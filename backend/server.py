"""
Letsm AI — Main Application Entry Point
Thin orchestrator: imports route modules and assembles the FastAPI app.
"""
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import os
import logging
import resend

from database import db, client, RESEND_API_KEY, SENDER_EMAIL

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# ── Import route modules ──
from routes.auth import auth_router
from routes.chat import chat_router
from routes.tasks import tasks_router
from routes.reminders import reminders_router
from routes.calendar import calendar_router
from routes.misc import misc_router
from routes.services import services_router
from routes.email import email_router, send_all_weekly_digests
from routes.admin import admin_router
from routes.teams import team_router
from routes.google_calendar import gcal_router
from routes.voice import voice_router
from routes.image_analysis import image_router

# ── Create App ──
app = FastAPI(title="Letsm AI - AI Assistant Platform")

# ── Include all routers ──
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(tasks_router)
app.include_router(reminders_router)
app.include_router(calendar_router)
app.include_router(misc_router)
app.include_router(services_router)
app.include_router(email_router)
app.include_router(admin_router)
app.include_router(team_router)
app.include_router(gcal_router)
app.include_router(voice_router)
app.include_router(image_router)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Scheduler ──
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_scheduler():
    scheduler.add_job(
        send_all_weekly_digests,
        trigger=CronTrigger(day_of_week="sun", hour=9, minute=0),
        id="weekly_digest",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — weekly digest runs every Sunday at 09:00 UTC")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    client.close()
