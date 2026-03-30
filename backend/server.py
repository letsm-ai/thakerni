from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import json
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import resend
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

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

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Resend Config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Subscription Plans (prices managed server-side only)
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free",
        "price": 0.00,
        "currency": "usd",
        "features": ["5 Active Tasks", "3 Conversations/day", "Basic Reminders", "Email Support"],
        "limits": {"max_tasks": 5, "max_conversations_daily": 3}
    },
    "pro": {
        "name": "Pro",
        "price": 9.99,
        "currency": "usd",
        "features": ["Unlimited Tasks", "Unlimited Conversations", "Voice Input", "Advanced Analytics", "Priority Support"],
        "limits": {"max_tasks": -1, "max_conversations_daily": -1}
    },
    "business": {
        "name": "Business",
        "price": 29.99,
        "currency": "usd",
        "features": ["All Pro Features", "WhatsApp Integration", "Team up to 10", "Custom API", "Account Manager"],
        "limits": {"max_tasks": -1, "max_conversations_daily": -1}
    }
}

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

class NotificationResponse(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    type: str  # reminder, task_due, system
    read: bool
    created_at: datetime
    related_id: Optional[str] = None  # reminder_id or task_id

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

async def parse_and_execute_chat_action(user_message: str, user: dict) -> Optional[str]:
    """Parse user message for task/reminder actions and execute them"""
    action_taken = None
    lower_msg = user_message.lower().strip()
    
    # ===== LIST TASKS (English + Arabic) =====
    list_task_keywords = [
        'show my tasks', 'list tasks', 'my tasks', 'what are my tasks', 'show tasks', 'pending tasks',
        'اعرض مهامي', 'قائمة المهام', 'مهامي', 'ما هي مهامي', 'المهام المعلقة', 'اظهر المهام'
    ]
    if any(kw in lower_msg for kw in list_task_keywords):
        tasks = await db.tasks.find(
            {"user_id": user["user_id"], "completed": False},
            {"_id": 0}
        ).sort("created_at", -1).to_list(10)
        
        if not tasks:
            return "\n\n📋 **مهامك / Your Tasks**: لا توجد مهام معلقة! / No pending tasks!"
        
        task_list = "\n\n📋 **المهام المعلقة / Pending Tasks:**\n"
        for i, task in enumerate(tasks, 1):
            priority_icon = "🔴" if task["priority"] == "high" else "🟡" if task["priority"] == "medium" else "🟢"
            due_str = ""
            if task.get("due_date"):
                due_date = datetime.fromisoformat(task["due_date"])
                due_str = f" (Due: {due_date.strftime('%b %d')})"
            task_list += f"{i}. {priority_icon} {task['title']}{due_str}\n"
        task_list += f"\n_Say \"complete task [number]\" / قل \"أكمل المهمة [رقم]\"_"
        return task_list
    
    # ===== COMPLETE TASK (English + Arabic) =====
    complete_patterns = [
        r'complete task (\d+)',
        r'finish task (\d+)',
        r'done with task (\d+)',
        r'mark task (\d+)',
        r'task (\d+) done',
        r'task (\d+) complete',
        r'أكمل المهمة (\d+)',
        r'انهي المهمة (\d+)',
        r'المهمة (\d+) منتهية',
        r'أنجز المهمة (\d+)'
    ]
    for pattern in complete_patterns:
        match = re.search(pattern, lower_msg)
        if match:
            task_num = int(match.group(1))
            tasks = await db.tasks.find(
                {"user_id": user["user_id"], "completed": False},
                {"_id": 0}
            ).sort("created_at", -1).to_list(100)
            
            if task_num < 1 or task_num > len(tasks):
                return f"\n\n❌ Invalid task number. You have {len(tasks)} pending tasks."
            
            task_to_complete = tasks[task_num - 1]
            await db.tasks.update_one(
                {"task_id": task_to_complete["task_id"]},
                {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}}
            )
            return f"\n\n✅ **Task completed**: \"{task_to_complete['title']}\""
    
    # ===== LIST REMINDERS (English + Arabic) =====
    list_reminder_keywords = [
        'show my reminders', 'list reminders', 'my reminders', 'what reminders', 'show reminders', 'upcoming reminders',
        'اعرض تذكيراتي', 'قائمة التذكيرات', 'تذكيراتي', 'التذكيرات القادمة', 'اظهر التذكيرات'
    ]
    if any(kw in lower_msg for kw in list_reminder_keywords):
        reminders = await db.reminders.find(
            {"user_id": user["user_id"], "active": True},
            {"_id": 0}
        ).sort("reminder_time", 1).to_list(10)
        
        if not reminders:
            return "\n\n🔔 **تذكيراتك / Your Reminders**: لا توجد تذكيرات نشطة / No active reminders."
        
        reminder_list = "\n\n🔔 **التذكيرات القادمة / Upcoming Reminders:**\n"
        for i, rem in enumerate(reminders, 1):
            rem_time = datetime.fromisoformat(rem["reminder_time"])
            reminder_list += f"{i}. {rem['title']} - {rem_time.strftime('%b %d at %I:%M %p')}\n"
        return reminder_list
    
    # ===== DELETE/CANCEL REMINDER (English + Arabic) =====
    cancel_patterns = [
        r'cancel reminder (\d+)', r'delete reminder (\d+)', r'remove reminder (\d+)',
        r'احذف التذكير (\d+)', r'الغي التذكير (\d+)', r'امسح التذكير (\d+)'
    ]
    for pattern in cancel_patterns:
        match = re.search(pattern, lower_msg)
        if match:
            rem_num = int(match.group(1))
            reminders = await db.reminders.find(
                {"user_id": user["user_id"], "active": True},
                {"_id": 0}
            ).sort("reminder_time", 1).to_list(100)
            
            if rem_num < 1 or rem_num > len(reminders):
                return f"\n\n❌ Invalid reminder number. You have {len(reminders)} active reminders."
            
            rem_to_delete = reminders[rem_num - 1]
            await db.reminders.delete_one({"reminder_id": rem_to_delete["reminder_id"]})
            return f"\n\n🗑️ **Reminder cancelled**: \"{rem_to_delete['title']}\""
    
    return None


