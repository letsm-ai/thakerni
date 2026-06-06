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
import os
import secrets
import string

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

logger = logging.getLogger(__name__)
services_router = APIRouter(prefix="/api")

WHATSAPP_SERVICE_URL = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:3001")


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
            "plan_id": plan_id,
            "name": plan["name"],
            "name_ar": plan.get("name_ar"),
            "price": plan["price"],
            "price_yearly": plan.get("price_yearly", plan["price"] * 12),
            "currency": plan["currency"],
            "features": plan["features"],
            "features_ar": plan.get("features_ar", plan["features"]),
        })
    return {"plans": plans}


@services_router.get("/subscription/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    subscription = user_doc.get("subscription", "free")
    plan = SUBSCRIPTION_PLANS.get(subscription, SUBSCRIPTION_PLANS["free"])
    return {
        "plan_id": subscription,
        "plan_name": plan["name"],
        "price": plan["price"],
        "features": plan["features"],
        "limits": plan["limits"],
        "cycle": user_doc.get("subscription_cycle"),
        "expires_at": user_doc.get("subscription_expires_at"),
        "provider": user_doc.get("subscription_provider"),
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


# ==================== WHATSAPP (Multi-User Bot) ====================

async def _get_wa_user_profile(phone: str) -> dict:  # noqa: F841 - kept for backward compatibility
    profile = await db.wa_profiles.find_one({"phone": phone}, {"_id": 0})
    if not profile:
        profile = {"phone": phone, "name": None, "preferences": [], "facts": [], "created_at": datetime.now(timezone.utc).isoformat()}
        await db.wa_profiles.insert_one(profile)
    return profile


async def _get_wa_history(phone: str, limit: int = 20) -> list:
    messages = await db.whatsapp_messages.find({"phone_number": phone}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    messages.reverse()
    return messages


async def _update_wa_profile(phone: str, ai_response: str, user_message: str):
    lower = user_message.lower()
    updates = {}
    for hint in ['اسمي', 'انا', 'أنا', 'my name is', "i'm ", 'i am ']:
        if hint in lower:
            parts = user_message.split(hint, 1)
            if len(parts) > 1:
                name = ' '.join(parts[1].strip().split()[0:2]).strip('.,!؟')
                if len(name) > 1:
                    updates["name"] = name
                    break
    if updates:
        await db.wa_profiles.update_one({"phone": phone}, {"$set": updates})


async def _check_wa_rate_limit(user_id: str, subscription: str) -> dict:
    if subscription in ("pro", "business"):
        return {"allowed": True, "remaining": -1}
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.whatsapp_messages.count_documents({"user_id": user_id, "created_at": {"$gte": today_start.isoformat()}})
    limit = 5
    return {"allowed": count < limit, "remaining": max(0, limit - count), "limit": limit}


# ── WhatsApp routes moved to whatsapp_cloud.py (Meta Cloud API) ──
# The old Baileys-based linking and AI endpoints have been removed.
# Frontend now uses /api/whatsapp/cloud/link/{status|code} instead.

