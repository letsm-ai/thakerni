"""
Backend API Tests for WhatsApp QR and Stripe Subscription Features
Tests: WhatsApp status/QR/connect, Stripe plans/checkout/status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
TEST_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'test-stripe@test.com')
TEST_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'Test123!')

class TestHealthEndpoints:
    """Health check tests - run first"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ API health check passed: {data}")

    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "message" in data
        print(f"✓ API root check passed: {data}")


class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for test user"""
        # First try login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"✓ Login successful for {TEST_EMAIL}")
            return token
        
        # If login fails, try registration
        print(f"Login failed ({response.status_code}), trying registration...")
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Stripe Test User"
        })
        
        if reg_response.status_code == 200:
            token = reg_response.json().get("access_token")
            print(f"✓ Registration successful for {TEST_EMAIL}")
            return token
        elif reg_response.status_code == 400 and "already registered" in reg_response.text.lower():
            # User exists but password might be different - skip auth tests
            pytest.skip("User exists but credentials don't match")
        
        pytest.fail(f"Could not authenticate: {reg_response.text}")
    
    def test_login_with_test_credentials(self, auth_token):
        """Test login works with test credentials"""
        assert auth_token is not None
        assert len(auth_token) > 20
        print(f"✓ Auth token obtained: {auth_token[:20]}...")


class TestSubscriptionPlans:
    """Stripe subscription plans tests - no auth required"""
    
    def test_get_subscription_plans(self):
        """GET /api/subscription/plans returns 3 plans (free, pro, business)"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plans" in data, f"Response missing 'plans' key: {data}"
        
        plans = data["plans"]
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
        
        plan_ids = [p["plan_id"] for p in plans]
        assert "free" in plan_ids, "Missing 'free' plan"
        assert "pro" in plan_ids, "Missing 'pro' plan"
        assert "business" in plan_ids, "Missing 'business' plan"
        
        # Verify plan structure
        for plan in plans:
            assert "name" in plan, f"Plan missing 'name': {plan}"
            assert "price" in plan, f"Plan missing 'price': {plan}"
            assert "features" in plan, f"Plan missing 'features': {plan}"
            assert isinstance(plan["features"], list), f"Features should be list: {plan}"
        
        print(f"✓ Subscription plans returned correctly: {plan_ids}")
        print(f"  - Free: ${plans[0]['price']}")
        print(f"  - Pro: ${plans[1]['price']}")
        print(f"  - Business: ${plans[2]['price']}")