async def parse_and_create_from_ai(user_message: str, user: dict, ai_response: str) -> Optional[str]:
    """Parse AI response for task/reminder creation commands and execute them"""
    action_taken = None
    
    # Check if the message contains task/reminder intent
    lower_msg = user_message.lower()
    
    # English + Arabic keywords
    task_keywords = [
        'create task', 'add task', 'new task', 'make a task', 'todo:', 'task:',
        'أنشئ مهمة', 'اضف مهمة', 'مهمة جديدة', 'مهمة:'
    ]
    reminder_keywords = [
        'remind me', 'set reminder', 'create reminder', 'add reminder', 'reminder:',
        'ذكرني', 'اضف تذكير', 'انشئ تذكير', 'تذكير:'
    ]
    
    has_task_intent = any(kw in lower_msg for kw in task_keywords)
    has_reminder_intent = any(kw in lower_msg for kw in reminder_keywords)
    
    if has_task_intent:
        # Extract task title from message
        title = user_message
        for kw in task_keywords:
            if kw in lower_msg:
                idx = lower_msg.find(kw) + len(kw)
                title = user_message[idx:].strip()
                if title.startswith(':'):
                    title = title[1:].strip()
                break
        
        if title and len(title) > 2:
            # Determine priority from message
            priority = "medium"
            if any(w in lower_msg for w in ['urgent', 'important', 'asap', 'critical', 'high priority']):
                priority = "high"
            elif any(w in lower_msg for w in ['low priority', 'whenever', 'someday']):
                priority = "low"
            
            # Parse due date hints
            due_date = None
            now = datetime.now(timezone.utc)
            if 'tomorrow' in lower_msg:
                due_date = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0)
            elif 'today' in lower_msg:
                due_date = now.replace(hour=18, minute=0, second=0)
            elif 'next week' in lower_msg:
                due_date = (now + timedelta(days=7)).replace(hour=9, minute=0, second=0)
            
            # Create task
            task_id = f"task_{uuid.uuid4().hex[:12]}"
            task_doc = {
                "task_id": task_id,
                "user_id": user["user_id"],
                "title": title[:100],
                "description": f"Created from chat: {user_message[:200]}",
                "due_date": due_date.isoformat() if due_date else None,
                "priority": priority,
                "completed": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.tasks.insert_one(task_doc)
            action_taken = f"\n\n✅ **Task created**: \"{title[:50]}\" (Priority: {priority})"
            if due_date:
                action_taken += f" - Due: {due_date.strftime('%b %d, %Y')}"
    
    elif has_reminder_intent:
        # Extract reminder title
        title = user_message
        for kw in reminder_keywords:
            if kw in lower_msg:
                idx = lower_msg.find(kw) + len(kw)
                title = user_message[idx:].strip()
                if title.startswith('to '):
                    title = title[3:].strip()
                break
        
        if title and len(title) > 2:
            # Parse time from message
            reminder_time = datetime.now(timezone.utc) + timedelta(hours=1)  # Default: 1 hour
            
            # Time pattern matching
            time_match = re.search(r'at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?', lower_msg, re.IGNORECASE)
            if time_match:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2) or 0)
                ampm = time_match.group(3)
                if ampm and ampm.lower() == 'pm' and hour < 12:
                    hour += 12
                elif ampm and ampm.lower() == 'am' and hour == 12:
                    hour = 0
                reminder_time = reminder_time.replace(hour=hour, minute=minute, second=0)
            
            # Date parsing
            if 'tomorrow' in lower_msg:
                reminder_time = reminder_time + timedelta(days=1)
            elif 'next week' in lower_msg:
                reminder_time = reminder_time + timedelta(days=7)
            
            # Time keywords
            if 'morning' in lower_msg:
                reminder_time = reminder_time.replace(hour=9, minute=0)
            elif 'afternoon' in lower_msg:
                reminder_time = reminder_time.replace(hour=14, minute=0)
            elif 'evening' in lower_msg:
                reminder_time = reminder_time.replace(hour=18, minute=0)
            elif 'night' in lower_msg:
                reminder_time = reminder_time.replace(hour=21, minute=0)
            
            # Create reminder
            reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
            reminder_doc = {
                "reminder_id": reminder_id,
                "user_id": user["user_id"],
                "title": title[:100],
                "description": f"Created from chat: {user_message[:200]}",
                "reminder_time": reminder_time.isoformat(),
                "repeat": "none",
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.reminders.insert_one(reminder_doc)
            action_taken = f"\n\n🔔 **Reminder set**: \"{title[:50]}\" - {reminder_time.strftime('%b %d, %Y at %I:%M %p')}"
    
    return action_taken

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
        # First check for direct action commands (list tasks, complete task, etc.)
        direct_action = await parse_and_execute_chat_action(message.message, user)
        
        if direct_action:
            # For direct actions, provide a simple response + the action result
            ai_response = "Sure!" + direct_action
        else:
            # Initialize AI chat for general conversation
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=conversation_id,
                system_message="""You are Letsm AI, a helpful and professional AI assistant. You help users with:
- Task management and productivity
- Scheduling and reminders
- General questions and assistance
- WhatsApp integration guidance

IMPORTANT LANGUAGE RULE: Always detect the user's language and respond in the SAME language. If the user writes in Arabic, respond in Arabic. If they write in English, respond in English. Match their language exactly.

أنت مساعد ذكي يدعم اللغة العربية بشكل كامل. إذا كتب المستخدم بالعربية، أجب بالعربية.

IMPORTANT: When users ask you to create tasks or set reminders, acknowledge their request naturally. The system will automatically create the task/reminder for them.

Users can also say (in any language):
- "Show my tasks" / "اعرض مهامي" to see pending tasks
- "Complete task 1" / "أكمل المهمة 1" to mark task as done
- "Show my reminders" / "اعرض تذكيراتي" to see upcoming reminders
- "Cancel reminder 1" / "احذف التذكير 1" to delete a reminder
- "Create task" / "أنشئ مهمة" to create a new task
- "Remind me" / "ذكرني" to set a reminder

Be concise, friendly, and helpful. Format your responses clearly."""
            )
            chat.with_model("openai", "gpt-5.2")
            
            # Send message and get response
            user_message_obj = UserMessage(text=message.message)
            ai_response = await chat.send_message(user_message_obj)
            
            # Check for task/reminder creation from natural language
            action_result = await parse_and_create_from_ai(message.message, user, ai_response)
            if action_result:
                ai_response += action_result
            
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

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    result = []
    for notif in notifications:
        created_at = notif["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(NotificationResponse(
            notification_id=notif["notification_id"],
            user_id=notif["user_id"],
            title=notif["title"],
            message=notif["message"],
            type=notif["type"],
            read=notif.get("read", False),
            created_at=created_at,
            related_id=notif.get("related_id")
        ))
    
    return result

