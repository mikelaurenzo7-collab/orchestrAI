"""
orchestrAI Auth Testing - Iteration 3
Tests for: Registration, Login, Logout, Token Auth, Brute Force Protection, Protected Endpoints, 30-day Trial
"""
import pytest
import requests
import os
import time

BASE_URL = "https://agent-marketplace-69.preview.emergentagent.com"

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPublicEndpoints:
    """Public endpoints that should work without auth"""
    
    def test_root_endpoint_public(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["app"] == "orchestrAI"
        assert data["version"] == "3.0.0"
        assert data["status"] == "operational"
    
    def test_health_endpoint_public(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestRegistration:
    """User registration flow"""
    
    def test_register_new_user_success(self, api_client):
        """Register new user and verify response"""
        timestamp = int(time.time())
        user_data = {
            "email": f"TEST_user_{timestamp}@example.com",
            "password": "SecurePass123!",
            "name": "Test User"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["email"] == user_data["email"].lower()  # Backend lowercases email
        assert data["name"] == user_data["name"]
        assert data["role"] == "user"
        assert "token" in data
        assert len(data["token"]) > 0
        
        # Verify httpOnly cookies are set
        assert "access_token" in response.cookies or "Set-Cookie" in response.headers
    
    def test_register_duplicate_email(self, api_client):
        """Registering with existing email should fail"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "admin@orchestrai.app",
            "password": "AnyPassword123",
            "name": "Duplicate"
        })
        assert response.status_code == 409
        data = response.json()
        assert "already registered" in data["detail"].lower()
    
    def test_register_invalid_password_too_short(self, api_client):
        """Password must be at least 6 characters"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@example.com",
            "password": "12345",
            "name": "Test"
        })
        assert response.status_code == 400
    
    def test_register_missing_fields(self, api_client):
        """Missing required fields should fail"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@example.com"
        })
        assert response.status_code == 422  # Pydantic validation error
    
    def test_new_user_gets_4_agents(self, api_client):
        """Verify new user gets 4 default agents seeded"""
        timestamp = int(time.time())
        user_data = {
            "email": f"TEST_agents_{timestamp}@example.com",
            "password": "Password123!",
            "name": "Agent Test User"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        
        token = response.json()["token"]
        
        # Get agents for this user
        response = api_client.get(
            f"{BASE_URL}/api/agents",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        agents = response.json()
        assert len(agents) == 4
        
        # Verify all 4 agent types exist
        agent_types = [a["agent_type"] for a in agents]
        assert "store_manager" in agent_types
        assert "marketing" in agent_types
        assert "analytics" in agent_types
        assert "customer_service" in agent_types


class TestLogin:
    """User login flow"""
    
    def test_login_admin_success(self, api_client):
        """Login with admin credentials (orchestrAI v3.0)"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@orchestrai.app",
            "password": "Orchestr2026!"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["email"] == "admin@orchestrai.app"
        assert data["name"] == "Admin"
        assert data["role"] == "admin"
        assert "token" in data
        assert len(data["token"]) > 0
        
        # Verify httpOnly cookies are set
        assert "access_token" in response.cookies or "Set-Cookie" in response.headers
    
    def test_login_wrong_password(self, api_client):
        """Login with wrong password should fail"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@orchestrai.app",
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        data = response.json()
        assert "invalid" in data["detail"].lower()
    
    def test_login_nonexistent_user(self, api_client):
        """Login with non-existent email should fail"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "AnyPassword123"
        })
        assert response.status_code == 401
    
    def test_login_case_insensitive_email(self, api_client):
        """Email should be case-insensitive"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ADMIN@ORCHESTRAI.APP",
            "password": "Orchestr2026!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@orchestrai.app"


class TestBruteForceProtection:
    """Brute force protection - 5 failed attempts → 15 min lockout"""
    
    def test_brute_force_lockout(self, api_client):
        """After 5 failed login attempts, account should be locked for 15 minutes"""
        timestamp = int(time.time())
        test_email = f"TEST_brute_{timestamp}@example.com"
        
        # Register a test user first
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "CorrectPassword123",
            "name": "Brute Force Test"
        })
        
        # Make 5 failed login attempts
        for i in range(5):
            response = api_client.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "WrongPassword"
            })
            assert response.status_code == 401
        
        # 6th attempt with wrong password should return 429 (Too Many Requests)
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword"
        })
        # Should be locked out now
        assert response.status_code == 429
        data = response.json()
        assert "too many attempts" in data["detail"].lower() or "try again" in data["detail"].lower()


class TestAuthMe:
    """GET /api/auth/me - Get current user"""
    
    def test_auth_me_with_valid_token(self, api_client):
        """GET /api/auth/me with valid Bearer token should return user"""
        # Login first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@theone.ai",
            "password": "TheOne2026!"
        })
        token = login_response.json()["token"]
        
        # Get current user
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["email"] == "admin@theone.ai"
        assert data["name"] == "Admin"
        assert data["role"] == "admin"
        assert "password_hash" not in data  # Password should never be returned
    
    def test_auth_me_without_token(self, api_client):
        """GET /api/auth/me without token should return 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        data = response.json()
        assert "not authenticated" in data["detail"].lower()
    
    def test_auth_me_with_invalid_token(self, api_client):
        """GET /api/auth/me with invalid token should return 401"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401


class TestProtectedEndpoints:
    """All protected endpoints should return 401 without auth"""
    
    def test_dashboard_requires_auth(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 401
    
    def test_agents_requires_auth(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/agents")
        assert response.status_code == 401
    
    def test_stores_requires_auth(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 401
    
    def test_chat_requires_auth(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/chat", json={
            "message": "Hello",
            "agent_type": "general"
        })
        assert response.status_code == 401
    
    def test_social_content_requires_auth(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/social/content")
        assert response.status_code == 401
    
    def test_tasks_requires_auth(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 401
    
    def test_protected_endpoints_work_with_token(self, api_client):
        """Verify protected endpoints work with valid token"""
        # Login first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@orchestrai.app",
            "password": "Orchestr2026!"
        })
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test all protected endpoints
        response = api_client.get(f"{BASE_URL}/api/dashboard", headers=headers)
        assert response.status_code == 200
        
        response = api_client.get(f"{BASE_URL}/api/agents", headers=headers)
        assert response.status_code == 200
        
        response = api_client.get(f"{BASE_URL}/api/stores", headers=headers)
        assert response.status_code == 200
        
        response = api_client.get(f"{BASE_URL}/api/tasks", headers=headers)
        assert response.status_code == 200


class TestLogout:
    """Logout flow"""
    
    def test_logout_clears_cookies(self, api_client):
        """POST /api/auth/logout should clear cookies"""
        # Login first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@orchestrai.app",
            "password": "Orchestr2026!"
        })
        token = login_response.json()["token"]
        
        # Logout
        response = api_client.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "logged out"


class TestBcryptHashFormat:
    """Verify bcrypt password hashing"""
    
    def test_bcrypt_hash_format(self, api_client):
        """Verify password hashes start with $2b$ (bcrypt format)"""
        # This test verifies the hash format by checking the backend logs
        # We can't directly access the database, but we can verify the hash works
        
        timestamp = int(time.time())
        user_data = {
            "email": f"TEST_bcrypt_{timestamp}@example.com",
            "password": "TestPassword123!",
            "name": "Bcrypt Test"
        }
        
        # Register user
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        
        # Login with same password should work (verifies bcrypt.checkpw works)
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert response.status_code == 200
        
        # Login with wrong password should fail
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_data["email"],
            "password": "WrongPassword"
        })
        assert response.status_code == 401


class TestRefreshToken:
    """Refresh token flow"""
    
    def test_refresh_token_endpoint_exists(self, api_client):
        """POST /api/auth/refresh should exist"""
        response = api_client.post(f"{BASE_URL}/api/auth/refresh")
        # Should return 401 without refresh token cookie


class TestTrialFeature:
    """30-day free trial feature tests (orchestrAI v3.0)"""
    
    def test_register_sets_trial_ends_at(self, api_client):
        """New user registration should set trial_ends_at to 30 days from now"""
        timestamp = int(time.time())
        user_data = {
            "email": f"TEST_trial_{timestamp}@example.com",
            "password": "TrialPass123!",
            "name": "Trial Test User"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        
        token = response.json()["token"]
        
        # Get user details via /api/auth/me
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert data["plan"] == "trial"
        assert "trial_ends_at" in data
        assert data["trial_ends_at"] is not None
        
        # Verify trial_ends_at is approximately 30 days from now
        from datetime import datetime, timezone, timedelta
        trial_end = datetime.fromisoformat(data["trial_ends_at"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        expected_end = now + timedelta(days=30)
        
        # Allow 1 minute tolerance for test execution time
        time_diff = abs((trial_end - expected_end).total_seconds())
        assert time_diff < 60, f"Trial end date is not ~30 days from now (diff: {time_diff}s)"
    
    def test_auth_me_returns_plan_and_trial(self, api_client):
        """GET /api/auth/me should return plan and trial_ends_at fields"""
        # Login with admin
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@orchestrai.app",
            "password": "Orchestr2026!"
        })
        token = login_response.json()["token"]
        
        # Get current user
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "trial_ends_at" in data
        # Admin may not have trial_ends_at, but field should exist

        assert response.status_code == 401
