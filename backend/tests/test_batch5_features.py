"""
Test suite for Batch 5 features:
1. Data export endpoints (tasks, reminders, conversations, all)
2. Existing auth and core functionality verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
TEST_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'test-stripe@test.com')
TEST_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'Test123!')


class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health endpoint working")
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Letsm AI" in data.get("message", "")
        print("✅ Root API endpoint working")


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✅ Login successful for {TEST_EMAIL}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")


class TestDataExportEndpoints:
    """Test data export endpoints - Batch 5 feature"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_export_tasks(self, auth_headers):
        """Test GET /api/export/tasks - exports user tasks as JSON"""
        response = requests.get(f"{BASE_URL}/api/export/tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "tasks" in data
        assert "count" in data
        assert "exported_at" in data
        assert isinstance(data["tasks"], list)
        assert isinstance(data["count"], int)
        assert data["count"] == len(data["tasks"])
        print(f"✅ Export tasks endpoint working - {data['count']} tasks exported")
    
    def test_export_reminders(self, auth_headers):
        """Test GET /api/export/reminders - exports user reminders as JSON"""
        response = requests.get(f"{BASE_URL}/api/export/reminders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "reminders" in data
        assert "count" in data
        assert "exported_at" in data
        assert isinstance(data["reminders"], list)
        assert isinstance(data["count"], int)
        assert data["count"] == len(data["reminders"])
        print(f"✅ Export reminders endpoint working - {data['count']} reminders exported")
    
    def test_export_conversations(self, auth_headers):
        """Test GET /api/export/conversations - exports user conversations with messages"""
        response = requests.get(f"{BASE_URL}/api/export/conversations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "conversations" in data
        assert "count" in data
        assert "exported_at" in data
        assert isinstance(data["conversations"], list)
        assert isinstance(data["count"], int)
        assert data["count"] == len(data["conversations"])
        
        # If there are conversations, verify they include messages
        if data["count"] > 0:
            conv = data["conversations"][0]
            assert "messages" in conv
            assert isinstance(conv["messages"], list)
        print(f"✅ Export conversations endpoint working - {data['count']} conversations exported")
    
    def test_export_all(self, auth_headers):
        """Test GET /api/export/all - exports all user data"""
        response = requests.get(f"{BASE_URL}/api/export/all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user" in data
        assert "tasks" in data
        assert "reminders" in data
        assert "conversations" in data
        assert "exported_at" in data
        
        # Verify user info
        assert "email" in data["user"]
        assert data["user"]["email"] == TEST_EMAIL
        
        # Verify tasks structure
        assert "data" in data["tasks"]
        assert "count" in data["tasks"]
        assert isinstance(data["tasks"]["data"], list)
        
        # Verify reminders structure
        assert "data" in data["reminders"]
        assert "count" in data["reminders"]
        assert isinstance(data["reminders"]["data"], list)
        
        # Verify conversations structure
        assert "data" in data["conversations"]
        assert "count" in data["conversations"]
        assert isinstance(data["conversations"]["data"], list)
        
        print(f"✅ Export all endpoint working - Tasks: {data['tasks']['count']}, Reminders: {data['reminders']['count']}, Conversations: {data['conversations']['count']}")
    
    def test_export_requires_auth(self):
        """Test that export endpoints require authentication"""
        endpoints = [
            "/api/export/tasks",
            "/api/export/reminders",
            "/api/export/conversations",
            "/api/export/all"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 401, f"Expected 401 for {endpoint}, got {response.status_code}"
        
        print("✅ All export endpoints correctly require authentication")


class TestSubscriptionPlans:
    """Test subscription plans endpoint"""
    
    def test_get_plans(self):
        """Test GET /api/subscription/plans returns all plans"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        data = response.json()
        
        assert "plans" in data
        plans = data["plans"]
        assert len(plans) == 3  # free, pro, business
        
        plan_ids = [p["plan_id"] for p in plans]
        assert "free" in plan_ids
        assert "pro" in plan_ids
        assert "business" in plan_ids
        
        print("✅ Subscription plans endpoint working - 3 plans available")


class TestGuestChat:
    """Test guest chat endpoint (no auth required)"""
    
    def test_guest_chat_works(self):
        """Test POST /api/guest/chat works without auth"""
        response = requests.post(f"{BASE_URL}/api/guest/chat", json={
            "message": "Hello, what can you help me with?"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "response" in data
        assert "session_id" in data
        assert data["session_id"].startswith("guest_")
        print("✅ Guest chat endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
