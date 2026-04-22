from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from database import db
from auth_helpers import get_current_user
from models import CalendarEventCreate, CalendarEventResponse
import uuid

calendar_router = APIRouter(prefix="/api")


@calendar_router.post("/calendar/events", response_model=CalendarEventResponse)
async def create_calendar_event(event: CalendarEventCreate, user: dict = Depends(get_current_user)):
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    event_doc = {
        "event_id": event_id, "user_id": user["user_id"],
        "title": event.title, "description": event.description,
        "start_time": event.start_time.isoformat(),
        "end_time": event.end_time.isoformat(),
        "all_day": event.all_day,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.calendar_events.insert_one(event_doc)
    return CalendarEventResponse(
        event_id=event_id, title=event.title, description=event.description,
        start_time=event.start_time, end_time=event.end_time,
        all_day=event.all_day, created_at=datetime.now(timezone.utc)
    )


@calendar_router.get("/calendar/events", response_model=List[CalendarEventResponse])
async def get_calendar_events(user: dict = Depends(get_current_user)):
    events = await db.calendar_events.find(
        {"user_id": user["user_id"]}, {"_id": 0}
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
            event_id=evt["event_id"], title=evt["title"],
            description=evt.get("description"), start_time=start_time,
            end_time=end_time, all_day=evt["all_day"], created_at=created_at
        ))
    return result


@calendar_router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(event_id: str, user: dict = Depends(get_current_user)):
    result = await db.calendar_events.delete_one({"event_id": event_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}
