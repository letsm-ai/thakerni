"""
WhatsApp Cloud API integration (Meta official).

This coexists with the Baileys microservice — admin chooses which provider
each workspace uses. Cloud API is preferred for production because the phone
is independent from any physical device.

Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
"""
import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from auth_helpers import get_current_user
from database import db

logger = logging.getLogger(__name__)
whatsapp_cloud_router = APIRouter(prefix="/api/whatsapp/cloud")

META_GRAPH_VERSION = "v22.0"
META_GRAPH_BASE = f"https://graph.facebook.com/{META_GRAPH_VERSION}"


# ── Helpers ──
def _env_verify_token() -> Optional[str]:
    return os.environ.get("META_WEBHOOK_VERIFY_TOKEN")


def _env_app_secret() -> Optional[str]:
    return os.environ.get("META_APP_SECRET")


def _env_access_token() -> Optional[str]:
    return os.environ.get("META_PERMANENT_ACCESS_TOKEN")


def _env_phone_number_id() -> Optional[str]:
    return os.environ.get("META_PHONE_NUMBER_ID")


def _verify_meta_signature(app_secret: str, payload: bytes, signature_header: Optional[str]) -> None:
    """Validates X-Hub-Signature-256 using HMAC-SHA256 over the raw body."""
    if not signature_header:
        raise HTTPException(status_code=401, detail="Missing signature header")
    try:
        scheme, signature = signature_header.split("=", 1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid signature header format")
    if scheme != "sha256":
        raise HTTPException(status_code=400, detail="Unsupported signature scheme")
    expected = hmac.new(
        key=app_secret.encode("utf-8"),
        msg=payload,
        digestmod=hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")


# ── Webhook GET: verification handshake ──
@whatsapp_cloud_router.get("/webhook")
async def verify_webhook(
    mode: Optional[str] = Query(None, alias="hub.mode"),
    verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """Echoed by Meta during initial webhook setup. Must return the
    `hub.challenge` value as plain text when the verify token matches."""
    expected = _env_verify_token()
    if not expected:
        raise HTTPException(status_code=500, detail="Webhook verify token not configured")
    if mode == "subscribe" and verify_token == expected:
        logger.info("WhatsApp Cloud webhook verified successfully")
        return PlainTextResponse(content=challenge or "", status_code=200)
    logger.warning("WhatsApp Cloud webhook verification failed")
    raise HTTPException(status_code=403, detail="Webhook verification failed")


# ── Webhook POST: receive messages & status updates ──
@whatsapp_cloud_router.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    body_bytes = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    app_secret = _env_app_secret()
    if not app_secret:
        raise HTTPException(status_code=500, detail="App secret not configured")
    _verify_meta_signature(app_secret, body_bytes, signature)

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Log raw payload (truncated) for audit
    await db.whatsapp_cloud_events.insert_one({
        "received_at": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    })

    # Iterate entries
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            statuses = value.get("statuses", [])
            metadata = value.get("metadata", {})
            if messages:
                background_tasks.add_task(_handle_incoming_messages, messages, metadata)
            if statuses:
                background_tasks.add_task(_handle_status_updates, statuses)

    return {"success": True}


async def _generate_ai_reply(text_body: str, from_number: str) -> str:
    """Generate AI response using the same LLM that powers the web chat."""
    try:
        from database import EMERGENT_LLM_KEY
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        SYSTEM = (
            "You are Let's M AI, a helpful professional assistant replying over WhatsApp. "
            "Keep responses concise (under 600 characters). Reply in the same language as the user. "
            "If the user writes Arabic, reply in Arabic. If English, reply in English."
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"whatsapp_{from_number}",
            system_message=SYSTEM,
        )
        chat.with_model("openai", "gpt-4o-mini")
        return await chat.send_message(UserMessage(text=text_body))
    except Exception as e:
        logger.error(f"WhatsApp AI reply generation failed: {e}")
        return (
            "أهلاً! استلمنا رسالتك وسنرد عليك قريباً.\n"
            "Hi! We've received your message and will respond soon."
        )


async def _handle_incoming_messages(messages: list, metadata: dict):
    """Persist incoming message and reply via Cloud API using AI."""
    phone_number_id = metadata.get("phone_number_id") or _env_phone_number_id()
    for msg in messages:
        from_number = msg.get("from")
        msg_id = msg.get("id")
        msg_type = msg.get("type")
        timestamp = msg.get("timestamp")
        text_body = ""
        if msg_type == "text":
            text_body = msg.get("text", {}).get("body", "")

        await db.whatsapp_cloud_messages.insert_one({
            "direction": "inbound",
            "from": from_number,
            "message_id": msg_id,
            "type": msg_type,
            "body": text_body,
            "timestamp": timestamp,
            "received_at": datetime.now(timezone.utc).isoformat(),
        })

        # Check global on/off toggle (admin can disable auto-reply)
        settings = await db.whatsapp_cloud_settings.find_one({"_id": "default"}, {"_id": 0}) or {}
        auto_reply_enabled = settings.get("auto_reply_enabled", True)

        if msg_type == "text" and text_body and phone_number_id and auto_reply_enabled:
            ai_reply = await _generate_ai_reply(text_body, from_number)
            try:
                sent_id = await send_text_message(phone_number_id, from_number, ai_reply)
                await db.whatsapp_cloud_messages.insert_one({
                    "direction": "outbound",
                    "to": from_number,
                    "message_id": sent_id,
                    "type": "text",
                    "body": ai_reply,
                    "in_reply_to": msg_id,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                })
            except Exception as e:
                logger.error(f"Failed to send Cloud API AI reply: {e}")


async def _handle_status_updates(statuses: list):
    for status_obj in statuses:
        await db.whatsapp_cloud_messages.update_one(
            {"message_id": status_obj.get("id")},
            {"$set": {
                "delivery_status": status_obj.get("status"),
                "status_timestamp": status_obj.get("timestamp"),
            }},
            upsert=True,
        )


async def send_text_message(phone_number_id: str, to: str, body: str) -> str:
    """Sends a text message via Cloud API. Returns Meta message_id."""
    token = _env_access_token()
    if not token:
        raise HTTPException(status_code=500, detail="Access token not configured")
    url = f"{META_GRAPH_BASE}/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body},
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
        )
    if r.status_code != 200:
        logger.error(f"Cloud API send failed [{r.status_code}]: {r.text}")
        raise HTTPException(status_code=502, detail="Failed to send WhatsApp message")
    data = r.json()
    return data["messages"][0]["id"]


# ── Public status endpoint (for admin UI) ──
class CloudStatusOut(BaseModel):
    configured: bool
    has_verify_token: bool
    has_app_secret: bool
    has_access_token: bool
    phone_number_id: Optional[str] = None


@whatsapp_cloud_router.get("/status")
async def cloud_status(user: dict = Depends(get_current_user)) -> CloudStatusOut:
    """Reports which env vars are set so admin can see what's missing."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    verify = _env_verify_token()
    secret = _env_app_secret()
    token = _env_access_token()
    pnid = _env_phone_number_id()
    return CloudStatusOut(
        configured=bool(verify and secret and token and pnid),
        has_verify_token=bool(verify),
        has_app_secret=bool(secret),
        has_access_token=bool(token),
        phone_number_id=pnid,
    )


class SendMessageRequest(BaseModel):
    to: str
    body: str


@whatsapp_cloud_router.post("/send")
async def admin_send_test(req: SendMessageRequest, user: dict = Depends(get_current_user)):
    """Admin-only: send a test message via Cloud API."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    pnid = _env_phone_number_id()
    if not pnid:
        raise HTTPException(status_code=400, detail="META_PHONE_NUMBER_ID not configured")
    msg_id = await send_text_message(pnid, req.to, req.body)
    await db.whatsapp_cloud_messages.insert_one({
        "direction": "outbound",
        "to": req.to,
        "message_id": msg_id,
        "type": "text",
        "body": req.body,
        "sent_via": "admin_test",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"sent": True, "message_id": msg_id}


# ── Settings: auto-reply on/off ──
class SettingsOut(BaseModel):
    auto_reply_enabled: bool


class SettingsIn(BaseModel):
    auto_reply_enabled: bool


@whatsapp_cloud_router.get("/settings", response_model=SettingsOut)
async def get_settings(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    doc = await db.whatsapp_cloud_settings.find_one({"_id": "default"}, {"_id": 0}) or {}
    return SettingsOut(auto_reply_enabled=doc.get("auto_reply_enabled", True))


@whatsapp_cloud_router.put("/settings", response_model=SettingsOut)
async def update_settings(req: SettingsIn, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    await db.whatsapp_cloud_settings.update_one(
        {"_id": "default"},
        {"$set": {"auto_reply_enabled": req.auto_reply_enabled,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return SettingsOut(auto_reply_enabled=req.auto_reply_enabled)


# ── Recent messages (admin inbox) ──
@whatsapp_cloud_router.get("/messages")
async def list_messages(
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    limit = max(1, min(limit, 200))
    msgs = await db.whatsapp_cloud_messages.find(
        {}, {"_id": 0}
    ).sort("received_at", -1).limit(limit).to_list(limit)
    # Aggregate quick stats
    total = await db.whatsapp_cloud_messages.count_documents({})
    inbound = await db.whatsapp_cloud_messages.count_documents({"direction": "inbound"})
    outbound = await db.whatsapp_cloud_messages.count_documents({"direction": "outbound"})
    return {
        "messages": msgs,
        "stats": {"total": total, "inbound": inbound, "outbound": outbound},
    }
