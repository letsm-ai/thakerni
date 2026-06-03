"""Iter15: Audit Logs filters/export + Team Calendar endpoint tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "test-stripe@test.com"
ADMIN_PASS = "Test123!"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ─── Audit Logs ─────────────────────────────────────────────────

class TestAuditLogs:
    def test_list_default(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "logs" in body and "total" in body and "action_types" in body
        assert isinstance(body["logs"], list)
        assert isinstance(body["action_types"], list)

    def test_filter_by_action(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs",
                         params={"action": "subscription_change"},
                         headers=admin_headers, timeout=15)
        assert r.status_code == 200
        for log in r.json()["logs"]:
            assert log.get("action") == "subscription_change"

    def test_search_filter(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs",
                         params={"search": "test"},
                         headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert "logs" in r.json()

    def test_date_range_filter(self, admin_headers):
        # Use very old from_date so should match all
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs",
                         params={"from_date": "2000-01-01T00:00:00Z",
                                 "to_date": "2099-12-31T23:59:59Z"},
                         headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        # Future-bounded should return at least every log
        r2 = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=admin_headers, timeout=15)
        assert body["total"] == r2.json()["total"]

    def test_export_csv(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs/export",
                         headers=admin_headers, timeout=20)
        assert r.status_code == 200
        ctype = r.headers.get("content-type", "")
        assert "text/csv" in ctype, f"unexpected content-type: {ctype}"
        assert "attachment" in r.headers.get("content-disposition", "").lower()
        # Header row
        first_line = r.text.split("\n", 1)[0]
        assert "timestamp" in first_line and "action" in first_line

    def test_export_csv_with_filter(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs/export",
                         params={"action": "subscription_change"},
                         headers=admin_headers, timeout=20)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")

    def test_unauthorized(self):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs/export", timeout=10)
        assert r.status_code in (401, 403)


# ─── Team Calendar ──────────────────────────────────────────────

class TestTeamCalendar:
    def test_calendar_default(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/teams/calendar", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "events" in body and "members" in body and "counts" in body
        assert isinstance(body["events"], list)
        assert isinstance(body["members"], list)
        assert {"tasks", "reminders", "total"} <= set(body["counts"].keys())

    def test_calendar_with_range(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/teams/calendar",
                         params={"from_date": "2025-01-01T00:00:00Z",
                                 "to_date": "2030-12-31T23:59:59Z"},
                         headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        for ev in body["events"]:
            assert "id" in ev and "kind" in ev and "date" in ev and "title" in ev
            assert ev["kind"] in ("task", "reminder")
            if ev.get("owner"):
                assert "user_id" in ev["owner"]

    def test_calendar_unauth(self):
        r = requests.get(f"{BASE_URL}/api/teams/calendar", timeout=10)
        assert r.status_code in (401, 403)
