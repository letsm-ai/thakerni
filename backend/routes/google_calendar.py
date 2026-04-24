"""
Google Calendar bidirectional sync routes.
Each user connects their own Google Calendar via OAuth2.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone, timedelta
from database import db
from auth_helpers import get_current_user
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
import os
import requests as http_requests
import uuid
import logging

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar"]

# Build redirect URI from REACT_APP_BACKEND_URL or fallback
REDIRECT_URI = None  # Set dynamically per request

gcal_router = APIRouter(prefix="/api/calendar/google")


def _get_redirect_uri(request: Request) -> str:
    """Build the OAuth callback URI from the incoming request."""
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/calendar/google/callback"


async def _get_google_creds(user_id: str, request: Request = None) -> Credentials:
    """Get valid Google credentials for a user, refreshing if needed."""
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "google_tokens": 1})
    if not user_doc or not user_doc.get("google_tokens"):
        raise HTTPException(status_code=400, detail="Google Calendar not connected. Please connect first.")

    tokens = user_doc["google_tokens"]
    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=GOOGLE_SCOPES
    )

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"google_tokens.access_token": creds.token}}
            )
        except Exception as e:
            logger.error(f"Token refresh failed for {user_id}: {e}")
            # Clear invalid tokens
            await db.users.update_one(
                {"user_id": user_id},
                {"$unset": {"google_tokens": ""}}
            )
            raise HTTPException(status_code=401, detail="Google Calendar session expired. Please reconnect.")

    return creds


def _build_service(creds: Credentials):
    return build('calendar', 'v3', credentials=creds, cache_discovery=False)


# ── OAuth Flow ──

@gcal_router.get("/connect")
async def google_calendar_connect(request: Request, user: dict = Depends(get_current_user)):
    """Start OAuth flow — redirect user to Google consent screen."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google Calendar not configured on server.")

    redirect_uri = _get_redirect_uri(request)

    # Store user_id in state so callback knows who initiated
    state = f"{user['user_id']}|{uuid.uuid4().hex[:8]}"
    await db.google_oauth_states.insert_one({
        "state": state,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    auth_url = (
        "https://accounts.google.com/o/oauth2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={'%20'.join(GOOGLE_SCOPES)}"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={state}"
    )

    return {"authorization_url": auth_url}


@gcal_router.get("/callback")
async def google_calendar_callback(request: Request, code: str = None, state: str = None, error: str = None):
    """Handle Google OAuth callback — exchange code for tokens."""
    if error:
        logger.error(f"Google OAuth error: {error}")
        return RedirectResponse("/dashboard/calendar?google_error=denied")

    if not code or not state:
        return RedirectResponse("/dashboard/calendar?google_error=missing_params")

    # Verify state
    state_doc = await db.google_oauth_states.find_one({"state": state})
    if not state_doc:
        return RedirectResponse("/dashboard/calendar?google_error=invalid_state")

    user_id = state_doc["user_id"]
    await db.google_oauth_states.delete_one({"state": state})

    redirect_uri = _get_redirect_uri(request)

    # Exchange code for tokens
    try:
        token_resp = http_requests.post('https://oauth2.googleapis.com/token', data={
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }).json()

        if 'error' in token_resp:
            logger.error(f"Token exchange error: {token_resp}")
            return RedirectResponse("/dashboard/calendar?google_error=token_exchange_failed")

        # Save tokens to user document
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "google_tokens": {
                    "access_token": token_resp["access_token"],
                    "refresh_token": token_resp.get("refresh_token"),
                    "token_type": token_resp.get("token_type"),
                    "expires_in": token_resp.get("expires_in"),
                    "connected_at": datetime.now(timezone.utc).isoformat()
                }
            }}
        )

        logger.info(f"Google Calendar connected for user {user_id}")
        return RedirectResponse("/dashboard/calendar?google_connected=true")

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return RedirectResponse("/dashboard/calendar?google_error=server_error")


@gcal_router.get("/status")
async def google_calendar_status(user: dict = Depends(get_current_user)):
    """Check if user has Google Calendar connected."""
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "google_tokens": 1})
    connected = bool(user_doc and user_doc.get("google_tokens"))
    return {
        "connected": connected,
        "connected_at": user_doc.get("google_tokens", {}).get("connected_at") if connected else None
    }


@gcal_router.post("/disconnect")
async def google_calendar_disconnect(user: dict = Depends(get_current_user)):
    """Disconnect Google Calendar."""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$unset": {"google_tokens": ""}}
    )
    return {"message": "Google Calendar disconnected"}


# ── Read Events from Google Calendar ──

@gcal_router.get("/events")
async def get_google_events(
    request: Request,
    user: dict = Depends(get_current_user),
    time_min: str = None,
    time_max: str = None,
    max_results: int = 50
):
    """Fetch events from user's Google Calendar."""
    creds = await _get_google_creds(user["user_id"], request)
    service = _build_service(creds)

    now = datetime.now(timezone.utc)
    if not time_min:
        time_min = (now - timedelta(days=30)).isoformat()
    if not time_max:
        time_max = (now + timedelta(days=60)).isoformat()

    try:
        result = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = []
        for item in result.get('items', []):
            start = item.get('start', {})
            end = item.get('end', {})
            events.append({
                "google_event_id": item['id'],
                "title": item.get('summary', '(No title)'),
                "description": item.get('description', ''),
                "start_time": start.get('dateTime') or start.get('date'),
                "end_time": end.get('dateTime') or end.get('date'),
                "all_day": 'date' in start,
                "location": item.get('location', ''),
                "html_link": item.get('htmlLink', ''),
                "source": "google"
            })

        return {"events": events, "count": len(events)}

    except Exception as e:
        logger.error(f"Google Calendar fetch error: {e}")
        if "invalid_grant" in str(e).lower() or "token" in str(e).lower():
            await db.users.update_one({"user_id": user["user_id"]}, {"$unset": {"google_tokens": ""}})
            raise HTTPException(status_code=401, detail="Google Calendar session expired. Please reconnect.")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Google events: {str(e)[:100]}")


