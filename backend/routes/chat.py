"""
Chat route — AI conversations with NLP task/reminder management.
Refactored: complex parsers split into focused helpers.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db, EMERGENT_LLM_KEY, SUBSCRIPTION_PLANS
from auth_helpers import get_current_user
from models import ChatMessageCreate, ChatMessageResponse, ConversationResponse, GuestChatRequest
import re
import uuid
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)
chat_router = APIRouter(prefix="/api")

guest_rate_limits = {}

# ── Keyword dictionaries ──
LIST_TASK_KW = [
    'show my tasks', 'list tasks', 'my tasks', 'what are my tasks', 'show tasks', 'pending tasks',
    'اعرض مهامي', 'قائمة المهام', 'مهامي', 'ما هي مهامي', 'المهام المعلقة', 'اظهر المهام'
]
COMPLETE_TASK_PATTERNS = [
    r'complete task (\d+)', r'finish task (\d+)', r'done with task (\d+)',
    r'mark task (\d+)', r'task (\d+) done', r'task (\d+) complete',
    r'أكمل المهمة (\d+)', r'انهي المهمة (\d+)', r'المهمة (\d+) منتهية', r'أنجز المهمة (\d+)'
]
LIST_REMINDER_KW = [
    'show my reminders', 'list reminders', 'my reminders', 'what reminders', 'show reminders', 'upcoming reminders',
    'اعرض تذكيراتي', 'قائمة التذكيرات', 'تذكيراتي', 'التذكيرات القادمة', 'اظهر التذكيرات'
]
CANCEL_REMINDER_PATTERNS = [
    r'cancel reminder (\d+)', r'delete reminder (\d+)', r'remove reminder (\d+)',
    r'احذف التذكير (\d+)', r'الغي التذكير (\d+)', r'امسح التذكير (\d+)'
]
TASK_INTENT_KW = [
    'create task', 'add task', 'new task', 'make a task', 'todo:', 'task:',
    'أنشئ مهمة', 'اضف مهمة', 'مهمة جديدة', 'مهمة:'
]
REMINDER_INTENT_KW = [
    'remind me', 'set reminder', 'create reminder', 'add reminder', 'reminder:',
    'ذكرني', 'اضف تذكير', 'انشئ تذكير', 'تذكير:'
]


# ── Small focused helpers ──

async def _handle_list_tasks(user_id: str) -> str:
    tasks = await db.tasks.find({"user_id": user_id, "completed": False}, {"_id": 0}).sort("created_at", -1).to_list(10)
    if not tasks:
        return "\n\n📋 **مهامك / Your Tasks**: لا توجد مهام معلقة! / No pending tasks!"
    lines = "\n\n📋 **المهام المعلقة / Pending Tasks:**\n"
    for i, t in enumerate(tasks, 1):
        icon = "🔴" if t["priority"] == "high" else "🟡" if t["priority"] == "medium" else "🟢"
        due = f" (Due: {datetime.fromisoformat(t['due_date']).strftime('%b %d')})" if t.get("due_date") else ""
        lines += f"{i}. {icon} {t['title']}{due}\n"
    return lines + '\n_Say "complete task [number]" / قل "أكمل المهمة [رقم]"_'


async def _handle_complete_task(user_id: str, task_num: int) -> str:
    tasks = await db.tasks.find({"user_id": user_id, "completed": False}, {"_id": 0}).sort("created_at", -1).to_list(100)
    if task_num < 1 or task_num > len(tasks):
        return f"\n\n❌ Invalid task number. You have {len(tasks)} pending tasks."
    task = tasks[task_num - 1]
    await db.tasks.update_one({"task_id": task["task_id"]}, {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}})
    return f'\n\n✅ **Task completed**: "{task["title"]}"'


async def _handle_list_reminders(user_id: str) -> str:
    rems = await db.reminders.find({"user_id": user_id, "active": True}, {"_id": 0}).sort("reminder_time", 1).to_list(10)
    if not rems:
        return "\n\n🔔 **تذكيراتك / Your Reminders**: لا توجد تذكيرات نشطة / No active reminders."
    lines = "\n\n🔔 **التذكيرات القادمة / Upcoming Reminders:**\n"
    for i, r in enumerate(rems, 1):
        lines += f"{i}. {r['title']} - {datetime.fromisoformat(r['reminder_time']).strftime('%b %d at %I:%M %p')}\n"
    return lines


async def _handle_cancel_reminder(user_id: str, rem_num: int) -> str:
    rems = await db.reminders.find({"user_id": user_id, "active": True}, {"_id": 0}).sort("reminder_time", 1).to_list(100)
    if rem_num < 1 or rem_num > len(rems):
        return f"\n\n❌ Invalid reminder number. You have {len(rems)} active reminders."
    rem = rems[rem_num - 1]
    await db.reminders.delete_one({"reminder_id": rem["reminder_id"]})
    return f'\n\n🗑️ **Reminder cancelled**: "{rem["title"]}"'


def _extract_title(message: str, lower: str, keywords: list) -> str:
    """Extract title from message after matching keyword."""
    for kw in keywords:
        if kw in lower:
            title = message[lower.find(kw) + len(kw):].strip()
            return title[1:].strip() if title.startswith(':') or title.startswith('to ') else title
    return message


def _detect_priority(lower: str) -> str:
    if any(w in lower for w in ['urgent', 'important', 'asap', 'critical', 'high priority']):
        return "high"
    if any(w in lower for w in ['low priority', 'whenever', 'someday']):
        return "low"
    return "medium"


def _parse_due_date(lower: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if 'tomorrow' in lower:
        return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0)
    if 'today' in lower:
        return now.replace(hour=18, minute=0, second=0)
    if 'next week' in lower:
        return (now + timedelta(days=7)).replace(hour=9, minute=0, second=0)
    return None


def _parse_reminder_time(lower: str) -> datetime:
    rt = datetime.now(timezone.utc) + timedelta(hours=1)
    m = re.search(r'at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?', lower, re.IGNORECASE)
    if m:
        hour, minute = int(m.group(1)), int(m.group(2) or 0)
        ampm = m.group(3)
        if ampm and ampm.lower() == 'pm' and hour < 12:
            hour += 12
        elif ampm and ampm.lower() == 'am' and hour == 12:
            hour = 0
        rt = rt.replace(hour=hour, minute=minute, second=0)
    if 'tomorrow' in lower:
        rt += timedelta(days=1)
    elif 'next week' in lower:
        rt += timedelta(days=7)
    for period, h in [('morning', 9), ('afternoon', 14), ('evening', 18), ('night', 21)]:
        if period in lower:
            rt = rt.replace(hour=h, minute=0)
            break
    return rt


# ── Main action dispatcher ──

async def parse_and_execute_chat_action(user_message: str, user: dict) -> Optional[str]:
    lower = user_message.lower().strip()
    uid = user["user_id"]

    if any(kw in lower for kw in LIST_TASK_KW):
        return await _handle_list_tasks(uid)

    for p in COMPLETE_TASK_PATTERNS:
        m = re.search(p, lower)
        if m:
            return await _handle_complete_task(uid, int(m.group(1)))

    if any(kw in lower for kw in LIST_REMINDER_KW):
        return await _handle_list_reminders(uid)

    for p in CANCEL_REMINDER_PATTERNS:
        m = re.search(p, lower)
        if m:
            return await _handle_cancel_reminder(uid, int(m.group(1)))

    return None


async def parse_and_create_from_ai(user_message: str, user: dict, ai_response: str) -> Optional[str]:
    lower = user_message.lower()

    if any(kw in lower for kw in TASK_INTENT_KW):
        title = _extract_title(user_message, lower, TASK_INTENT_KW)
        if title and len(title) > 2:
            priority = _detect_priority(lower)
            due = _parse_due_date(lower)
            tid = f"task_{uuid.uuid4().hex[:12]}"
            await db.tasks.insert_one({
                "task_id": tid, "user_id": user["user_id"],
                "title": title[:100], "description": f"Created from chat: {user_message[:200]}",
                "due_date": due.isoformat() if due else None,
                "priority": priority, "completed": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            result = f'\n\n✅ **Task created**: "{title[:50]}" (Priority: {priority})'
            return result + f" - Due: {due.strftime('%b %d, %Y')}" if due else result

    elif any(kw in lower for kw in REMINDER_INTENT_KW):
        title = _extract_title(user_message, lower, REMINDER_INTENT_KW)
        if title and len(title) > 2:
            rt = _parse_reminder_time(lower)
            rid = f"rem_{uuid.uuid4().hex[:12]}"
            await db.reminders.insert_one({
                "reminder_id": rid, "user_id": user["user_id"],
                "title": title[:100], "description": f"Created from chat: {user_message[:200]}",
                "reminder_time": rt.isoformat(), "repeat": "none",
                "active": True, "created_at": datetime.now(timezone.utc).isoformat()
            })
            return f'\n\n🔔 **Reminder set**: "{title[:50]}" - {rt.strftime("%b %d, %Y at %I:%M %p")}'

    return None


# ── Chat System Prompt ──
SYSTEM_PROMPT = """You are Letsm AI, a helpful and professional AI assistant. You help users with:
- Task management and productivity
- Scheduling and reminders
- General questions and assistance
- WhatsApp integration guidance

