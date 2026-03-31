from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

team_router = APIRouter(prefix="/api/teams")

def _db():
    from server import db
    return db

async def _get_user(request: Request):
    from server import get_current_user
    from fastapi.security import HTTPBearer
    security = HTTPBearer(auto_error=False)
    credentials = await security(request)
    return await get_current_user(request, credentials)


async def _notify(db, user_id: str, title: str, message: str, notif_type: str = "team", related_id: str = None):
    """Create a notification for a user."""
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "related_id": related_id
    })


async def _notify_team(db, team_id: str, title: str, message: str, exclude_user: str = None, notif_type: str = "team", related_id: str = None):
    """Send a notification to all active team members except the excluded user."""
    members = await db.team_members.find(
        {"team_id": team_id, "status": "active"},
        {"_id": 0, "user_id": 1}
    ).to_list(50)
    for m in members:
        if m["user_id"] and m["user_id"] != exclude_user:
            await _notify(db, m["user_id"], title, message, notif_type, related_id)


# ── Models ──

class TeamCreate(BaseModel):
    name: str

class TeamUpdate(BaseModel):
    name: Optional[str] = None

class InviteCreate(BaseModel):
    email: str
    role: str = "member"

class TeamTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"
    assigned_to: Optional[str] = None

class TeamReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_time: datetime

class TeamMessageCreate(BaseModel):
    content: str
    conversation_id: Optional[str] = None


# ── Helpers ──

async def get_user_team_membership(db, user_id: str):
    """Get the user's active team membership, if any."""
    return await db.team_members.find_one(
        {"user_id": user_id, "status": "active"},
        {"_id": 0}
    )

async def require_team_member(db, user_id: str):
    """Require user to be an active team member. Returns membership doc."""
    mem = await get_user_team_membership(db, user_id)
    if not mem:
        raise HTTPException(status_code=403, detail="You are not a member of any team")
    return mem

async def require_team_admin(db, user_id: str):
    """Require user to be team owner or admin."""
    mem = await require_team_member(db, user_id)
    if mem["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Team admin access required")
    return mem


# ══════════════════════════════════════════
#  TEAM CRUD
# ══════════════════════════════════════════

