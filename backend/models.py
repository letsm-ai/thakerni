from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime
    role: Optional[str] = "user"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChatMessageCreate(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    message_id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime

class ConversationResponse(BaseModel):
    conversation_id: str
    title: str
    created_at: datetime
    updated_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None

class TaskResponse(BaseModel):
    task_id: str
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    priority: str
    completed: bool
    created_at: datetime

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_time: datetime
    repeat: str = "none"

class ReminderResponse(BaseModel):
    reminder_id: str
    title: str
    description: Optional[str]
    reminder_time: datetime
    repeat: str
    active: bool
    created_at: datetime

class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    all_day: bool = False

class CalendarEventResponse(BaseModel):
    event_id: str
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    all_day: bool
    created_at: datetime

class NotificationResponse(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime
    related_id: Optional[str] = None

class EmailPreferences(BaseModel):
    weekly_digest: Optional[bool] = True
    reminder_alerts: Optional[bool] = True

class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str

class GuestChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class WhatsAppAIRequest(BaseModel):
    phone_number: str
    message: str
