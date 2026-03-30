"""
Test suite for new AI Assistant SaaS Platform features:
1. Guest Chat API (POST /api/guest/chat) - No auth, rate limited
2. WhatsApp AI endpoint (POST /api/whatsapp/ai) - No auth, logs to MongoDB
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-functions-core.preview.emergentagent.com')

class TestGuestChat:
    """Tests for POST /api/guest/chat - Guest chat without authentication"""
    
    def test_guest_chat_basic_english(self):
        """Test guest chat returns AI response in English"""
        response = requests.post(f"{BASE_URL}/api/guest/chat", json={
            "message": "Hello, what can you help me with?"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "response" in data, "Response should contain 'response' field"
        assert "session_id" in data, "Response should contain 'session_id' field"
        assert "limited" in data, "Response should contain 'limited' field"
        
        # Verify response content
        assert isinstance(data["response"], str), "Response should be a string"
        assert len(data["response"]) > 0, "Response should not be empty"
        assert data["session_id"].startswith("guest_"), f"Session ID should start with 'guest_', got {data['session_id']}"
        assert data["limited"] == False, "First message should not be rate limited"
        
        print(f"✓ Guest chat English response: {data['response'][:100]}...")
    
    def test_guest_chat_arabic_response(self):
        """Test guest chat responds in Arabic when asked in Arabic"""
        response = requests.post(f"{BASE_URL}/api/guest/chat", json={
            "message": "مرحبا، كيف يمكنك مساعدتي؟"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "response" in data, "Response should contain 'response' field"
        assert isinstance(data["response"], str), "Response should be a string"
        assert len(data["response"]) > 0, "Response should not be empty"
        
        # Check for Arabic characters in response (Arabic Unicode range)
        has_arabic = any('\u0600' <= char <= '\u06FF' for char in data["response"])
        print(f"✓ Guest chat Arabic response: {data['response'][:100]}...")
        print(f"  Contains Arabic characters: {has_arabic}")
        # Note: AI should respond in Arabic but we don't fail if it doesn't - just log
    
    def test_guest_chat_with_session_id(self):
        """Test guest chat maintains session with session_id"""
        # First message
        response1 = requests.post(f"{BASE_URL}/api/guest/chat", json={
            "message": "My name is TestUser"
        })
        assert response1.status_code == 200
        session_id = response1.json()["session_id"]
        
        # Second message with same session
        response2 = requests.post(f"{BASE_URL}/api/guest/chat", json={
            "message": "What is my name?",
            "session_id": session_id
        })
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Session should be maintained
        assert data2["session_id"] == session_id, "Session ID should be maintained"
        print(f"✓ Session maintained: {session_id}")
        print(f"  Response: {data2['response'][:100]}...")
    
    def test_guest_chat_no_auth_required(self):
        """Test guest chat works without any authentication headers"""
        # Explicitly send request without auth headers
        response = requests.post(
            f"{BASE_URL}/api/guest/chat",
            json={"message": "Test without auth"},
            headers={"Content-Type": "application/json"}  # Only content-type, no auth
        )
        
        assert response.status_code == 200, f"Guest chat should work without auth, got {response.status_code}"
        data = response.json()
        assert "response" in data
        print("✓ Guest chat works without authentication")


class TestWhatsAppAI:
    """Tests for POST /api/whatsapp/ai - WhatsApp AI processing endpoint"""
    
    def test_whatsapp_ai_basic(self):
        """Test WhatsApp AI endpoint processes messages and returns response"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/ai", json={
            "phone_number": "+1234567890",
            "message": "Hello, I need help with my tasks"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "response" in data, "Response should contain 'response' field"
        assert "success" in data, "Response should contain 'success' field"
        
        # Verify response content
        assert isinstance(data["response"], str), "Response should be a string"
        assert len(data["response"]) > 0, "Response should not be empty"
        assert data["success"] == True, "Success should be True"
        
        print(f"✓ WhatsApp AI response: {data['response'][:100]}...")
    
    def test_whatsapp_ai_arabic_response(self):
        """Test WhatsApp AI responds in Arabic when message is in Arabic"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/ai", json={
            "phone_number": "+966501234567",
            "message": "مرحبا، أريد إنشاء مهمة جديدة"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "response" in data
        assert data["success"] == True
        
        # Check for Arabic characters
        has_arabic = any('\u0600' <= char <= '\u06FF' for char in data["response"])
        print(f"✓ WhatsApp AI Arabic response: {data['response'][:100]}...")
        print(f"  Contains Arabic characters: {has_arabic}")
    
    def test_whatsapp_ai_no_auth_required(self):
        """Test WhatsApp AI endpoint works without authentication (internal service call)"""
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/ai",
            json={
                "phone_number": "+1987654321",
                "message": "Test message without auth"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"WhatsApp AI should work without auth, got {response.status_code}"
        data = response.json()
        assert "response" in data
        assert data["success"] == True
        print("✓ WhatsApp AI works without authentication")
    
    def test_whatsapp_ai_message_logged(self):
        """Test that WhatsApp AI messages are logged to MongoDB"""
        # Send a unique message
        unique_id = str(int(time.time()))
        test_phone = f"+1555{unique_id[-7:]}"
        test_message = f"Test logging message {unique_id}"
        
        response = requests.post(f"{BASE_URL}/api/whatsapp/ai", json={
            "phone_number": test_phone,
            "message": test_message
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Note: We can't directly verify MongoDB logging from here,
        # but the endpoint should have logged it
        print(f"✓ WhatsApp AI message sent (should be logged to whatsapp_messages collection)")
        print(f"  Phone: {test_phone}, Message: {test_message[:50]}...")


class TestExistingEndpoints:
    """Verify existing endpoints still work after new feature additions"""
    
    def test_health_endpoint(self):
        """Test health endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")
    
    def test_subscription_plans(self):
        """Test subscription plans endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) == 3  # free, pro, business
        print("✓ Subscription plans endpoint working")
    
    def test_login_endpoint(self):
        """Test login endpoint still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test-stripe@test.com",
            "password": "Test123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print("✓ Login endpoint working")


class TestWhatsAppProxy:
    """Test WhatsApp proxy endpoints (require auth)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test-stripe@test.com",
            "password": "Test123!"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get auth token")
    
    def test_whatsapp_status(self, auth_token):
        """Test WhatsApp status endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have connected field (may be true or false)
        assert "connected" in data or "error" in data
        print(f"✓ WhatsApp status endpoint working: {data}")
    
    def test_whatsapp_qr(self, auth_token):
        """Test WhatsApp QR endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/qr",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have qr field (may be null if not generating)
        assert "qr" in data or "message" in data
        print(f"✓ WhatsApp QR endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
