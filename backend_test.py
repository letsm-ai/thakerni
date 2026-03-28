import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class LetsmAITester:
    def __init__(self, base_url="https://ai-functions-core.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return None

    def test_health_check(self):
        """Test health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_register(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        # Generate unique email for testing
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_email = f"test_{timestamp}@example.com"
        
        register_data = {
            "email": test_email,
            "password": "Test123456",
            "name": "Test User"
        }
        
        response = self.run_test("User Registration", "POST", "auth/register", 200, register_data)
        if response:
            self.token = response.get('access_token')
            if response.get('user'):
                self.user_id = response['user'].get('user_id')
            return True
        return False

    def test_auth_login(self):
        """Test user login with existing credentials"""
        print("\n🔍 Testing User Login...")
        
        login_data = {
            "email": "test@example.com",
            "password": "Test123456"
        }
        
        response = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        if response:
            self.token = response.get('access_token')
            if response.get('user'):
                self.user_id = response['user'].get('user_id')
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        print("\n🔍 Testing Auth Me Endpoint...")
        if not self.token:
            self.log_test("Auth Me", False, "No token available")
            return False
        
        response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return response is not None

    def test_tasks_crud(self):
        """Test task CRUD operations"""
        print("\n🔍 Testing Tasks CRUD...")
        
        if not self.token:
            self.log_test("Tasks CRUD", False, "No authentication token")
            return False

        # Create task
        task_data = {
            "title": "Test Task",
            "description": "This is a test task",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "priority": "high"
        }
        
        create_response = self.run_test("Create Task", "POST", "tasks", 200, task_data)
        if not create_response:
            return False
        
        task_id = create_response.get('task_id')
        
        # Get tasks
        self.run_test("Get Tasks", "GET", "tasks", 200)
        
        # Update task
        update_data = {
            "title": "Updated Test Task",
            "completed": True
        }
        self.run_test("Update Task", "PUT", f"tasks/{task_id}", 200, update_data)
        
        # Delete task
        self.run_test("Delete Task", "DELETE", f"tasks/{task_id}", 200)
        
        return True

    def test_reminders_crud(self):
        """Test reminder CRUD operations"""
        print("\n🔍 Testing Reminders CRUD...")
        
        if not self.token:
            self.log_test("Reminders CRUD", False, "No authentication token")
            return False

        # Create reminder
        reminder_data = {
            "title": "Test Reminder",
            "description": "This is a test reminder",
            "reminder_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "repeat": "none"
        }
        
        create_response = self.run_test("Create Reminder", "POST", "reminders", 200, reminder_data)
        if not create_response:
            return False
        
        reminder_id = create_response.get('reminder_id')
        
        # Get reminders
        self.run_test("Get Reminders", "GET", "reminders", 200)
        
        # Delete reminder
        self.run_test("Delete Reminder", "DELETE", f"reminders/{reminder_id}", 200)
        
        return True

    def test_calendar_crud(self):
        """Test calendar event CRUD operations"""
        print("\n🔍 Testing Calendar Events CRUD...")
        
        if not self.token:
            self.log_test("Calendar CRUD", False, "No authentication token")
            return False

        # Create calendar event
        start_time = datetime.now(timezone.utc) + timedelta(hours=2)
        end_time = start_time + timedelta(hours=1)
        
        event_data = {
            "title": "Test Event",
            "description": "This is a test event",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "all_day": False
        }
        
        create_response = self.run_test("Create Calendar Event", "POST", "calendar/events", 200, event_data)
        if not create_response:
            return False
        
        event_id = create_response.get('event_id')
        
        # Get calendar events
        self.run_test("Get Calendar Events", "GET", "calendar/events", 200)
        
        # Delete calendar event
        self.run_test("Delete Calendar Event", "DELETE", f"calendar/events/{event_id}", 200)
        
        return True

    def test_chat_functionality(self):
        """Test AI chat functionality"""
        print("\n🔍 Testing AI Chat Functionality...")
        
        if not self.token:
            self.log_test("Chat Functionality", False, "No authentication token")
            return False

        # Send chat message
        chat_data = {
            "message": "Hello, can you help me with task management?"
        }
        
        # Note: AI responses may take time, so we'll wait a bit longer
        print("   Sending message to AI (this may take a few seconds)...")
        response = self.run_test("Send Chat Message", "POST", "chat/message", 200, chat_data)
        if not response:
            return False
        
        conversation_id = response.get('conversation_id')
        
        # Get conversations
        self.run_test("Get Conversations", "GET", "chat/conversations", 200)
        
        # Get conversation messages
        if conversation_id:
            self.run_test("Get Conversation Messages", "GET", f"chat/conversations/{conversation_id}/messages", 200)
            
            # Delete conversation
            self.run_test("Delete Conversation", "DELETE", f"chat/conversations/{conversation_id}", 200)
        
        return True

    def test_whatsapp_endpoints(self):
        """Test WhatsApp integration endpoints"""
        print("\n🔍 Testing WhatsApp Endpoints...")
        
        if not self.token:
            self.log_test("WhatsApp Endpoints", False, "No authentication token")
            return False

        # Get WhatsApp status
        self.run_test("Get WhatsApp Status", "GET", "whatsapp/status", 200)
        
        # Get WhatsApp QR (placeholder)
        self.run_test("Get WhatsApp QR", "GET", "whatsapp/qr", 200)

    def test_profile_update(self):
        """Test profile update"""
        print("\n🔍 Testing Profile Update...")
        
        if not self.token:
            self.log_test("Profile Update", False, "No authentication token")
            return False

        profile_data = {
            "name": "Updated Test User"
        }
        
        self.run_test("Update Profile", "PUT", "users/profile", 200, profile_data)

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Letsm AI Backend API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        
        # Test health endpoints first
        self.test_health_check()
        
        # Test authentication - try login first, then register if needed
        auth_success = self.test_auth_login()
        if not auth_success:
            print("   Login failed, trying registration...")
            auth_success = self.test_auth_register()
        
        if auth_success:
            self.test_auth_me()
            self.test_tasks_crud()
            self.test_reminders_crud()
            self.test_calendar_crud()
            self.test_chat_functionality()
            self.test_whatsapp_endpoints()
            self.test_profile_update()
        else:
            print("❌ Authentication failed, skipping protected endpoint tests")
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = LetsmAITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())