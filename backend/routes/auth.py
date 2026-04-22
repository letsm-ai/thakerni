from fastapi import APIRouter, HTTPException, Depends, Request, Response
from datetime import datetime, timezone, timedelta
from database import db
from auth_helpers import (
    hash_password, verify_password, create_jwt_token,
    get_current_user, capture_geo
)
from models import UserCreate, UserLogin, UserResponse, TokenResponse
import uuid
import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)
auth_router = APIRouter(prefix="/api/auth")


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