class TestSubscriptionStatus:
    """Stripe subscription status tests - requires auth"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            # Try registration
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Stripe Test User"
            })
            if reg_response.status_code == 200:
                token = reg_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate")
        else:
            token = response.json().get("access_token")
        
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_subscription_status(self, auth_headers):
        """GET /api/subscription/status returns current user plan info"""
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plan_id" in data, f"Response missing 'plan_id': {data}"
        assert "plan_name" in data, f"Response missing 'plan_name': {data}"
        assert "features" in data, f"Response missing 'features': {data}"
        assert "limits" in data, f"Response missing 'limits': {data}"
        
        print(f"✓ Subscription status returned: plan={data['plan_id']}, name={data['plan_name']}")


class TestStripeCheckout:
    """Stripe checkout session tests - requires auth"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Stripe Test User"
            })
            if reg_response.status_code == 200:
                token = reg_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate")
        else:
            token = response.json().get("access_token")
        
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_checkout_session_pro(self, auth_headers):
        """POST /api/subscription/checkout creates Stripe checkout session for Pro plan"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers=auth_headers,
            json={
                "plan_id": "pro",
                "origin_url": "https://ai-functions-core.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, f"Response missing 'url': {data}"
        assert "session_id" in data, f"Response missing 'session_id': {data}"
        
        # Verify URL is a valid Stripe checkout URL
        assert "stripe.com" in data["url"] or "checkout" in data["url"].lower(), f"URL doesn't look like Stripe: {data['url']}"
        assert len(data["session_id"]) > 10, f"Session ID too short: {data['session_id']}"
        
        print(f"✓ Checkout session created for Pro plan")
        print(f"  - Session ID: {data['session_id'][:30]}...")
        print(f"  - URL: {data['url'][:60]}...")
    
    def test_create_checkout_session_business(self, auth_headers):
        """POST /api/subscription/checkout creates Stripe checkout session for Business plan"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers=auth_headers,
            json={
                "plan_id": "business",
                "origin_url": "https://ai-functions-core.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        print(f"✓ Checkout session created for Business plan")
    
    def test_checkout_free_plan_rejected(self, auth_headers):
        """POST /api/subscription/checkout rejects free plan (no payment needed)"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers=auth_headers,
            json={
                "plan_id": "free",
                "origin_url": "https://ai-functions-core.preview.emergentagent.com"
            }
        )
        # Should return 400 because free plan doesn't require payment
        assert response.status_code == 400, f"Expected 400 for free plan, got {response.status_code}"
        print(f"✓ Free plan checkout correctly rejected")
    
    def test_checkout_invalid_plan_rejected(self, auth_headers):
        """POST /api/subscription/checkout rejects invalid plan"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/checkout",
            headers=auth_headers,
            json={
                "plan_id": "invalid_plan",
                "origin_url": "https://ai-functions-core.preview.emergentagent.com"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print(f"✓ Invalid plan checkout correctly rejected")


class TestWhatsAppStatus:
    """WhatsApp status endpoint tests - requires auth"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Stripe Test User"
            })
            if reg_response.status_code == 200:
                token = reg_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate")
        else:
            token = response.json().get("access_token")
        
        return {"Authorization": f"Bearer {token}"}
    
    def test_whatsapp_status(self, auth_headers):
        """GET /api/whatsapp/status returns connection status with has_qr field"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/status", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have connected field
        assert "connected" in data, f"Response missing 'connected': {data}"
        
        # Check for has_qr field (new feature)
        if "has_qr" in data:
            print(f"✓ WhatsApp status: connected={data['connected']}, has_qr={data['has_qr']}")
        else:
            print(f"✓ WhatsApp status: connected={data['connected']}")
        
        # If not connected, should have initializing or error info
        if not data.get("connected"):
            print(f"  - Initializing: {data.get('initializing', 'N/A')}")
            print(f"  - Error: {data.get('error', 'None')}")


class TestWhatsAppQR:
    """WhatsApp QR code endpoint tests - requires auth"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Stripe Test User"
            })
            if reg_response.status_code == 200:
                token = reg_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate")
        else:
            token = response.json().get("access_token")
        
        return {"Authorization": f"Bearer {token}"}
    
    def test_whatsapp_qr(self, auth_headers):
        """GET /api/whatsapp/qr returns QR code data"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/qr", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have qr field (may be null if not available)
        assert "qr" in data, f"Response missing 'qr' field: {data}"
        
        if data["qr"]:
            print(f"✓ WhatsApp QR code available: {len(data['qr'])} chars")
            # QR code should be a string (base64 or raw QR data)
            assert isinstance(data["qr"], str), f"QR should be string: {type(data['qr'])}"
            assert len(data["qr"]) > 50, f"QR code too short: {len(data['qr'])}"
        else:
            print(f"✓ WhatsApp QR endpoint working (QR not currently available)")
            print(f"  - Message: {data.get('message', 'N/A')}")


class TestWhatsAppConnect:
    """WhatsApp connect endpoint tests - requires auth"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Stripe Test User"
            })
            if reg_response.status_code == 200:
                token = reg_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate")
        else:
            token = response.json().get("access_token")
        
        return {"Authorization": f"Bearer {token}"}
    
    def test_whatsapp_connect(self, auth_headers):
        """POST /api/whatsapp/connect triggers new connection"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/connect", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return some status info
        print(f"✓ WhatsApp connect endpoint working")
        print(f"  - Response: {data}")
        
        # Check if QR was generated
        if data.get("qr"):
            print(f"  - QR code generated: {len(data['qr'])} chars")
        elif data.get("message"):
            print(f"  - Message: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
