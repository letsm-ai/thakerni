"""
Google Calendar bidirectional sync integration tests.
Tests new endpoints added for Google Calendar OAuth + bidirectional sync.
Also regression-tests login, tasks, and local calendar events still work.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ai-functions-core.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@test.com"
DEMO_PASSWORD = "Test123!"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(client):
    # Regression: POST /api/auth/login still works
    r = client.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token and isinstance(token, str) and len(token) > 0
    return token


@pytest.fixture(scope="module")
def auth_client(client, auth_token):
    client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return client


# ── Regression: Auth / Tasks / Local Calendar ──

class TestRegression:
    def test_login_ok(self, auth_token):
        assert isinstance(auth_token, str) and len(auth_token) > 10

    def test_tasks_list_with_auth(self, auth_client):
        r = auth_client.get(f"{API}/tasks")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_local_calendar_events(self, auth_client):
        r = auth_client.get(f"{API}/calendar/events")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── Google Calendar: connect/status/disconnect ──

class TestGoogleCalendar:
    def test_status_returns_connected_false_when_not_connected(self, auth_client):
        # Ensure not connected first (defensive)
        auth_client.post(f"{API}/calendar/google/disconnect")
        r = auth_client.get(f"{API}/calendar/google/status")
        assert r.status_code == 200
        body = r.json()
        assert "connected" in body
        assert body["connected"] is False

    def test_connect_returns_authorization_url(self, auth_client):
        r = auth_client.get(f"{API}/calendar/google/connect")
        assert r.status_code == 200, f"connect failed: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert "authorization_url" in body
        url = body["authorization_url"]
        assert url.startswith("https://accounts.google.com"), f"unexpected url: {url}"
        # OAuth2 required params
        assert "client_id=" in url
        assert "redirect_uri=" in url
        assert "response_type=code" in url
        assert "scope=" in url
        assert "state=" in url

    def test_disconnect_returns_message(self, auth_client):
        r = auth_client.post(f"{API}/calendar/google/disconnect")
        assert r.status_code == 200
        body = r.json()
        assert "message" in body
        assert isinstance(body["message"], str)

    def test_events_returns_400_when_not_connected(self, auth_client):
        # Make sure disconnected
        auth_client.post(f"{API}/calendar/google/disconnect")
        r = auth_client.get(f"{API}/calendar/google/events")
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"
        body = r.json()
        assert "detail" in body
        assert "not connected" in body["detail"].lower()

    def test_sync_pull_returns_400_when_not_connected(self, auth_client):
        auth_client.post(f"{API}/calendar/google/disconnect")
        r = auth_client.post(f"{API}/calendar/google/sync/pull")
        assert r.status_code == 400
        body = r.json()
        assert "detail" in body
        assert "not connected" in body["detail"].lower()

    def test_sync_push_returns_400_when_not_connected(self, auth_client):
        auth_client.post(f"{API}/calendar/google/disconnect")
        r = auth_client.post(f"{API}/calendar/google/sync/push")
        assert r.status_code == 400
        body = r.json()
        assert "detail" in body
        assert "not connected" in body["detail"].lower()

    def test_status_requires_auth(self, client):
        # Without Authorization header
        s = requests.Session()
        r = s.get(f"{API}/calendar/google/status")
        assert r.status_code in (401, 403)