# ── Write Events to Google Calendar ──

@gcal_router.post("/events")
async def create_google_event(request: Request, user: dict = Depends(get_current_user)):
    """Create an event in user's Google Calendar."""
    body = await request.json()
    creds = await _get_google_creds(user["user_id"])
    service = _build_service(creds)

    title = body.get("title", "Letsm AI Event")
    description = body.get("description", "")
    start_time = body.get("start_time")
    end_time = body.get("end_time")
    all_day = body.get("all_day", False)
    location = body.get("location", "")

    if not start_time or not end_time:
        raise HTTPException(status_code=400, detail="start_time and end_time are required")

    event_body = {
        'summary': title,
        'description': description,
        'location': location,
    }

    if all_day:
        # All-day events use 'date' format (YYYY-MM-DD)
        event_body['start'] = {'date': start_time[:10]}
        event_body['end'] = {'date': end_time[:10]}
    else:
        event_body['start'] = {'dateTime': start_time, 'timeZone': 'UTC'}
        event_body['end'] = {'dateTime': end_time, 'timeZone': 'UTC'}

    try:
        created = service.events().insert(calendarId='primary', body=event_body).execute()

        return {
            "google_event_id": created['id'],
            "title": created.get('summary'),
            "html_link": created.get('htmlLink'),
            "message": "Event created in Google Calendar"
        }
    except Exception as e:
        logger.error(f"Google Calendar create error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)[:100]}")


@gcal_router.delete("/events/{event_id}")
async def delete_google_event(event_id: str, user: dict = Depends(get_current_user)):
    """Delete an event from user's Google Calendar."""
    creds = await _get_google_creds(user["user_id"])
    service = _build_service(creds)

    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        return {"message": "Event deleted from Google Calendar"}
    except Exception as e:
        logger.error(f"Google Calendar delete error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete event: {str(e)[:100]}")


# ── Sync: Push local events to Google ──

@gcal_router.post("/sync/push")
async def sync_push_to_google(user: dict = Depends(get_current_user)):
    """Push all local calendar events to Google Calendar."""
    creds = await _get_google_creds(user["user_id"])
    service = _build_service(creds)

    # Get local events not yet synced
    local_events = await db.calendar_events.find(
        {"user_id": user["user_id"], "google_event_id": {"$exists": False}},
        {"_id": 0}
    ).to_list(100)

    synced = 0
    errors = 0

    for evt in local_events:
        try:
            start_time = evt.get("start_time")
            end_time = evt.get("end_time")
            if isinstance(start_time, str):
                start_time = start_time
            if isinstance(end_time, str):
                end_time = end_time

            event_body = {
                'summary': evt['title'],
                'description': evt.get('description', ''),
            }

            if evt.get('all_day'):
                event_body['start'] = {'date': start_time[:10]}
                event_body['end'] = {'date': end_time[:10]}
            else:
                event_body['start'] = {'dateTime': start_time, 'timeZone': 'UTC'}
                event_body['end'] = {'dateTime': end_time, 'timeZone': 'UTC'}

            created = service.events().insert(calendarId='primary', body=event_body).execute()

            # Link the local event to the Google event
            await db.calendar_events.update_one(
                {"event_id": evt["event_id"]},
                {"$set": {"google_event_id": created['id']}}
            )
            synced += 1
        except Exception as e:
            logger.error(f"Sync push error for event {evt.get('event_id')}: {e}")
            errors += 1

    return {"synced": synced, "errors": errors, "message": f"Pushed {synced} events to Google Calendar"}


@gcal_router.post("/sync/pull")
async def sync_pull_from_google(user: dict = Depends(get_current_user)):
    """Pull events from Google Calendar and save locally."""
    creds = await _get_google_creds(user["user_id"])
    service = _build_service(creds)

    now = datetime.now(timezone.utc)
    time_min = (now - timedelta(days=7)).isoformat()
    time_max = (now + timedelta(days=60)).isoformat()

    try:
        result = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            maxResults=100,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        imported = 0
        skipped = 0

        for item in result.get('items', []):
            google_id = item['id']

            # Check if already imported
            existing = await db.calendar_events.find_one({
                "user_id": user["user_id"],
                "google_event_id": google_id
            })
            if existing:
                skipped += 1
                continue

            start = item.get('start', {})
            end = item.get('end', {})
            is_all_day = 'date' in start

            event_doc = {
                "event_id": f"evt_{uuid.uuid4().hex[:12]}",
                "user_id": user["user_id"],
                "google_event_id": google_id,
                "title": item.get('summary', '(No title)'),
                "description": item.get('description', ''),
                "start_time": start.get('dateTime') or start.get('date'),
                "end_time": end.get('dateTime') or end.get('date'),
                "all_day": is_all_day,
                "source": "google",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.calendar_events.insert_one(event_doc)
            imported += 1

        return {"imported": imported, "skipped": skipped, "message": f"Pulled {imported} new events from Google Calendar"}

    except Exception as e:
        logger.error(f"Sync pull error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to pull events: {str(e)[:100]}")
