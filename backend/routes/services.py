from fastapi import APIRouter, HTTPException, Depends, Request, Response
from datetime import datetime, timezone, timedelta
from database import db, STRIPE_API_KEY, SUBSCRIPTION_PLANS, EMERGENT_LLM_KEY
from auth_helpers import get_current_user
from models import CheckoutRequest, WhatsAppAIRequest
import uuid
import csv
import io
import httpx
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

logger = logging.getLogger(__name__)
services_router = APIRouter(prefix="/api")

WHATSAPP_SERVICE_URL = "http://localhost:3001"


# ==================== DATA EXPORT ====================

def _to_csv_response(rows: list, fieldnames: list, filename: str):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for row in rows:
        writer.writerow({k: str(row.get(k, "")) for k in fieldnames})
    return Response(
        content=output.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@services_router.get("/export/tasks")
async def export_tasks(format: str = "json", user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    if format == "csv":
        return _to_csv_response(tasks, ["task_id", "title", "status", "priority", "due_date", "created_at"], "tasks.csv")
    return {"tasks": tasks, "count": len(tasks), "exported_at": datetime.now(timezone.utc).isoformat()}


@services_router.get("/export/reminders")
async def export_reminders(format: str = "json", user: dict = Depends(get_current_user)):
    reminders = await db.reminders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    if format == "csv":
        return _to_csv_response(reminders, ["reminder_id", "title", "remind_at", "status", "created_at"], "reminders.csv")
    return {"reminders": reminders, "count": len(reminders), "exported_at": datetime.now(timezone.utc).isoformat()}


@services_router.get("/export/conversations")
async def export_conversations(format: str = "json", user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for conv in conversations:
        messages = await db.messages.find({"conversation_id": conv["conversation_id"]}, {"_id": 0}).sort("created_at", 1).to_list(500)
        result.append({**conv, "messages": messages})

    if format == "csv":
        rows = []
        for conv in result:
            for msg in conv.get("messages", []):
                rows.append({
                    "conversation_id": conv.get("conversation_id"),
                    "conversation_title": conv.get("title", ""),
                    "role": msg.get("role", ""),
                    "content": msg.get("content", ""),
                    "created_at": msg.get("created_at", "")
                })
        return _to_csv_response(rows, ["conversation_id", "conversation_title", "role", "content", "created_at"], "conversations.csv")

    return {"conversations": result, "count": len(result), "exported_at": datetime.now(timezone.utc).isoformat()}


@services_router.get("/export/all")
async def export_all_data(format: str = "json", user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    reminders = await db.reminders.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    conversations = await db.conversations.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)

    conv_data = []
    for conv in conversations:
        messages = await db.messages.find({"conversation_id": conv["conversation_id"]}, {"_id": 0}).sort("created_at", 1).to_list(500)
        conv_data.append({**conv, "messages": messages})

    if format == "csv":
        rows = []
        for t in tasks:
            rows.append({"type": "task", "id": t.get("task_id"), "title": t.get("title"), "status": t.get("status"), "priority": t.get("priority"), "created_at": t.get("created_at")})
        for r in reminders:
            rows.append({"type": "reminder", "id": r.get("reminder_id"), "title": r.get("title"), "status": r.get("status"), "priority": "", "created_at": r.get("created_at")})
        for conv in conv_data:
            for msg in conv.get("messages", []):
                rows.append({"type": "message", "id": msg.get("message_id"), "title": conv.get("title", ""), "status": msg.get("role", ""), "priority": "", "created_at": msg.get("created_at", "")})
        return _to_csv_response(rows, ["type", "id", "title", "status", "priority", "created_at"], "all_data.csv")

    return {
        "user": {"email": user["email"], "name": user.get("name")},
        "tasks": {"data": tasks, "count": len(tasks)},
        "reminders": {"data": reminders, "count": len(reminders)},
        "conversations": {"data": conv_data, "count": len(conv_data)},
        "exported_at": datetime.now(timezone.utc).isoformat()
    }


# ==================== STRIPE / SUBSCRIPTIONS ====================

@services_router.get("/subscription/plans")
async def get_subscription_plans():
    plans = []
    for plan_id, plan in SUBSCRIPTION_PLANS.items():
        plans.append({
            "plan_id": plan_id, "name": plan["name"], "price": plan["price"],
            "currency": plan["currency"], "features": plan["features"]
        })
    return {"plans": plans}


@services_router.get("/subscription/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    subscription = user_doc.get("subscription", "free")
    plan = SUBSCRIPTION_PLANS.get(subscription, SUBSCRIPTION_PLANS["free"])
    return {
        "plan_id": subscription, "plan_name": plan["name"],
        "price": plan["price"], "features": plan["features"], "limits": plan["limits"]
    }


@services_router.post("/subscription/checkout")
async def create_checkout_session(request: Request, body: CheckoutRequest, user: dict = Depends(get_current_user)):
    plan_id = body.plan_id
    origin_url = body.origin_url

    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = SUBSCRIPTION_PLANS[plan_id]
    if plan["price"] <= 0:
        raise HTTPException(status_code=400, detail="Free plan doesn't require payment")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{origin_url}/dashboard/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/dashboard/profile"

    metadata = {"user_id": user["user_id"], "plan_id": plan_id, "user_email": user["email"]}

    checkout_request = CheckoutSessionRequest(
        amount=plan["price"], currency=plan["currency"],
        success_url=success_url, cancel_url=cancel_url, metadata=metadata
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)

    transaction = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}", "session_id": session.session_id,
        "user_id": user["user_id"], "email": user["email"], "plan_id": plan_id,
        "amount": plan["price"], "currency": plan["currency"],
        "payment_status": "initiated", "status": "pending", "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    return {"url": session.url, "session_id": session.session_id}


@services_router.get("/subscription/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    checkout_status = await stripe_checkout.get_checkout_status(session_id)

    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = {
        "payment_status": checkout_status.payment_status,
        "status": checkout_status.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    if checkout_status.payment_status == "paid" and transaction.get("payment_status") != "paid":
        plan_id = transaction.get("plan_id") or checkout_status.metadata.get("plan_id", "pro")
        await db.users.update_one(
            {"user_id": transaction["user_id"]},
            {"$set": {"subscription": plan_id, "subscription_updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        update_data["processed"] = True
        logger.info(f"User {transaction['user_id']} upgraded to {plan_id}")

    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_data})
    return {
        "status": checkout_status.status, "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total, "currency": checkout_status.currency,
        "plan_id": transaction.get("plan_id")
    }


@services_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        webhook_response = await stripe_checkout.handle_webhook(body, signature)

        if webhook_response.payment_status == "paid":
            transaction = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id}, {"_id": 0}
            )
            if transaction and transaction.get("payment_status") != "paid":
                plan_id = transaction.get("plan_id", "pro")
                await db.users.update_one(
                    {"user_id": transaction["user_id"]},
                    {"$set": {"subscription": plan_id, "subscription_updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "paid", "status": "complete", "processed": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                logger.info(f"Webhook: User {transaction['user_id']} upgraded to {plan_id}")

        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"received": True, "error": str(e)}


# ==================== WHATSAPP ====================

async def _get_wa_user_profile(phone: str) -> dict:
    """Get or create a WhatsApp user profile for memory/personalization."""
    profile = await db.wa_profiles.find_one({"phone": phone}, {"_id": 0})
    if not profile:
        profile = {
            "phone": phone,
            "name": None,
            "preferences": [],
            "facts": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wa_profiles.insert_one(profile)
    return profile


async def _get_wa_history(phone: str, limit: int = 20) -> list:
    """Get recent WhatsApp conversation history for context."""
    messages = await db.whatsapp_messages.find(
        {"phone_number": phone}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    messages.reverse()
    return messages


async def _update_wa_profile(phone: str, ai_response: str, user_message: str):
    """Extract and save user facts/preferences from conversation."""
    # Simple extraction: if AI learned something about the user, save it
    lower = user_message.lower()
    updates = {}

    # Detect name
    name_hints = ['اسمي', 'انا', 'أنا', 'my name is', "i'm ", 'i am ']
    for hint in name_hints:
        if hint in lower:
            parts = user_message.split(hint, 1)
            if len(parts) > 1:
                name_candidate = parts[1].strip().split()[0:2]
                name = ' '.join(name_candidate).strip('.,!؟')
                if len(name) > 1:
                    updates["name"] = name
                    break

    if updates:
        await db.wa_profiles.update_one({"phone": phone}, {"$set": updates})


@services_router.post("/whatsapp/ai")
async def whatsapp_ai_process(body: WhatsAppAIRequest):
    session_id = f"wa_{body.phone_number}"

    # Get user profile and conversation history
    profile = await _get_wa_user_profile(body.phone_number)
    history = await _get_wa_history(body.phone_number, limit=20)

    # Build context from history
    history_text = ""
    if history:
        recent = history[-15:]  # Last 15 exchanges
        for msg in recent:
            history_text += f"User: {msg.get('user_message', '')}\nAssistant: {msg.get('ai_response', '')}\n\n"

    # Current date/time info
    now = datetime.now(timezone.utc)
    date_info = now.strftime("%A, %B %d, %Y at %I:%M %p UTC")
    date_info_ar = now.strftime("%Y-%m-%d %H:%M")

    # User profile context
    profile_context = ""
    if profile.get("name"):
        profile_context += f"User's name: {profile['name']}. "
    if profile.get("facts"):
        profile_context += f"Known facts: {', '.join(profile['facts'][-5:])}. "

    system_prompt = f"""You are Letsm AI, a smart personal WhatsApp assistant for this specific user. You have memory and context.

CURRENT DATE & TIME: {date_info} ({date_info_ar})
Today is {now.strftime('%A')}. Use this for any time-related requests (today, tomorrow, this week, etc.).

USER PROFILE: {profile_context if profile_context else 'New user - learn about them through conversation.'}

CONVERSATION HISTORY (recent messages):
{history_text if history_text else 'No previous messages - this is the start of the conversation.'}

RULES:
1. ALWAYS detect and respond in the user's language. If Arabic, respond in Arabic. If English, respond in English.
2. You have FULL conversation history above. Use it to understand context. If the user says "1" or "2" or any number, look at your LAST message to understand what options you gave them.
3. When the user asks to set reminders or tasks, use the CURRENT DATE above to calculate the correct date/time. "Today" = {now.strftime('%Y-%m-%d')}, "Tomorrow" = {(now + timedelta(days=1)).strftime('%Y-%m-%d')}.
4. Keep responses SHORT and WhatsApp-friendly. Use *bold* for emphasis.
5. Remember everything the user tells you about themselves (name, habits, preferences).
6. Do NOT ask unnecessary questions. If the user says "ذكرني اتصل بزوجتي الساعة 10" - confirm and create the reminder directly.
7. When giving options, use simple text not numbered lists. If you must use numbers, remember them in context.
8. Be proactive - suggest helpful follow-ups based on what you know about the user.

أنت مساعد ذكي شخصي عبر واتساب. لديك ذاكرة كاملة للمحادثات السابقة. استخدم السياق دائماً.
التاريخ الحالي: {date_info_ar}"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY, session_id=session_id,
            system_message=system_prompt
        )
        chat.with_model("openai", "gpt-5.2")
        user_message_obj = UserMessage(text=body.message)
        ai_response = await chat.send_message(user_message_obj)

        # Save message to history
        await db.whatsapp_messages.insert_one({
            "phone_number": body.phone_number,
            "user_message": body.message,
            "ai_response": ai_response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        # Update user profile with learned info
        await _update_wa_profile(body.phone_number, ai_response, body.message)

        return {"response": ai_response, "success": True}
    except Exception as e:
        logger.error(f"WhatsApp AI error: {str(e)}")
        if "budget" in str(e).lower() or "exceeded" in str(e).lower():
            return {"response": "عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً. حاول لاحقاً.", "success": False}
        return {"response": "عذراً، حدث خطأ. حاول مرة ثانية.", "success": False}


@services_router.get("/whatsapp/status")
async def get_whatsapp_status(user: dict = Depends(get_current_user)):
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(f"{WHATSAPP_SERVICE_URL}/status", timeout=5.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp service error: {str(e)}")
        return {"connected": False, "error": "WhatsApp service unavailable"}


@services_router.get("/whatsapp/qr")
async def get_whatsapp_qr(user: dict = Depends(get_current_user)):
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(f"{WHATSAPP_SERVICE_URL}/qr", timeout=5.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp QR error: {str(e)}")
        return {"qr": None, "message": "WhatsApp service unavailable. Please try again."}


@services_router.post("/whatsapp/send")
async def send_whatsapp_message(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(f"{WHATSAPP_SERVICE_URL}/send", json=body, timeout=10.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp send error: {str(e)}")
        return {"success": False, "error": str(e)}


@services_router.post("/whatsapp/connect")
async def connect_whatsapp(user: dict = Depends(get_current_user)):
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(f"{WHATSAPP_SERVICE_URL}/connect", timeout=15.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp connect error: {str(e)}")
        return {"success": False, "error": "WhatsApp service unavailable"}


@services_router.post("/whatsapp/disconnect")
async def disconnect_whatsapp(user: dict = Depends(get_current_user)):
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(f"{WHATSAPP_SERVICE_URL}/disconnect", timeout=5.0)
            return response.json()
    except Exception as e:
        logger.error(f"WhatsApp disconnect error: {str(e)}")
        return {"success": False, "error": str(e)}
