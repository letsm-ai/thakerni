from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from database import db
from auth_helpers import get_current_user
from models import ReminderCreate, ReminderResponse
import uuid

reminders_router = APIRouter(prefix="/api")


@reminders_router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(reminder: ReminderCreate, user: dict = Depends(get_current_user)):
    reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
    reminder_doc = {
        "reminder_id": reminder_id, "user_id": user["user_id"],
        "title": reminder.title, "description": reminder.description,
        "reminder_time": reminder.reminder_time.isoformat(),
        "repeat": reminder.repeat, "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reminders.insert_one(reminder_doc)
    return ReminderResponse(
        reminder_id=reminder_id, title=reminder.title,
        description=reminder.description, reminder_time=reminder.reminder_time,
        repeat=reminder.repeat, active=True, created_at=datetime.now(timezone.utc)
    )


@reminders_router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(user: dict = Depends(get_current_user)):
    reminders = await db.reminders.find(
        {"user_id": user["user_id"]}, {"_id": 0}
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
            reminder_id=rem["reminder_id"], title=rem["title"],
            description=rem.get("description"), reminder_time=reminder_time,
            repeat=rem["repeat"], active=rem["active"], created_at=created_at
        ))
    return result


@reminders_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    result = await db.reminders.delete_one({"reminder_id": reminder_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}
