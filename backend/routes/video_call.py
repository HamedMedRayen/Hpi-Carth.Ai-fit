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


@router.api_route("/token", methods=["GET", "POST"])
async def generate_stream_token(
    user_id: Optional[str] = None,
    userId: Optional[str] = None,
    body: Optional[TokenRequest] = None,
    current_user: dict = Depends(get_current_user_placeholder)
):
    """
    GET or POST /api/stream/token
    Generates a signed Stream user token server-side using STREAM_API_SECRET.
    """
    uid = (body.userId if body else None) or (body.athleteId if body else None) or (body.coachId if body else None) or user_id or userId
    if not uid:
        raise HTTPException(status_code=400, detail="userId is required")

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
    callerAvatar: Optional[str] = None
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
    
    caller_name = body.callerName
    caller_avatar = body.callerAvatar

    # Query DB to get caller's real profile name and avatar
    try:
        from database import get_connection
        conn = get_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            caller_num = int(body.callerId) if body.callerId.isdigit() else 0
            cur.execute("""
                SELECT u.name, u.avatar_url, a.nickname 
                FROM users u 
                LEFT JOIN auth_users a ON u.auth_id = a.id 
                WHERE u.id = %s OR u.auth_id = %s
            """, (caller_num, caller_num))
            user_row = cur.fetchone()
            if user_row:
                real_name = user_row.get("name") or user_row.get("nickname")
                if real_name and (not caller_name or caller_name in ("User", "Coach", "Athlete")):
                    caller_name = real_name
                if not caller_avatar and user_row.get("avatar_url"):
                    caller_avatar = user_row.get("avatar_url")
        conn.close()
    except Exception as e:
        print(f"[VIDEO_CALL] Error resolving caller info from DB: {e}", flush=True)

    invite_data = {
        "callId": call_id,
        "callerId": str(body.callerId),
        "callerName": caller_name or "Coach",
        "callerAvatar": caller_avatar,
        "receiverId": str(body.receiverId),
        "athleteId": str(body.athleteId),
        "coachId": str(body.coachId),
        "status": "ringing",
        "timestamp": time.time()
    }
    ACTIVE_CALL_INVITES[call_id] = invite_data
    return {"success": True, "invite": invite_data}


def save_system_chat_message(sender_id: str, receiver_id: str, message_text: str):
    """Helper to save a video call system event notification into chat_messages table"""
    try:
        from database import get_connection
        conn = get_connection()
        with conn.cursor() as cur:
            s_id = int(sender_id) if str(sender_id).isdigit() else 0
            r_id = int(receiver_id) if str(receiver_id).isdigit() else 0
            if s_id and r_id:
                cur.execute("""
                    INSERT INTO chat_messages (sender_id, receiver_id, message)
                    VALUES (%s, %s, %s)
                """, (s_id, r_id, message_text))
                conn.commit()
        conn.close()
    except Exception as e:
        print(f"[VIDEO_CALL] Error inserting system chat message: {e}", flush=True)


@router.get("/invite/check")
async def check_call_invite(userId: str):
    """Checks if there is an active ringing video call invite for the user"""
    now = time.time()
    for call_id, invite in list(ACTIVE_CALL_INVITES.items()):
        if now - invite.get("timestamp", 0) > 40:
            if invite.get("status") == "ringing":
                save_system_chat_message(
                    sender_id=invite.get("callerId"),
                    receiver_id=invite.get("receiverId"),
                    message_text="📞 Missed Video Call"
                )
            ACTIVE_CALL_INVITES.pop(call_id, None)
            continue
        if (
            invite.get("receiverId") == str(userId)
            and invite.get("callerId") != str(userId)
            and invite.get("status") == "ringing"
        ):
            return {"active": True, "invite": invite}

    return {"active": False}


@router.get("/invite/status")
async def check_invite_status(callId: str):
    """Allows caller to poll if the callee accepted, declined, or missed the call"""
    invite = ACTIVE_CALL_INVITES.get(callId)
    if not invite:
        return {"status": "none"}
    return {
        "status": invite.get("status", "ringing"),
        "callerId": invite.get("callerId"),
        "receiverId": invite.get("receiverId")
    }


class CancelInviteRequest(BaseModel):
    callId: str


@router.post("/invite/cancel")
async def cancel_call_invite(body: CancelInviteRequest):
    """Removes active ringing invite when call is ended or cancelled"""
    call_id = body.callId
    if call_id in ACTIVE_CALL_INVITES:
        invite = ACTIVE_CALL_INVITES.get(call_id)
        if invite and invite.get("status") == "ringing":
            save_system_chat_message(
                sender_id=invite.get("callerId"),
                receiver_id=invite.get("receiverId"),
                message_text="📞 Missed Video Call"
            )
        ACTIVE_CALL_INVITES.pop(call_id, None)
        return {"success": True, "cancelled": True}
    return {"success": True, "cancelled": False}


@router.post("/invite/respond")
async def respond_to_invite(body: RespondInviteRequest):
    """Allows recipient to accept or decline an incoming call invite"""
    call_id = body.callId
    if call_id in ACTIVE_CALL_INVITES:
        invite = ACTIVE_CALL_INVITES[call_id]
        status = body.action
        invite["status"] = status
        
        if status == "decline":
            save_system_chat_message(
                sender_id=invite.get("receiverId"),
                receiver_id=invite.get("callerId"),
                message_text="📹 Video call declined"
            )
        return {"success": True, "status": status}
    return {"success": False, "message": "Invite not found or expired"}


class EndCallLogRequest(BaseModel):
    callId: str
    callerId: str
    receiverId: str
    durationSeconds: int = 0


@router.post("/call/end_log")
async def log_ended_call(body: EndCallLogRequest):
    """Logs completed video call duration into chat_messages table"""
    mins = body.durationSeconds // 60
    secs = body.durationSeconds % 60
    dur_str = f"{mins:02d}:{secs:02d}"

    if body.durationSeconds > 3:
        msg = f"📹 Video Call Ended • Duration: {dur_str}"
    else:
        msg = "📞 Missed Video Call"

    save_system_chat_message(
        sender_id=body.callerId,
        receiver_id=body.receiverId,
        message_text=msg
    )
    
    if body.callId in ACTIVE_CALL_INVITES:
        ACTIVE_CALL_INVITES.pop(body.callId, None)

    return {"success": True, "duration": dur_str, "message": msg}


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

