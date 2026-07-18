from fastapi import APIRouter, Depends, HTTPException
from typing import List
from database import get_db
from routes.auth import get_current_user_id
from models.chat import ChatMessageCreate, ChatMessageRead, ChatConversation
from repositories.chat_repository import ChatRepository

router = APIRouter(prefix="/coach-chat", tags=["Coach Chat"])

@router.post("/send", response_model=ChatMessageRead)
def send_message(
    payload: ChatMessageCreate,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    repo = ChatRepository(db)
    msg = repo.create_message(user_id, payload.receiver_id, payload.message)
    if not msg:
        raise HTTPException(status_code=500, detail="Failed to send message")
    return msg

@router.get("/messages/{other_user_id}", response_model=List[ChatMessageRead])
def get_messages(
    other_user_id: int,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    repo = ChatRepository(db)
    # Mark messages from the other user as read
    repo.mark_as_read(user_id, other_user_id)
    return repo.get_messages(user_id, other_user_id)

@router.get("/conversations", response_model=List[ChatConversation])
def get_conversations(
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    repo = ChatRepository(db)
    return repo.get_conversations(user_id)

@router.delete("/clear/{other_user_id}")
def clear_conversation(
    other_user_id: int,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db)
):
    repo = ChatRepository(db)
    repo.clear_conversation(user_id, other_user_id)
    return {"status": "success", "message": "Conversation cleared successfully"}

