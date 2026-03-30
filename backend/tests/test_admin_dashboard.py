"""
Admin Dashboard API Tests
Tests for admin panel endpoints: overview, users, analytics, billing, system health, audit logs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-functions-core.preview.emergentagent.com')

# Test credentials for admin user
ADMIN_EMAIL = "test-stripe@test.com"
ADMIN_PASSWORD = "Test123!"


class TestAdminAuth:
    """Test authentication and get admin token"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin user and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") == "admin", f"User role is not admin: {data.get('user', {}).get('role')}"
        print(f"Admin login successful, role: {data.get('user', {}).get('role')}")
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers with admin token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_admin_login(self, admin_token):
        """Verify admin can login and has admin role"""
        assert admin_token is not None
        print("Admin login test passed")


class TestAdminOverview:
    """Test /api/admin/overview endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_overview_returns_stats(self, auth_headers):
        """GET /api/admin/overview returns user/subscription/content/revenue stats"""
        response = requests.get(f"{BASE_URL}/api/admin/overview", headers=auth_headers)
        assert response.status_code == 200, f"Overview failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "users" in data, "Missing 'users' in overview"
        assert "subscriptions" in data, "Missing 'subscriptions' in overview"
        assert "content" in data, "Missing 'content' in overview"
        assert "revenue" in data, "Missing 'revenue' in overview"
        
        # Verify users stats
        users = data["users"]
        assert "total" in users, "Missing 'total' in users"
        assert "new_this_week" in users, "Missing 'new_this_week' in users"
        assert "new_this_month" in users, "Missing 'new_this_month' in users"
        assert isinstance(users["total"], int), "users.total should be int"
        
        # Verify subscriptions
        subs = data["subscriptions"]
        assert "free" in subs, "Missing 'free' in subscriptions"
        assert "pro" in subs, "Missing 'pro' in subscriptions"
        assert "business" in subs, "Missing 'business' in subscriptions"
        
        # Verify content
        content = data["content"]
        assert "tasks" in content, "Missing 'tasks' in content"
        assert "reminders" in content, "Missing 'reminders' in content"
        assert "conversations" in content, "Missing 'conversations' in content"
        assert "messages" in content, "Missing 'messages' in content"
        
        # Verify revenue
        revenue = data["revenue"]
        assert "total_payments" in revenue, "Missing 'total_payments' in revenue"
        assert "total_revenue" in revenue, "Missing 'total_revenue' in revenue"
        
        print(f"Overview stats: {data['users']['total']} users, ${data['revenue']['total_revenue']} revenue")


class TestAdminUsers:
    """Test /api/admin/users endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_list_users(self, auth_headers):
        """GET /api/admin/users returns paginated user list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200, f"List users failed: {response.text}"
        data = response.json()
        
        assert "users" in data, "Missing 'users' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        assert "pages" in data, "Missing 'pages' in response"
        assert isinstance(data["users"], list), "users should be a list"
        
        print(f"Found {data['total']} users, page {data['page']} of {data['pages']}")
    
    def test_list_users_with_search(self, auth_headers):
        """GET /api/admin/users with search param"""
        response = requests.get(f"{BASE_URL}/api/admin/users", 
                               headers=auth_headers, 
                               params={"search": "test"})
        assert response.status_code == 200, f"Search users failed: {response.text}"
        data = response.json()
        assert "users" in data
        print(f"Search 'test' returned {len(data['users'])} users")
    
    def test_list_users_with_plan_filter(self, auth_headers):
        """GET /api/admin/users with plan filter"""
        response = requests.get(f"{BASE_URL}/api/admin/users", 
                               headers=auth_headers, 
                               params={"plan": "free"})
        assert response.status_code == 200, f"Filter by plan failed: {response.text}"
        data = response.json()
        assert "users" in data
        print(f"Free plan filter returned {len(data['users'])} users")
    
    def test_get_user_detail(self, auth_headers):
        """GET /api/admin/users/{user_id} returns user details"""
        # First get a user from the list
        list_response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        users = list_response.json()["users"]
        
        if len(users) > 0:
            user_id = users[0]["user_id"]
            response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=auth_headers)
            assert response.status_code == 200, f"Get user detail failed: {response.text}"
            data = response.json()
            
            assert "user" in data, "Missing 'user' in response"
            assert "stats" in data, "Missing 'stats' in response"
            assert "payments" in data, "Missing 'payments' in response"
            
            # Verify user fields
            user = data["user"]
            assert "user_id" in user, "Missing 'user_id' in user"
            assert "email" in user, "Missing 'email' in user"
            
            # Verify stats
            stats = data["stats"]
            assert "tasks" in stats, "Missing 'tasks' in stats"
            assert "reminders" in stats, "Missing 'reminders' in stats"
            assert "conversations" in stats, "Missing 'conversations' in stats"
            assert "messages" in stats, "Missing 'messages' in stats"
            
            print(f"User detail: {user['email']}, {stats['tasks']} tasks, {stats['messages']} messages")
        else:
            pytest.skip("No users found to test detail endpoint")


class TestAdminAnalytics:
    """Test /api/admin/analytics/* endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_signup_trends(self, auth_headers):
        """GET /api/admin/analytics/signups returns daily signup data"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/signups", 
                               headers=auth_headers, 
                               params={"days": 7})
        assert response.status_code == 200, f"Signup trends failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Missing 'data' in response"
        assert isinstance(data["data"], list), "data should be a list"
        
        if len(data["data"]) > 0:
            item = data["data"][0]
            assert "date" in item, "Missing 'date' in data item"
            assert "signups" in item, "Missing 'signups' in data item"
        
        print(f"Signup trends: {len(data['data'])} days of data")
    
    def test_activity_trends(self, auth_headers):
        """GET /api/admin/analytics/activity returns daily activity data"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/activity", 
                               headers=auth_headers, 
                               params={"days": 7})
        assert response.status_code == 200, f"Activity trends failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Missing 'data' in response"
        assert isinstance(data["data"], list), "data should be a list"
        
        if len(data["data"]) > 0:
            item = data["data"][0]
            assert "date" in item, "Missing 'date' in data item"
            assert "messages" in item, "Missing 'messages' in data item"
            assert "tasks" in item, "Missing 'tasks' in data item"
        
        print(f"Activity trends: {len(data['data'])} days of data")
    
    def test_country_stats(self, auth_headers):
        """GET /api/admin/analytics/countries returns user distribution by country"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics/countries", headers=auth_headers)
        assert response.status_code == 200, f"Country stats failed: {response.text}"
        data = response.json()
        
        assert "countries" in data, "Missing 'countries' in response"
        assert isinstance(data["countries"], list), "countries should be a list"
        
        if len(data["countries"]) > 0:
            item = data["countries"][0]
            assert "country" in item, "Missing 'country' in data item"
            assert "users" in item, "Missing 'users' in data item"
        
        print(f"Country stats: {len(data['countries'])} countries")


class TestAdminBilling:
    """Test /api/admin/billing/* endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_list_payments(self, auth_headers):
        """GET /api/admin/billing/payments returns payment history"""
        response = requests.get(f"{BASE_URL}/api/admin/billing/payments", headers=auth_headers)
        assert response.status_code == 200, f"List payments failed: {response.text}"
        data = response.json()
        
        assert "payments" in data, "Missing 'payments' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        assert "pages" in data, "Missing 'pages' in response"
        assert isinstance(data["payments"], list), "payments should be a list"
        
        print(f"Found {data['total']} payments")
    
    def test_list_payments_with_status_filter(self, auth_headers):
        """GET /api/admin/billing/payments with status filter"""
        response = requests.get(f"{BASE_URL}/api/admin/billing/payments", 
                               headers=auth_headers, 
                               params={"status": "completed"})
        assert response.status_code == 200, f"Filter payments failed: {response.text}"
        data = response.json()
        assert "payments" in data
        print(f"Completed payments: {len(data['payments'])}")
    
    def test_revenue_chart(self, auth_headers):
        """GET /api/admin/billing/revenue returns daily revenue data"""
        response = requests.get(f"{BASE_URL}/api/admin/billing/revenue", 
                               headers=auth_headers, 
                               params={"days": 30})
        assert response.status_code == 200, f"Revenue chart failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Missing 'data' in response"
        assert isinstance(data["data"], list), "data should be a list"
        
        if len(data["data"]) > 0:
            item = data["data"][0]
            assert "date" in item, "Missing 'date' in data item"
            assert "revenue" in item, "Missing 'revenue' in data item"
            assert "transactions" in item, "Missing 'transactions' in data item"
        
        print(f"Revenue chart: {len(data['data'])} days of data")


class TestAdminSystem:
    """Test /api/admin/system/* endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_system_health(self, auth_headers):
        """GET /api/admin/system/health returns service status and DB stats"""
        response = requests.get(f"{BASE_URL}/api/admin/system/health", headers=auth_headers)
        assert response.status_code == 200, f"System health failed: {response.text}"
        data = response.json()
        
        assert "services" in data, "Missing 'services' in response"
        assert "whatsapp" in data, "Missing 'whatsapp' in response"
        assert "database" in data, "Missing 'database' in response"
        
        # Verify services
        services = data["services"]
        assert "openai_llm" in services, "Missing 'openai_llm' in services"
        assert "stripe" in services, "Missing 'stripe' in services"
        assert "resend_email" in services, "Missing 'resend_email' in services"
        assert "whatsapp" in services, "Missing 'whatsapp' in services"
        
        # Verify database stats
        db = data["database"]
        assert "users" in db, "Missing 'users' in database"
        assert "tasks" in db, "Missing 'tasks' in database"
        assert "reminders" in db, "Missing 'reminders' in database"
        assert "conversations" in db, "Missing 'conversations' in database"
        assert "messages" in db, "Missing 'messages' in database"
        
        print(f"System health: OpenAI={services['openai_llm']}, Stripe={services['stripe']}, DB users={db['users']}")


class TestAdminAuditLogs:
    """Test /api/admin/audit-logs endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_list_audit_logs(self, auth_headers):
        """GET /api/admin/audit-logs returns audit log entries"""
        response = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=auth_headers)
        assert response.status_code == 200, f"Audit logs failed: {response.text}"
        data = response.json()
        
        assert "logs" in data, "Missing 'logs' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        assert isinstance(data["logs"], list), "logs should be a list"
        
        print(f"Found {data['total']} audit log entries")


class TestAdminRoles:
    """Test /api/admin/roles endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_roles(self, auth_headers):
        """GET /api/admin/roles returns role permissions"""
        response = requests.get(f"{BASE_URL}/api/admin/roles", headers=auth_headers)
        assert response.status_code == 200, f"Get roles failed: {response.text}"
        data = response.json()
        
        assert "roles" in data, "Missing 'roles' in response"
        roles = data["roles"]
        
        assert "admin" in roles, "Missing 'admin' role"
        assert "developer" in roles, "Missing 'developer' role"
        assert "operations" in roles, "Missing 'operations' role"
        assert "viewer" in roles, "Missing 'viewer' role"
        
        # Verify admin has all permissions
        admin_perms = set(roles["admin"])
        assert "users" in admin_perms, "Admin missing 'users' permission"
        assert "billing" in admin_perms, "Admin missing 'billing' permission"
        assert "analytics" in admin_perms, "Admin missing 'analytics' permission"
        assert "system" in admin_perms, "Admin missing 'system' permission"
        assert "audit" in admin_perms, "Admin missing 'audit' permission"
        assert "roles" in admin_perms, "Admin missing 'roles' permission"
        
        print(f"Roles: admin has {len(roles['admin'])} permissions")


class TestNonAdminAccess:
    """Test that non-admin users cannot access admin endpoints"""
    
    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests should be denied"""
        response = requests.get(f"{BASE_URL}/api/admin/overview")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated access correctly denied")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
