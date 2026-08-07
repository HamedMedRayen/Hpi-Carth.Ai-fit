"""
Stream Video Call Endpoint Implementation for FastAPI Backend

Creates signed Stream user tokens using STREAM_API_SECRET and STREAM_API_KEY.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request, status
from pydantic import BaseModel
from typing import Dict, List, Optional
import os
import time
import jwt

router = APIRouter(prefix="/api/stream", tags=["stream_video"])

STREAM_API_KEY = os.getenv("STREAM_API_KEY", "zgeq5ef43ya7")
STREAM_API_SECRET = os.getenv("STREAM_API_SECRET", "nz9fc3mcqp9ce6qck6qkrhbzg8r3x3s64gky2re7wv3kzb7jyhtp3tv5uywqbfhw")
STREAM_APP_ID = os.getenv("STREAM_APP_ID", "1707397")


# =========================================================================
# [AUTH PLACEHOLDER]: Dependency for checking JWT token authentication
# =========================================================================
async def get_current_user_placeholder(authorization: Optional[str] = Header(None)):
    """
    [AUTH PLACEHOLDER]
    Replace this dependency with your real authentication method (e.g., verifying JWT token).
    """
    # Example validation logic:
    # if not authorization or not authorization.startswith("Bearer "):
    #     raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authorization header")
    # token = authorization.split(" ")[1]
    # user = verify_jwt_token(token)
    # return user
    return {"id": "demo_user"}


class TokenRequest(BaseModel):
    userId: Optional[str] = None
    role: Optional[str] = "athlete"
    athleteId: Optional[str] = None
    coachId: Optional[str] = None
    validityInSeconds: Optional[int] = 3600


class CreateCallRequest(BaseModel):
    athleteId: str
    coachId: str
    createdById: Optional[str] = None


@router.post("/token")
async def generate_stream_token(
    body: TokenRequest,
    current_user: dict = Depends(get_current_user_placeholder)
):
    """
    POST /api/stream/token
    Generates a signed Stream user token server-side using STREAM_API_SECRET.
    """
    user_id = body.userId or body.athleteId or body.coachId
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required in body")

    if not STREAM_API_SECRET:
        raise HTTPException(status_code=500, detail="STREAM_API_SECRET is not configured on server")

    # =========================================================================
    # [AUTH PLACEHOLDER]: Validate that current_user matches requested userId
    # if current_user.get("id") != body.userId:
    #     raise HTTPException(status_code=403, detail="Forbidden: User mismatch")
    # =========================================================================

    expiration_time = int(time.time()) + (body.validityInSeconds or 3600)

    # Payload required by Stream for User Tokens
    payload = {
        "user_id": str(user_id),
        "exp": expiration_time
    }

    try:
        # Sign payload using HMAC-SHA256 and STREAM_API_SECRET
        token = jwt.encode(payload, STREAM_API_SECRET, algorithm="HS256")
        
        # If jwt.encode returns bytes in older PyJWT versions, decode to string
        if isinstance(token, bytes):
            token = token.decode("utf-8")

        return {
            "success": True,
            "token": token,
            "apiKey": STREAM_API_KEY,
            "userId": str(user_id),
            "expiresAt": expiration_time
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Stream token: {str(e)}"
        )


# In-memory call invite store: call_id -> invite metadata
ACTIVE_CALL_INVITES: Dict[str, dict] = {}


class InviteCallRequest(BaseModel):
    callerId: str
    callerName: Optional[str] = "Coach"
    receiverId: str
    athleteId: str
    coachId: str


class RespondInviteRequest(BaseModel):
    callId: str
    receiverId: str
    action: str  # 'accept' | 'decline'


@router.post("/invite")
async def create_call_invite(body: InviteCallRequest):
    call_id = format_call_id(body.athleteId, body.coachId)
    invite_data = {
        "callId": call_id,
        "callerId": str(body.callerId),
        "callerName": body.callerName or "User",
        "receiverId": str(body.receiverId),
        "athleteId": str(body.athleteId),
        "coachId": str(body.coachId),
        "status": "ringing",
        "timestamp": time.time()
    }
    ACTIVE_CALL_INVITES[call_id] = invite_data
    return {"success": True, "invite": invite_data}


@router.get("/invite/check")
async def check_call_invite(userId: str):
    """Checks if there is an active ringing video call invite for the user"""
    now = time.time()
    for call_id, invite in list(ACTIVE_CALL_INVITES.items()):
        if now - invite.get("timestamp", 0) > 45:
            ACTIVE_CALL_INVITES.pop(call_id, None)
            continue
        if (
            invite.get("receiverId") == str(userId)
            and invite.get("callerId") != str(userId)
            and invite.get("status") == "ringing"
        ):
            return {"active": True, "invite": invite}

    return {"active": False}


class CancelInviteRequest(BaseModel):
    callId: str


@router.post("/invite/cancel")
async def cancel_call_invite(body: CancelInviteRequest):
    """Removes active ringing invite when call is ended or cancelled"""
    call_id = body.callId
    if call_id in ACTIVE_CALL_INVITES:
        ACTIVE_CALL_INVITES.pop(call_id, None)
        return {"success": True, "cancelled": True}
    return {"success": True, "cancelled": False}


@router.post("/invite/respond")
async def respond_to_invite(body: RespondInviteRequest):
    """Allows recipient to accept or decline an incoming call invite"""
    call_id = body.callId
    if call_id in ACTIVE_CALL_INVITES:
        status = body.action
        ACTIVE_CALL_INVITES.pop(call_id, None)
        return {"success": True, "status": status}
    return {"success": False, "message": "Invite not found or expired"}


def format_call_id(athlete_id: str, coach_id: str) -> str:
    """Helper to format callId consistently: athlete-{athleteId}-coach-{coachId}"""
    return f"athlete-{athlete_id}-coach-{coach_id}"


@router.post("/call")
async def create_or_join_call(
    body: CreateCallRequest,
    current_user: dict = Depends(get_current_user_placeholder)
):
    """
    POST /api/stream/call
    Returns consistent callId and metadata for 1:1 call between athlete and coach.
    """
    call_id = format_call_id(body.athleteId, body.coachId)
    members = [str(body.athleteId), str(body.coachId)]

    return {
        "success": True,
        "callId": call_id,
        "members": members,
        "createdById": body.createdById or str(body.athleteId)
    }

