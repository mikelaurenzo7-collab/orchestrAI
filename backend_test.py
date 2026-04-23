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
TEST_EMAIL = "admin@yourdomain.com"
TEST_PASSWORD = "ChangeThisPassword123!"

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
        """Test GET /api/agents"""
        print("\n🤖 Testing Agents Endpoint...")
        try:
            response = self.session.get(f"{BACKEND_URL}/agents", timeout=30)
            if response.status_code == 200:
                agents = response.json()
                self.log_test("Agents Endpoint", True, f"Found {len(agents)} agents")
                return True
            else:
                self.log_test("Agents Endpoint", False, f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Agents Endpoint", False, str(e))
            return False

    def run_all_tests(self) -> bool:
        print("🚀 Starting orchestrAI Backend Tests")
        tests = [self.test_login, self.test_agents_endpoint]
        all_passed = True
        for test in tests:
            if not test(): all_passed = False
        return all_passed

def main():
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
