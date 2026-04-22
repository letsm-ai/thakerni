"""
Test P2 Features: CSV Export and Email Configuration
- CSV export for tasks, reminders, conversations, all data
- JSON export backwards compatibility
- Email config endpoints (admin only)
"""
import pytest
import requests
import os
import csv
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test-stripe@test.com"
ADMIN_PASSWORD = "Test123!"
REGULAR_EMAIL = "demo@test.com"
REGULAR_PASSWORD = "Test123!"


class TestCSVExport:
    """Test CSV export functionality for all export endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin user for export tests"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_export_tasks_csv_format(self):
        """GET /api/export/tasks?format=csv returns valid CSV with headers"""
        response = self.session.get(f"{BASE_URL}/api/export/tasks", params={"format": "csv"})
        assert response.status_code == 200, f"Export tasks CSV failed: {response.text}"
        
        # Check content type
        assert "text/csv" in response.headers.get("Content-Type", ""), "Content-Type should be text/csv"
        
        # Check Content-Disposition header
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert "tasks.csv" in content_disp, "Filename should be tasks.csv"
        
        # Parse CSV and verify headers
        csv_content = response.text
        reader = csv.DictReader(io.StringIO(csv_content))
        headers = reader.fieldnames
        expected_headers = ["task_id", "title", "status", "priority", "due_date", "created_at"]
        assert headers == expected_headers, f"CSV headers mismatch. Got: {headers}, Expected: {expected_headers}"
        print(f"✓ Tasks CSV export working with headers: {headers}")
    
    def test_export_reminders_csv_format(self):
        """GET /api/export/reminders?format=csv returns valid CSV"""
        response = self.session.get(f"{BASE_URL}/api/export/reminders", params={"format": "csv"})
        assert response.status_code == 200, f"Export reminders CSV failed: {response.text}"
        
        # Check content type
        assert "text/csv" in response.headers.get("Content-Type", ""), "Content-Type should be text/csv"
        
        # Check Content-Disposition header
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert "reminders.csv" in content_disp, "Filename should be reminders.csv"
        
        # Parse CSV and verify headers
        csv_content = response.text
        reader = csv.DictReader(io.StringIO(csv_content))
        headers = reader.fieldnames
        expected_headers = ["reminder_id", "title", "remind_at", "status", "created_at"]
        assert headers == expected_headers, f"CSV headers mismatch. Got: {headers}, Expected: {expected_headers}"
        print(f"✓ Reminders CSV export working with headers: {headers}")
    
    def test_export_conversations_csv_format(self):
        """GET /api/export/conversations?format=csv returns flattened message rows"""
        response = self.session.get(f"{BASE_URL}/api/export/conversations", params={"format": "csv"})
        assert response.status_code == 200, f"Export conversations CSV failed: {response.text}"
        
        # Check content type
        assert "text/csv" in response.headers.get("Content-Type", ""), "Content-Type should be text/csv"
        
        # Check Content-Disposition header
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert "conversations.csv" in content_disp, "Filename should be conversations.csv"
        
        # Parse CSV and verify headers (flattened message rows)
        csv_content = response.text
        reader = csv.DictReader(io.StringIO(csv_content))
        headers = reader.fieldnames
        expected_headers = ["conversation_id", "conversation_title", "role", "content", "created_at"]
        assert headers == expected_headers, f"CSV headers mismatch. Got: {headers}, Expected: {expected_headers}"
        print(f"✓ Conversations CSV export working with headers: {headers}")
    
    def test_export_all_csv_format(self):
        """GET /api/export/all?format=csv returns combined data with type column"""
        response = self.session.get(f"{BASE_URL}/api/export/all", params={"format": "csv"})
        assert response.status_code == 200, f"Export all CSV failed: {response.text}"
        
        # Check content type
        assert "text/csv" in response.headers.get("Content-Type", ""), "Content-Type should be text/csv"
        
        # Check Content-Disposition header
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert "all_data.csv" in content_disp, "Filename should be all_data.csv"
        
        # Parse CSV and verify headers (combined with type column)
        csv_content = response.text
        reader = csv.DictReader(io.StringIO(csv_content))
        headers = reader.fieldnames
        expected_headers = ["type", "id", "title", "status", "priority", "created_at"]
        assert headers == expected_headers, f"CSV headers mismatch. Got: {headers}, Expected: {expected_headers}"
        
        # Verify type column has expected values
        rows = list(reader)
        if rows:
            types_found = set(row.get("type") for row in rows)
            print(f"✓ All data CSV export working with types: {types_found}")
        else:
            print("✓ All data CSV export working (no data rows)")
    
    def test_export_tasks_json_backwards_compatible(self):
        """GET /api/export/tasks?format=json still returns JSON (backwards compatible)"""
        response = self.session.get(f"{BASE_URL}/api/export/tasks", params={"format": "json"})
        assert response.status_code == 200, f"Export tasks JSON failed: {response.text}"
        
        # Check content type is JSON
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Content-Type should be application/json, got: {content_type}"
        
        # Verify JSON structure
        data = response.json()
        assert "tasks" in data, "JSON response should have 'tasks' key"
        assert "count" in data, "JSON response should have 'count' key"
        assert "exported_at" in data, "JSON response should have 'exported_at' key"
        print(f"✓ Tasks JSON export backwards compatible, count: {data['count']}")
    
    def test_export_tasks_default_format_is_json(self):
        """GET /api/export/tasks without format param defaults to JSON"""
        response = self.session.get(f"{BASE_URL}/api/export/tasks")
        assert response.status_code == 200, f"Export tasks default failed: {response.text}"
        
        # Check content type is JSON (default)
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Default format should be JSON, got: {content_type}"
        
        data = response.json()
        assert "tasks" in data, "Default format should return JSON with 'tasks' key"
        print("✓ Default export format is JSON (backwards compatible)")


class TestEmailConfigEndpoints:
    """Test email configuration endpoints (admin only)"""
    
    def test_get_email_config_admin_access(self):
        """GET /api/email/config returns configured status and sender_email (admin only)"""
        session = requests.Session()
        # Login as admin
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get email config
        response = session.get(f"{BASE_URL}/api/email/config")
        assert response.status_code == 200, f"Get email config failed: {response.text}"
        
        data = response.json()
        assert "configured" in data, "Response should have 'configured' field"
        assert "sender_email" in data, "Response should have 'sender_email' field"
        assert isinstance(data["configured"], bool), "'configured' should be boolean"
        print(f"✓ Email config GET working - configured: {data['configured']}, sender: {data['sender_email']}")
    
    def test_get_email_config_non_admin_forbidden(self):
        """Non-admin user gets 403 on GET /api/email/config"""
        session = requests.Session()
        # Login as regular user
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_EMAIL,
            "password": REGULAR_PASSWORD
        })
        assert response.status_code == 200, f"Regular user login failed: {response.text}"
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to get email config
        response = session.get(f"{BASE_URL}/api/email/config")
        assert response.status_code == 403, f"Expected 403 for non-admin, got: {response.status_code}"
        print("✓ Non-admin user correctly gets 403 on GET /api/email/config")
    
    def test_post_email_config_admin_access(self):
        """POST /api/email/config saves resend_api_key and sender_email (admin only)"""
        session = requests.Session()
        # Login as admin
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Update email config (just sender email, not the API key to avoid breaking things)
        response = session.post(f"{BASE_URL}/api/email/config", json={
            "sender_email": "test@resend.dev"
        })
        assert response.status_code == 200, f"Update email config failed: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "'success' should be True"
        assert "configured" in data, "Response should have 'configured' field"
        assert "sender_email" in data, "Response should have 'sender_email' field"
        print(f"✓ Email config POST working - sender_email updated to: {data['sender_email']}")
    
    def test_post_email_config_non_admin_forbidden(self):
        """Non-admin user gets 403 on POST /api/email/config"""
        session = requests.Session()
        # Login as regular user
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_EMAIL,
            "password": REGULAR_PASSWORD
        })
        assert response.status_code == 200, f"Regular user login failed: {response.text}"
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to update email config
        response = session.post(f"{BASE_URL}/api/email/config", json={
            "resend_api_key": "re_test_key",
            "sender_email": "hacker@evil.com"
        })
        assert response.status_code == 403, f"Expected 403 for non-admin, got: {response.status_code}"
        print("✓ Non-admin user correctly gets 403 on POST /api/email/config")


class TestExportWithData:
    """Test exports with actual data to verify content"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin user"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_csv_export_contains_data(self):
        """Verify CSV exports contain actual data rows"""
        # First check if user has any tasks
        tasks_json = self.session.get(f"{BASE_URL}/api/export/tasks", params={"format": "json"})
        task_count = tasks_json.json().get("count", 0)
        
        if task_count > 0:
            # Get CSV and verify row count
            tasks_csv = self.session.get(f"{BASE_URL}/api/export/tasks", params={"format": "csv"})
            csv_content = tasks_csv.text
            reader = csv.DictReader(io.StringIO(csv_content))
            rows = list(reader)
            assert len(rows) == task_count, f"CSV row count ({len(rows)}) should match JSON count ({task_count})"
            print(f"✓ CSV export contains {len(rows)} task rows matching JSON count")
        else:
            print("✓ No tasks to export (empty CSV is valid)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
