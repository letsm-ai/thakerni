from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/api/admin")

# ── Role Permissions ──
ROLE_PERMISSIONS = {
    "admin": {"users", "subscriptions", "billing", "analytics", "system", "roles", "audit", "announcements"},
    "developer": {"users", "analytics", "system", "audit"},
    "operations": {"users", "subscriptions", "billing", "analytics", "announcements"},
    "viewer": {"users", "subscriptions", "analytics"},
}

def _db():
    from database import db
    return db

def _get_current_user():
    from auth_helpers import get_current_user
    return get_current_user


def require_role(*allowed_roles):
    """Dependency that checks if the current user has one of the allowed roles."""
    async def _check(request: Request):
        get_current_user = _get_current_user()
        user = await get_current_user(request, request.state.credentials if hasattr(request.state, 'credentials') else None)
        role = user.get("role", "user")
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _check


def require_permission(permission: str):
    """Dependency that checks if the current user's role has a specific permission."""
    async def _check(request: Request):
        get_current_user = _get_current_user()
        from fastapi.security import HTTPBearer
        security = HTTPBearer(auto_error=False)
        credentials = await security(request)
        user = await get_current_user(request, credentials)
        role = user.get("role", "user")
        perms = ROLE_PERMISSIONS.get(role, set())
        if permission not in perms:
            raise HTTPException(status_code=403, detail=f"Permission '{permission}' required")
        user["_permissions"] = perms
        return user
    return _check


# ══════════════════════════════════════════
#  OVERVIEW / DASHBOARD STATS
# ══════════════════════════════════════════

@admin_router.get("/overview")
async def admin_overview(user: dict = Depends(require_permission("analytics"))):
    db = _db()
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    total_users = await db.users.count_documents({})
    new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    new_users_month = await db.users.count_documents({"created_at": {"$gte": month_ago}})
    total_tasks = await db.tasks.count_documents({})
    total_reminders = await db.reminders.count_documents({})
    total_conversations = await db.conversations.count_documents({})
    total_messages = await db.messages.count_documents({})

    # Subscription breakdown
    free_users = await db.users.count_documents({"$or": [{"subscription_plan": "free"}, {"subscription_plan": {"$exists": False}}]})
    pro_users = await db.users.count_documents({"subscription_plan": "pro"})
    business_users = await db.users.count_documents({"subscription_plan": "business"})

    # Payment stats
    total_payments = await db.payment_transactions.count_documents({"status": "completed"})
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.payment_transactions.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0

    # Recent activity
    active_today = await db.messages.count_documents({
        "created_at": {"$gte": (now - timedelta(days=1)).isoformat()}
    })

    return {
        "users": {
            "total": total_users,
            "new_this_week": new_users_week,
            "new_this_month": new_users_month,
            "active_today": active_today,
        },
        "subscriptions": {
            "free": free_users,
            "pro": pro_users,
            "business": business_users,
        },
        "content": {
            "tasks": total_tasks,
            "reminders": total_reminders,
            "conversations": total_conversations,
            "messages": total_messages,
        },
        "revenue": {
            "total_payments": total_payments,
            "total_revenue": total_revenue,
        }
    }


# ══════════════════════════════════════════
#  USERS MANAGEMENT
# ══════════════════════════════════════════

@admin_router.get("/users")
async def admin_list_users(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    plan: Optional[str] = None,
    role: Optional[str] = None,
    country: Optional[str] = None,
    user: dict = Depends(require_permission("users"))
):
    db = _db()
    query = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
        ]
    if plan:
        if plan == "free":
            # Free plan: users with subscription_plan="free" or no subscription_plan field
            free_condition = {"$or": [{"subscription_plan": "free"}, {"subscription_plan": {"$exists": False}}]}
            if "$or" in query:
                # If search is also present, combine with $and
                query = {"$and": [{"$or": query["$or"]}, free_condition]}
            else:
                query.update(free_condition)
        else:
            query["subscription_plan"] = plan
    if role:
        query["role"] = role
    if country:
        query["geo.country"] = {"$regex": country, "$options": "i"}

    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    users_cursor = db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await users_cursor.to_list(limit)

    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@admin_router.get("/users/{user_id}")
