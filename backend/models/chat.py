from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class ChatMessageBase(BaseModel):
    message: str
    receiver_id: int

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageRead(ChatMessageBase):
    id: int
    sender_id: int
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatConversation(BaseModel):
    other_user_id: int
    other_user_name: str
    other_user_avatar: Optional[str] = None
    last_message: str
    last_message_at: datetime
    unread_count: int
