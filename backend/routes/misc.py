from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from datetime import datetime, timezone, timedelta
from database import db
from auth_helpers import get_current_user
from models import NotificationResponse, UserResponse
import uuid

misc_router = APIRouter(prefix="/api")


# ==================== NOTIFICATIONS ====================

@misc_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    result = []
    for notif in notifications:
        created_at = notif["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        result.append(NotificationResponse(
            notification_id=notif["notification_id"], user_id=notif["user_id"],
            title=notif["title"], message=notif["message"], type=notif["type"],
            read=notif.get("read", False), created_at=created_at,
            related_id=notif.get("related_id")
        ))
    return result


@misc_router.get("/notifications/unread-count")
async def get_unread_notification_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"count": count}


@misc_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}


@misc_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False}, {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}


@misc_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    result = await db.notifications.delete_one(
        {"notification_id": notification_id, "user_id": user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}


@misc_router.get("/notifications/check-reminders")
async def check_due_reminders(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    five_minutes_ago = now - timedelta(minutes=5)

    due_reminders = await db.reminders.find({
        "user_id": user["user_id"], "active": True,
        "reminder_time": {
            "$lte": (now + timedelta(minutes=1)).isoformat(),
            "$gte": five_minutes_ago.isoformat()
        }
    }, {"_id": 0}).to_list(100)

    notifications_created = []

    for reminder in due_reminders:
        existing = await db.notifications.find_one({
            "related_id": reminder["reminder_id"], "type": "reminder"
        })
        if not existing:
            notification_id = f"notif_{uuid.uuid4().hex[:12]}"
            notification = {
                "notification_id": notification_id, "user_id": user["user_id"],
                "title": "🔔 Reminder", "message": reminder["title"],
                "type": "reminder", "read": False,
                "related_id": reminder["reminder_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
            notifications_created.append(notification)

            if reminder.get("repeat", "none") == "none":
                await db.reminders.update_one(
                    {"reminder_id": reminder["reminder_id"]},
                    {"$set": {"active": False}}
                )

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    due_tasks = await db.tasks.find({
        "user_id": user["user_id"], "completed": False,
        "due_date": {"$gte": today_start.isoformat(), "$lt": today_end.isoformat()}
    }, {"_id": 0}).to_list(100)

    for task in due_tasks:
        existing = await db.notifications.find_one({
            "related_id": task["task_id"], "type": "task_due",
            "created_at": {"$gte": today_start.isoformat()}
        })
        if not existing:
            notification_id = f"notif_{uuid.uuid4().hex[:12]}"
            notification = {
                "notification_id": notification_id, "user_id": user["user_id"],
                "title": "📋 Task Due Today", "message": task["title"],
                "type": "task_due", "read": False, "related_id": task["task_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
            notifications_created.append(notification)

    return {"checked": True, "notifications_created": len(notifications_created), "notifications": notifications_created}


# ==================== USER PROFILE ====================

@misc_router.put("/users/profile")
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
        user_id=updated_user["user_id"], email=updated_user["email"],
        name=updated_user["name"], picture=updated_user.get("picture"),
        created_at=created_at
    )


# ==================== HEALTH CHECK ====================

@misc_router.get("/")
async def root():
    return {"message": "Letsm AI API", "status": "healthy"}

@misc_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==================== STATISTICS ====================

@misc_router.get("/stats/overview")
async def get_stats_overview(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    total_tasks = await db.tasks.count_documents({"user_id": user_id})
    completed_tasks = await db.tasks.count_documents({"user_id": user_id, "completed": True})
    pending_tasks = await db.tasks.count_documents({"user_id": user_id, "completed": False})
    tasks_completed_this_week = await db.tasks.count_documents({
        "user_id": user_id, "completed": True,
        "completed_at": {"$gte": week_start.isoformat()}
    })
    high_priority_pending = await db.tasks.count_documents({
        "user_id": user_id, "completed": False, "priority": "high"
    })
    total_reminders = await db.reminders.count_documents({"user_id": user_id})
    active_reminders = await db.reminders.count_documents({"user_id": user_id, "active": True})
    total_conversations = await db.conversations.count_documents({"user_id": user_id})
    total_messages = await db.messages.count_documents({"user_id": user_id})
    messages_this_week = await db.messages.count_documents({
        "user_id": user_id, "created_at": {"$gte": week_start.isoformat()}
    })
    total_events = await db.calendar_events.count_documents({"user_id": user_id})
    upcoming_events = await db.calendar_events.count_documents({
        "user_id": user_id, "start_time": {"$gte": now.isoformat()}
    })
    completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)

    return {
        "tasks": {
            "total": total_tasks, "completed": completed_tasks, "pending": pending_tasks,
            "completed_this_week": tasks_completed_this_week,
            "high_priority_pending": high_priority_pending, "completion_rate": completion_rate
        },
        "reminders": {"total": total_reminders, "active": active_reminders},
        "conversations": {
            "total": total_conversations, "total_messages": total_messages,
            "messages_this_week": messages_this_week
        },
        "calendar": {"total_events": total_events, "upcoming_events": upcoming_events}
    }


@misc_router.get("/stats/activity")
async def get_activity_stats(user: dict = Depends(get_current_user), days: int = 7):
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    daily_stats = []

    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        rng = {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}

        tasks_created = await db.tasks.count_documents({"user_id": user_id, "created_at": rng})
        tasks_completed = await db.tasks.count_documents({"user_id": user_id, "completed_at": rng})
        messages_sent = await db.messages.count_documents({"user_id": user_id, "role": "user", "created_at": rng})
        reminders_set = await db.reminders.count_documents({"user_id": user_id, "created_at": rng})

        daily_stats.append({
            "date": day_start.strftime("%Y-%m-%d"), "day_name": day_start.strftime("%a"),
            "tasks_created": tasks_created, "tasks_completed": tasks_completed,
            "messages_sent": messages_sent, "reminders_set": reminders_set
        })

    return {"daily_activity": daily_stats}


@misc_router.get("/stats/streaks")
async def get_streaks(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    current_streak = 0
    max_streak = 0
    temp_streak = 0

    for i in range(30):
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

    return {"current_streak": current_streak, "max_streak": max(max_streak, current_streak), "streak_unit": "days"}