@api_router.get("/notifications/unread-count")
async def get_unread_notification_count(user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents(
        {"user_id": user["user_id"], "read": False}
    )
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one(
        {"notification_id": notification_id, "user_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

@api_router.get("/notifications/check-reminders")
async def check_due_reminders(user: dict = Depends(get_current_user)):
    """Check for due reminders and create notifications"""
    now = datetime.now(timezone.utc)
    five_minutes_ago = now - timedelta(minutes=5)
    
    # Find reminders that are due (within the last 5 minutes to now + 1 minute)
    due_reminders = await db.reminders.find({
        "user_id": user["user_id"],
        "active": True,
        "reminder_time": {
            "$lte": (now + timedelta(minutes=1)).isoformat(),
            "$gte": five_minutes_ago.isoformat()
        }
    }, {"_id": 0}).to_list(100)
    
    notifications_created = []
    
    for reminder in due_reminders:
        # Check if notification already exists for this reminder
        existing = await db.notifications.find_one({
            "related_id": reminder["reminder_id"],
            "type": "reminder"
        })
        
        if not existing:
            notification_id = f"notif_{uuid.uuid4().hex[:12]}"
            notification = {
                "notification_id": notification_id,
                "user_id": user["user_id"],
                "title": "🔔 Reminder",
                "message": reminder["title"],
                "type": "reminder",
                "read": False,
                "related_id": reminder["reminder_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
            notifications_created.append(notification)
            
            # If reminder doesn't repeat, mark as inactive
            if reminder.get("repeat", "none") == "none":
                await db.reminders.update_one(
                    {"reminder_id": reminder["reminder_id"]},
                    {"$set": {"active": False}}
                )
    
    # Also check for tasks due today
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    due_tasks = await db.tasks.find({
        "user_id": user["user_id"],
        "completed": False,
        "due_date": {
            "$gte": today_start.isoformat(),
            "$lt": today_end.isoformat()
        }
    }, {"_id": 0}).to_list(100)
    
    for task in due_tasks:
        # Check if notification already exists for this task today
        existing = await db.notifications.find_one({
            "related_id": task["task_id"],
            "type": "task_due",
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        if not existing:
            notification_id = f"notif_{uuid.uuid4().hex[:12]}"
            notification = {
                "notification_id": notification_id,
                "user_id": user["user_id"],
                "title": "📋 Task Due Today",
                "message": task["title"],
                "type": "task_due",
                "read": False,
                "related_id": task["task_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
            notifications_created.append(notification)
    
    return {
        "checked": True,
        "notifications_created": len(notifications_created),
        "notifications": notifications_created
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Letsm AI API", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== STATISTICS ====================

@api_router.get("/stats/overview")
async def get_stats_overview(user: dict = Depends(get_current_user)):
    """Get user productivity statistics overview"""
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    # Task statistics
    total_tasks = await db.tasks.count_documents({"user_id": user_id})
    completed_tasks = await db.tasks.count_documents({"user_id": user_id, "completed": True})
    pending_tasks = await db.tasks.count_documents({"user_id": user_id, "completed": False})
    
    # Tasks completed this week
    tasks_completed_this_week = await db.tasks.count_documents({
        "user_id": user_id,
        "completed": True,
        "completed_at": {"$gte": week_start.isoformat()}
    })
    
    # High priority pending tasks
    high_priority_pending = await db.tasks.count_documents({
        "user_id": user_id,
        "completed": False,
        "priority": "high"
    })
    
    # Reminder statistics
    total_reminders = await db.reminders.count_documents({"user_id": user_id})
    active_reminders = await db.reminders.count_documents({"user_id": user_id, "active": True})
    
    # Conversation statistics
    total_conversations = await db.conversations.count_documents({"user_id": user_id})
    total_messages = await db.messages.count_documents({"user_id": user_id})
    
    # Messages this week
    messages_this_week = await db.messages.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": week_start.isoformat()}
    })
    
    # Calendar events
    total_events = await db.calendar_events.count_documents({"user_id": user_id})
    upcoming_events = await db.calendar_events.count_documents({
        "user_id": user_id,
        "start_time": {"$gte": now.isoformat()}
    })
    
    # Completion rate
    completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
    
    return {
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "pending": pending_tasks,
            "completed_this_week": tasks_completed_this_week,
            "high_priority_pending": high_priority_pending,
            "completion_rate": completion_rate
        },
        "reminders": {
            "total": total_reminders,
            "active": active_reminders
        },
        "conversations": {
            "total": total_conversations,
            "total_messages": total_messages,
            "messages_this_week": messages_this_week
        },
        "calendar": {
            "total_events": total_events,
            "upcoming_events": upcoming_events
        }
    }

@api_router.get("/stats/activity")
async def get_activity_stats(user: dict = Depends(get_current_user), days: int = 7):
    """Get daily activity for the past N days"""
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    
    daily_stats = []
    
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        # Tasks created/completed on this day
        tasks_created = await db.tasks.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        
        tasks_completed = await db.tasks.count_documents({
            "user_id": user_id,
            "completed_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        
        # Messages sent
        messages_sent = await db.messages.count_documents({
            "user_id": user_id,
            "role": "user",
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        
        # Reminders set
        reminders_set = await db.reminders.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        
        daily_stats.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "day_name": day_start.strftime("%a"),
            "tasks_created": tasks_created,
            "tasks_completed": tasks_completed,
            "messages_sent": messages_sent,
            "reminders_set": reminders_set
        })
    
    return {"daily_activity": daily_stats}

@api_router.get("/stats/streaks")
async def get_streaks(user: dict = Depends(get_current_user)):
    """Get productivity streaks"""
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    
    # Calculate current streak (consecutive days with at least one completed task)
    current_streak = 0
    max_streak = 0
    temp_streak = 0
    
    for i in range(30):  # Check last 30 days
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        completed_on_day = await db.tasks.count_documents({
            "user_id": user_id,
            "completed_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        
        if completed_on_day > 0:
            temp_streak += 1
            if i == 0 or (i > 0 and current_streak == temp_streak - 1):
                current_streak = temp_streak
        else:
            if temp_streak > max_streak:
                max_streak = temp_streak
            if i == 0:
                current_streak = 0
            temp_streak = 0
    
    if temp_streak > max_streak:
        max_streak = temp_streak
    
    return {
        "current_streak": current_streak,
        "max_streak": max(max_streak, current_streak),
        "streak_unit": "days"
    }

# ==================== DATA EXPORT ====================

@api_router.get("/export/tasks")
async def export_tasks(user: dict = Depends(get_current_user)):
    """Export all user tasks as JSON"""
    tasks = await db.tasks.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return {"tasks": tasks, "count": len(tasks), "exported_at": datetime.now(timezone.utc).isoformat()}

@api_router.get("/export/reminders")
async def export_reminders(user: dict = Depends(get_current_user)):
    """Export all user reminders as JSON"""
    reminders = await db.reminders.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return {"reminders": reminders, "count": len(reminders), "exported_at": datetime.now(timezone.utc).isoformat()}

@api_router.get("/export/conversations")
async def export_conversations(user: dict = Depends(get_current_user)):
    """Export all user conversations with messages as JSON"""
    conversations = await db.conversations.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    result = []
    for conv in conversations:
        messages = await db.messages.find(
            {"conversation_id": conv["conversation_id"]},
            {"_id": 0}
        ).sort("created_at", 1).to_list(500)
        result.append({**conv, "messages": messages})

    return {"conversations": result, "count": len(result), "exported_at": datetime.now(timezone.utc).isoformat()}

@api_router.get("/export/all")
async def export_all_data(user: dict = Depends(get_current_user)):
    """Export all user data (tasks, reminders, conversations)"""
    tasks = await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    reminders = await db.reminders.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    conversations = await db.conversations.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)

    conv_data = []
    for conv in conversations:
        messages = await db.messages.find({"conversation_id": conv["conversation_id"]}, {"_id": 0}).sort("created_at", 1).to_list(500)
        conv_data.append({**conv, "messages": messages})

    return {
        "user": {"email": user["email"], "name": user.get("name")},
        "tasks": {"data": tasks, "count": len(tasks)},
        "reminders": {"data": reminders, "count": len(reminders)},
        "conversations": {"data": conv_data, "count": len(conv_data)},
        "exported_at": datetime.now(timezone.utc).isoformat()
    }

# ==================== STRIPE / SUBSCRIPTIONS ====================

class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    plans = []
    for plan_id, plan in SUBSCRIPTION_PLANS.items():
        plans.append({
            "plan_id": plan_id,
            "name": plan["name"],
            "price": plan["price"],
            "currency": plan["currency"],
            "features": plan["features"]
        })
    return {"plans": plans}

@api_router.get("/subscription/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    """Get current user subscription status"""
    user_id = user["user_id"]
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    subscription = user_doc.get("subscription", "free")
    plan = SUBSCRIPTION_PLANS.get(subscription, SUBSCRIPTION_PLANS["free"])
    return {
        "plan_id": subscription,
        "plan_name": plan["name"],
        "price": plan["price"],
        "features": plan["features"],
        "limits": plan["limits"]
    }

@api_router.post("/subscription/checkout")
async def create_checkout_session(request: Request, body: CheckoutRequest, user: dict = Depends(get_current_user)):
    """Create a Stripe checkout session for subscription"""
    plan_id = body.plan_id
    origin_url = body.origin_url

    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = SUBSCRIPTION_PLANS[plan_id]
    if plan["price"] <= 0:
        raise HTTPException(status_code=400, detail="Free plan doesn't require payment")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{origin_url}/dashboard/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/dashboard/profile"

    metadata = {
        "user_id": user["user_id"],
        "plan_id": plan_id,
        "user_email": user["email"]
    }

    checkout_request = CheckoutSessionRequest(
        amount=plan["price"],
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )

    session = await stripe_checkout.create_checkout_session(checkout_request)

    # Create payment transaction record
    transaction = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "email": user["email"],
        "plan_id": plan_id,
        "amount": plan["price"],
        "currency": plan["currency"],
        "payment_status": "initiated",
        "status": "pending",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)

    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/subscription/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Check status of a checkout session and update subscription if paid"""
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    checkout_status = await stripe_checkout.get_checkout_status(session_id)

    # Find the transaction
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Update transaction status
    update_data = {
        "payment_status": checkout_status.payment_status,
        "status": checkout_status.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    # If paid and not already processed, upgrade user
    if checkout_status.payment_status == "paid" and transaction.get("payment_status") != "paid":
        plan_id = transaction.get("plan_id") or checkout_status.metadata.get("plan_id", "pro")
        await db.users.update_one(
            {"user_id": transaction["user_id"]},
            {"$set": {"subscription": plan_id, "subscription_updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        update_data["processed"] = True
        logger.info(f"User {transaction['user_id']} upgraded to {plan_id}")

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": update_data}
    )

    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total,
        "currency": checkout_status.currency,
        "plan_id": transaction.get("plan_id")
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")

        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

        webhook_response = await stripe_checkout.handle_webhook(body, signature)

        if webhook_response.payment_status == "paid":
            transaction = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )
            if transaction and transaction.get("payment_status") != "paid":
                plan_id = transaction.get("plan_id", "pro")
                await db.users.update_one(
                    {"user_id": transaction["user_id"]},
                    {"$set": {"subscription": plan_id, "subscription_updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "complete",
                        "processed": True,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"Webhook: User {transaction['user_id']} upgraded to {plan_id}")

        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"received": True, "error": str(e)}

# ==================== GUEST CHAT (No Auth) ====================

# Simple in-memory rate limiting for guest chat
guest_rate_limits = {}

class GuestChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@api_router.post("/guest/chat")
async def guest_chat(request: Request, body: GuestChatRequest):
    """AI chat endpoint for landing page visitors (no auth required, rate limited)"""
    # Get client IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"
    now = datetime.now(timezone.utc)

    # Rate limit: 10 messages per 5 minutes per IP
    if client_ip in guest_rate_limits:
        entries = [t for t in guest_rate_limits[client_ip] if (now - t).total_seconds() < 300]
        guest_rate_limits[client_ip] = entries
        if len(entries) >= 10:
            return {"response": "You've reached the message limit. Please sign up for unlimited conversations!", "limited": True}
    else:
        guest_rate_limits[client_ip] = []

    guest_rate_limits[client_ip].append(now)

    session_id = body.session_id or f"guest_{uuid.uuid4().hex[:8]}"

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="""You are Letsm AI, a helpful AI assistant on the landing page. You are chatting with a potential customer who hasn't signed up yet.

Be friendly, helpful, and demonstrate your capabilities. Show them how you can:
- Create tasks and reminders from natural language
- Help with scheduling and productivity
- Understand context and preferences
- Support Arabic and English

Keep responses concise (2-3 sentences). Encourage them to sign up for the full experience.

IMPORTANT: If the user writes in Arabic, respond in Arabic. Match their language.
أنت مساعد ذكي يدعم اللغة العربية. إذا كتب المستخدم بالعربية، أجب بالعربية."""
        )
        chat.with_model("openai", "gpt-5.2")
        user_message = UserMessage(text=body.message)
        ai_response = await chat.send_message(user_message)

        return {
            "response": ai_response,
            "session_id": session_id,
            "limited": False
        }
    except Exception as e:
        logger.error(f"Guest chat error: {str(e)}")
        if "budget" in str(e).lower() or "exceeded" in str(e).lower():
            return {"response": "The AI service is temporarily at capacity. Please sign up and try again!", "limited": True}
        return {"response": "I'd love to chat! Please sign up to start your AI-powered productivity journey.", "limited": True}

# ==================== WHATSAPP AI ENDPOINT (for Node.js service) ====================

class WhatsAppAIRequest(BaseModel):
    phone_number: str
    message: str

@api_router.post("/whatsapp/ai")
async def whatsapp_ai_process(body: WhatsAppAIRequest):
    """Process incoming WhatsApp message with AI and return response (called by Node.js service)"""
    session_id = f"wa_{body.phone_number}"

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="""You are Letsm AI, a WhatsApp-based AI assistant. Users are chatting with you via WhatsApp.

You help with:
- Task management (create, list, complete tasks)
- Reminders (set and manage)
- General questions and productivity tips
- Scheduling assistance

Keep responses short and WhatsApp-friendly (use *bold* for emphasis, avoid long paragraphs).
If the user writes in Arabic, respond in Arabic. Match their language.

أنت مساعد ذكي عبر واتساب. إذا كتب المستخدم بالعربية، أجب بالعربية."""
        )
        chat.with_model("openai", "gpt-5.2")
        user_message = UserMessage(text=body.message)
        ai_response = await chat.send_message(user_message)

        # Log the WhatsApp conversation
        await db.whatsapp_messages.insert_one({
            "phone_number": body.phone_number,
            "user_message": body.message,
            "ai_response": ai_response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"response": ai_response, "success": True}
    except Exception as e:
        logger.error(f"WhatsApp AI error: {str(e)}")
        return {"response": "I'm having trouble right now. Please try again in a moment.", "success": False}

# ==================== EMAIL DIGEST ====================

class EmailPreferences(BaseModel):
    weekly_digest: Optional[bool] = True
    reminder_alerts: Optional[bool] = True

@api_router.get("/email/preferences")
async def get_email_preferences(user: dict = Depends(get_current_user)):
    """Get user email notification preferences"""
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    prefs = user_doc.get("email_preferences", {"weekly_digest": True, "reminder_alerts": True})
    return {"preferences": prefs}

@api_router.put("/email/preferences")
async def update_email_preferences(prefs: EmailPreferences, user: dict = Depends(get_current_user)):
    """Update user email notification preferences"""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_preferences": prefs.dict()}}
    )
    return {"message": "Preferences updated", "preferences": prefs.dict()}

async def generate_digest_html(user_id: str, user_email: str, user_name: str) -> str:
    """Generate weekly productivity digest HTML for a user"""
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    tasks_created = await db.tasks.count_documents({"user_id": user_id, "created_at": {"$gte": week_ago}})
    tasks_completed = await db.tasks.count_documents({"user_id": user_id, "status": "completed"})
    pending_tasks = await db.tasks.count_documents({"user_id": user_id, "status": {"$ne": "completed"}})
    active_reminders = await db.reminders.count_documents({"user_id": user_id, "status": "active"})
    conversations = await db.conversations.count_documents({"user_id": user_id, "created_at": {"$gte": week_ago}})
    messages_sent = await db.messages.count_documents({"user_id": user_id, "role": "user", "created_at": {"$gte": week_ago}})

    upcoming_tasks = await db.tasks.find(
        {"user_id": user_id, "status": {"$ne": "completed"}}, {"_id": 0}
    ).sort("created_at", -1).to_list(5)

    upcoming_html = ""
    for t in upcoming_tasks:
        priority_color = "#ef4444" if t.get("priority") == "high" else "#f59e0b" if t.get("priority") == "medium" else "#22c55e"
        upcoming_html += f'<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{priority_color};margin-right:8px;"></span>{t["title"]}</td></tr>'

    if not upcoming_html:
        upcoming_html = '<tr><td style="padding:8px 0;color:#94a3b8;">No pending tasks - great job!</td></tr>'

    rate = round((tasks_completed / tasks_created * 100) if tasks_created > 0 else 0)
    name = user_name or "there"

    html = f'''<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
<div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
<h1 style="color:white;margin:0;font-size:24px;">Letsm AI Weekly Digest</h1>
<p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">Hi {name}, here's your productivity summary</p></div>
<div style="background:white;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
<h2 style="color:#1e293b;font-size:18px;margin:0 0 16px;">This Week at a Glance</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr>
<td style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;width:33%;"><div style="font-size:28px;font-weight:bold;color:#16a34a;">{tasks_completed}</div><div style="font-size:12px;color:#4ade80;">Tasks Done</div></td>
<td style="width:8px;"></td>
<td style="background:#eff6ff;border-radius:12px;padding:16px;text-align:center;width:33%;"><div style="font-size:28px;font-weight:bold;color:#2563eb;">{tasks_created}</div><div style="font-size:12px;color:#60a5fa;">Created</div></td>
<td style="width:8px;"></td>
<td style="background:#faf5ff;border-radius:12px;padding:16px;text-align:center;width:33%;"><div style="font-size:28px;font-weight:bold;color:#7c3aed;">{rate}%</div><div style="font-size:12px;color:#a78bfa;">Rate</div></td></tr></table>
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr>
<td style="background:#fff7ed;border-radius:12px;padding:16px;text-align:center;width:33%;"><div style="font-size:28px;font-weight:bold;color:#ea580c;">{conversations}</div><div style="font-size:12px;color:#fb923c;">Chats</div></td>
<td style="width:8px;"></td>
<td style="background:#fdf2f8;border-radius:12px;padding:16px;text-align:center;width:33%;"><div style="font-size:28px;font-weight:bold;color:#db2777;">{messages_sent}</div><div style="font-size:12px;color:#f472b6;">Messages</div></td>
<td style="width:8px;"></td>
<td style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center;width:33%;"><div style="font-size:28px;font-weight:bold;color:#0284c7;">{active_reminders}</div><div style="font-size:12px;color:#38bdf8;">Reminders</div></td></tr></table>
<h2 style="color:#1e293b;font-size:18px;margin:24px 0 12px;">Upcoming Tasks ({pending_tasks} pending)</h2>
<table style="width:100%;">{upcoming_html}</table>
<div style="margin-top:32px;text-align:center;"><a href="#" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;text-decoration:none;border-radius:50px;font-weight:600;font-size:14px;">Open Letsm AI</a></div></div>
<p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">You're receiving this because you opted in to weekly digests.</p></div>
</body></html>'''
    return html

@api_router.post("/email/send-digest")
async def send_weekly_digest(user: dict = Depends(get_current_user)):
    """Send weekly productivity digest email to current user"""
    if not RESEND_API_KEY:
        return {"success": False, "message": "Email service not configured. Add RESEND_API_KEY to backend .env file."}

    html = await generate_digest_html(user["user_id"], user["email"], user.get("name", ""))

    try:
        params = {
            "from": f"Letsm AI <{SENDER_EMAIL}>",
            "to": [user["email"]],
            "subject": "Your Weekly Productivity Digest - Letsm AI",
            "html": html
        }
        email_response = resend.Emails.send(params)
        logger.info(f"Digest sent to {user['email']}: {email_response}")
        return {"success": True, "message": "Digest email sent!", "email_id": email_response.get("id")}
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        return {"success": False, "message": str(e)}

@api_router.post("/email/preview-digest")
async def preview_digest(user: dict = Depends(get_current_user)):
    """Preview the weekly digest HTML without sending"""
    html = await generate_digest_html(user["user_id"], user["email"], user.get("name", ""))
    return {"html": html}


# ==================== WHATSAPP PROXY ====================

WHATSAPP_SERVICE_URL = "http://localhost:3001"

@api_router.get("/whatsapp/status")
async def get_whatsapp_status(user: dict = Depends(get_current_user)):
    """Get WhatsApp connection status from Node.js service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status", timeout=5.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp service error: {str(e)}")
        return {"connected": False, "error": "WhatsApp service unavailable"}

@api_router.get("/whatsapp/qr")
async def get_whatsapp_qr(user: dict = Depends(get_current_user)):
    """Get QR code for WhatsApp connection"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/qr", timeout=5.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp QR error: {str(e)}")
        return {"qr": None, "message": "WhatsApp service unavailable. Please try again."}

@api_router.post("/whatsapp/send")
async def send_whatsapp_message(request: Request, user: dict = Depends(get_current_user)):
    """Send a WhatsApp message"""
    body = await request.json()
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json=body,
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp send error: {str(e)}")
        return {"success": False, "error": str(e)}

@api_router.post("/whatsapp/connect")
async def connect_whatsapp(user: dict = Depends(get_current_user)):
    """Trigger a new WhatsApp connection and QR code generation"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/connect", timeout=15.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp connect error: {str(e)}")
        return {"success": False, "error": "WhatsApp service unavailable"}

@api_router.post("/whatsapp/disconnect")
async def disconnect_whatsapp(user: dict = Depends(get_current_user)):
    """Disconnect WhatsApp session"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/disconnect", timeout=5.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp disconnect error: {str(e)}")
        return {"success": False, "error": str(e)}

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
