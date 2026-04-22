#!/usr/bin/env python3
"""
Backend API Testing for orchestrAI Agent Architecture
Tests the refactored architecture with 16 EAs and social connectors
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend env
BACKEND_URL = "http://localhost:8000/api"

# Test credentials from test_credentials.md
TEST_EMAIL = "mikelaurenzo7@gmail.com"
TEST_PASSWORD = "chet1212!"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_cookies = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_login(self) -> bool:
        """Test login endpoint and save auth cookies"""
        print("\n🔐 Testing Authentication...")
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                # Check if we got the expected user data
                if data.get("email") == TEST_EMAIL:
                    self.auth_cookies = self.session.cookies
                    self.log_test("Login Authentication", True, f"Logged in as {data.get('name', 'User')}")
                    return True
                else:
                    self.log_test("Login Authentication", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Login Authentication", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Login Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_agents_endpoint(self) -> bool:
        """Test GET /api/agents - should return exactly 16 agents with proper categories"""
        print("\n🤖 Testing Agents Endpoint...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/agents", timeout=30)
            
            if response.status_code == 200:
                agents = response.json()
                
                # Check total count
                if len(agents) != 16:
                    self.log_test("Agent Count", False, f"Expected 16 agents, got {len(agents)}")
                    return False
                
                self.log_test("Agent Count", True, f"Found exactly 16 agents")
                
                # Categorize agents
                store_agents = [a for a in agents if a.get("category") == "store"]
                employee_agents = [a for a in agents if a.get("category") == "employee"]
                intelligence_agents = [a for a in agents if a.get("category") == "intelligence"]
                
                # Check store agents (should be 7)
                expected_store_types = {"shopify", "etsy", "ebay", "walmart", "faire", "mercari", "poshmark"}
                store_types = {a.get("agent_type") for a in store_agents}
                
                if len(store_agents) != 7:
                    self.log_test("Store Agent Count", False, f"Expected 7 store agents, got {len(store_agents)}")
                    return False
                
                if store_types != expected_store_types:
                    missing = expected_store_types - store_types
                    extra = store_types - expected_store_types
                    self.log_test("Store Agent Types", False, f"Missing: {missing}, Extra: {extra}")
                    return False
                
                self.log_test("Store Agent Count", True, f"Found 7 store agents: {', '.join(store_types)}")
                
                # Check employee agents (should be 8)
                if len(employee_agents) != 8:
                    self.log_test("Employee Agent Count", False, f"Expected 8 employee agents, got {len(employee_agents)}")
                    return False
                
                employee_types = {a.get("agent_type") for a in employee_agents}
                self.log_test("Employee Agent Count", True, f"Found 8 employee agents: {', '.join(employee_types)}")
                
                # Check intelligence agents (should be 1)
                if len(intelligence_agents) != 1:
                    self.log_test("Intelligence Agent Count", False, f"Expected 1 intelligence agent, got {len(intelligence_agents)}")
                    return False
                
                intelligence_types = {a.get("agent_type") for a in intelligence_agents}
                self.log_test("Intelligence Agent Count", True, f"Found 1 intelligence agent: {', '.join(intelligence_types)}")
                
                # Verify NO social agents exist
                social_agent_types = {"twitter", "pinterest", "tiktok", "meta", "youtube", "whatsapp", "threads", "reddit", "linkedin", "discord"}
                found_social = {a.get("agent_type") for a in agents} & social_agent_types
                
                if found_social:
                    self.log_test("No Social Agents", False, f"Found social agents that should not exist: {found_social}")
                    return False
                
                self.log_test("No Social Agents", True, "Confirmed no social agents exist")
                
                return True
                
            else:
                self.log_test("Agents Endpoint", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Agents Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_social_connectors(self) -> bool:
        """Test GET /api/connectors/social - should return social platform list"""
        print("\n🔗 Testing Social Connectors...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/connectors/social", timeout=30)
            
            if response.status_code == 200:
                social_connectors = response.json()
                
                if not isinstance(social_connectors, list) or len(social_connectors) == 0:
                    self.log_test("Social Connectors List", False, f"Expected list of social connectors, got: {type(social_connectors)}")
                    return False
                
                # Check for expected social platforms
                social_platforms = {conn.get("platform") for conn in social_connectors}
                expected_platforms = {"twitter", "pinterest", "tiktok", "meta"}
                
                if not expected_platforms.issubset(social_platforms):
                    missing = expected_platforms - social_platforms
                    self.log_test("Social Platform Coverage", False, f"Missing platforms: {missing}")
                    return False
                
                self.log_test("Social Connectors", True, f"Found {len(social_connectors)} social connectors: {', '.join(social_platforms)}")
                return True
                
            else:
                self.log_test("Social Connectors", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Social Connectors", False, f"Exception: {str(e)}")
            return False
    
    def test_chat_marketing_suite(self) -> bool:
        """Test POST /api/chat with marketing_suite agent"""
        print("\n💬 Testing Marketing Suite Chat...")
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/chat",
                json={
                    "message": "hello",
                    "agent_type": "marketing_suite"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if we got a response
                if "content" in data and data["content"]:
                    self.log_test("Marketing Suite Chat", True, f"Got response: {data['content'][:100]}...")
                    return True
                else:
                    self.log_test("Marketing Suite Chat", False, f"No response in data: {data}")
                    return False
                    
            else:
                self.log_test("Marketing Suite Chat", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Marketing Suite Chat", False, f"Exception: {str(e)}")
            return False
    
    def test_chat_shopify(self) -> bool:
        """Test POST /api/chat with shopify agent"""
        print("\n🛍️ Testing Shopify Agent Chat...")
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/chat",
                json={
                    "message": "hello",
                    "agent_type": "shopify"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if we got a response
                if "content" in data and data["content"]:
                    self.log_test("Shopify Agent Chat", True, f"Got response: {data['content'][:100]}...")
                    return True
                else:
                    self.log_test("Shopify Agent Chat", False, f"No response in data: {data}")
                    return False
                    
            else:
                self.log_test("Shopify Agent Chat", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Shopify Agent Chat", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self) -> bool:
        """Run all tests in sequence"""
        print("🚀 Starting orchestrAI Backend Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test User: {TEST_EMAIL}")
        
        # Test sequence
        tests = [
            self.test_login,
            self.test_agents_endpoint,
            self.test_social_connectors,
            self.test_chat_marketing_suite,
            self.test_chat_shopify
        ]
        
        all_passed = True
        
        for test in tests:
            try:
                result = test()
                if not result:
                    all_passed = False
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
                all_passed = False
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"] and not result["success"]:
                print(f"    {result['details']}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if all_passed:
            print("🎉 ALL TESTS PASSED - Architecture refactor successful!")
        else:
            print("⚠️  SOME TESTS FAILED - Check implementation")
        
        return all_passed

def main():
    """Main test runner"""
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()