"""
Peace Within API Tests
Tests for: Auth, User Profile, Affirmation, Check-ins, Chat, Progress, Subscription
"""
import pytest
import requests
import uuid
import time

class TestAuth:
    """Authentication endpoint tests"""

    def test_register_new_user(self, api_client, base_url):
        """Test user registration with new email"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Test User",
            "email": test_email,
            "password": "testpass123"
        }
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        
        print(f"✓ Registration response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Token missing in response"
        assert "user" in data, "User missing in response"
        assert data["user"]["email"] == test_email.lower()
        assert data["user"]["name"] == "Test User"
        assert "password_hash" not in data["user"], "Password hash leaked in response"
        assert "_id" not in data["user"], "MongoDB _id leaked in response"
        print(f"✓ User registered successfully: {test_email}")

    def test_register_duplicate_email(self, api_client, base_url):
        """Test registration with duplicate email"""
        test_email = f"duplicate_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"name": "User One", "email": test_email, "password": "pass123"}
        
        # First registration
        response1 = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert response1.status_code == 200
        
        # Duplicate registration
        response2 = api_client.post(f"{base_url}/api/auth/register", json=payload)
        print(f"✓ Duplicate registration status: {response2.status_code}")
        assert response2.status_code == 400, "Should reject duplicate email"
        assert "already registered" in response2.json()["detail"].lower()
        print(f"✓ Duplicate email rejected correctly")

    def test_login_success(self, api_client, base_url):
        """Test successful login"""
        # Create user first
        test_email = f"login_{uuid.uuid4().hex[:8]}@example.com"
        test_password = "loginpass123"
        register_payload = {"name": "Login User", "email": test_email, "password": test_password}
        api_client.post(f"{base_url}/api/auth/register", json=register_payload)
        
        # Login
        login_payload = {"email": test_email, "password": test_password}
        response = api_client.post(f"{base_url}/api/auth/login", json=login_payload)
        
        print(f"✓ Login response status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email.lower()
        print(f"✓ Login successful for {test_email}")

    def test_login_invalid_credentials(self, api_client, base_url):
        """Test login with wrong password"""
        login_payload = {"email": "nonexistent@example.com", "password": "wrongpass"}
        response = api_client.post(f"{base_url}/api/auth/login", json=login_payload)
        
        print(f"✓ Invalid login status: {response.status_code}")
        assert response.status_code == 401, "Should return 401 for invalid credentials"
        assert "invalid" in response.json()["detail"].lower()
        print(f"✓ Invalid credentials rejected")


class TestUserProfile:
    """User profile endpoint tests"""

    @pytest.fixture
    def authenticated_user(self, api_client, base_url):
        """Create and authenticate a test user"""
        test_email = f"profile_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"name": "Profile User", "email": test_email, "password": "pass123"}
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        data = response.json()
        return {"token": data["token"], "user": data["user"]}

    def test_get_profile(self, api_client, base_url, authenticated_user):
        """Test fetching user profile"""
        token = authenticated_user["token"]
        response = api_client.get(
            f"{base_url}/api/user/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Profile fetch status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "email" in data
        assert "name" in data
        assert "total_checkins" in data
        assert data["email"] == authenticated_user["user"]["email"]
        assert "_id" not in data, "MongoDB _id leaked in response"
        print(f"✓ Profile fetched successfully")

    def test_profile_without_auth(self, api_client, base_url):
        """Test profile endpoint without authentication"""
        response = api_client.get(f"{base_url}/api/user/profile")
        
        print(f"✓ Unauthorized profile status: {response.status_code}")
        assert response.status_code == 401, "Should reject unauthenticated request"
        print(f"✓ Unauthenticated request rejected")


class TestAffirmation:
    """Daily affirmation endpoint tests"""

    @pytest.fixture
    def authenticated_user(self, api_client, base_url):
        """Create and authenticate a test user"""
        test_email = f"affirmation_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"name": "Affirmation User", "email": test_email, "password": "pass123"}
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        data = response.json()
        return {"token": data["token"], "user": data["user"]}

    def test_get_daily_affirmation(self, api_client, base_url, authenticated_user):
        """Test fetching daily affirmation (AI-generated)"""
        token = authenticated_user["token"]
        response = api_client.get(
            f"{base_url}/api/affirmation",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Affirmation fetch status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "affirmation" in data
        assert "date" in data
        assert len(data["affirmation"]) > 0
        print(f"✓ Affirmation generated: {data['affirmation'][:50]}...")


class TestMoodCheckin:
    """Mood check-in endpoint tests"""

    @pytest.fixture
    def authenticated_user(self, api_client, base_url):
        """Create and authenticate a test user"""
        test_email = f"checkin_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"name": "Checkin User", "email": test_email, "password": "pass123"}
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        data = response.json()
        return {"token": data["token"], "user": data["user"]}

    def test_create_mood_checkin(self, api_client, base_url, authenticated_user):
        """Test creating mood check-in with AI content generation"""
        token = authenticated_user["token"]
        payload = {"mood": "stressed"}
        
        response = api_client.post(
            f"{base_url}/api/checkin",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Check-in creation status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["mood"] == "stressed"
        assert "motivational_message" in data
        assert "scripture" in data
        assert "grounding_exercise" in data
        assert len(data["motivational_message"]) > 0
        assert len(data["scripture"]) > 0
        assert len(data["grounding_exercise"]) > 0
        assert "_id" not in data, "MongoDB _id leaked in response"
        print(f"✓ Check-in created with AI content")
        
        # Verify persistence by fetching check-ins
        time.sleep(1)  # Brief wait
        get_response = api_client.get(
            f"{base_url}/api/checkins",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200
        checkins = get_response.json()
        assert len(checkins) > 0
        assert any(c["id"] == data["id"] for c in checkins)
        print(f"✓ Check-in persisted and retrieved")

    def test_create_checkin_invalid_mood(self, api_client, base_url, authenticated_user):
        """Test check-in with invalid mood"""
        token = authenticated_user["token"]
        payload = {"mood": "invalid_mood"}
        
        response = api_client.post(
            f"{base_url}/api/checkin",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Invalid mood status: {response.status_code}")
        assert response.status_code == 400
        print(f"✓ Invalid mood rejected")

    def test_get_checkins_list(self, api_client, base_url, authenticated_user):
        """Test fetching check-in history"""
        token = authenticated_user["token"]
        
        # Create a check-in first
        api_client.post(
            f"{base_url}/api/checkin",
            json={"mood": "happy"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Fetch check-ins
        response = api_client.get(
            f"{base_url}/api/checkins",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Checkins list status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} check-ins")


class TestChat:
    """AI chat endpoint tests"""

    @pytest.fixture
    def authenticated_user(self, api_client, base_url):
        """Create and authenticate a test user"""
        test_email = f"chat_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"name": "Chat User", "email": test_email, "password": "pass123"}
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        data = response.json()
        return {"token": data["token"], "user": data["user"]}

    def test_send_chat_message(self, api_client, base_url, authenticated_user):
        """Test sending chat message and receiving AI response"""
        token = authenticated_user["token"]
        payload = {"message": "How can I manage stress?"}
        
        response = api_client.post(
            f"{base_url}/api/chat",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Chat message status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "session_id" in data
        assert "user_message" in data
        assert "ai_message" in data
        assert data["user_message"]["content"] == "How can I manage stress?"
        assert len(data["ai_message"]["content"]) > 0
        assert data["ai_message"]["role"] == "assistant"
        assert "_id" not in data["user_message"], "MongoDB _id leaked"
        assert "_id" not in data["ai_message"], "MongoDB _id leaked"
        print(f"✓ AI response received: {data['ai_message']['content'][:50]}...")

    def test_get_chat_sessions(self, api_client, base_url, authenticated_user):
        """Test fetching chat sessions"""
        token = authenticated_user["token"]
        
        # Send a message first
        api_client.post(
            f"{base_url}/api/chat",
            json={"message": "Hello"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        time.sleep(1)
        
        response = api_client.get(
            f"{base_url}/api/chat/sessions",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Chat sessions status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "session_id" in data[0]
            assert "last_message" in data[0]
        print(f"✓ Retrieved {len(data)} chat sessions")

    def test_get_chat_history(self, api_client, base_url, authenticated_user):
        """Test fetching chat history for a session"""
        token = authenticated_user["token"]
        
        # Send a message
        chat_response = api_client.post(
            f"{base_url}/api/chat",
            json={"message": "Test message"},
            headers={"Authorization": f"Bearer {token}"}
        )
        session_id = chat_response.json()["session_id"]
        
        # Get history
        response = api_client.get(
            f"{base_url}/api/chat/history?session_id={session_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Chat history status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # User message + AI response
        print(f"✓ Retrieved {len(data)} messages in history")


class TestProgress:
    """Progress tracker endpoint tests"""

    @pytest.fixture
    def authenticated_user(self, api_client, base_url):
        """Create and authenticate a test user"""
        test_email = f"progress_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"name": "Progress User", "email": test_email, "password": "pass123"}
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        data = response.json()
        return {"token": data["token"], "user": data["user"]}

    def test_get_progress_empty(self, api_client, base_url, authenticated_user):
        """Test progress endpoint with no check-ins"""
        token = authenticated_user["token"]
        
        response = api_client.get(
            f"{base_url}/api/progress",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Progress fetch status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "daily_scores" in data
        assert "mood_distribution" in data
        assert "total_checkins" in data
        assert "current_streak" in data
        assert data["total_checkins"] == 0
        print(f"✓ Empty progress data structure valid")

    def test_get_progress_with_data(self, api_client, base_url, authenticated_user):
        """Test progress endpoint with check-in data"""
        token = authenticated_user["token"]
        
        # Create check-ins
        for mood in ["happy", "calm"]:
            api_client.post(
                f"{base_url}/api/checkin",
                json={"mood": mood},
                headers={"Authorization": f"Bearer {token}"}
            )
        
        time.sleep(1)
        
        response = api_client.get(
            f"{base_url}/api/progress",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Progress with data status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_checkins"] >= 2
        assert len(data["mood_distribution"]) > 0
        assert "avg_score" in data
        print(f"✓ Progress data with {data['total_checkins']} check-ins")


class TestSubscription:
    """Subscription/Stripe endpoint tests"""

    @pytest.fixture
    def authenticated_user(self, api_client, base_url):
        """Create and authenticate a test user"""
        test_email = f"sub_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"name": "Sub User", "email": test_email, "password": "pass123"}
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        data = response.json()
        return {"token": data["token"], "user": data["user"]}

    def test_create_checkout_session(self, api_client, base_url, authenticated_user):
        """Test creating Stripe checkout session"""
        token = authenticated_user["token"]
        payload = {"origin_url": base_url}
        
        response = api_client.post(
            f"{base_url}/api/subscription/checkout",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"✓ Checkout session status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("http")
        print(f"✓ Stripe checkout session created: {data['session_id']}")
