"""
orchestrAI v7 Comprehensive Backend Test
Tests: All endpoints with proper auth, profile endpoints, onboarding flow
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

@pytest.fixture
def admin_token(api_client):
    """Get admin auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@orchestrai.app",
        "password": "Orchestr2026!"
    })
    if response.status_code == 200:
        return response.json()["token"]
    return None


class TestProfileEndpoints:
    """Test new profile endpoints for onboarding"""
    
    def test_get_profile_admin(self, api_client, admin_token):
        """GET /api/profile should return admin profile"""
        response = api_client.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data or "brand_name" in data
        print(f"✓ Admin profile retrieved: {data}")
    
    def test_update_profile(self, api_client, admin_token):
        """PUT /api/profile should update profile"""
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "brand_name": "TEST_orchestrAI",
                "niche": "AI automation",
                "brand_voice": "professional",
                "goals": "automate"
            }
        )
        assert response.status_code == 200
        print(f"✓ Profile updated successfully")
        
        # Verify update
        response = api_client.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("brand_name") == "TEST_orchestrAI"
        print(f"✓ Profile update verified")
    
    def test_profile_requires_auth(self, api_client):
        """Profile endpoints should require auth"""
        response = api_client.get(f"{BASE_URL}/api/profile")
        assert response.status_code == 401
        print(f"✓ Profile requires auth")


class TestDashboardWithAuth:
    """Test dashboard endpoint with auth"""
    
    def test_dashboard_with_token(self, api_client, admin_token):
        response = api_client.get(
            f"{BASE_URL}/api/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_stores" in data
        assert "active_agents" in data
        assert data["active_agents"] == 4
        print(f"✓ Dashboard: {data['active_agents']} agents, {data['total_stores']} stores")


class TestAgentsWithAuth:
    """Test agents endpoints with auth"""
    
    def test_get_agents(self, api_client, admin_token):
        response = api_client.get(
            f"{BASE_URL}/api/agents",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        agents = response.json()
        assert len(agents) == 4
        agent_types = [a["agent_type"] for a in agents]
        assert "store_manager" in agent_types
        assert "marketing" in agent_types
        assert "analytics" in agent_types
        assert "customer_service" in agent_types
        print(f"✓ All 4 agents present: {agent_types}")
    
    def test_update_agent(self, api_client, admin_token):
        # Get first agent
        response = api_client.get(
            f"{BASE_URL}/api/agents",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        agents = response.json()
        agent_id = agents[0]["id"]
        
        # Toggle is_active
        response = api_client.patch(
            f"{BASE_URL}/api/agents/{agent_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": False}
        )
        assert response.status_code == 200
        print(f"✓ Agent toggle working")


class TestStoresWithAuth:
    """Test stores endpoints with auth"""
    
    def test_get_stores(self, api_client, admin_token):
        response = api_client.get(
            f"{BASE_URL}/api/stores",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        stores = response.json()
        assert isinstance(stores, list)
        print(f"✓ Stores endpoint working: {len(stores)} stores")
    
    def test_create_and_delete_store(self, api_client, admin_token):
        # Create store
        response = api_client.post(
            f"{BASE_URL}/api/stores",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_v7_Store",
                "platform": "shopify",
                "store_url": "https://test.myshopify.com"
            }
        )
        assert response.status_code == 200
        store = response.json()
        assert "id" in store
        store_id = store["id"]
        print(f"✓ Store created: {store_id}")
        
        # Delete store
        response = api_client.delete(
            f"{BASE_URL}/api/stores/{store_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print(f"✓ Store deleted")


class TestExecutionEngine:
    """Test execution engine endpoints"""
    
    def test_get_action_catalog(self, api_client, admin_token):
        response = api_client.get(
            f"{BASE_URL}/api/actions/catalog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        catalog = response.json()
        assert "store_manager" in catalog
        assert "marketing" in catalog
        assert "analytics" in catalog
        assert "customer_service" in catalog
        
        # Count total actions
        total_actions = sum(len(actions) for actions in catalog.values())
        print(f"✓ Action catalog: {total_actions} actions across 4 agents")
        assert total_actions >= 20  # Should have at least 20 actions
    
    def test_get_workflow_templates(self, api_client, admin_token):
        response = api_client.get(
            f"{BASE_URL}/api/workflows/templates",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)
        assert len(templates) >= 4
        print(f"✓ Workflow templates: {len(templates)} templates")
    
    def test_get_action_history(self, api_client, admin_token):
        response = api_client.get(
            f"{BASE_URL}/api/actions/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        history = response.json()
        assert isinstance(history, list)
        print(f"✓ Action history: {len(history)} past actions")


class TestOnboardingFlow:
    """Test complete onboarding flow for new user"""
    
    def test_new_user_onboarding_flow(self, api_client):
        """Test: Register → Check profile (empty) → Update profile → Verify"""
        timestamp = int(time.time())
        email = f"TEST_onboard_{timestamp}@example.com"
        
        # 1. Register new user
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Onboarding Test User"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        print(f"✓ New user registered: {email}")
        
        # 2. Check profile (should be empty or default)
        response = api_client.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        profile = response.json()
        # New user should have empty/default profile
        print(f"✓ New user profile: {profile}")
        
        # 3. Complete onboarding (update profile)
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "brand_name": "Test Brand",
                "niche": "handmade jewelry",
                "brand_voice": "casual",
                "goals": "launch"
            }
        )
        assert response.status_code == 200
        print(f"✓ Onboarding profile saved")
        
        # 4. Verify profile was saved
        response = api_client.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        profile = response.json()
        assert profile.get("brand_name") == "Test Brand"
        assert profile.get("niche") == "handmade jewelry"
        assert profile.get("goals") == "launch"
        print(f"✓ Onboarding complete - profile verified")
        
        # 5. Verify user has 4 agents
        response = api_client.get(
            f"{BASE_URL}/api/agents",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        agents = response.json()
        assert len(agents) == 4
        print(f"✓ New user has 4 agents ready")
