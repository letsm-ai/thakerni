from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="Letsm AI - AI Assistant Platform")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

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

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    if session_token:
        # Validate session token from database
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    
    # Fallback to Authorization header (JWT)
    if credentials:
        payload = decode_jwt_token(credentials.credentials)
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user:
            return user
    
    raise HTTPException(status_code=401, detail="Not authenticated")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pw = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_pw,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user_id,
            email=user_data.email,
            name=user_data.name,
            picture=None,
            created_at=datetime.now(timezone.utc)
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["user_id"], user["email"])
    
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            name=user["name"],
            picture=user.get("picture"),
            created_at=created_at
        )
    )

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id from Emergent OAuth for user data"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = auth_response.json()
    
    # Get or create user
    user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": auth_data["name"], "picture": auth_data.get("picture")}}
        )
        user["name"] = auth_data["name"]
        user["picture"] = auth_data.get("picture")
    
    # Store session
    session_token = auth_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return {
        "user_id": user_id,
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "created_at": created_at.isoformat()
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        created_at=created_at
    )

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== AI CHAT ROUTES ====================

@api_router.post("/chat/message", response_model=ChatMessageResponse)
async def send_chat_message(message: ChatMessageCreate, user: dict = Depends(get_current_user)):
    conversation_id = message.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
    
    # Check if conversation exists, if not create it
    conversation = await db.conversations.find_one(
        {"conversation_id": conversation_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not conversation:
        # Create new conversation
        await db.conversations.insert_one({
            "conversation_id": conversation_id,
            "user_id": user["user_id"],
            "title": message.message[:50] + "..." if len(message.message) > 50 else message.message,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Store user message
    user_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.messages.insert_one({
        "message_id": user_msg_id,
        "conversation_id": conversation_id,
        "user_id": user["user_id"],
        "role": "user",
        "content": message.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get conversation history for context
    history = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    try:
        # Initialize AI chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=conversation_id,
            system_message="""You are Letsm AI, a helpful and professional AI assistant. You help users with:
- Task management and productivity
- Scheduling and reminders
- General questions and assistance
- WhatsApp integration guidance

Be concise, friendly, and helpful. Format your responses clearly."""
        )
        chat.with_model("openai", "gpt-5.2")
        
        # Send message and get response
        user_message_obj = UserMessage(text=message.message)
        ai_response = await chat.send_message(user_message_obj)
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        # Check if budget exceeded
        if "budget" in str(e).lower() or "exceeded" in str(e).lower():
            ai_response = "I apologize, but the AI service is temporarily unavailable due to budget limits. Please try again later or contact support to top up the Universal Key balance (Profile -> Universal Key -> Add Balance)."
        else:
            ai_response = f"I encountered an issue processing your request. Please try again. Error: {str(e)[:100]}"
    
    # Store AI response
    ai_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.messages.insert_one({
        "message_id": ai_msg_id,
        "conversation_id": conversation_id,
        "user_id": user["user_id"],
        "role": "assistant",
        "content": ai_response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Update conversation timestamp
    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return ChatMessageResponse(
        message_id=ai_msg_id,
        conversation_id=conversation_id,
        role="assistant",
        content=ai_response,
        created_at=datetime.now(timezone.utc)
    )

@api_router.get("/chat/conversations", response_model=List[ConversationResponse])
async def get_conversations(user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        created_at = conv["created_at"]
        updated_at = conv["updated_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
        
        result.append(ConversationResponse(
            conversation_id=conv["conversation_id"],
            title=conv["title"],
            created_at=created_at,
            updated_at=updated_at
        ))
    
    return result

@api_router.get("/chat/conversations/{conversation_id}/messages", response_model=List[ChatMessageResponse])
async def get_conversation_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {"conversation_id": conversation_id, "user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    result = []
    for msg in messages:
        created_at = msg["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ChatMessageResponse(
            message_id=msg["message_id"],
            conversation_id=msg["conversation_id"],
            role=msg["role"],
            content=msg["content"],
            created_at=created_at
        ))
    
    return result

@api_router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    await db.conversations.delete_one({"conversation_id": conversation_id, "user_id": user["user_id"]})
    await db.messages.delete_many({"conversation_id": conversation_id, "user_id": user["user_id"]})
    return {"message": "Conversation deleted"}

# ==================== TASK ROUTES ====================

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, user: dict = Depends(get_current_user)):
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    
    task_doc = {
        "task_id": task_id,
        "user_id": user["user_id"],
        "title": task.title,
        "description": task.description,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "priority": task.priority,
        "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tasks.insert_one(task_doc)
    
    return TaskResponse(
        task_id=task_id,
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        priority=task.priority,
        completed=False,
        created_at=datetime.now(timezone.utc)
    )

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    result = []
    for task in tasks:
        created_at = task["created_at"]
        due_date = task.get("due_date")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date)
        
        result.append(TaskResponse(
            task_id=task["task_id"],
            title=task["title"],
            description=task.get("description"),
            due_date=due_date,
            priority=task["priority"],
            completed=task["completed"],
            created_at=created_at
        ))
    
    return result

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"task_id": task_id, "user_id": user["user_id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {}
    if task_update.title is not None:
        update_data["title"] = task_update.title
    if task_update.description is not None:
        update_data["description"] = task_update.description
    if task_update.due_date is not None:
        update_data["due_date"] = task_update.due_date.isoformat()
    if task_update.priority is not None:
        update_data["priority"] = task_update.priority
    if task_update.completed is not None:
        update_data["completed"] = task_update.completed
    
    if update_data:
        await db.tasks.update_one({"task_id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    
    created_at = updated_task["created_at"]
    due_date = updated_task.get("due_date")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if isinstance(due_date, str):
        due_date = datetime.fromisoformat(due_date)
    
    return TaskResponse(
        task_id=updated_task["task_id"],
        title=updated_task["title"],
        description=updated_task.get("description"),
        due_date=due_date,
        priority=updated_task["priority"],
        completed=updated_task["completed"],
        created_at=created_at
    )

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"task_id": task_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# ==================== REMINDER ROUTES ====================

@api_router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(reminder: ReminderCreate, user: dict = Depends(get_current_user)):
    reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
    
    reminder_doc = {
        "reminder_id": reminder_id,
        "user_id": user["user_id"],
        "title": reminder.title,
        "description": reminder.description,
        "reminder_time": reminder.reminder_time.isoformat(),
        "repeat": reminder.repeat,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reminders.insert_one(reminder_doc)
    
    return ReminderResponse(
        reminder_id=reminder_id,
        title=reminder.title,
        description=reminder.description,
        reminder_time=reminder.reminder_time,
        repeat=reminder.repeat,
        active=True,
        created_at=datetime.now(timezone.utc)
    )

@api_router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(user: dict = Depends(get_current_user)):
    reminders = await db.reminders.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("reminder_time", 1).to_list(1000)
    
    result = []
    for rem in reminders:
        created_at = rem["created_at"]
        reminder_time = rem["reminder_time"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(reminder_time, str):
            reminder_time = datetime.fromisoformat(reminder_time)
        
        result.append(ReminderResponse(
            reminder_id=rem["reminder_id"],
            title=rem["title"],
            description=rem.get("description"),
            reminder_time=reminder_time,
            repeat=rem["repeat"],
            active=rem["active"],
            created_at=created_at
        ))
    
    return result

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    result = await db.reminders.delete_one({"reminder_id": reminder_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}

# ==================== CALENDAR EVENT ROUTES ====================

@api_router.post("/calendar/events", response_model=CalendarEventResponse)
async def create_calendar_event(event: CalendarEventCreate, user: dict = Depends(get_current_user)):
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    
    event_doc = {
        "event_id": event_id,
        "user_id": user["user_id"],
        "title": event.title,
        "description": event.description,
        "start_time": event.start_time.isoformat(),
        "end_time": event.end_time.isoformat(),
        "all_day": event.all_day,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.calendar_events.insert_one(event_doc)
    
    return CalendarEventResponse(
        event_id=event_id,
        title=event.title,
        description=event.description,
        start_time=event.start_time,
        end_time=event.end_time,
        all_day=event.all_day,
        created_at=datetime.now(timezone.utc)
    )

@api_router.get("/calendar/events", response_model=List[CalendarEventResponse])
async def get_calendar_events(user: dict = Depends(get_current_user)):
    events = await db.calendar_events.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("start_time", 1).to_list(1000)
    
    result = []
    for evt in events:
        created_at = evt["created_at"]
        start_time = evt["start_time"]
        end_time = evt["end_time"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        result.append(CalendarEventResponse(
            event_id=evt["event_id"],
            title=evt["title"],
            description=evt.get("description"),
            start_time=start_time,
            end_time=end_time,
            all_day=evt["all_day"],
            created_at=created_at
        ))
    
    return result

@api_router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(event_id: str, user: dict = Depends(get_current_user)):
    result = await db.calendar_events.delete_one({"event_id": event_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ==================== WHATSAPP ROUTES (PLACEHOLDER) ====================

@api_router.get("/whatsapp/status")
async def get_whatsapp_status(user: dict = Depends(get_current_user)):
    """Get WhatsApp connection status"""
    connection = await db.whatsapp_connections.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    return {"connected": connection is not None and connection.get("connected", False)}

@api_router.get("/whatsapp/qr")
async def get_whatsapp_qr(user: dict = Depends(get_current_user)):
    """Get QR code for WhatsApp connection - placeholder"""
    return {"qr": None, "message": "WhatsApp integration requires Node.js service setup"}

# ==================== USER PROFILE ====================

@api_router.put("/users/profile")
async def update_profile(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    update_data = {}
    
    if "name" in body:
        update_data["name"] = body["name"]
    
    if update_data:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    created_at = updated_user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return UserResponse(
        user_id=updated_user["user_id"],
        email=updated_user["email"],
        name=updated_user["name"],
        picture=updated_user.get("picture"),
        created_at=created_at
    )

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Letsm AI API", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
