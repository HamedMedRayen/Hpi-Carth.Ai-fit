"""
HPI — /api/auth routes
Register, login, get current user.
"""
import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from services.auth_service import (
    register_user, login_user, create_access_token,
    decode_token, get_user_id_for_auth,
    get_or_create_user_social, generate_email_otp, verify_email_otp, verify_google_token
)
from services.email_service import send_otp_email

router = APIRouter(prefix="/auth", tags=["Auth"])
bearer = HTTPBearer(auto_error=False)

from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)

# ── Pydantic models ───────────────────────────────────────────

class RegisterRequest(BaseModel):
    nickname: str = Field(..., min_length=3, max_length=40)
    email: str = Field(..., example="user@example.com")
    password: str = Field(..., min_length=6)
    role: str = Field(default="athlete", description="athlete or coach")

class LoginRequest(BaseModel):
    nickname: str
    password: str

class SocialLoginRequest(BaseModel):
    token: str

class OtpRequest(BaseModel):
    email: str

class OtpVerifyRequest(BaseModel):
    email: str
    otp: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    nickname: str
    avatar_url: Optional[str] = None
    onboarding_completed: bool = False


# ── Dependency: current user ──────────────────────────────────

def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: psycopg2.extensions.connection = Depends(get_db),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = decode_token(creds.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    auth_id = payload.get("auth_id")
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM auth_users WHERE id = %s", (auth_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="User not found.")
    user_id = get_user_id_for_auth(db, auth_id)
    return {"auth_id": auth_id, "nickname": row["nickname"], "user_id": user_id}


def get_current_user_id(current=Depends(get_current_user)) -> int:
    uid = current.get("user_id")
    if not uid:
        raise HTTPException(status_code=401, detail="Profile not found.")
    return uid


# ── Routes ────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: psycopg2.extensions.connection = Depends(get_db)):
    try:
        auth_user = register_user(db, payload.nickname, payload.password, payload.email, payload.role)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id, avatar_url, onboarding_completed FROM users WHERE auth_id = %s", (auth_user["id"],))
        u_row = cur.fetchone()
    
    user_id = u_row["id"]
    token = create_access_token({"auth_id": auth_user["id"], "nickname": auth_user["nickname"]})
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        nickname=auth_user["nickname"],
        avatar_url=u_row.get("avatar_url"),
        onboarding_completed=bool(u_row.get("onboarding_completed", False))
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, db: psycopg2.extensions.connection = Depends(get_db)):
    auth_user = login_user(db, payload.nickname, payload.password)
    if not auth_user:
        raise HTTPException(status_code=401, detail="Invalid nickname or password.")

    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id, avatar_url, onboarding_completed FROM users WHERE auth_id = %s", (auth_user["id"],))
        u_row = cur.fetchone()
        
    user_id = u_row["id"]
    token = create_access_token({"auth_id": auth_user["id"], "nickname": auth_user["nickname"]})
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        nickname=auth_user["nickname"],
        avatar_url=u_row.get("avatar_url"),
        onboarding_completed=bool(u_row.get("onboarding_completed", False))
    )


@router.post("/google", response_model=AuthResponse)
def google_login(payload: SocialLoginRequest, db: psycopg2.extensions.connection = Depends(get_db)):
    info = verify_google_token(payload.token)
    if not info:
        raise HTTPException(status_code=401, detail="Invalid Google token.")
        
    auth_user = get_or_create_user_social(db, info["email"], info["name"], "google")
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id, avatar_url, onboarding_completed FROM users WHERE auth_id = %s", (auth_user["id"],))
        u_row = cur.fetchone()

    user_id = u_row["id"]
    token = create_access_token({"auth_id": auth_user["id"], "nickname": auth_user["nickname"]})
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        nickname=auth_user["nickname"],
        avatar_url=u_row.get("avatar_url"),
        onboarding_completed=bool(u_row.get("onboarding_completed", False))
    )


@router.post("/email-otp-request")
@limiter.limit("3/minute")
def email_otp_request(request: Request, payload: OtpRequest, db: psycopg2.extensions.connection = Depends(get_db)):
    otp = generate_email_otp(db, payload.email)
    sent = send_otp_email(payload.email, otp)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send email.")
    return {"message": "OTP sent to email."}


@router.post("/email-otp-verify", response_model=AuthResponse)
def email_otp_verify(payload: OtpVerifyRequest, db: psycopg2.extensions.connection = Depends(get_db)):
    auth_user = verify_email_otp(db, payload.email, payload.otp)
    if not auth_user:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")
        
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id, avatar_url, onboarding_completed FROM users WHERE auth_id = %s", (auth_user["id"],))
        u_row = cur.fetchone()

    user_id = u_row["id"]
    token = create_access_token({"auth_id": auth_user["id"], "nickname": auth_user["nickname"]})
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        nickname=auth_user["nickname"],
        avatar_url=u_row.get("avatar_url"),
        onboarding_completed=bool(u_row.get("onboarding_completed", False))
    )


@router.get("/me")
def me(current=Depends(get_current_user), db: psycopg2.extensions.connection = Depends(get_db)):
    with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM users WHERE id = %s", (current["user_id"],)
        )
        row = cur.fetchone()
    role = row.get("role", "athlete") if row else "athlete"
    avatar_url = row.get("avatar_url") if row else None
    onboarding_completed = bool(row.get("onboarding_completed", False)) if row else False
    coach_verified = bool(row.get("coach_verified", False) or row.get("approved", False)) if row else False
    verification_status = row.get("verification_status") or ("approved" if coach_verified else ("pending" if row.get("cv_url") else "unsubmitted")) if row else "unsubmitted"
    return {
        **current, 
        "role": role, 
        "avatar_url": avatar_url, 
        "onboarding_completed": onboarding_completed,
        "coach_verified": coach_verified,
        "verification_status": verification_status,
        "profile": dict(row) if row else None
    }
