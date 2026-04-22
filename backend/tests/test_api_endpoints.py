"""
orchestrAI API Endpoint Tests - Iteration 3
Tests for: Dashboard, Agents, Stores, Chat, Social Content, Tasks
"""
import pytest
import requests
import os
import time

# Use the public backend URL from frontend .env
BASE_URL = "http://localhost:8000"

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get auth token by logging in with admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@orchestrai.app",
        "password": "Orchestr2026!"
    })
    if response.status_code == 200:
        return response.json()["token"]
    return None


class TestHealth:
    """Health check endpoints - run first"""
    
    def test_root_endpoint(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["app"] == "orchestrAI"
        assert data["version"] == "3.0.0"
        assert data["status"] == "operational"
    
    def test_health_endpoint(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "orchestrAI" in data["service"]


class TestDashboard:
    """Dashboard metrics endpoint"""
    
    def test_get_dashboard_metrics(self, api_client, auth_token):
        response = api_client.get(f"{BASE_URL}/api/dashboard", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        data = response.json()
        # Validate structure
        assert "total_stores" in data
        assert "active_agents" in data
        assert "tasks_completed" in data
        assert "total_revenue" in data
        assert "total_orders" in data
        assert "social_posts" in data
        assert "recent_activity" in data
        
        # Validate types
        assert isinstance(data["total_stores"], int)
        assert isinstance(data["active_agents"], int)
        assert isinstance(data["tasks_completed"], int)
        assert isinstance(data["total_revenue"], (int, float))
        assert isinstance(data["total_orders"], int)
        assert isinstance(data["social_posts"], int)
        assert isinstance(data["recent_activity"], list)
        
        # Should have 4 seeded agents
        assert data["active_agents"] == 4


class TestAgents:
    """Agent management endpoints"""
    
    def test_get_all_agents(self, api_client, auth_token):
        response = api_client.get(f"{BASE_URL}/api/agents", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        
        agents = response.json()
        assert isinstance(agents, list)
        assert len(agents) == 4  # 4 seeded agents
        
        # Validate agent structure
        agent = agents[0]
        assert "id" in agent
        assert "name" in agent
        assert "agent_type" in agent
        assert "description" in agent
        assert "is_active" in agent
        assert "capabilities" in agent
        assert "tasks_completed" in agent
        
        # Check all 4 agent types exist
        agent_types = [a["agent_type"] for a in agents]
        assert "store_manager" in agent_types
        assert "marketing" in agent_types
        assert "analytics" in agent_types
        assert "customer_service" in agent_types
    
    def test_get_single_agent(self, api_client, auth_token):
        # First get all agents
        response = api_client.get(f"{BASE_URL}/api/agents", headers={"Authorization": f"Bearer {auth_token}"})
        agents = response.json()
        agent_id = agents[0]["id"]
        
        # Get single agent - Note: This endpoint doesn't exist in server.py, skip for now
        pytest.skip("GET /api/agents/{id} endpoint not implemented")
    
    def test_get_nonexistent_agent(self, api_client, auth_token):
        pytest.skip("GET /api/agents/{id} endpoint not implemented")
    
    def test_update_agent_toggle_active(self, api_client, auth_token):
        # Get an agent
        response = api_client.get(f"{BASE_URL}/api/agents", headers={"Authorization": f"Bearer {auth_token}"})
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
        
        # Verify persistence with GET
        response = api_client.get(f"{BASE_URL}/api/agents", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        agents = response.json()
        verified_agent = next(a for a in agents if a["id"] == agent_id)
        assert verified_agent["is_active"] == (not original_status)
        
        # Restore original state
        api_client.patch(
            f"{BASE_URL}/api/agents/{agent_id}",
            json={"is_active": original_status},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_update_agent_auto_execute(self, api_client, auth_token):
        response = api_client.get(f"{BASE_URL}/api/agents", headers={"Authorization": f"Bearer {auth_token}"})
        agents = response.json()
        agent_id = agents[0]["id"]
        
        response = api_client.patch(
            f"{BASE_URL}/api/agents/{agent_id}",
            json={"auto_execute": True},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        updated_agent = response.json()
        assert updated_agent["auto_execute"] == True


class TestStores:
    """Store connection endpoints"""
    
    def test_get_stores_empty_or_list(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        
        stores = response.json()
        assert isinstance(stores, list)
    
    def test_connect_store_and_verify(self, api_client):
        # Create store
        store_data = {
            "name": "TEST_Shopify_Store",
            "platform": "shopify",
            "store_url": "https://test-store.myshopify.com",
            "api_key": "test_api_key_12345"
        }
        
        response = api_client.post(f"{BASE_URL}/api/stores", json=store_data)
        assert response.status_code == 200
        
        created_store = response.json()
        assert created_store["name"] == store_data["name"]
        assert created_store["platform"] == store_data["platform"]
        assert created_store["status"] == "connected"
        assert "id" in created_store
        assert "connected_at" in created_store
        
        store_id = created_store["id"]
        
        # Verify persistence with GET
        response = api_client.get(f"{BASE_URL}/api/stores")
        assert response.status_code == 200
        stores = response.json()
        assert any(s["id"] == store_id for s in stores)
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/stores/{store_id}")
    
    def test_disconnect_store(self, api_client):
        # Create a test store
        store_data = {
            "name": "TEST_Delete_Store",
            "platform": "woocommerce",
            "store_url": "https://test.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/stores", json=store_data)
        store_id = response.json()["id"]
        
        # Delete store
        response = api_client.delete(f"{BASE_URL}/api/stores/{store_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "disconnected"
        
        # Verify deletion with GET
        response = api_client.get(f"{BASE_URL}/api/stores")
        stores = response.json()
        assert not any(s["id"] == store_id for s in stores)
    
    def test_disconnect_nonexistent_store(self, api_client):
        response = api_client.delete(f"{BASE_URL}/api/stores/nonexistent-store-id")
        assert response.status_code == 404


class TestChat:
    """Chat with AI agents"""
    
    def test_chat_with_general_agent(self, api_client):
        chat_data = {
            "message": "Hello, what can you do?",
            "agent_type": "general"
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat", json=chat_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "content" in data
        assert "role" in data
        assert data["role"] == "assistant"
        assert len(data["content"]) > 0
        
        # AI should respond with meaningful content
        assert len(data["content"]) > 20
    
    def test_chat_with_store_manager_agent(self, api_client):
        chat_data = {
            "message": "Help me manage inventory",
            "agent_type": "store_manager"
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat", json=chat_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["role"] == "assistant"
        assert len(data["content"]) > 0
    
    def test_get_chat_history(self, api_client):
        # Send a message first
        api_client.post(
            f"{BASE_URL}/api/chat",
            json={"message": "Test message for history", "agent_type": "marketing"}
        )
        
        # Wait a bit for message to be stored
        time.sleep(0.5)
        
        # Get history
        response = api_client.get(f"{BASE_URL}/api/chat/history/marketing")
        assert response.status_code == 200
        
        messages = response.json()
        assert isinstance(messages, list)
        assert len(messages) > 0
    
    def test_clear_chat_history(self, api_client):
        # Send a message
        api_client.post(
            f"{BASE_URL}/api/chat",
            json={"message": "Test clear", "agent_type": "analytics"}
        )
        
        # Clear history
        response = api_client.delete(f"{BASE_URL}/api/chat/history/analytics")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "cleared"
        
        # Verify cleared
        response = api_client.get(f"{BASE_URL}/api/chat/history/analytics")
        messages = response.json()
        assert len(messages) == 0


class TestSocialContent:
    """Social media content generation"""
    
    def test_generate_instagram_content(self, api_client):
        content_data = {
            "product_name": "Wireless Earbuds Pro",
            "product_description": "Premium wireless earbuds with noise cancellation and 24h battery life",
            "platform": "instagram",
            "tone": "engaging"
        }
        
        response = api_client.post(f"{BASE_URL}/api/social/generate", json=content_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "content" in data
        assert "hashtags" in data
        assert data["platform"] == "instagram"
        assert data["product_name"] == content_data["product_name"]
        assert data["status"] == "draft"
        
        # Content should be generated
        assert len(data["content"]) > 0
        assert isinstance(data["hashtags"], list)
        assert len(data["hashtags"]) > 0
    
    def test_generate_twitter_content(self, api_client):
        content_data = {
            "product_name": "Smart Watch",
            "product_description": "Track your fitness goals",
            "platform": "twitter",
            "tone": "professional"
        }
        
        response = api_client.post(f"{BASE_URL}/api/social/generate", json=content_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["platform"] == "twitter"
        assert len(data["content"]) > 0
    
    def test_get_social_content_list(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/social/content")
        assert response.status_code == 200
        
        content_list = response.json()
        assert isinstance(content_list, list)


class TestTasks:
    """Task management endpoints"""
    
    def test_create_task_and_verify(self, api_client):
        task_data = {
            "title": "TEST_Daily_Inventory_Check",
            "agent_type": "store_manager",
            "task_type": "schedule",
            "description": "Check inventory levels daily",
            "schedule": "daily"
        }
        
        response = api_client.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert response.status_code == 200
        
        created_task = response.json()
        assert created_task["title"] == task_data["title"]
        assert created_task["agent_type"] == task_data["agent_type"]
        assert created_task["status"] == "active"
        assert "id" in created_task
        
        task_id = created_task["id"]
        
        # Verify persistence
        response = api_client.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200
        tasks = response.json()
        assert any(t["id"] == task_id for t in tasks)
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}")
    
    def test_get_all_tasks(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200
        
        tasks = response.json()
        assert isinstance(tasks, list)
    
    def test_update_task_status(self, api_client):
        # Create task
        task_data = {
            "title": "TEST_Task_Status",
            "agent_type": "marketing",
            "task_type": "one_time",
            "description": "Test task"
        }
        
        response = api_client.post(f"{BASE_URL}/api/tasks", json=task_data)
        task_id = response.json()["id"]
        
        # Update status
        response = api_client.patch(f"{BASE_URL}/api/tasks/{task_id}?status=completed")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "updated"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tasks/{task_id}")
    
    def test_delete_task(self, api_client):
        # Create task
        task_data = {
            "title": "TEST_Delete_Task",
            "agent_type": "analytics",
            "task_type": "automation",
            "description": "Task to delete"
        }
        
        response = api_client.post(f"{BASE_URL}/api/tasks", json=task_data)
        task_id = response.json()["id"]
        
        # Delete task
        response = api_client.delete(f"{BASE_URL}/api/tasks/{task_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "deleted"
        
        # Verify deletion
        response = api_client.get(f"{BASE_URL}/api/tasks")
        tasks = response.json()
        assert not any(t["id"] == task_id for t in tasks)
