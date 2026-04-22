"""
Iteration 11 - P0 Security + P1 Refactor Testing
Tests the refactored modular backend (12 modules split from monolithic server.py)
and in-memory tokenStore auth integration.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ai-functions-core.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

REGULAR_USER = {"email": "demo@test.com", "password": "Test123!"}
ADMIN_USER = {"email": "test-stripe@test.com", "password": "Test123!"}


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def user_token(session):
    r = session.post(f"{API}/auth/login", json=REGULAR_USER, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Regular user login failed: {r.status_code} {r.text}")
    return r.json().get("access_token")


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json=ADMIN_USER, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json().get("access_token")


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health / Public endpoints ----------
class TestHealth:
    def test_health(self, session):
        r = session.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        assert "timestamp" in data

    def test_subscription_plans_public(self, session):
        r = session.get(f"{API}/subscription/plans", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # Either list of 3 plans or a {plans: [..]} wrapper
        plans = data if isinstance(data, list) else data.get("plans", [])
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"


# ---------- Auth ----------
class TestAuth:
    def test_login_returns_access_token(self, session):
        r = session.post(f"{API}/auth/login", json=REGULAR_USER, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 20

    def test_login_invalid_credentials(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "bad@x.com", "password": "nope"}, timeout=15)
        assert r.status_code in (401, 400, 403)

    def test_me_endpoint(self, session, user_token):
        r = session.get(f"{API}/auth/me", headers=auth(user_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("email") == REGULAR_USER["email"]


# ---------- Tasks CRUD ----------
class TestTasks:
    def test_list_tasks(self, session, user_token):
        r = session.get(f"{API}/tasks", headers=auth(user_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_and_get_task(self, session, user_token):
        payload = {"title": "TEST_refactor_task", "priority": "medium"}
        r = session.post(f"{API}/tasks", headers=auth(user_token), json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        assert created.get("title") == "TEST_refactor_task"
        task_id = created.get("id") or created.get("task_id")
        assert task_id

        # Verify in list
        r2 = session.get(f"{API}/tasks", headers=auth(user_token), timeout=15)
        assert r2.status_code == 200
        titles = [t.get("title") for t in r2.json()]
        assert "TEST_refactor_task" in titles

        # Cleanup
        session.delete(f"{API}/tasks/{task_id}", headers=auth(user_token), timeout=15)

    def test_tasks_requires_auth(self, session):
        r = session.get(f"{API}/tasks", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Reminders ----------
class TestReminders:
    def test_list_reminders(self, session, user_token):
        r = session.get(f"{API}/reminders", headers=auth(user_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Stats / Notifications / Profile (misc.py) ----------
class TestMisc:
    def test_stats_overview(self, session, user_token):
        r = session.get(f"{API}/stats/overview", headers=auth(user_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        # Typical keys
        for k in ("total_tasks", "total_reminders"):
            # At least one stat should exist
            pass
        assert len(data) > 0

    def test_notifications(self, session, user_token):
        r = session.get(f"{API}/notifications", headers=auth(user_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Email preferences ----------
class TestEmail:
    def test_email_preferences(self, session, user_token):
        r = session.get(f"{API}/email/preferences", headers=auth(user_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)


# ---------- Admin ----------
class TestAdmin:
    def test_admin_overview(self, session, admin_token):
        r = session.get(f"{API}/admin/overview", headers=auth(admin_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        # Should have user stats
        assert any(k in data for k in ("total_users", "users", "stats"))

    def test_admin_overview_forbidden_for_regular(self, session, user_token):
        r = session.get(f"{API}/admin/overview", headers=auth(user_token), timeout=15)
        assert r.status_code in (401, 403)


# ---------- Chat guest (public) ----------
class TestChatGuest:
    def test_guest_chat_endpoint_exists(self, session):
        # Non-strict, just check endpoint routing doesn't 404 (could be 400/422 for missing body)
        r = session.post(f"{API}/guest/chat", json={"message": "hi"}, timeout=60)
        # LLM could be slow, accept 200 or a valid 4xx shape, not 404
        assert r.status_code != 404