async def admin_get_user(user_id: str, user: dict = Depends(require_permission("users"))):
    db = _db()
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    tasks_count = await db.tasks.count_documents({"user_id": user_id})
    reminders_count = await db.reminders.count_documents({"user_id": user_id})
    conversations_count = await db.conversations.count_documents({"user_id": user_id})
    messages_count = await db.messages.count_documents({"user_id": user_id})
    payments = await db.payment_transactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(20)

    return {
        "user": target,
        "stats": {
            "tasks": tasks_count,
            "reminders": reminders_count,
            "conversations": conversations_count,
            "messages": messages_count,
        },
        "payments": payments,
    }


@admin_router.put("/users/{user_id}/role")
async def admin_update_role(user_id: str, request: Request, user: dict = Depends(require_permission("roles"))):
    db = _db()
    body = await request.json()
    new_role = body.get("role")
    if new_role not in ROLE_PERMISSIONS and new_role != "user":
        raise HTTPException(status_code=400, detail=f"Invalid role: {new_role}")

    await db.users.update_one({"user_id": user_id}, {"$set": {"role": new_role}})

    # Audit log
    await db.audit_logs.insert_one({
        "log_id": str(uuid.uuid4()),
        "action": "role_change",
        "actor_id": user["user_id"],
        "target_id": user_id,
        "details": {"new_role": new_role},
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "message": f"Role updated to {new_role}"}


@admin_router.put("/users/{user_id}/status")
async def admin_toggle_user_status(user_id: str, request: Request, user: dict = Depends(require_permission("users"))):
    db = _db()
    body = await request.json()
    suspended = body.get("suspended", False)

    await db.users.update_one({"user_id": user_id}, {"$set": {"suspended": suspended}})

    await db.audit_logs.insert_one({
        "log_id": str(uuid.uuid4()),
        "action": "suspend" if suspended else "activate",
        "actor_id": user["user_id"],
        "target_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "message": f"User {'suspended' if suspended else 'activated'}"}


# ══════════════════════════════════════════
#  ANALYTICS — Signup & Activity Trends
# ══════════════════════════════════════════

@admin_router.get("/analytics/signups")
async def admin_signup_trends(days: int = 30, user: dict = Depends(require_permission("analytics"))):
    """Daily signup counts for the last N days."""
    db = _db()
    now = datetime.now(timezone.utc)
    data = []
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await db.users.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        data.append({"date": day_start.strftime("%b %d"), "signups": count})
    return {"data": data}


@admin_router.get("/analytics/activity")
async def admin_activity_trends(days: int = 30, user: dict = Depends(require_permission("analytics"))):
    """Daily message counts for the last N days."""
    db = _db()
    now = datetime.now(timezone.utc)
    data = []
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        msgs = await db.messages.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        tasks = await db.tasks.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        data.append({"date": day_start.strftime("%b %d"), "messages": msgs, "tasks": tasks})
    return {"data": data}


@admin_router.get("/analytics/countries")
async def admin_country_stats(user: dict = Depends(require_permission("analytics"))):
    """User distribution by country."""
    db = _db()
    pipeline = [
        {"$match": {"geo.country": {"$exists": True}}},
        {"$group": {"_id": "$geo.country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    result = await db.users.aggregate(pipeline).to_list(20)
    return {"countries": [{"country": r["_id"], "users": r["count"]} for r in result]}


# ══════════════════════════════════════════
#  SUBSCRIPTIONS & BILLING
# ══════════════════════════════════════════

@admin_router.get("/billing/payments")
async def admin_list_payments(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    user: dict = Depends(require_permission("billing"))
):
    db = _db()
    query = {}
    if status:
        query["status"] = status
    skip = (page - 1) * limit
    total = await db.payment_transactions.count_documents(query)
    payments = await db.payment_transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"payments": payments, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@admin_router.get("/billing/revenue")
async def admin_revenue_chart(days: int = 30, user: dict = Depends(require_permission("billing"))):
    """Daily revenue for the last N days."""
    db = _db()
    now = datetime.now(timezone.utc)
    data = []
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        pipeline = [
            {"$match": {"status": "completed", "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}}},
            {"$group": {"_id": None, "revenue": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        result = await db.payment_transactions.aggregate(pipeline).to_list(1)
        r = result[0] if result else {"revenue": 0, "count": 0}
        data.append({"date": day_start.strftime("%b %d"), "revenue": r["revenue"], "transactions": r["count"]})
    return {"data": data}


# ══════════════════════════════════════════
#  SYSTEM HEALTH
# ══════════════════════════════════════════

@admin_router.get("/system/health")
async def admin_system_health(user: dict = Depends(require_permission("system"))):
    db = _db()
    import httpx

    # WhatsApp status
    wa_status = {"connected": False, "error": None}
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get("http://localhost:3001/status", timeout=3.0)
            wa_status = r.json()
    except Exception as e:
        wa_status["error"] = str(e)

    # Email digest logs
    last_digest = await db.digest_logs.find_one(sort=[("timestamp", -1)], projection={"_id": 0})

    # DB stats
    collections = ["users", "tasks", "reminders", "conversations", "messages", "payment_transactions"]
    db_stats = {}
    for col in collections:
        db_stats[col] = await db[col].count_documents({})

    from database import RESEND_API_KEY, EMERGENT_LLM_KEY, STRIPE_API_KEY
    services = {
        "openai_llm": bool(EMERGENT_LLM_KEY),
        "stripe": bool(STRIPE_API_KEY),
        "resend_email": bool(RESEND_API_KEY),
        "whatsapp": wa_status.get("connected", False),
    }

    return {
        "services": services,
        "whatsapp": wa_status,
        "last_digest": last_digest,
        "database": db_stats,
    }


# ══════════════════════════════════════════
#  AUDIT LOGS
# ══════════════════════════════════════════

@admin_router.get("/audit-logs")
async def admin_audit_logs(page: int = 1, limit: int = 30, user: dict = Depends(require_permission("audit"))):
    db = _db()
    skip = (page - 1) * limit
    total = await db.audit_logs.count_documents({})
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    return {"logs": logs, "total": total, "page": page}


# ══════════════════════════════════════════
#  ROLE MANAGEMENT
# ══════════════════════════════════════════

@admin_router.get("/roles")
async def admin_get_roles(user: dict = Depends(require_permission("roles"))):
    return {"roles": {k: list(v) for k, v in ROLE_PERMISSIONS.items()}}


# ══════════════════════════════════════════
#  USAGE & COST TRACKING
# ══════════════════════════════════════════

@admin_router.get("/usage")
async def admin_get_usage(user: dict = Depends(require_permission("analytics"))):
    """Get per-user usage stats and estimated costs — optimized with aggregation."""
    db = _db()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    COST_PER_MSG = 0.005
    COST_PER_VOICE = 0.01

    users = await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "subscription": 1}).to_list(1000)
    user_ids = [u["user_id"] for u in users]

    # Batch aggregation: messages today per user
    msgs_today_agg = await db.messages.aggregate([
        {"$match": {"user_id": {"$in": user_ids}, "role": "user", "created_at": {"$gte": today_start.isoformat()}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(1000)
    msgs_today_map = {r["_id"]: r["count"] for r in msgs_today_agg}

    # Batch aggregation: messages this month per user
    msgs_month_agg = await db.messages.aggregate([
        {"$match": {"user_id": {"$in": user_ids}, "role": "user", "created_at": {"$gte": month_start.isoformat()}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(1000)
    msgs_month_map = {r["_id"]: r["count"] for r in msgs_month_agg}

    # Batch aggregation: whatsapp messages this month per user
    wa_month_agg = await db.whatsapp_messages.aggregate([
        {"$match": {"user_id": {"$in": user_ids}, "created_at": {"$gte": month_start.isoformat()}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(1000)
    wa_month_map = {r["_id"]: r["count"] for r in wa_month_agg}

    usage_data = []
    total_cost_month = 0

    for u in users:
        uid = u["user_id"]
        msgs_today = msgs_today_map.get(uid, 0)
        msgs_month = msgs_month_map.get(uid, 0)
        wa_month = wa_month_map.get(uid, 0)
        est_cost = round((msgs_month * COST_PER_MSG) + (wa_month * COST_PER_VOICE), 3)
        total_cost_month += est_cost

        usage_data.append({
            "user_id": uid, "email": u.get("email", ""), "name": u.get("name", ""),
            "subscription": u.get("subscription", "free"),
            "messages_today": msgs_today, "messages_this_month": msgs_month,
            "whatsapp_messages_month": wa_month, "estimated_cost_usd": est_cost
        })

    usage_data.sort(key=lambda x: x["estimated_cost_usd"], reverse=True)

    return {
        "users": usage_data,
        "total_estimated_cost_usd": round(total_cost_month, 2),
        "month": now.strftime("%B %Y"),
        "pricing": {"cost_per_message": COST_PER_MSG, "cost_per_voice": COST_PER_VOICE}
    }
