from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone, timedelta
from database import db, EMERGENT_LLM_KEY, SUBSCRIPTION_PLANS
from auth_helpers import get_current_user
from models import ChatMessageCreate, ChatMessageResponse, ConversationResponse, GuestChatRequest
from typing import Optional
from fastapi import Request
import re
import uuid
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)
chat_router = APIRouter(prefix="/api")

# Simple in-memory rate limiting for guest chat
guest_rate_limits = {}


async def parse_and_execute_chat_action(user_message: str, user: dict) -> Optional[str]:
    """Parse user message for task/reminder actions and execute them"""
    lower_msg = user_message.lower().strip()

    # ===== LIST TASKS (English + Arabic) =====
    list_task_keywords = [
        'show my tasks', 'list tasks', 'my tasks', 'what are my tasks', 'show tasks', 'pending tasks',
        'اعرض مهامي', 'قائمة المهام', 'مهامي', 'ما هي مهامي', 'المهام المعلقة', 'اظهر المهام'
    ]
    if any(kw in lower_msg for kw in list_task_keywords):
        tasks = await db.tasks.find(
            {"user_id": user["user_id"], "completed": False}, {"_id": 0}
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
        task_list += '\n_Say "complete task [number]" / قل "أكمل المهمة [رقم]"_'
        return task_list

    # ===== COMPLETE TASK (English + Arabic) =====
    complete_patterns = [
        r'complete task (\d+)', r'finish task (\d+)', r'done with task (\d+)',
        r'mark task (\d+)', r'task (\d+) done', r'task (\d+) complete',
        r'أكمل المهمة (\d+)', r'انهي المهمة (\d+)', r'المهمة (\d+) منتهية', r'أنجز المهمة (\d+)'
    ]
    for pattern in complete_patterns:
        match = re.search(pattern, lower_msg)
        if match:
            task_num = int(match.group(1))
            tasks = await db.tasks.find(
                {"user_id": user["user_id"], "completed": False}, {"_id": 0}
            ).sort("created_at", -1).to_list(100)

            if task_num < 1 or task_num > len(tasks):
                return f"\n\n❌ Invalid task number. You have {len(tasks)} pending tasks."

            task_to_complete = tasks[task_num - 1]
            await db.tasks.update_one(
                {"task_id": task_to_complete["task_id"]},
                {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}}
            )
            return f'\n\n✅ **Task completed**: "{task_to_complete["title"]}"'

    # ===== LIST REMINDERS =====
    list_reminder_keywords = [
        'show my reminders', 'list reminders', 'my reminders', 'what reminders', 'show reminders', 'upcoming reminders',
        'اعرض تذكيراتي', 'قائمة التذكيرات', 'تذكيراتي', 'التذكيرات القادمة', 'اظهر التذكيرات'
    ]
    if any(kw in lower_msg for kw in list_reminder_keywords):
        reminders = await db.reminders.find(
            {"user_id": user["user_id"], "active": True}, {"_id": 0}
        ).sort("reminder_time", 1).to_list(10)

        if not reminders:
            return "\n\n🔔 **تذكيراتك / Your Reminders**: لا توجد تذكيرات نشطة / No active reminders."

        reminder_list = "\n\n🔔 **التذكيرات القادمة / Upcoming Reminders:**\n"
        for i, rem in enumerate(reminders, 1):
            rem_time = datetime.fromisoformat(rem["reminder_time"])
            reminder_list += f"{i}. {rem['title']} - {rem_time.strftime('%b %d at %I:%M %p')}\n"
        return reminder_list

    # ===== DELETE/CANCEL REMINDER =====
    cancel_patterns = [
        r'cancel reminder (\d+)', r'delete reminder (\d+)', r'remove reminder (\d+)',
        r'احذف التذكير (\d+)', r'الغي التذكير (\d+)', r'امسح التذكير (\d+)'
    ]
    for pattern in cancel_patterns:
        match = re.search(pattern, lower_msg)
        if match:
            rem_num = int(match.group(1))
            reminders = await db.reminders.find(
                {"user_id": user["user_id"], "active": True}, {"_id": 0}
            ).sort("reminder_time", 1).to_list(100)

            if rem_num < 1 or rem_num > len(reminders):
                return f"\n\n❌ Invalid reminder number. You have {len(reminders)} active reminders."

            rem_to_delete = reminders[rem_num - 1]
            await db.reminders.delete_one({"reminder_id": rem_to_delete["reminder_id"]})
            return f'\n\n🗑️ **Reminder cancelled**: "{rem_to_delete["title"]}"'

    return None