IMPORTANT LANGUAGE RULE: Always detect the user's language and respond in the SAME language. If the user writes in Arabic, respond in Arabic. If they write in English, respond in English.

أنت مساعد ذكي يدعم اللغة العربية بشكل كامل. إذا كتب المستخدم بالعربية، أجب بالعربية.

Users can say (in any language):
- "Show my tasks" / "اعرض مهامي" to see pending tasks
- "Complete task 1" / "أكمل المهمة 1" to mark task as done
- "Show my reminders" / "اعرض تذكيراتي" to see upcoming reminders
- "Cancel reminder 1" / "احذف التذكير 1" to delete a reminder
- "Create task" / "أنشئ مهمة" to create a new task
- "Remind me" / "ذكرني" to set a reminder

Be concise, friendly, and helpful. Format your responses clearly."""


# ── Endpoints ──

@chat_router.post("/chat/message", response_model=ChatMessageResponse)
async def send_chat_message(message: ChatMessageCreate, user: dict = Depends(get_current_user)):
    # Rate limit
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    subscription = user_doc.get("subscription", "free") if user_doc else "free"
    plan = SUBSCRIPTION_PLANS.get(subscription, SUBSCRIPTION_PLANS["free"])
    daily_limit = plan["limits"].get("max_messages_daily", 10)
    if daily_limit > 0:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        count = await db.messages.count_documents({"user_id": user["user_id"], "role": "user", "created_at": {"$gte": today.isoformat()}})
        if count >= daily_limit:
            raise HTTPException(status_code=429, detail=f"Daily message limit reached ({daily_limit}). Upgrade your plan for more messages.")

    conv_id = message.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
    conv = await db.conversations.find_one({"conversation_id": conv_id, "user_id": user["user_id"]}, {"_id": 0})
    if not conv:
        await db.conversations.insert_one({
            "conversation_id": conv_id, "user_id": user["user_id"],
            "title": message.message[:50] + ("..." if len(message.message) > 50 else ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })

    await db.messages.insert_one({
        "message_id": f"msg_{uuid.uuid4().hex[:12]}", "conversation_id": conv_id,
        "user_id": user["user_id"], "role": "user", "content": message.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    try:
        direct = await parse_and_execute_chat_action(message.message, user)
        if direct:
            ai_response = "Sure!" + direct
        else:
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=conv_id, system_message=SYSTEM_PROMPT)
            chat.with_model("openai", "gpt-4o-mini")
            ai_response = await chat.send_message(UserMessage(text=message.message))
            action = await parse_and_create_from_ai(message.message, user, ai_response)
            if action:
                ai_response += action
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        ai_response = "I encountered an issue. Please try again." if "budget" not in str(e).lower() else \
            "AI service temporarily unavailable due to budget limits. Please try again later or contact support."

    ai_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.messages.insert_one({
        "message_id": ai_msg_id, "conversation_id": conv_id,
        "user_id": user["user_id"], "role": "assistant", "content": ai_response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.conversations.update_one({"conversation_id": conv_id}, {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})

    return ChatMessageResponse(message_id=ai_msg_id, conversation_id=conv_id, role="assistant", content=ai_response, created_at=datetime.now(timezone.utc))


@chat_router.get("/chat/conversations", response_model=List[ConversationResponse])
async def get_conversations(user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return [ConversationResponse(
        conversation_id=c["conversation_id"], title=c["title"],
        created_at=datetime.fromisoformat(c["created_at"]) if isinstance(c["created_at"], str) else c["created_at"],
        updated_at=datetime.fromisoformat(c["updated_at"]) if isinstance(c["updated_at"], str) else c["updated_at"]
    ) for c in convs]


@chat_router.get("/chat/conversations/{conversation_id}/messages", response_model=List[ChatMessageResponse])
async def get_conversation_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.messages.find({"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [ChatMessageResponse(
        message_id=m["message_id"], conversation_id=m["conversation_id"], role=m["role"], content=m["content"],
        created_at=datetime.fromisoformat(m["created_at"]) if isinstance(m["created_at"], str) else m["created_at"]
    ) for m in msgs]


@chat_router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    await db.conversations.delete_one({"conversation_id": conversation_id, "user_id": user["user_id"]})
    await db.messages.delete_many({"conversation_id": conversation_id, "user_id": user["user_id"]})
    return {"message": "Conversation deleted"}


@chat_router.post("/guest/chat")
async def guest_chat(request: Request, body: GuestChatRequest):
    client_ip = request.client.host if request.client else "unknown"
    now = datetime.now(timezone.utc)
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
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id,
            system_message="You are Letsm AI on the landing page. Be friendly, concise (2-3 sentences). Show capabilities. Match user's language. Encourage signup.")
        chat.with_model("openai", "gpt-4o-mini")
        ai_response = await chat.send_message(UserMessage(text=body.message))
        return {"response": ai_response, "session_id": session_id, "limited": False}
    except Exception as e:
        logger.error(f"Guest chat error: {e}")
        return {"response": "I'd love to chat! Please sign up to start.", "limited": True}
