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
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional

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


async def _generate_ai_reply(text_body: str, from_number: str, *, linked_user: Optional[dict] = None, history: Optional[list] = None) -> str:
    """Generate AI response. Tries OpenAI SDK first, falls back to emergentintegrations.

    If `linked_user` is provided, personalises the reply with the user's name.
    If `history` is provided (list of {role, content}), includes it as context for memory.
    """
    user_name = (linked_user or {}).get("name") or (linked_user or {}).get("email", "").split("@")[0]
    is_anonymous = linked_user is None

    if is_anonymous:
        SYSTEM = (
            "You are Let's M AI, a helpful professional WhatsApp assistant. "
            "Keep responses concise (under 500 characters). "
            "Reply in the EXACT SAME language the user wrote in (Arabic for Arabic, English for English). "
            "Be friendly, helpful, and direct. "
            "IMPORTANT: This user is anonymous (not linked to an account)."
        )
    else:
        SYSTEM = (
            f"You are Let's M AI, a helpful professional WhatsApp assistant. "
            f"You are chatting with {user_name}, an authenticated user. "
            f"Keep responses concise (under 600 characters). "
            f"Reply in the EXACT SAME language the user wrote in. "
            f"Be friendly, helpful, and personal. Remember prior messages in this conversation."
        )

    messages_for_llm: List[dict] = [{"role": "system", "content": SYSTEM}]
    if history:
        # Cap history to last 10 turns to control tokens
        messages_for_llm.extend(history[-10:])
    messages_for_llm.append({"role": "user", "content": text_body})

    # ── Path 1: Direct OpenAI SDK ──
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages_for_llm,
                max_tokens=400,
                temperature=0.7,
            )
            reply = (resp.choices[0].message.content or "").strip()
            if reply:
                logger.info(f"WhatsApp AI reply (OpenAI, {'linked' if linked_user else 'anon'}) → {from_number}: {reply[:80]}...")
                return reply
            logger.warning("OpenAI returned empty content — falling back")
        except Exception as e:
            logger.error(f"OpenAI direct call failed for {from_number}: {type(e).__name__}: {e}", exc_info=True)

    # ── Path 2: emergentintegrations fallback ──
    try:
        from database import EMERGENT_LLM_KEY
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        if not EMERGENT_LLM_KEY:
            raise RuntimeError("Neither OPENAI_API_KEY nor EMERGENT_LLM_KEY is configured")
        sid = "wa_" + "".join(c for c in (from_number or "anon") if c.isalnum())
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=sid, system_message=SYSTEM)
        chat.with_model("openai", "gpt-4o-mini")
        reply = await chat.send_message(UserMessage(text=text_body))
        reply = (reply or "").strip()
        if reply:
            logger.info(f"WhatsApp AI reply (Emergent) → {from_number}: {reply[:80]}...")
            return reply
    except Exception as e:
        logger.error(f"WhatsApp AI reply generation FAILED for {from_number}: {type(e).__name__}: {e}", exc_info=True)

    return (
        "أهلاً! استلمنا رسالتك وسنرد عليك قريباً.\n"
        "Hi! We've received your message and will respond soon."
    )


# ── Linking helpers ──
LINKING_CODE_TTL_MINUTES = 15
LINKING_CODE_PATTERN = re.compile(r"\b(LM-[A-Z0-9]{4,8})\b", re.IGNORECASE)


def _generate_linking_code() -> str:
    """Generates a memorable code like LM-7K9X."""
    import secrets
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # Removed easily confused chars
    return "LM-" + "".join(secrets.choice(alphabet) for _ in range(4))


async def _try_link_with_code(text_body: str, from_number: str) -> Optional[dict]:
    """If the message contains a valid LM-XXXX code, link the phone number to the user.
    Returns the linked user dict on success, None otherwise."""
    if not text_body:
        return None
    match = LINKING_CODE_PATTERN.search(text_body)
    if not match:
        return None

    code = match.group(1).upper()
    now = datetime.now(timezone.utc)
    code_doc = await db.whatsapp_link_codes.find_one(
        {"code": code, "used": {"$ne": True}},
        {"_id": 0},
    )
    if not code_doc:
        return None

    # Check expiry
    expires_at_str = code_doc.get("expires_at")
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
            if expires_at < now:
                return None
        except Exception:
            pass

    user_id = code_doc.get("user_id")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
    if not user:
        return None

    # Link the phone to the user
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"whatsapp_phone": from_number, "whatsapp_linked_at": now.isoformat()}},
    )
    # Mark the code as used
    await db.whatsapp_link_codes.update_one(
        {"code": code},
        {"$set": {"used": True, "used_at": now.isoformat(), "used_by_phone": from_number}},
    )
    logger.info(f"WhatsApp link success: phone {from_number} → user {user_id} via code {code}")
    return user


async def _get_linked_user(from_number: str) -> Optional[dict]:
    return await db.users.find_one(
        {"whatsapp_phone": from_number},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1},
    )


async def _get_recent_history(from_number: str, limit: int = 10) -> List[dict]:
    """Returns recent message history for an LLM context window."""
    docs = await db.whatsapp_cloud_messages.find(
        {"$or": [{"from": from_number}, {"to": from_number}]},
        {"_id": 0, "direction": 1, "body": 1, "received_at": 1, "sent_at": 1},
    ).sort([("received_at", -1), ("sent_at", -1)]).limit(limit * 2).to_list(limit * 2)
    docs.reverse()
    out = []
    for d in docs:
        if not d.get("body"):
            continue
        role = "user" if d.get("direction") == "inbound" else "assistant"
        out.append({"role": role, "content": d["body"]})
    return out