async def parse_and_create_from_ai(user_message: str, user: dict, ai_response: str) -> Optional[str]:
    """Parse AI response for task/reminder creation commands and execute them"""
    lower_msg = user_message.lower()

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
        title = user_message
        for kw in task_keywords:
            if kw in lower_msg:
                idx = lower_msg.find(kw) + len(kw)
                title = user_message[idx:].strip()
                if title.startswith(':'):
                    title = title[1:].strip()
                break

        if title and len(title) > 2:
            priority = "medium"
            if any(w in lower_msg for w in ['urgent', 'important', 'asap', 'critical', 'high priority']):
                priority = "high"
            elif any(w in lower_msg for w in ['low priority', 'whenever', 'someday']):
                priority = "low"

            due_date = None
            now = datetime.now(timezone.utc)
            if 'tomorrow' in lower_msg:
                due_date = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0)
            elif 'today' in lower_msg:
                due_date = now.replace(hour=18, minute=0, second=0)
            elif 'next week' in lower_msg:
                due_date = (now + timedelta(days=7)).replace(hour=9, minute=0, second=0)

            task_id = f"task_{uuid.uuid4().hex[:12]}"
            task_doc = {
                "task_id": task_id, "user_id": user["user_id"],
                "title": title[:100], "description": f"Created from chat: {user_message[:200]}",
                "due_date": due_date.isoformat() if due_date else None,
                "priority": priority, "completed": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.tasks.insert_one(task_doc)
            action_taken = f'\n\n✅ **Task created**: "{title[:50]}" (Priority: {priority})'
            if due_date:
                action_taken += f" - Due: {due_date.strftime('%b %d, %Y')}"
            return action_taken

    elif has_reminder_intent:
        title = user_message
        for kw in reminder_keywords:
            if kw in lower_msg:
                idx = lower_msg.find(kw) + len(kw)
                title = user_message[idx:].strip()
                if title.startswith('to '):
                    title = title[3:].strip()
                break

        if title and len(title) > 2:
            reminder_time = datetime.now(timezone.utc) + timedelta(hours=1)

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

            if 'tomorrow' in lower_msg:
                reminder_time = reminder_time + timedelta(days=1)
            elif 'next week' in lower_msg:
                reminder_time = reminder_time + timedelta(days=7)

            if 'morning' in lower_msg:
                reminder_time = reminder_time.replace(hour=9, minute=0)
            elif 'afternoon' in lower_msg:
                reminder_time = reminder_time.replace(hour=14, minute=0)
            elif 'evening' in lower_msg:
                reminder_time = reminder_time.replace(hour=18, minute=0)
            elif 'night' in lower_msg:
                reminder_time = reminder_time.replace(hour=21, minute=0)

            reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
            reminder_doc = {
                "reminder_id": reminder_id, "user_id": user["user_id"],
                "title": title[:100], "description": f"Created from chat: {user_message[:200]}",
                "reminder_time": reminder_time.isoformat(), "repeat": "none",
                "active": True, "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.reminders.insert_one(reminder_doc)
            return f'\n\n🔔 **Reminder set**: "{title[:50]}" - {reminder_time.strftime("%b %d, %Y at %I:%M %p")}'

    return None


@chat_router.post("/chat/message", response_model=ChatMessageResponse)
async def send_chat_message(message: ChatMessageCreate, user: dict = Depends(get_current_user)):
    # Rate limit check
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    subscription = user_doc.get("subscription", "free") if user_doc else "free"
    plan = SUBSCRIPTION_PLANS.get(subscription, SUBSCRIPTION_PLANS["free"])
    daily_limit = plan["limits"].get("max_messages_daily", 10)

    if daily_limit > 0:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = await db.messages.count_documents({
            "user_id": user["user_id"], "role": "user",
            "created_at": {"$gte": today_start.isoformat()}
        })
        if today_count >= daily_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily message limit reached ({daily_limit}). Upgrade your plan for more messages."
            )

    conversation_id = message.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"

    conversation = await db.conversations.find_one(
        {"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}
    )

    if not conversation:
        await db.conversations.insert_one({
            "conversation_id": conversation_id, "user_id": user["user_id"],
            "title": message.message[:50] + "..." if len(message.message) > 50 else message.message,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })

    user_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.messages.insert_one({
        "message_id": user_msg_id, "conversation_id": conversation_id,
        "user_id": user["user_id"], "role": "user", "content": message.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    try:
        direct_action = await parse_and_execute_chat_action(message.message, user)

        if direct_action:
            ai_response = "Sure!" + direct_action
        else:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY, session_id=conversation_id,
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
            user_message_obj = UserMessage(text=message.message)
            ai_response = await chat.send_message(user_message_obj)

            action_result = await parse_and_create_from_ai(message.message, user, ai_response)
            if action_result:
                ai_response += action_result

    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        if "budget" in str(e).lower() or "exceeded" in str(e).lower():
            ai_response = "I apologize, but the AI service is temporarily unavailable due to budget limits. Please try again later or contact support to top up the Universal Key balance (Profile -> Universal Key -> Add Balance)."
        else:
            ai_response = f"I encountered an issue processing your request. Please try again. Error: {str(e)[:100]}"

    ai_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await db.messages.insert_one({
        "message_id": ai_msg_id, "conversation_id": conversation_id,
        "user_id": user["user_id"], "role": "assistant", "content": ai_response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return ChatMessageResponse(
        message_id=ai_msg_id, conversation_id=conversation_id,
        role="assistant", content=ai_response, created_at=datetime.now(timezone.utc)
    )


@chat_router.get("/chat/conversations", response_model=List[ConversationResponse])
async def get_conversations(user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find(
        {"user_id": user["user_id"]}, {"_id": 0}
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
            conversation_id=conv["conversation_id"], title=conv["title"],
            created_at=created_at, updated_at=updated_at
        ))
    return result


@chat_router.get("/chat/conversations/{conversation_id}/messages", response_model=List[ChatMessageResponse])
async def get_conversation_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)

    result = []
    for msg in messages:
        created_at = msg["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        result.append(ChatMessageResponse(
            message_id=msg["message_id"], conversation_id=msg["conversation_id"],
            role=msg["role"], content=msg["content"], created_at=created_at
        ))
    return result


@chat_router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    await db.conversations.delete_one({"conversation_id": conversation_id, "user_id": user["user_id"]})
    await db.messages.delete_many({"conversation_id": conversation_id, "user_id": user["user_id"]})
    return {"message": "Conversation deleted"}


@chat_router.post("/guest/chat")
async def guest_chat(request: Request, body: GuestChatRequest):
    """AI chat endpoint for landing page visitors (no auth required, rate limited)"""
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
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY, session_id=session_id,
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

        return {"response": ai_response, "session_id": session_id, "limited": False}
    except Exception as e:
        logger.error(f"Guest chat error: {str(e)}")
        if "budget" in str(e).lower() or "exceeded" in str(e).lower():
            return {"response": "The AI service is temporarily at capacity. Please sign up and try again!", "limited": True}
        return {"response": "I'd love to chat! Please sign up to start your AI-powered productivity journey.", "limited": True}
