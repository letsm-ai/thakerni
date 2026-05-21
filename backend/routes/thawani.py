"""
Thawani Pay integration for Letsm AI subscriptions.

Thawani E-Commerce API does NOT support native recurring billing, so we model
subscriptions as one-off payments with an expiry date stored on the user doc.
A scheduler job downgrades expired users back to the Free plan.

Docs: https://docs.thawani.om
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import Literal
import httpx
import uuid
import logging
import os

from database import (
    db,
    SUBSCRIPTION_PLANS,
    THAWANI_BASE_URL,
    THAWANI_PAY_URL,
    THAWANI_PUBLIC_KEY,
)
from auth_helpers import get_current_user
from routes.invoices import (
    send_subscription_invoice_email,
    build_invoice_record,
)
import database as _db_module

logger = logging.getLogger(__name__)
thawani_router = APIRouter(prefix="/api/payments/thawani")


# ── Schemas ──
class ThawaniCheckoutRequest(BaseModel):
    plan_id: Literal["pro", "business"]
    billing_cycle: Literal["monthly", "yearly"] = "monthly"


# ── Helpers ──
def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "https://letsm.ai").rstrip("/")


def _thawani_headers() -> dict:
    if not _db_module.THAWANI_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Thawani not configured")
    return {
        "thawani-api-key": _db_module.THAWANI_SECRET_KEY,
        "Content-Type": "application/json",
    }


def _plan_amount_baisas(plan_id: str, billing_cycle: str) -> int:
    """Returns price in baisas (1 OMR = 1000 baisas)."""
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    price_omr = plan["price_yearly"] if billing_cycle == "yearly" else plan["price"]
    if price_omr <= 0:
        raise HTTPException(status_code=400, detail="Free plan does not require payment")
    return int(round(price_omr * 1000))


def _plan_label(plan_id: str, billing_cycle: str) -> str:
    plan = SUBSCRIPTION_PLANS[plan_id]
    cycle = "Yearly" if billing_cycle == "yearly" else "Monthly"
    return f"Let's M AI - {plan['name']} Plan ({cycle})"


# ── Endpoints ──
@thawani_router.post("/create-session")
async def create_thawani_session(
    payload: ThawaniCheckoutRequest,
    user: dict = Depends(get_current_user),
):
    """Creates a Thawani checkout session and returns redirect URL."""
    amount = _plan_amount_baisas(payload.plan_id, payload.billing_cycle)
    reference_id = f"sub_{uuid.uuid4().hex[:16]}"
    frontend = _frontend_url()

    body = {
        "client_reference_id": reference_id,
        "mode": "payment",
        "products": [
            {
                "name": _plan_label(payload.plan_id, payload.billing_cycle),
                "quantity": 1,
                "unit_amount": amount,
            }
        ],
        "success_url": f"{frontend}/dashboard/subscription/success?session_id={{CHECKOUT_SESSION_ID}}&provider=thawani",
        "cancel_url": f"{frontend}/dashboard/subscription/cancel",
        "metadata": {
            "user_id": user["user_id"],
            "plan_id": payload.plan_id,
            "billing_cycle": payload.billing_cycle,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                f"{THAWANI_BASE_URL}/checkout/session",
                headers=_thawani_headers(),
                json=body,
            )
        if r.status_code not in (200, 201):
            logger.error(f"Thawani create-session failed [{r.status_code}]: {r.text}")
            raise HTTPException(status_code=502, detail="Thawani API error")
        data = r.json().get("data") or {}
        session_id = data.get("session_id")
        if not session_id:
            logger.error(f"Thawani response missing session_id: {r.text}")
            raise HTTPException(status_code=502, detail="Invalid Thawani response")
    except httpx.RequestError as e:
        logger.error(f"Thawani network error: {e}")
        raise HTTPException(status_code=502, detail="Cannot reach Thawani")

    redirect_url = f"{THAWANI_PAY_URL}/{session_id}?key={THAWANI_PUBLIC_KEY}"

    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:16]}",
        "provider": "thawani",
        "session_id": session_id,
        "client_reference_id": reference_id,
        "user_id": user["user_id"],
        "plan_id": payload.plan_id,
        "billing_cycle": payload.billing_cycle,
        "amount_baisas": amount,
        "amount_omr": amount / 1000,
        "currency": "OMR",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"session_id": session_id, "url": redirect_url}


@thawani_router.get("/verify/{session_id}")
async def verify_thawani_session(session_id: str, user: dict = Depends(get_current_user)):
    """Polls Thawani for the session status; upgrades the user on success.
    Idempotent — safe to call multiple times."""
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "provider": "thawani"}, {"_id": 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if transaction["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # If already finalized, return cached state
    if transaction["status"] in ("paid", "failed", "cancelled"):
        return {
            "payment_status": transaction["status"],
            "plan_id": transaction["plan_id"],
            "billing_cycle": transaction["billing_cycle"],
            "amount_omr": transaction["amount_omr"],
        }

    # Poll Thawani
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{THAWANI_BASE_URL}/checkout/session/{session_id}",
                headers=_thawani_headers(),
            )
        if r.status_code != 200:
            logger.error(f"Thawani verify failed [{r.status_code}]: {r.text}")
            raise HTTPException(status_code=502, detail="Thawani API error")
        data = r.json().get("data") or {}
    except httpx.RequestError as e:
        logger.error(f"Thawani network error: {e}")
        raise HTTPException(status_code=502, detail="Cannot reach Thawani")

    payment_status = (data.get("payment_status") or "").lower()  # paid | unpaid | cancelled
    now_iso = datetime.now(timezone.utc).isoformat()

    if payment_status == "paid":
        # Calculate expiry
        days = 365 if transaction["billing_cycle"] == "yearly" else 30
        paid_at = datetime.now(timezone.utc)
        expires_dt = paid_at + timedelta(days=days)
        expires_at = expires_dt.isoformat()

        # Upgrade user
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "subscription": transaction["plan_id"],
                "subscription_plan": transaction["plan_id"],
                "subscription_cycle": transaction["billing_cycle"],
                "subscription_started_at": now_iso,
                "subscription_expires_at": expires_at,
                "subscription_provider": "thawani",
                "subscription_updated_at": now_iso,
            }}
        )
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "paid",
                "paid_at": now_iso,
                "thawani_invoice": data.get("invoice"),
            }}
        )

        # Generate + email invoice (best-effort; failure must not block upgrade)
        plan_label = _plan_label(transaction["plan_id"], transaction["billing_cycle"])
        try:
            invoice_number = await send_subscription_invoice_email(
                customer_email=user["email"],
                customer_name=user.get("name", ""),
                plan_label=plan_label,
                billing_cycle=transaction["billing_cycle"],
                total_omr=transaction["amount_omr"],
                paid_at=paid_at,
                expires_at=expires_dt,
                transaction_id=transaction["transaction_id"],
            )
            if invoice_number:
                record = build_invoice_record(
                    invoice_number=invoice_number,
                    user_id=user["user_id"],
                    customer_email=user["email"],
                    plan_id=transaction["plan_id"],
                    plan_label=plan_label,
                    billing_cycle=transaction["billing_cycle"],
                    total_omr=transaction["amount_omr"],
                    paid_at=paid_at,
                    expires_at=expires_dt,
                    transaction_id=transaction["transaction_id"],
                    session_id=session_id,
                )
                await db.invoices.insert_one(record)
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"invoice_number": invoice_number}}
                )
        except Exception as e:
            logger.error(f"Invoice generation failed for {user['email']}: {e}")

        logger.info(
            f"Thawani: user {user['user_id']} upgraded to {transaction['plan_id']}"
            f" ({transaction['billing_cycle']}) — expires {expires_at}"
        )
        return {
            "payment_status": "paid",
            "plan_id": transaction["plan_id"],
            "billing_cycle": transaction["billing_cycle"],
            "amount_omr": transaction["amount_omr"],
            "expires_at": expires_at,
        }

    if payment_status == "cancelled":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "cancelled", "cancelled_at": now_iso}}
        )

    return {
        "payment_status": payment_status or "unpaid",
        "plan_id": transaction["plan_id"],
        "billing_cycle": transaction["billing_cycle"],
        "amount_omr": transaction["amount_omr"],
    }


@thawani_router.get("/config")
async def thawani_config():
    """Returns whether Thawani is configured (for UI to show/hide the button)."""
    return {
        "enabled": bool(_db_module.THAWANI_SECRET_KEY and _db_module.THAWANI_PUBLIC_KEY),
        "mode": _db_module.THAWANI_MODE,
    }


@thawani_router.get("/invoices")
async def list_my_invoices(user: dict = Depends(get_current_user)):
    """Returns the authenticated user's invoices, newest first."""
    cursor = db.invoices.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("issued_at", -1).limit(50)
    invoices = [doc async for doc in cursor]
    return {"invoices": invoices}


# ─────────────────────────────────────────────────────────────
# Auto-downgrade job for expired subscriptions
# Called by the APScheduler (see server.py).
# ─────────────────────────────────────────────────────────────
async def downgrade_expired_subscriptions():
    """Find users whose subscription_expires_at < now and revert them to free."""
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = db.users.find(
        {
            "subscription": {"$in": ["pro", "business"]},
            "subscription_expires_at": {"$lt": now_iso},
        },
        {"_id": 0, "user_id": 1, "email": 1, "subscription": 1, "subscription_expires_at": 1},
    )
    downgraded = 0
    async for u in cursor:
        await db.users.update_one(
            {"user_id": u["user_id"]},
            {"$set": {
                "subscription": "free",
                "subscription_plan": "free",
                "subscription_downgraded_at": now_iso,
                "subscription_previous_plan": u["subscription"],
            }}
        )
        downgraded += 1
        logger.info(
            f"Auto-downgraded {u['email']} from {u['subscription']} → free"
            f" (expired {u.get('subscription_expires_at')})"
        )

    if downgraded:
        await db.subscription_downgrade_logs.insert_one({
            "log_id": str(uuid.uuid4()),
            "downgraded": downgraded,
            "timestamp": now_iso,
        })
    return downgraded
