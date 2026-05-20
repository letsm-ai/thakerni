from fastapi import APIRouter, HTTPException, Depends, Request, Response
from datetime import datetime, timezone, timedelta
from database import db, RESEND_API_KEY, SENDER_EMAIL
from auth_helpers import (
    hash_password, verify_password, create_jwt_token,
    get_current_user, capture_geo
)
from models import UserCreate, UserLogin, UserResponse, TokenResponse
from pydantic import BaseModel, EmailStr
import database as _db_module
import uuid
import os
import secrets
import httpx
import asyncio
import logging
import resend

logger = logging.getLogger(__name__)
auth_router = APIRouter(prefix="/api/auth")


# ── Request schemas for password reset & Google OAuth ──
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token (JWT) returned by GIS


@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, request: Request):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pw = hash_password(user_data.password)

    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_pw,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    asyncio.create_task(capture_geo(request, user_id))
    token = create_jwt_token(user_id, user_data.email)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user_id, email=user_data.email, name=user_data.name,
            picture=None, created_at=datetime.now(timezone.utc)
        )
    )


@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    asyncio.create_task(capture_geo(request, user["user_id"]))
    token = create_jwt_token(user["user_id"], user["email"])

    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"], email=user["email"], name=user["name"],
            picture=user.get("picture"), created_at=created_at,
            role=user.get("role", "user")
        )
    )


# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@auth_router.post("/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id from Emergent OAuth for user data"""
    body = await request.json()
    session_id = body.get("session_id")

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient() as http_client:
        auth_response = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )

        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")

        auth_data = auth_response.json()

    user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})

    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": auth_data["name"], "picture": auth_data.get("picture")}}
        )
        user["name"] = auth_data["name"]
        user["picture"] = auth_data.get("picture")

    session_token = auth_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 60 * 60
    )

    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)

    return {
        "user_id": user.get("user_id", user_id),
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "created_at": created_at.isoformat(),
        "role": user.get("role", "user")
    }


@auth_router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)

    return UserResponse(
        user_id=user["user_id"], email=user["email"], name=user["name"],
        picture=user.get("picture"), created_at=created_at,
        role=user.get("role", "user")
    )


@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}


# ─────────────────────────────────────────────────────────────
# Forgot Password / Reset Password (Resend email delivery)
# ─────────────────────────────────────────────────────────────
def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "https://letsm.ai").rstrip("/")


def _reset_email_html(name: str, reset_link: str) -> str:
    safe_name = name or "there"
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#06b6d4,#2563eb);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">Let's M AI</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Password reset request</p>
  </div>
  <div style="background:white;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <p style="color:#1e293b;font-size:16px;margin:0 0 16px;">Hi {safe_name},</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      We received a request to reset your password. Click the button below to set a new password.
      This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
    </p>
    <div style="margin:28px 0;text-align:center;">
      <a href="{reset_link}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#06b6d4,#2563eb);color:white;text-decoration:none;border-radius:50px;font-weight:600;font-size:14px;">Reset Password</a>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;word-break:break-all;">
      Or copy this URL into your browser:<br/>{reset_link}
    </p>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">Let's M AI — your personal AI assistant.</p>
</div></body></html>"""


@auth_router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """Generates a one-time reset token and emails a reset link.
    Always returns success to prevent email enumeration."""
    user = await db.users.find_one({"email": payload.email}, {"_id": 0})

    # Only send if the user exists AND has a local password (not Google-only)
    if user and user.get("password"):
        # Invalidate any previously issued, unused tokens for this user
        await db.password_reset_tokens.update_many(
            {"user_id": user["user_id"], "used": False},
            {"$set": {"used": True, "invalidated_at": datetime.now(timezone.utc).isoformat()}}
        )

        token = secrets.token_urlsafe(48)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["user_id"],
            "email": user["email"],
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "used": False
        })

        reset_link = f"{_frontend_url()}/reset-password?token={token}"

        if _db_module.RESEND_API_KEY:
            try:
                resend.api_key = _db_module.RESEND_API_KEY
                resend.Emails.send({
                    "from": f"Let's M AI <{_db_module.SENDER_EMAIL}>",
                    "to": [user["email"]],
                    "subject": "Reset your Let's M AI password",
                    "html": _reset_email_html(user.get("name", ""), reset_link),
                })
                logger.info(f"Password reset email sent to {user['email']}")
            except Exception as e:
                logger.error(f"Failed to send reset email to {user['email']}: {e}")
        else:
            # No Resend key configured — log the link so devs can still test
            logger.warning(f"RESEND_API_KEY not set. Reset link for {user['email']}: {reset_link}")

    return {"message": "If an account exists for that email, a reset link has been sent."}


@auth_router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    record = await db.password_reset_tokens.find_one({"token": payload.token}, {"_id": 0})
    if not record or record.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    expires_at = record["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = await db.users.find_one({"user_id": record["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    new_hash = hash_password(payload.new_password)
    await db.users.update_one(
        {"user_id": record["user_id"]},
        {"$set": {"password": new_hash, "password_reset_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.password_reset_tokens.update_one(
        {"token": payload.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Invalidate any existing sessions for this user as a safety measure
    await db.user_sessions.delete_many({"user_id": record["user_id"]})

    return {"message": "Password updated successfully"}


# ─────────────────────────────────────────────────────────────
# Direct Google OAuth — ID token flow (no Emergent wrapper)
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
# ─────────────────────────────────────────────────────────────
@auth_router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleAuthRequest, request: Request):
    """Verifies a Google ID token (from GIS One-Tap/Sign-In button) and
    returns a Let's M AI JWT. Creates or links an account by email."""
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    try:
        # Verifies signature, audience, issuer and expiry
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError as e:
        logger.warning(f"Google ID token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email")
    if not email or not idinfo.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email not verified")

    name = idinfo.get("name") or email.split("@")[0]
    picture = idinfo.get("picture")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "google_id": idinfo.get("sub"),
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    else:
        update_doc = {
            "google_id": idinfo.get("sub"),
            "last_login_at": datetime.now(timezone.utc).isoformat(),
        }
        if not user.get("picture") and picture:
            update_doc["picture"] = picture
        if not user.get("name") and name:
            update_doc["name"] = name
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_doc})
        user.update(update_doc)

    asyncio.create_task(capture_geo(request, user["user_id"]))
    token = create_jwt_token(user["user_id"], user["email"])

    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"], email=user["email"], name=user["name"],
            picture=user.get("picture"), created_at=created_at,
            role=user.get("role", "user"),
        ),
    )
