"""
orchestrAI v3.0 Rebrand Testing
Tests for: Rebrand from THEONE to orchestrAI, 30-day trial, new admin credentials
"""
import pytest
import requests
import time
from datetime import datetime, timezone, timedelta

BASE_URL = "https://agent-marketplace-69.preview.emergentagent.com"

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get auth token by logging in with new admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@orchestrai.app",
        "password": "Orchestr2026!"
    })
    if response.status_code == 200:
        return response.json()["token"]
    return None


class TestRebrand:
    """orchestrAI v3.0 rebrand tests"""
    
    def test_root_endpoint_shows_orchestrai(self, api_client):
        """GET /api/ should return orchestrAI and version 3.0.0"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["app"] == "orchestrAI"
        assert data["version"] == "3.0.0"
        assert data["status"] == "operational"
    
    def test_health_endpoint_shows_orchestrai(self, api_client):
        """GET /api/health should mention orchestrAI"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "orchestrAI" in data["service"]
    
    def test_new_admin_login_works(self, api_client):
        """New admin@orchestrai.app credentials should work"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@orchestrai.app",
            "password": "Orchestr2026!"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == "admin@orchestrai.app"
        assert data["name"] == "Admin"
        assert data["role"] == "admin"
        assert "token" in data
    
    def test_old_admin_may_still_exist(self, api_client):
        """Old admin@theone.ai may still exist in database (not deleted, just not primary)"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@theone.ai",
            "password": "TheOne2026!"
        })
        # Old admin may or may not exist - both are acceptable
        # What matters is that new admin works
        assert response.status_code in [200, 401]


class TestTrialFeature:
    """30-day free trial feature tests"""
    
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
        trial_end = datetime.fromisoformat(data["trial_ends_at"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        expected_end = now + timedelta(days=30)
        
        # Allow 1 minute tolerance for test execution time
        time_diff = abs((trial_end - expected_end).total_seconds())
        assert time_diff < 60, f"Trial end date is not ~30 days from now (diff: {time_diff}s)"
    
    def test_auth_me_returns_plan_and_trial(self, api_client, auth_token):
        """GET /api/auth/me should return plan and trial_ends_at fields"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "trial_ends_at" in data


class TestCoreFeatures:
    """Test core features still work after rebrand"""
    
    def test_dashboard_loads(self, api_client, auth_token):
        """Dashboard should load with metrics"""
        response = api_client.get(
            f"{BASE_URL}/api/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_stores" in data
        assert "active_agents" in data
        assert "tasks_completed" in data
        assert data["active_agents"] == 4  # 4 seeded agents
    
    def test_agents_endpoint(self, api_client, auth_token):
        """Agents endpoint should return 4 seeded agents"""
        response = api_client.get(
            f"{BASE_URL}/api/agents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        agents = response.json()
        assert len(agents) == 4
        
        agent_types = [a["agent_type"] for a in agents]
        assert "store_manager" in agent_types
        assert "marketing" in agent_types
        assert "analytics" in agent_types
        assert "customer_service" in agent_types
    
    def test_agent_toggle_works(self, api_client, auth_token):
        """Agent toggle (active/inactive) should work"""
        # Get agents
        response = api_client.get(
            f"{BASE_URL}/api/agents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        agents = response.json()
        agent = agents[0]
        agent_id = agent["id"]
        original_status = agent["is_active"]
        
        # Toggle is_active
        response = api_client.patch(
            f"{BASE_URL}/api/agents/{agent_id}",
            json={"is_active": not original_status},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        updated_agent = response.json()
        assert updated_agent["is_active"] == (not original_status)
        
        # Restore original state
        api_client.patch(
            f"{BASE_URL}/api/agents/{agent_id}",
            json={"is_active": original_status},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_store_connection_flow(self, api_client, auth_token):
        """Store connection and disconnection should work"""
        # Connect store
        store_data = {
            "name": "TEST_Rebrand_Store",
            "platform": "shopify",
            "store_url": "https://test-rebrand.myshopify.com"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/stores",
            json=store_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        created_store = response.json()
        assert created_store["name"] == store_data["name"]
        assert created_store["status"] == "connected"
        store_id = created_store["id"]
        
        # Disconnect store
        response = api_client.delete(
            f"{BASE_URL}/api/stores/{store_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "disconnected"
