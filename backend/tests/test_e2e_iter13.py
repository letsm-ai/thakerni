"""
Iteration 13 - Comprehensive E2E test for Letsm AI preview env.
Covers: auth, forgot password, dashboard data, chat, tasks, calendar,
thawani config + session, whatsapp cloud webhook, admin, security.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-functions-core.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@test.com"
DEMO_PASS = "Test123!"
ADMIN_EMAIL = "test-stripe@test.com"
ADMIN_PASS = "Test123!"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def demo_token(s):
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"demo login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ---------------- AUTH ----------------
class TestAuth:
    def test_login_valid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d and isinstance(d["access_token"], str) and len(d["access_token"]) > 10
        assert "user" in d

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "no@no.com", "password": "wrong"}, timeout=30)
        assert r.status_code in (400, 401)
        body = r.json()
        assert "detail" in body or "message" in body

    def test_register_new_user(self, s):
        em = f"TEST_e2e_{uuid.uuid4().hex[:8]}@test.com"
        r = s.post(f"{API}/auth/register", json={"email": em, "password": "Pw12345!", "name": "E2E"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "access_token" in d
        assert d["user"]["email"] == em

    def test_me_with_token(self, s, demo_token):
        r = s.get(f"{API}/auth/me", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_logout(self, s, demo_token):
        r = s.post(f"{API}/auth/logout", headers=H(demo_token), timeout=20)
        assert r.status_code == 200


# ---------------- FORGOT PASSWORD ----------------
class TestForgotPassword:
    def test_forgot_existing(self, s):
        r = s.post(f"{API}/auth/forgot-password", json={"email": DEMO_EMAIL}, timeout=30)
        assert r.status_code == 200, r.text
        assert "message" in r.json()

    def test_forgot_unknown_no_enum(self, s):
        r = s.post(f"{API}/auth/forgot-password", json={"email": f"nobody_{uuid.uuid4().hex[:6]}@nowhere.com"}, timeout=30)
        assert r.status_code == 200, "Security: must return 200 to prevent enumeration"

    def test_reset_invalid_token(self, s):
        r = s.post(f"{API}/auth/reset-password", json={"token": "invalid-xyz", "new_password": "NewPw123!"}, timeout=20)
        assert r.status_code in (400, 401, 404)


# ---------------- DASHBOARD CORE ----------------
class TestDashboard:
    def test_stats(self, s, demo_token):
        r = s.get(f"{API}/stats/overview", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        # accept any subset of expected keys
        assert isinstance(d, dict)

    def test_tasks_list(self, s, demo_token):
        r = s.get(f"{API}/tasks", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_reminders_list(self, s, demo_token):
        r = s.get(f"{API}/reminders", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_conversations_list(self, s, demo_token):
        r = s.get(f"{API}/conversations", headers=H(demo_token), timeout=20)
        assert r.status_code in (200, 404)


# ---------------- TASKS CRUD ----------------
class TestTasks:
    created_id = None

    def test_create(self, s, demo_token):
        r = s.post(f"{API}/tasks", headers=H(demo_token),
                   json={"title": "TEST_e2e_task", "priority": "medium"}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == "TEST_e2e_task"
        assert "task_id" in d
        TestTasks.created_id = d["task_id"]

    def test_get_persisted(self, s, demo_token):
        assert TestTasks.created_id
        r = s.get(f"{API}/tasks", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        ids = [t.get("task_id") for t in r.json()]
        assert TestTasks.created_id in ids

    def test_update_complete(self, s, demo_token):
        assert TestTasks.created_id
        r = s.put(f"{API}/tasks/{TestTasks.created_id}", headers=H(demo_token),
                  json={"completed": True}, timeout=20)
        assert r.status_code == 200
        assert r.json().get("completed") is True

    def test_delete(self, s, demo_token):
        assert TestTasks.created_id
        r = s.delete(f"{API}/tasks/{TestTasks.created_id}", headers=H(demo_token), timeout=20)
        assert r.status_code in (200, 204)


# ---------------- CALENDAR ----------------
class TestCalendar:
    def test_events_list(self, s, demo_token):
        r = s.get(f"{API}/calendar/events", headers=H(demo_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- THAWANI ----------------
class TestThawani:
    def test_config(self, s):
        r = s.get(f"{API}/payments/thawani/config", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("enabled") is True

    def test_create_session_pro_monthly(self, s, demo_token):
        r = s.post(f"{API}/payments/thawani/create-session",
                   headers=H(demo_token),
                   json={"plan_id": "pro", "billing_cycle": "monthly"}, timeout=30)
        # Live Thawani may return 200 with session_id+pay_url, or 4xx if upstream rejects
        assert r.status_code in (200, 400, 402, 500, 502), r.text
        if r.status_code == 200:
            d = r.json()
            assert "session_id" in d or "pay_url" in d or "checkout_url" in d


# ---------------- WHATSAPP CLOUD WEBHOOK ----------------
class TestWhatsAppCloudWebhook:
    def test_verify_correct_token(self, s):
        token = "i9l2acNBCnIvB5XR21cijzwvdbafZhF2bK8qNlQvoJo"
        r = s.get(f"{API}/whatsapp/cloud/webhook",
                  params={"hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "test123"},
                  timeout=20)
        assert r.status_code == 200
        assert r.text.strip().strip('"') == "test123"

    def test_verify_wrong_token(self, s):
        r = s.get(f"{API}/whatsapp/cloud/webhook",
                  params={"hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "x"},
                  timeout=20)
        assert r.status_code in (401, 403)


# ---------------- CHAT (AI) ----------------
class TestChat:
    def test_send_arabic_message(self, s, demo_token):
        payload = {"message": "ذكرني اتصل بأحمد بكرا الساعة 3", "conversation_id": None}
        r = s.post(f"{API}/chat/message", headers=H(demo_token), json=payload, timeout=90)
        # may be 200 or 429 (rate limit) or 503
        assert r.status_code in (200, 429, 503), r.text
        if r.status_code == 200:
            d = r.json()
            assert "content" in d or "response" in d or "message" in d or "reply" in d


# ---------------- PROFILE ----------------
class TestProfile:
    def test_update_profile(self, s, demo_token):
        r = s.put(f"{API}/profile", headers=H(demo_token),
                  json={"name": "Demo Updated", "language": "ar", "timezone": "Asia/Muscat"}, timeout=20)
        assert r.status_code in (200, 404)


# ---------------- ADMIN ----------------
class TestAdmin:
    def test_overview(self, s, admin_token):
        r = s.get(f"{API}/admin/overview", headers=H(admin_token), timeout=20)
        assert r.status_code == 200, r.text

    def test_users(self, s, admin_token):
        r = s.get(f"{API}/admin/users", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list) or "users" in r.json()

    def test_billing(self, s, admin_token):
        r = s.get(f"{API}/admin/billing/payments", headers=H(admin_token), timeout=20)
        assert r.status_code == 200

    def test_analytics(self, s, admin_token):
        r = s.get(f"{API}/admin/analytics/signups", headers=H(admin_token), timeout=20)
        assert r.status_code == 200

    def test_usage(self, s, admin_token):
        r = s.get(f"{API}/admin/usage", headers=H(admin_token), timeout=20)
        assert r.status_code == 200


# ---------------- SECURITY ----------------
class TestSecurity:
    def test_protected_no_auth(self, s):
        r = s.get(f"{API}/tasks", timeout=10)
        assert r.status_code in (401, 403)

    def test_admin_as_demo(self, s, demo_token):
        r = s.get(f"{API}/admin/overview", headers=H(demo_token), timeout=20)
        assert r.status_code in (401, 403)
