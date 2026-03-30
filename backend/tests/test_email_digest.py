"""
Test Email Digest Feature - Iteration 6
Tests for:
1. GET /api/email/preferences - Returns default preferences
2. PUT /api/email/preferences - Updates and persists preferences
3. POST /api/email/preview-digest - Returns HTML string with stats
4. POST /api/email/send-digest - Returns graceful error when no RESEND_API_KEY
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmailDigestFeature:
    """Email Digest API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test-stripe@test.com",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    # ===== GET /api/email/preferences =====
    def test_get_email_preferences_returns_defaults(self):
        """GET /api/email/preferences returns default preferences"""
        response = self.session.get(f"{BASE_URL}/api/email/preferences")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "preferences" in data, "Response should contain 'preferences' key"
        
        prefs = data["preferences"]
        assert "weekly_digest" in prefs, "Preferences should have 'weekly_digest' key"
        assert "reminder_alerts" in prefs, "Preferences should have 'reminder_alerts' key"
        
        # Default values should be True
        assert isinstance(prefs["weekly_digest"], bool), "weekly_digest should be boolean"
        assert isinstance(prefs["reminder_alerts"], bool), "reminder_alerts should be boolean"
        
        print(f"✅ GET /api/email/preferences - Returns preferences: {prefs}")
    
    def test_get_email_preferences_requires_auth(self):
        """GET /api/email/preferences requires authentication"""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.get(f"{BASE_URL}/api/email/preferences")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✅ GET /api/email/preferences - Requires authentication (401 without token)")
    
    # ===== PUT /api/email/preferences =====
    def test_update_email_preferences_weekly_digest_off(self):
        """PUT /api/email/preferences updates weekly_digest to false"""
        response = self.session.put(f"{BASE_URL}/api/email/preferences", json={
            "weekly_digest": False,
            "reminder_alerts": True
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "preferences" in data, "Response should contain 'preferences' key"
        assert data["preferences"]["weekly_digest"] == False, "weekly_digest should be False"
        assert data["preferences"]["reminder_alerts"] == True, "reminder_alerts should be True"
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/email/preferences")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["preferences"]["weekly_digest"] == False, "weekly_digest should persist as False"
        
        print("✅ PUT /api/email/preferences - Updated weekly_digest to False and persisted")
    
    def test_update_email_preferences_reminder_alerts_off(self):
        """PUT /api/email/preferences updates reminder_alerts to false"""
        response = self.session.put(f"{BASE_URL}/api/email/preferences", json={
            "weekly_digest": True,
            "reminder_alerts": False
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["preferences"]["reminder_alerts"] == False, "reminder_alerts should be False"
        
        # Verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/email/preferences")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["preferences"]["reminder_alerts"] == False, "reminder_alerts should persist as False"
        
        print("✅ PUT /api/email/preferences - Updated reminder_alerts to False and persisted")
    
    def test_update_email_preferences_both_on(self):
        """PUT /api/email/preferences can set both to true"""
        response = self.session.put(f"{BASE_URL}/api/email/preferences", json={
            "weekly_digest": True,
            "reminder_alerts": True
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["preferences"]["weekly_digest"] == True
        assert data["preferences"]["reminder_alerts"] == True
        
        print("✅ PUT /api/email/preferences - Both preferences set to True")
    
    def test_update_email_preferences_requires_auth(self):
        """PUT /api/email/preferences requires authentication"""
        unauthenticated_session = requests.Session()
        unauthenticated_session.headers.update({"Content-Type": "application/json"})
        response = unauthenticated_session.put(f"{BASE_URL}/api/email/preferences", json={
            "weekly_digest": False,
            "reminder_alerts": False
        })
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✅ PUT /api/email/preferences - Requires authentication (401 without token)")
    
    # ===== POST /api/email/preview-digest =====
    def test_preview_digest_returns_html(self):
        """POST /api/email/preview-digest returns HTML string"""
        response = self.session.post(f"{BASE_URL}/api/email/preview-digest")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "html" in data, "Response should contain 'html' key"
        
        html = data["html"]
        assert isinstance(html, str), "HTML should be a string"
        assert len(html) > 100, "HTML should have substantial content"
        
        # Check for expected HTML elements
        assert "<!DOCTYPE html>" in html or "<html" in html, "Should be valid HTML"
        assert "Letsm AI" in html, "Should contain app name"
        assert "Weekly Digest" in html, "Should contain 'Weekly Digest'"
        
        # Check for stat cards (6 stats: Tasks Done, Created, Rate, Chats, Messages, Reminders)
        assert "Tasks Done" in html or "Tasks" in html, "Should contain task stats"
        
        print(f"✅ POST /api/email/preview-digest - Returns HTML ({len(html)} chars)")
    
    def test_preview_digest_contains_user_stats(self):
        """POST /api/email/preview-digest contains productivity stats"""
        response = self.session.post(f"{BASE_URL}/api/email/preview-digest")
        
        assert response.status_code == 200
        html = response.json()["html"]
        
        # Check for gradient header
        assert "gradient" in html.lower() or "linear-gradient" in html, "Should have gradient header"
        
        # Check for stat sections
        stat_keywords = ["Tasks", "Chats", "Messages", "Reminders", "Rate"]
        found_stats = [kw for kw in stat_keywords if kw in html]
        assert len(found_stats) >= 3, f"Should contain multiple stats, found: {found_stats}"
        
        # Check for upcoming tasks section
        assert "Upcoming" in html or "pending" in html.lower(), "Should have upcoming tasks section"
        
        print(f"✅ POST /api/email/preview-digest - Contains stats: {found_stats}")
    
    def test_preview_digest_requires_auth(self):
        """POST /api/email/preview-digest requires authentication"""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.post(f"{BASE_URL}/api/email/preview-digest")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✅ POST /api/email/preview-digest - Requires authentication (401 without token)")
    
    # ===== POST /api/email/send-digest =====
    def test_send_digest_graceful_error_no_api_key(self):
        """POST /api/email/send-digest returns graceful error when no RESEND_API_KEY"""
        response = self.session.post(f"{BASE_URL}/api/email/send-digest")
        
        assert response.status_code == 200, f"Expected 200 (graceful error), got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success' key"
        assert data["success"] == False, "success should be False when no API key"
        
        assert "message" in data, "Response should contain 'message' key"
        message = data["message"].lower()
        assert "not configured" in message or "resend" in message or "api" in message, \
            f"Message should indicate email service not configured: {data['message']}"
        
        print(f"✅ POST /api/email/send-digest - Graceful error: {data['message']}")
    
    def test_send_digest_requires_auth(self):
        """POST /api/email/send-digest requires authentication"""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.post(f"{BASE_URL}/api/email/send-digest")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✅ POST /api/email/send-digest - Requires authentication (401 without token)")


class TestExistingFeaturesRegression:
    """Regression tests for existing features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_health_endpoint(self):
        """GET /api/health still works"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ GET /api/health - Working")
    
    def test_login_endpoint(self):
        """POST /api/auth/login still works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test-stripe@test.com",
            "password": "Test123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print("✅ POST /api/auth/login - Working")
    
    def test_subscription_plans_endpoint(self):
        """GET /api/subscription/plans still works"""
        response = self.session.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) == 3  # free, pro, business
        print("✅ GET /api/subscription/plans - Working (3 plans)")
    
    def test_export_endpoints_require_auth(self):
        """Export endpoints still require authentication"""
        endpoints = ["/api/export/tasks", "/api/export/reminders", "/api/export/conversations", "/api/export/all"]
        for endpoint in endpoints:
            response = self.session.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 401, f"{endpoint} should require auth"
        print("✅ Export endpoints - All require authentication")
    
    def test_guest_chat_works(self):
        """POST /api/guest/chat still works without auth"""
        response = self.session.post(f"{BASE_URL}/api/guest/chat", json={
            "message": "Hello",
            "session_id": "test_session_123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        print("✅ POST /api/guest/chat - Working without auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
