from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
from database import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
import bcrypt
import jwt
import httpx
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def capture_geo(request: Request, user_id: str):
    """Capture user's country/city from IP using a free geolocation API."""
    try:
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "").split(",")[0].strip()
        if not ip or ip in ("127.0.0.1", "::1", "localhost"):
            return
        async with httpx.AsyncClient() as http_client:
            r = await http_client.get(f"http://ip-api.com/json/{ip}?fields=country,countryCode,city,region,timezone", timeout=3.0)
            if r.status_code == 200:
                geo = r.json()
                if geo.get("country"):
                    await db.users.update_one({"user_id": user_id}, {"$set": {
                        "geo": geo,
                        "last_login_ip": ip,
                        "last_login_at": datetime.now(timezone.utc).isoformat()
                    }})
    except Exception as e:
        logger.debug(f"Geo lookup failed: {e}")

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    # Check cookie first
    session_token = request.cookies.get("session_token")

    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user

    # Fallback to Authorization header (JWT)
    if credentials:
        payload = decode_jwt_token(credentials.credentials)
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user:
            return user

    raise HTTPException(status_code=401, detail="Not authenticated")
