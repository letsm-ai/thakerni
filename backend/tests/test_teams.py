"""
Team Features Backend Tests
Tests for: Team management, shared tasks, shared reminders, team chat, team analytics
Business plan required to create teams
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BUSINESS_USER = {"email": "test-stripe@test.com", "password": "Test123!"}  # Business plan user
FREE_USER = {"email": "demo@test.com", "password": "Test123!"}  # Free plan user


class TestTeamAuth:
    """Test authentication and authorization for team endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_token(self, email, password):
        """Login and get JWT token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_business_user_login(self):
        """Test business user can login"""
        token = self.get_token(BUSINESS_USER["email"], BUSINESS_USER["password"])
        assert token is not None, "Business user should be able to login"
        print(f"Business user login successful, token obtained")
    
    def test_free_user_login(self):
        """Test free user can login"""
        token = self.get_token(FREE_USER["email"], FREE_USER["password"])
        assert token is not None, "Free user should be able to login"
        print(f"Free user login successful, token obtained")
    
    def test_unauthenticated_team_access(self):
        """Test unauthenticated access to team endpoints returns 401/403"""
        response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"Unauthenticated access correctly blocked: {response.status_code}")


class TestTeamCRUD:
    """Test team creation and management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as business user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=BUSINESS_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_my_team(self):
        """GET /api/teams/my-team returns team info"""
        response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should have team, membership, members fields
        assert "team" in data, "Response should have 'team' field"
        assert "membership" in data, "Response should have 'membership' field"
        assert "members" in data, "Response should have 'members' field"
        print(f"GET /api/teams/my-team: team={data.get('team', {}).get('name') if data.get('team') else 'None'}")
        return data
    
    def test_free_user_cannot_create_team(self):
        """Free plan user cannot create a team (403)"""
        # Login as free user
        free_session = requests.Session()
        free_session.headers.update({"Content-Type": "application/json"})
        response = free_session.post(f"{BASE_URL}/api/auth/login", json=FREE_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            free_session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to create team
        response = free_session.post(f"{BASE_URL}/api/teams/create", json={"name": "Test Team"})
        assert response.status_code == 403, f"Expected 403 for free user, got {response.status_code}"
        print(f"Free user correctly blocked from creating team: {response.status_code}")


class TestTeamInvitations:
    """Test team invitation flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as business user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=BUSINESS_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_invitations(self):
        """GET /api/teams/invitations returns pending invitations"""
        response = self.session.get(f"{BASE_URL}/api/teams/invitations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "invitations" in data, "Response should have 'invitations' field"
        print(f"GET /api/teams/invitations: {len(data['invitations'])} pending invitations")
    
    def test_invite_member_requires_team(self):
        """POST /api/teams/invite requires being a team member"""
        # First check if user has a team
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        team_data = team_response.json()
        
        if team_data.get("team"):
            # User has a team, test invite
            response = self.session.post(f"{BASE_URL}/api/teams/invite", json={
                "email": "test-invite@example.com",
                "role": "member"
            })
            # Should succeed or fail with "already invited"
            assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
            print(f"POST /api/teams/invite: {response.status_code} - {response.json()}")
        else:
            print("User has no team, skipping invite test")


class TestTeamTasks:
    """Test shared team tasks"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as business user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=BUSINESS_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_team_tasks(self):
        """GET /api/teams/tasks returns team tasks"""
        response = self.session.get(f"{BASE_URL}/api/teams/tasks")
        # Should return 200 if user is team member, 403 if not
        if response.status_code == 200:
            data = response.json()
            assert "tasks" in data, "Response should have 'tasks' field"
            print(f"GET /api/teams/tasks: {len(data['tasks'])} tasks")
            # Verify task structure
            if data['tasks']:
                task = data['tasks'][0]
                assert "task_id" in task, "Task should have task_id"
                assert "title" in task, "Task should have title"
                assert "priority" in task, "Task should have priority"
                print(f"Sample task: {task.get('title')} (priority: {task.get('priority')})")
        elif response.status_code == 403:
            print("User is not a team member, cannot access tasks")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_create_team_task(self):
        """POST /api/teams/tasks creates a team task"""
        # First check if user is team member
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        team_data = team_response.json()
        
        if not team_data.get("team"):
            print("User has no team, skipping task creation test")
            return
        
        response = self.session.post(f"{BASE_URL}/api/teams/tasks", json={
            "title": "TEST_Team Task from pytest",
            "description": "Test task description",
            "priority": "high"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "task_id" in data, "Response should have task_id"
        assert data["title"] == "TEST_Team Task from pytest"
        print(f"Created team task: {data['task_id']}")
        
        # Verify task was created by fetching tasks
        tasks_response = self.session.get(f"{BASE_URL}/api/teams/tasks")
        tasks_data = tasks_response.json()
        task_ids = [t["task_id"] for t in tasks_data["tasks"]]
        assert data["task_id"] in task_ids, "Created task should appear in tasks list"
        
        return data["task_id"]
    
    def test_update_team_task(self):
        """PUT /api/teams/tasks/{id} updates a task"""
        # First get existing tasks
        response = self.session.get(f"{BASE_URL}/api/teams/tasks")
        if response.status_code != 200:
            print("Cannot access team tasks, skipping update test")
            return
        
        data = response.json()
        if not data["tasks"]:
            print("No tasks to update, skipping")
            return
        
        task_id = data["tasks"][0]["task_id"]
        update_response = self.session.put(f"{BASE_URL}/api/teams/tasks/{task_id}", json={
            "completed": True
        })
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        print(f"Updated task {task_id}: marked as completed")
    
    def test_delete_team_task(self):
        """DELETE /api/teams/tasks/{id} deletes a task"""
        # First create a task to delete
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        if not team_response.json().get("team"):
            print("User has no team, skipping delete test")
            return
        
        # Create a test task
        create_response = self.session.post(f"{BASE_URL}/api/teams/tasks", json={
            "title": "TEST_Task to delete",
            "priority": "low"
        })
        if create_response.status_code != 200:
            print("Could not create task, skipping delete test")
            return
        
        task_id = create_response.json()["task_id"]
        
        # Delete the task
        delete_response = self.session.delete(f"{BASE_URL}/api/teams/tasks/{task_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        print(f"Deleted task {task_id}")
        
        # Verify deletion
        tasks_response = self.session.get(f"{BASE_URL}/api/teams/tasks")
        task_ids = [t["task_id"] for t in tasks_response.json()["tasks"]]
        assert task_id not in task_ids, "Deleted task should not appear in tasks list"


class TestTeamReminders:
    """Test shared team reminders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as business user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=BUSINESS_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_team_reminders(self):
        """GET /api/teams/reminders returns active reminders"""
        response = self.session.get(f"{BASE_URL}/api/teams/reminders")
        if response.status_code == 200:
            data = response.json()
            assert "reminders" in data, "Response should have 'reminders' field"
            print(f"GET /api/teams/reminders: {len(data['reminders'])} active reminders")
        elif response.status_code == 403:
            print("User is not a team member, cannot access reminders")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_create_team_reminder(self):
        """POST /api/teams/reminders creates a reminder"""
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        if not team_response.json().get("team"):
            print("User has no team, skipping reminder creation test")
            return
        
        from datetime import datetime, timedelta
        future_time = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        
        response = self.session.post(f"{BASE_URL}/api/teams/reminders", json={
            "title": "TEST_Team Reminder from pytest",
            "description": "Test reminder description",
            "reminder_time": future_time
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "reminder_id" in data, "Response should have reminder_id"
        print(f"Created team reminder: {data['reminder_id']}")
        return data["reminder_id"]
    
    def test_delete_team_reminder(self):
        """DELETE /api/teams/reminders/{id} deactivates a reminder"""
        # First create a reminder to delete
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        if not team_response.json().get("team"):
            print("User has no team, skipping delete test")
            return
        
        from datetime import datetime, timedelta
        future_time = (datetime.utcnow() + timedelta(hours=2)).isoformat()
        
        create_response = self.session.post(f"{BASE_URL}/api/teams/reminders", json={
            "title": "TEST_Reminder to delete",
            "reminder_time": future_time
        })
        if create_response.status_code != 200:
            print("Could not create reminder, skipping delete test")
            return
        
        reminder_id = create_response.json()["reminder_id"]
        
        # Delete the reminder
        delete_response = self.session.delete(f"{BASE_URL}/api/teams/reminders/{reminder_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        print(f"Deleted reminder {reminder_id}")


class TestTeamChat:
    """Test team chat/messaging"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as business user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=BUSINESS_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_team_messages(self):
        """GET /api/teams/messages returns team messages"""
        response = self.session.get(f"{BASE_URL}/api/teams/messages")
        if response.status_code == 200:
            data = response.json()
            assert "messages" in data, "Response should have 'messages' field"
            print(f"GET /api/teams/messages: {len(data['messages'])} messages")
            # Verify message structure
            if data['messages']:
                msg = data['messages'][0]
                assert "message_id" in msg, "Message should have message_id"
                assert "content" in msg, "Message should have content"
                assert "user_name" in msg, "Message should have user_name"
                print(f"Sample message from {msg.get('user_name')}: {msg.get('content')[:50]}...")
        elif response.status_code == 403:
            print("User is not a team member, cannot access messages")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_send_team_message(self):
        """POST /api/teams/messages sends a message"""
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        if not team_response.json().get("team"):
            print("User has no team, skipping message send test")
            return
        
        response = self.session.post(f"{BASE_URL}/api/teams/messages", json={
            "content": "TEST_Message from pytest"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message_id" in data, "Response should have message_id"
        assert data["content"] == "TEST_Message from pytest"
        print(f"Sent team message: {data['message_id']}")
        
        # Verify message appears in messages list
        messages_response = self.session.get(f"{BASE_URL}/api/teams/messages")
        messages = messages_response.json()["messages"]
        message_ids = [m["message_id"] for m in messages]
        assert data["message_id"] in message_ids, "Sent message should appear in messages list"


class TestTeamAnalytics:
    """Test team analytics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as business user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=BUSINESS_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_team_analytics(self):
        """GET /api/teams/analytics returns team stats and billing info"""
        response = self.session.get(f"{BASE_URL}/api/teams/analytics")
        if response.status_code == 200:
            data = response.json()
            # Verify required fields
            assert "total_tasks" in data, "Should have total_tasks"
            assert "completed_tasks" in data, "Should have completed_tasks"
            assert "completion_rate" in data, "Should have completion_rate"
            assert "active_reminders" in data, "Should have active_reminders"
            assert "total_messages" in data, "Should have total_messages"
            assert "member_count" in data, "Should have member_count"
            assert "members" in data, "Should have members list"
            assert "billing" in data, "Should have billing info"
            
            # Verify billing structure
            billing = data["billing"]
            assert "seats" in billing, "Billing should have seats"
            assert "per_seat_price" in billing, "Billing should have per_seat_price"
            assert "monthly_cost" in billing, "Billing should have monthly_cost"
            assert billing["per_seat_price"] == 10.00, "Per seat price should be $10"
            
            print(f"Team Analytics: {data['total_tasks']} tasks, {data['member_count']} members")
            print(f"Billing: {billing['seats']} seats x ${billing['per_seat_price']}/mo = ${billing['monthly_cost']}/mo")
            
            # Verify member stats structure
            if data["members"]:
                member = data["members"][0]
                assert "user_id" in member, "Member should have user_id"
                assert "name" in member, "Member should have name"
                assert "role" in member, "Member should have role"
                assert "tasks_created" in member, "Member should have tasks_created"
                assert "tasks_completed" in member, "Member should have tasks_completed"
                assert "messages" in member, "Member should have messages count"
        elif response.status_code == 403:
            print("User is not a team member, cannot access analytics")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestTeamMemberManagement:
    """Test member removal and role changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as business user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=BUSINESS_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_cannot_remove_self(self):
        """Cannot remove yourself from team"""
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        team_data = team_response.json()
        
        if not team_data.get("membership"):
            print("User has no team membership, skipping")
            return
        
        user_id = team_data["membership"]["user_id"]
        response = self.session.delete(f"{BASE_URL}/api/teams/members/{user_id}")
        assert response.status_code == 400, f"Expected 400 when removing self, got {response.status_code}"
        print("Correctly prevented self-removal from team")
    
    def test_role_change_requires_owner(self):
        """Only owner can change member roles"""
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        team_data = team_response.json()
        
        if not team_data.get("membership"):
            print("User has no team membership, skipping")
            return
        
        # If user is owner, this should work (but we need another member)
        # If user is not owner, this should fail with 403
        membership = team_data["membership"]
        if membership["role"] == "owner":
            print("User is owner, role change would work if there were other members")
        else:
            # Try to change someone's role
            response = self.session.put(f"{BASE_URL}/api/teams/members/some-user-id/role", json={
                "role": "admin"
            })
            assert response.status_code == 403, f"Expected 403 for non-owner, got {response.status_code}"
            print("Correctly blocked non-owner from changing roles")


class TestNonTeamMemberAccess:
    """Test that non-team members cannot access team endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as free user (who should not be in a team)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=FREE_USER)
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_non_member_cannot_access_tasks(self):
        """Non-team member cannot access team tasks"""
        # First verify user is not in a team
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        team_data = team_response.json()
        
        if team_data.get("team"):
            print("Free user is in a team, skipping non-member test")
            return
        
        response = self.session.get(f"{BASE_URL}/api/teams/tasks")
        assert response.status_code == 403, f"Expected 403 for non-member, got {response.status_code}"
        print("Non-team member correctly blocked from accessing tasks")
    
    def test_non_member_cannot_access_messages(self):
        """Non-team member cannot access team messages"""
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        team_data = team_response.json()
        
        if team_data.get("team"):
            print("Free user is in a team, skipping non-member test")
            return
        
        response = self.session.get(f"{BASE_URL}/api/teams/messages")
        assert response.status_code == 403, f"Expected 403 for non-member, got {response.status_code}"
        print("Non-team member correctly blocked from accessing messages")
    
    def test_non_member_cannot_access_analytics(self):
        """Non-team member cannot access team analytics"""
        team_response = self.session.get(f"{BASE_URL}/api/teams/my-team")
        team_data = team_response.json()
        
        if team_data.get("team"):
            print("Free user is in a team, skipping non-member test")
            return
        
        response = self.session.get(f"{BASE_URL}/api/teams/analytics")
        assert response.status_code == 403, f"Expected 403 for non-member, got {response.status_code}"
        print("Non-team member correctly blocked from accessing analytics")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
