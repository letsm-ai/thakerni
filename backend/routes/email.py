from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from database import db, SENDER_EMAIL
from auth_helpers import get_current_user
from models import EmailPreferences
from pathlib import Path
import resend
import uuid
import re as re_mod
import logging

logger = logging.getLogger(__name__)
email_router = APIRouter(prefix="/api/email")

# Import mutable config from database module
import database as _db_module


@email_router.get("/preferences")
async def get_email_preferences(user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    prefs = user_doc.get("email_preferences", {"weekly_digest": True, "reminder_alerts": True})
    return {"preferences": prefs}


@email_router.put("/preferences")
async def update_email_preferences(prefs: EmailPreferences, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_preferences": prefs.dict()}}
    )
    return {"message": "Preferences updated", "preferences": prefs.dict()}


async def generate_digest_html(user_id: str, user_email: str, user_name: str) -> str:
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


@email_router.post("/send-digest")
async def send_weekly_digest(user: dict = Depends(get_current_user)):
    if not _db_module.RESEND_API_KEY:
        return {"success": False, "message": "Email service not configured. Add RESEND_API_KEY to backend .env file."}

    html = await generate_digest_html(user["user_id"], user["email"], user.get("name", ""))

    try:
        params = {
            "from": f"Letsm AI <{_db_module.SENDER_EMAIL}>",
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


@email_router.post("/preview-digest")
async def preview_digest(user: dict = Depends(get_current_user)):
    html = await generate_digest_html(user["user_id"], user["email"], user.get("name", ""))
    return {"html": html}


@email_router.get("/config")
async def get_email_config(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"configured": bool(_db_module.RESEND_API_KEY), "sender_email": _db_module.SENDER_EMAIL}


@email_router.post("/config")
async def update_email_config(request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Admin access required")

    body = await request.json()
    new_key = body.get("resend_api_key", "").strip()
    new_sender = body.get("sender_email", "").strip()

    if new_key:
        _db_module.RESEND_API_KEY = new_key
        resend.api_key = new_key
        env_path = Path(__file__).parent.parent / ".env"
        env_content = env_path.read_text() if env_path.exists() else ""
        if "RESEND_API_KEY" in env_content:
            env_content = re_mod.sub(r'RESEND_API_KEY=.*', f'RESEND_API_KEY={new_key}', env_content)
        else:
            env_content += f"\nRESEND_API_KEY={new_key}"
        env_path.write_text(env_content)

    if new_sender:
        _db_module.SENDER_EMAIL = new_sender
        env_path = Path(__file__).parent.parent / ".env"
        env_content = env_path.read_text()
        if "SENDER_EMAIL" in env_content:
            env_content = re_mod.sub(r'SENDER_EMAIL=.*', f'SENDER_EMAIL={new_sender}', env_content)
        else:
            env_content += f"\nSENDER_EMAIL={new_sender}"
        env_path.write_text(env_content)

    test_result = None
    if new_key:
        try:
            resend.Emails.send({
                "from": f"Letsm AI <{_db_module.SENDER_EMAIL}>",
                "to": [user["email"]],
                "subject": "Letsm AI - Email Configuration Test",
                "html": "<h2>Email configured successfully!</h2><p>Your Resend API key is working.</p>"
            })
            test_result = "success"
        except Exception as e:
            test_result = str(e)

    return {"success": True, "configured": bool(_db_module.RESEND_API_KEY), "sender_email": _db_module.SENDER_EMAIL, "test_result": test_result}


@email_router.get("/digest-schedule")
async def get_digest_schedule(user: dict = Depends(get_current_user)):
    # Import scheduler from server to check job status
    try:
        from server import scheduler
        jobs = scheduler.get_jobs()
        digest_job = next((j for j in jobs if j.id == "weekly_digest"), None)
        next_run = str(digest_job.next_run_time) if digest_job else None
    except Exception:
        next_run = None

    last_log = await db.digest_logs.find_one(sort=[("timestamp", -1)], projection={"_id": 0})
    return {"scheduled": next_run is not None, "next_run": next_run, "last_run": last_log}


@email_router.post("/trigger-digest-batch")
async def trigger_digest_batch(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    import asyncio
    asyncio.create_task(send_all_weekly_digests())
    return {"success": True, "message": "Digest batch job triggered in background."}


async def send_all_weekly_digests():
    """Background job: send weekly digest to all opted-in users"""
    if not _db_module.RESEND_API_KEY:
        logger.warning("Skipping scheduled digest — RESEND_API_KEY not configured.")
        return

    logger.info("Starting scheduled weekly digest job...")
    sent, failed = 0, 0
    cursor = db.users.find(
        {"email_preferences.weekly_digest": {"$ne": False}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    )
    async for user_doc in cursor:
        try:
            html = await generate_digest_html(user_doc["user_id"], user_doc["email"], user_doc.get("name", ""))
            resend.Emails.send({
                "from": f"Letsm AI <{_db_module.SENDER_EMAIL}>",
                "to": [user_doc["email"]],
                "subject": "Your Weekly Productivity Digest - Letsm AI",
                "html": html
            })
            sent += 1
        except Exception as e:
            logger.error(f"Digest failed for {user_doc.get('email')}: {e}")
            failed += 1

    logger.info(f"Weekly digest complete — sent: {sent}, failed: {failed}")
    await db.digest_logs.insert_one({
        "log_id": str(uuid.uuid4()), "sent": sent, "failed": failed,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