@team_router.post("/create")
async def create_team(data: TeamCreate, user: dict = Depends(_get_user)):
    """Create a new team. Only Business plan users can create teams."""
    db = _db()

    # Check subscription
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if user_doc.get("subscription_plan") != "business":
        raise HTTPException(status_code=403, detail="Business plan required to create a team")

    # Check if user already owns a team
    existing = await db.team_members.find_one({"user_id": user["user_id"], "role": "owner", "status": "active"})
    if existing:
        raise HTTPException(status_code=400, detail="You already own a team")

    team_id = f"team_{uuid.uuid4().hex[:12]}"
    team_doc = {
        "team_id": team_id,
        "name": data.name,
        "owner_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.teams.insert_one(team_doc)

    # Add owner as first member
    await db.team_members.insert_one({
        "team_id": team_id,
        "user_id": user["user_id"],
        "email": user["email"],
        "role": "owner",
        "status": "active",
        "invited_by": user["user_id"],
        "joined_at": datetime.now(timezone.utc).isoformat()
    })

    return {"success": True, "team_id": team_id, "name": data.name}


@team_router.get("/my-team")
async def get_my_team(user: dict = Depends(_get_user)):
    """Get the current user's team info."""
    db = _db()
    mem = await get_user_team_membership(db, user["user_id"])
    if not mem:
        return {"team": None, "membership": None, "members": []}

    team = await db.teams.find_one({"team_id": mem["team_id"]}, {"_id": 0})
    members = await db.team_members.find(
        {"team_id": mem["team_id"], "status": {"$in": ["active", "pending"]}},
        {"_id": 0}
    ).to_list(50)

    # Enrich members with user names
    for m in members:
        if m.get("user_id"):
            u = await db.users.find_one({"user_id": m["user_id"]}, {"_id": 0, "name": 1, "email": 1, "picture": 1})
            if u:
                m["name"] = u.get("name")
                m["picture"] = u.get("picture")

    return {"team": team, "membership": mem, "members": members}


@team_router.put("/update")
async def update_team(data: TeamUpdate, user: dict = Depends(_get_user)):
    """Update team name. Owner/admin only."""
    db = _db()
    mem = await require_team_admin(db, user["user_id"])
    updates = {}
    if data.name:
        updates["name"] = data.name
    if updates:
        await db.teams.update_one({"team_id": mem["team_id"]}, {"$set": updates})
    return {"success": True}


# ══════════════════════════════════════════
#  INVITATIONS
# ══════════════════════════════════════════

@team_router.post("/invite")
async def invite_member(data: InviteCreate, user: dict = Depends(_get_user)):
    """Invite a user to the team by email. Owner/admin only."""
    db = _db()
    mem = await require_team_admin(db, user["user_id"])

    if data.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

    # Check if already invited
    existing = await db.team_members.find_one({
        "team_id": mem["team_id"],
        "email": data.email,
        "status": {"$in": ["active", "pending"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="User already invited or a member")

    # Check seat limit (per-seat billing)
    active_count = await db.team_members.count_documents({
        "team_id": mem["team_id"],
        "status": "active"
    })
    # Business plan has no hard cap, but we track for billing
    # Default max 50 seats
    if active_count >= 50:
        raise HTTPException(status_code=400, detail="Maximum team size reached")

    # Check if the invited email has an account
    invited_user = await db.users.find_one({"email": data.email}, {"_id": 0, "user_id": 1})

    invite_doc = {
        "invite_id": f"inv_{uuid.uuid4().hex[:12]}",
        "team_id": mem["team_id"],
        "user_id": invited_user["user_id"] if invited_user else None,
        "email": data.email,
        "role": data.role,
        "status": "pending",
        "invited_by": user["user_id"],
        "invited_at": datetime.now(timezone.utc).isoformat(),
        "joined_at": None
    }
    await db.team_members.insert_one(invite_doc)

    # Notify the invited user if they have an account
    if invited_user:
        team = await db.teams.find_one({"team_id": mem["team_id"]}, {"_id": 0, "name": 1})
        await _notify(db, invited_user["user_id"],
            "Team Invitation",
            f"You've been invited to join '{team['name']}' as {data.role}.",
            "team_invite", invite_doc["invite_id"])

    return {"success": True, "message": f"Invitation sent to {data.email}", "invite_id": invite_doc["invite_id"]}


@team_router.get("/invitations")
async def get_my_invitations(user: dict = Depends(_get_user)):
    """Get pending invitations for the current user."""
    db = _db()
    invites = await db.team_members.find(
        {"$or": [{"email": user["email"]}, {"user_id": user["user_id"]}], "status": "pending"},
        {"_id": 0}
    ).to_list(10)

    # Enrich with team names
    for inv in invites:
        team = await db.teams.find_one({"team_id": inv["team_id"]}, {"_id": 0, "name": 1})
        inv["team_name"] = team["name"] if team else "Unknown"

    return {"invitations": invites}


@team_router.post("/invitations/{invite_id}/accept")
async def accept_invitation(invite_id: str, user: dict = Depends(_get_user)):
    """Accept a team invitation."""
    db = _db()
    invite = await db.team_members.find_one({"invite_id": invite_id, "status": "pending"}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invite.get("email") != user["email"] and invite.get("user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="This invitation is not for you")

    # Leave any existing team
    await db.team_members.update_many(
        {"user_id": user["user_id"], "status": "active"},
        {"$set": {"status": "left", "left_at": datetime.now(timezone.utc).isoformat()}}
    )

    await db.team_members.update_one(
        {"invite_id": invite_id},
        {"$set": {
            "status": "active",
            "user_id": user["user_id"],
            "joined_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Notify team that a new member joined
    team = await db.teams.find_one({"team_id": invite["team_id"]}, {"_id": 0, "name": 1})
    await _notify_team(db, invite["team_id"],
        "New Team Member",
        f"{user.get('name', user['email'])} has joined the team.",
        exclude_user=user["user_id"], notif_type="team_join")

    return {"success": True, "message": "You have joined the team"}


@team_router.post("/invitations/{invite_id}/decline")
async def decline_invitation(invite_id: str, user: dict = Depends(_get_user)):
    """Decline a team invitation."""
    db = _db()
    invite = await db.team_members.find_one({"invite_id": invite_id, "status": "pending"}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    await db.team_members.update_one({"invite_id": invite_id}, {"$set": {"status": "declined"}})
    return {"success": True}


@team_router.delete("/members/{user_id}")
async def remove_member(user_id: str, user: dict = Depends(_get_user)):
    """Remove a member from the team. Owner/admin only."""
    db = _db()
    mem = await require_team_admin(db, user["user_id"])

    if user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    target = await db.team_members.find_one({"team_id": mem["team_id"], "user_id": user_id, "status": "active"})
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    if target.get("role") == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the team owner")

    await db.team_members.update_one(
        {"team_id": mem["team_id"], "user_id": user_id, "status": "active"},
        {"$set": {"status": "removed", "removed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


@team_router.put("/members/{user_id}/role")
async def change_member_role(user_id: str, request: Request, user: dict = Depends(_get_user)):
    """Change a member's role. Owner only."""
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    if mem["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the team owner can change roles")

    body = await request.json()
    new_role = body.get("role")
    if new_role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

    await db.team_members.update_one(
        {"team_id": mem["team_id"], "user_id": user_id, "status": "active"},
        {"$set": {"role": new_role}}
    )
    return {"success": True}


@team_router.post("/leave")
async def leave_team(user: dict = Depends(_get_user)):
    """Leave the current team."""
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    if mem["role"] == "owner":
        raise HTTPException(status_code=400, detail="Team owner cannot leave. Transfer ownership or delete the team first.")

    await db.team_members.update_one(
        {"team_id": mem["team_id"], "user_id": user["user_id"], "status": "active"},
        {"$set": {"status": "left", "left_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


# ══════════════════════════════════════════
#  SHARED TASKS
# ══════════════════════════════════════════

@team_router.post("/tasks")
async def create_team_task(data: TeamTaskCreate, user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])

    task_id = f"ttask_{uuid.uuid4().hex[:12]}"
    task_doc = {
        "task_id": task_id,
        "team_id": mem["team_id"],
        "created_by": user["user_id"],
        "assigned_to": data.assigned_to,
        "title": data.title,
        "description": data.description,
        "due_date": data.due_date.isoformat() if data.due_date else None,
        "priority": data.priority,
        "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.team_tasks.insert_one(task_doc)
    task_doc.pop("_id", None)

    # Notify assigned member
    if data.assigned_to and data.assigned_to != user["user_id"]:
        await _notify(db, data.assigned_to,
            "Task Assigned",
            f"{user.get('name', 'A teammate')} assigned you: \"{data.title}\"",
            "team_task", task_id)

    return task_doc


@team_router.get("/tasks")
async def get_team_tasks(user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    tasks = await db.team_tasks.find(
        {"team_id": mem["team_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # Enrich with member names
    member_cache = {}
    for t in tasks:
        for field in ("created_by", "assigned_to"):
            uid = t.get(field)
            if uid and uid not in member_cache:
                u = await db.users.find_one({"user_id": uid}, {"_id": 0, "name": 1})
                member_cache[uid] = u.get("name", "Unknown") if u else "Unknown"
            if uid:
                t[f"{field}_name"] = member_cache.get(uid, "Unknown")

    return {"tasks": tasks}


@team_router.put("/tasks/{task_id}")
async def update_team_task(task_id: str, request: Request, user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    body = await request.json()

    updates = {}
    for field in ("title", "description", "priority", "completed", "assigned_to"):
        if field in body:
            updates[field] = body[field]
    if "due_date" in body:
        updates["due_date"] = body["due_date"]
    if "completed" in body and body["completed"]:
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()
        updates["completed_by"] = user["user_id"]

    await db.team_tasks.update_one(
        {"task_id": task_id, "team_id": mem["team_id"]},
        {"$set": updates}
    )

    # Notify on task completion
    if "completed" in body and body["completed"]:
        task = await db.team_tasks.find_one({"task_id": task_id}, {"_id": 0, "title": 1, "created_by": 1})
        if task and task.get("created_by") and task["created_by"] != user["user_id"]:
            await _notify(db, task["created_by"],
                "Task Completed",
                f"{user.get('name', 'A teammate')} completed: \"{task['title']}\"",
                "team_task", task_id)

    # Notify on reassignment
    if "assigned_to" in body and body["assigned_to"] and body["assigned_to"] != user["user_id"]:
        task = await db.team_tasks.find_one({"task_id": task_id}, {"_id": 0, "title": 1})
        if task:
            await _notify(db, body["assigned_to"],
                "Task Assigned",
                f"{user.get('name', 'A teammate')} assigned you: \"{task['title']}\"",
                "team_task", task_id)

    return {"success": True}


@team_router.delete("/tasks/{task_id}")
async def delete_team_task(task_id: str, user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    await db.team_tasks.delete_one({"task_id": task_id, "team_id": mem["team_id"]})
    return {"success": True}


# ══════════════════════════════════════════
#  SHARED REMINDERS
# ══════════════════════════════════════════

@team_router.post("/reminders")
async def create_team_reminder(data: TeamReminderCreate, user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])

    reminder_id = f"trem_{uuid.uuid4().hex[:12]}"
    rem_doc = {
        "reminder_id": reminder_id,
        "team_id": mem["team_id"],
        "created_by": user["user_id"],
        "title": data.title,
        "description": data.description,
        "reminder_time": data.reminder_time.isoformat(),
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.team_reminders.insert_one(rem_doc)
    rem_doc.pop("_id", None)

    # Notify team about new reminder
    await _notify_team(db, mem["team_id"],
        "New Team Reminder",
        f"{user.get('name', 'A teammate')} set a reminder: \"{data.title}\"",
        exclude_user=user["user_id"], notif_type="team_reminder", related_id=reminder_id)

    return rem_doc


@team_router.get("/reminders")
async def get_team_reminders(user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    reminders = await db.team_reminders.find(
        {"team_id": mem["team_id"], "active": True},
        {"_id": 0}
    ).sort("reminder_time", 1).to_list(50)

    member_cache = {}
    for r in reminders:
        uid = r.get("created_by")
        if uid and uid not in member_cache:
            u = await db.users.find_one({"user_id": uid}, {"_id": 0, "name": 1})
            member_cache[uid] = u.get("name", "Unknown") if u else "Unknown"
        r["created_by_name"] = member_cache.get(uid, "Unknown")

    return {"reminders": reminders}


@team_router.delete("/reminders/{reminder_id}")
async def delete_team_reminder(reminder_id: str, user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    await db.team_reminders.update_one(
        {"reminder_id": reminder_id, "team_id": mem["team_id"]},
        {"$set": {"active": False}}
    )
    return {"success": True}


# ══════════════════════════════════════════
#  TEAM CONVERSATIONS
# ══════════════════════════════════════════

@team_router.post("/messages")
async def send_team_message(data: TeamMessageCreate, user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])

    conv_id = data.conversation_id
    if not conv_id:
        # Use a single default team conversation
        conv_id = f"tconv_{mem['team_id']}"
        existing = await db.team_conversations.find_one({"conversation_id": conv_id})
        if not existing:
            await db.team_conversations.insert_one({
                "conversation_id": conv_id,
                "team_id": mem["team_id"],
                "title": "Team Chat",
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    msg_id = f"tmsg_{uuid.uuid4().hex[:12]}"
    msg_doc = {
        "message_id": msg_id,
        "conversation_id": conv_id,
        "team_id": mem["team_id"],
        "user_id": user["user_id"],
        "user_name": user.get("name", "Unknown"),
        "content": data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.team_messages.insert_one(msg_doc)
    msg_doc.pop("_id", None)

    # Notify team members of new message
    await _notify_team(db, mem["team_id"],
        "New Team Message",
        f"{user.get('name', 'A teammate')}: {data.content[:80]}{'...' if len(data.content) > 80 else ''}",
        exclude_user=user["user_id"], notif_type="team_message", related_id=msg_id)

    return msg_doc


@team_router.get("/messages")
async def get_team_messages(page: int = 1, limit: int = 50, user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    skip = (page - 1) * limit
    messages = await db.team_messages.find(
        {"team_id": mem["team_id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    messages.reverse()
    return {"messages": messages}


# ══════════════════════════════════════════
#  TEAM ANALYTICS
# ══════════════════════════════════════════

@team_router.get("/analytics")
async def get_team_analytics(user: dict = Depends(_get_user)):
    db = _db()
    mem = await require_team_member(db, user["user_id"])
    team_id = mem["team_id"]

    total_tasks = await db.team_tasks.count_documents({"team_id": team_id})
    completed_tasks = await db.team_tasks.count_documents({"team_id": team_id, "completed": True})
    active_reminders = await db.team_reminders.count_documents({"team_id": team_id, "active": True})
    total_messages = await db.team_messages.count_documents({"team_id": team_id})
    member_count = await db.team_members.count_documents({"team_id": team_id, "status": "active"})

    # Per-member stats
    members = await db.team_members.find(
        {"team_id": team_id, "status": "active"},
        {"_id": 0, "user_id": 1, "email": 1, "role": 1}
    ).to_list(50)

    member_stats = []
    for m in members:
        uid = m["user_id"]
        u = await db.users.find_one({"user_id": uid}, {"_id": 0, "name": 1})
        tasks_created = await db.team_tasks.count_documents({"team_id": team_id, "created_by": uid})
        tasks_completed = await db.team_tasks.count_documents({"team_id": team_id, "completed_by": uid})
        msgs = await db.team_messages.count_documents({"team_id": team_id, "user_id": uid})
        member_stats.append({
            "user_id": uid,
            "name": u.get("name", "Unknown") if u else "Unknown",
            "email": m["email"],
            "role": m["role"],
            "tasks_created": tasks_created,
            "tasks_completed": tasks_completed,
            "messages": msgs,
        })

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "completion_rate": round(completed_tasks / total_tasks * 100, 1) if total_tasks else 0,
        "active_reminders": active_reminders,
        "total_messages": total_messages,
        "member_count": member_count,
        "members": member_stats,
        "billing": {
            "seats": member_count,
            "per_seat_price": 10.00,
            "monthly_cost": member_count * 10.00
        }
    }