async def _handle_incoming_messages(messages: list, metadata: dict):
    """Persist incoming message, attempt linking, then AI reply."""
    phone_number_id = metadata.get("phone_number_id") or _env_phone_number_id()
    for msg in messages:
        from_number = msg.get("from")
        msg_id = msg.get("id")
        msg_type = msg.get("type")
        timestamp = msg.get("timestamp")
        text_body = msg.get("text", {}).get("body", "") if msg_type == "text" else ""

        await db.whatsapp_cloud_messages.insert_one({
            "direction": "inbound",
            "from": from_number,
            "message_id": msg_id,
            "type": msg_type,
            "body": text_body,
            "timestamp": timestamp,
            "received_at": datetime.now(timezone.utc).isoformat(),
        })

        if msg_type != "text" or not text_body or not phone_number_id:
            continue

        settings = await db.whatsapp_cloud_settings.find_one({"_id": "default"}, {"_id": 0}) or {}
        if not settings.get("auto_reply_enabled", True):
            continue

        # 1) Try linking via code
        newly_linked = await _try_link_with_code(text_body, from_number)
        if newly_linked:
            name = newly_linked.get("name") or newly_linked.get("email", "").split("@")[0]
            reply = (
                f"✅ تم ربط رقمك بنجاح، {name}!\n"
                f"يمكنك الآن مراسلتي بحرية وسأتذكر سياق محادثاتنا.\n\n"
                f"✅ Successfully linked, {name}!\n"
                f"You can now chat freely and I'll remember our conversation context."
            )
        else:
            # 2) Reply with AI (linked or anonymous)
            linked_user = await _get_linked_user(from_number)
            history = await _get_recent_history(from_number) if linked_user else None
            ai_reply = await _generate_ai_reply(
                text_body, from_number, linked_user=linked_user, history=history
            )
            if not linked_user:
                cta = (
                    "\n\n💡 للاستفادة الكاملة وحفظ محادثاتك، سجّل في "
                    "https://letsm.ai وأرسل لي الكود من حسابك."
                )
                # Avoid duplicating the CTA if AI already mentioned letsm.ai
                if "letsm.ai" not in ai_reply.lower():
                    ai_reply = ai_reply + cta
            reply = ai_reply

        try:
            sent_id = await send_text_message(phone_number_id, from_number, reply)
            await db.whatsapp_cloud_messages.insert_one({
                "direction": "outbound",
                "to": from_number,
                "message_id": sent_id,
                "type": "text",
                "body": reply,
                "in_reply_to": msg_id,
                "sent_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.error(f"Failed to send Cloud API reply to {from_number}: {e}")


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


# ══════════════════════════════════════════════════════════════════
#  USER-FACING LINKING (for the dashboard "Link WhatsApp" feature)
# ══════════════════════════════════════════════════════════════════

class LinkStatusOut(BaseModel):
    linked: bool
    phone: Optional[str] = None
    linked_at: Optional[str] = None
    business_number: Optional[str] = None


class LinkCodeOut(BaseModel):
    code: str
    expires_at: str
    expires_in_seconds: int
    business_number: Optional[str] = None
    instructions_en: str
    instructions_ar: str


@whatsapp_cloud_router.get("/link/status", response_model=LinkStatusOut)
async def get_link_status(user: dict = Depends(get_current_user)):
    """Returns whether the current user has a linked WhatsApp phone."""
    me = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "whatsapp_phone": 1, "whatsapp_linked_at": 1},
    ) or {}
    biz = os.environ.get("META_BUSINESS_DISPLAY_NUMBER") or "+968 7154 7480"
    return LinkStatusOut(
        linked=bool(me.get("whatsapp_phone")),
        phone=me.get("whatsapp_phone"),
        linked_at=me.get("whatsapp_linked_at"),
        business_number=biz,
    )


@whatsapp_cloud_router.post("/link/code", response_model=LinkCodeOut)
async def generate_link_code(user: dict = Depends(get_current_user)):
    """Generates a fresh linking code valid for 15 minutes. Replaces any prior unused code."""
    code = _generate_linking_code()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=LINKING_CODE_TTL_MINUTES)

    # Invalidate older unused codes for the same user
    await db.whatsapp_link_codes.update_many(
        {"user_id": user["user_id"], "used": {"$ne": True}},
        {"$set": {"used": True, "used_at": now.isoformat(), "expired": True}},
    )
    await db.whatsapp_link_codes.insert_one({
        "code": code,
        "user_id": user["user_id"],
        "user_email": user.get("email"),
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "used": False,
    })

    biz = os.environ.get("META_BUSINESS_DISPLAY_NUMBER") or "+968 7154 7480"
    return LinkCodeOut(
        code=code,
        expires_at=expires_at.isoformat(),
        expires_in_seconds=LINKING_CODE_TTL_MINUTES * 60,
        business_number=biz,
        instructions_en=f"Open WhatsApp, send this exact code to {biz}: {code}",
        instructions_ar=f"افتح واتساب وأرسل هذا الكود بالضبط إلى {biz}: {code}",
    )


@whatsapp_cloud_router.delete("/link")
async def unlink_whatsapp(user: dict = Depends(get_current_user)):
    """Removes the link between the user's account and their WhatsApp number."""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$unset": {"whatsapp_phone": "", "whatsapp_linked_at": ""}},
    )
    return {"success": True}
