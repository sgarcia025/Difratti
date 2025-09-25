#!/usr/bin/env python3
"""
User Edit Functionality Backend Testing
Tests all user management CRUD operations with focus on edit functionality
"""

import requests
import sys
import json
from datetime import datetime

class UserEditAPITester:
    def __init__(self, base_url="https://salesportal-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.seller_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_user_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"test": name, "details": details})

    def test_login(self, email, password, user_type):
        """Test login functionality"""
        try:
            response = requests.post(
                f"{self.api_url}/auth/login",
                json={"email": email, "password": password},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                role = data.get("role")
                full_name = data.get("full_name")
                
                if token and role:
                    if user_type == "admin":
                        self.admin_token = token
                    else:
                        self.seller_token = token
                    
                    self.log_test(
                        f"Login {user_type}",
                        True,
                        f"Role: {role}, Name: {full_name}"
                    )
                    return True
                else:
                    self.log_test(f"Login {user_type}", False, "Missing token or role in response")
                    return False
            else:
                self.log_test(
                    f"Login {user_type}",
                    False,
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return False
                
        except Exception as e:
            self.log_test(f"Login {user_type}", False, f"Exception: {str(e)}")
            return False

    def test_get_users_admin(self):
        """Test GET /api/users endpoint with admin token"""
        try:
            response = requests.get(
                f"{self.api_url}/users",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                users = response.json()
                if isinstance(users, list) and len(users) > 0:
                    # Check if users have required fields
                    first_user = users[0]
                    required_fields = ['id', 'email', 'full_name', 'role', 'is_active']
                    has_required_fields = all(field in first_user for field in required_fields)
                    
                    self.log_test(
                        "Get Users (Admin)",
                        has_required_fields,
                        f"Found {len(users)} users, Required fields present: {has_required_fields}"
                    )
                    return users if has_required_fields else []
                else:
                    self.log_test("Get Users (Admin)", False, "No users returned or invalid format")
                    return []
            else:
                self.log_test(
                    "Get Users (Admin)",
                    False,
                    f"Status: {response.status_code}"
                )
                return []
                
        except Exception as e:
            self.log_test("Get Users (Admin)", False, f"Exception: {str(e)}")
            return []

    def test_get_users_seller_forbidden(self):
        """Test GET /api/users endpoint with seller token (should be forbidden)"""
        try:
            response = requests.get(
                f"{self.api_url}/users",
                headers={"Authorization": f"Bearer {self.seller_token}"},
                timeout=10
            )
            
            # Should return 403 Forbidden for seller
            success = response.status_code == 403
            self.log_test(
                "Get Users (Seller - Should be Forbidden)",
                success,
                f"Status: {response.status_code} (Expected: 403)"
            )
            return success
                
        except Exception as e:
            self.log_test("Get Users (Seller - Should be Forbidden)", False, f"Exception: {str(e)}")
            return False

    def test_create_test_user(self):
        """Create a test user for editing"""
        try:
            timestamp = datetime.now().strftime('%H%M%S')
            user_data = {
                "email": f"test_edit_user_{timestamp}@difratti.com",
                "password": "testpass123",
                "full_name": "Test Edit User",
                "role": "seller",
                "sap_salesperson_code": 99,
                "monthly_target": 50000.0
            }
            
            response = requests.post(
                f"{self.api_url}/users",
                json=user_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                created_user = response.json()
                self.test_user_id = created_user.get("id")
                
                self.log_test(
                    "Create Test User for Editing",
                    True,
                    f"Created user: {created_user.get('email')}, ID: {self.test_user_id}"
                )
                return created_user
            else:
                self.log_test(
                    "Create Test User for Editing",
                    False,
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return None
                
        except Exception as e:
            self.log_test("Create Test User for Editing", False, f"Exception: {str(e)}")
            return None

    def test_update_user_full_name(self):
        """Test updating user's full name"""
        if not self.test_user_id:
            self.log_test("Update User Full Name", False, "No test user ID available")
            return False
            
        try:
            update_data = {
                "full_name": "Updated Test User Name"
            }
            
            response = requests.put(
                f"{self.api_url}/users/{self.test_user_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                success = updated_user.get("full_name") == "Updated Test User Name"
                
                self.log_test(
                    "Update User Full Name",
                    success,
                    f"Updated name: {updated_user.get('full_name')}"
                )
                return success
            else:
                self.log_test(
                    "Update User Full Name",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Update User Full Name", False, f"Exception: {str(e)}")
            return False

    def test_update_user_role(self):
        """Test updating user's role"""
        if not self.test_user_id:
            self.log_test("Update User Role", False, "No test user ID available")
            return False
            
        try:
            update_data = {
                "role": "supervisor"
            }
            
            response = requests.put(
                f"{self.api_url}/users/{self.test_user_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                success = updated_user.get("role") == "supervisor"
                
                self.log_test(
                    "Update User Role",
                    success,
                    f"Updated role: {updated_user.get('role')}"
                )
                return success
            else:
                self.log_test(
                    "Update User Role",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Update User Role", False, f"Exception: {str(e)}")
            return False

    def test_update_user_is_active(self):
        """Test updating user's active status"""
        if not self.test_user_id:
            self.log_test("Update User Active Status", False, "No test user ID available")
            return False
            
        try:
            update_data = {
                "is_active": False
            }
            
            response = requests.put(
                f"{self.api_url}/users/{self.test_user_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                success = updated_user.get("is_active") == False
                
                self.log_test(
                    "Update User Active Status",
                    success,
                    f"Updated is_active: {updated_user.get('is_active')}"
                )
                return success
            else:
                self.log_test(
                    "Update User Active Status",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Update User Active Status", False, f"Exception: {str(e)}")
            return False

    def test_update_user_sap_code(self):
        """Test updating user's SAP salesperson code"""
        if not self.test_user_id:
            self.log_test("Update User SAP Code", False, "No test user ID available")
            return False
            
        try:
            update_data = {
                "sap_salesperson_code": 88
            }
            
            response = requests.put(
                f"{self.api_url}/users/{self.test_user_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                success = updated_user.get("sap_salesperson_code") == 88
                
                self.log_test(
                    "Update User SAP Code",
                    success,
                    f"Updated SAP code: {updated_user.get('sap_salesperson_code')}"
                )
                return success
            else:
                self.log_test(
                    "Update User SAP Code",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Update User SAP Code", False, f"Exception: {str(e)}")
            return False

    def test_update_user_monthly_target(self):
        """Test updating user's monthly target"""
        if not self.test_user_id:
            self.log_test("Update User Monthly Target", False, "No test user ID available")
            return False
            
        try:
            update_data = {
                "monthly_target": 75000.50
            }
            
            response = requests.put(
                f"{self.api_url}/users/{self.test_user_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                success = updated_user.get("monthly_target") == 75000.50
                
                self.log_test(
                    "Update User Monthly Target",
                    success,
                    f"Updated monthly target: {updated_user.get('monthly_target')}"
                )
                return success
            else:
                self.log_test(
                    "Update User Monthly Target",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Update User Monthly Target", False, f"Exception: {str(e)}")
            return False

    def test_update_user_multiple_fields(self):
        """Test updating multiple user fields at once"""
        if not self.test_user_id:
            self.log_test("Update User Multiple Fields", False, "No test user ID available")
            return False
            
        try:
            update_data = {
                "full_name": "Final Test User Name",
                "role": "admin",
                "is_active": True,
                "sap_salesperson_code": 77,
                "monthly_target": 100000.0
            }
            
            response = requests.put(
                f"{self.api_url}/users/{self.test_user_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                
                # Check all fields were updated correctly
                checks = [
                    updated_user.get("full_name") == "Final Test User Name",
                    updated_user.get("role") == "admin",
                    updated_user.get("is_active") == True,
                    updated_user.get("sap_salesperson_code") == 77,
                    updated_user.get("monthly_target") == 100000.0
                ]
                
                success = all(checks)
                
                self.log_test(
                    "Update User Multiple Fields",
                    success,
                    f"All fields updated correctly: {success}"
                )
                return success
            else:
                self.log_test(
                    "Update User Multiple Fields",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Update User Multiple Fields", False, f"Exception: {str(e)}")
            return False

    def test_update_user_invalid_id(self):
        """Test updating user with invalid ID (should return 404)"""
        try:
            update_data = {
                "full_name": "Should Not Work"
            }
            
            response = requests.put(
                f"{self.api_url}/users/invalid-user-id",
                json=update_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            # Should return 404 for invalid user ID
            success = response.status_code == 404
            
            self.log_test(
                "Update User Invalid ID",
                success,
                f"Status: {response.status_code} (Expected: 404)"
            )
            return success
                
        except Exception as e:
            self.log_test("Update User Invalid ID", False, f"Exception: {str(e)}")
            return False

    def test_update_user_seller_forbidden(self):
        """Test updating user with seller token (should be forbidden)"""
        if not self.test_user_id:
            self.log_test("Update User Seller Forbidden", False, "No test user ID available")
            return False
            
        try:
            update_data = {
                "full_name": "Should Not Work"
            }
            
            response = requests.put(
                f"{self.api_url}/users/{self.test_user_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.seller_token}"},
                timeout=10
            )
            
            # Should return 403 Forbidden for seller
            success = response.status_code == 403
            
            self.log_test(
                "Update User Seller Forbidden",
                success,
                f"Status: {response.status_code} (Expected: 403)"
            )
            return success
                
        except Exception as e:
            self.log_test("Update User Seller Forbidden", False, f"Exception: {str(e)}")
            return False

    def test_update_user_email_immutable(self):
        """Test that email field cannot be updated (should be ignored or rejected)"""
        if not self.test_user_id:
            self.log_test("Update User Email Immutable", False, "No test user ID available")
            return False
            
        try:
            # Get current user data first
            get_response = requests.get(
                f"{self.api_url}/users",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if get_response.status_code != 200:
                self.log_test("Update User Email Immutable", False, "Could not get current user data")
                return False
                
            users = get_response.json()
            current_user = next((u for u in users if u['id'] == self.test_user_id), None)
            
            if not current_user:
                self.log_test("Update User Email Immutable", False, "Could not find test user")
                return False
                
            original_email = current_user['email']
            
            # Try to update email
            update_data = {
                "email": "should_not_change@example.com"
            }
            
            response = requests.put(
                f"{self.api_url}/users/{self.test_user_id}",
                json=update_data,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                updated_user = response.json()
                # Email should remain unchanged
                success = updated_user.get("email") == original_email
                
                self.log_test(
                    "Update User Email Immutable",
                    success,
                    f"Email unchanged: {success} (Original: {original_email}, Current: {updated_user.get('email')})"
                )
                return success
            else:
                # If the API rejects email updates entirely, that's also acceptable
                self.log_test(
                    "Update User Email Immutable",
                    True,
                    f"API rejected email update (Status: {response.status_code})"
                )
                return True
                
        except Exception as e:
            self.log_test("Update User Email Immutable", False, f"Exception: {str(e)}")
            return False

    def test_cleanup_test_user(self):
        """Clean up the test user"""
        if not self.test_user_id:
            self.log_test("Cleanup Test User", True, "No test user to clean up")
            return True
            
        try:
            response = requests.delete(
                f"{self.api_url}/users/{self.test_user_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            success = response.status_code == 200
            
            self.log_test(
                "Cleanup Test User",
                success,
                f"Test user deleted: {success}"
            )
            return success
                
        except Exception as e:
            self.log_test("Cleanup Test User", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all user edit backend tests"""
        print("🚀 Starting User Edit Functionality Backend Tests")
        print(f"📍 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Test admin login
        admin_login_success = self.test_login("admin@difratti.com", "admin123", "admin")
        
        # Test seller login
        seller_login_success = self.test_login("vendedor@difratti.com", "vendedor123", "seller")
        
        if not admin_login_success:
            print("\n❌ CRITICAL: Admin login failed. Cannot continue testing.")
            return False
        
        if not seller_login_success:
            print("\n⚠️  WARNING: Seller login failed. Some tests will be skipped.")
        
        # Test user list retrieval
        print(f"\n📋 Testing user list retrieval")
        users = self.test_get_users_admin()
        
        if seller_login_success:
            self.test_get_users_seller_forbidden()
        
        # Create test user for editing
        print(f"\n👤 Creating test user for editing")
        test_user = self.test_create_test_user()
        
        if not test_user:
            print("\n❌ CRITICAL: Could not create test user. Cannot continue edit tests.")
            return False
        
        # Test individual field updates
        print(f"\n✏️  Testing individual field updates")
        self.test_update_user_full_name()
        self.test_update_user_role()
        self.test_update_user_is_active()
        self.test_update_user_sap_code()
        self.test_update_user_monthly_target()
        
        # Test multiple field update
        print(f"\n🔄 Testing multiple field update")
        self.test_update_user_multiple_fields()
        
        # Test error conditions
        print(f"\n🚫 Testing error conditions")
        self.test_update_user_invalid_id()
        self.test_update_user_email_immutable()
        
        if seller_login_success:
            self.test_update_user_seller_forbidden()
        
        # Cleanup
        print(f"\n🧹 Cleaning up test data")
        self.test_cleanup_test_user()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 USER EDIT BACKEND TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return len(self.failed_tests) == 0

def main():
    tester = UserEditAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())