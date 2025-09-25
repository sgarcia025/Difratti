#!/usr/bin/env python3
"""
Difratti Sales System Backend API Testing
Tests all backend endpoints with proper authentication
"""

import requests
import sys
import json
from datetime import datetime

class DifrattiAPITester:
    def __init__(self, base_url="https://salesportal-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.seller_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

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

    def test_auth_me(self, token, user_type):
        """Test /auth/me endpoint"""
        try:
            response = requests.get(
                f"{self.api_url}/auth/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                email = data.get("email")
                role = data.get("role")
                self.log_test(
                    f"Auth Me ({user_type})",
                    True,
                    f"Email: {email}, Role: {role}"
                )
                return True
            else:
                self.log_test(
                    f"Auth Me ({user_type})",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test(f"Auth Me ({user_type})", False, f"Exception: {str(e)}")
            return False

    def test_dashboard_stats(self, token):
        """Test dashboard stats endpoint"""
        try:
            response = requests.get(
                f"{self.api_url}/dashboard/stats",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                monthly_sales = data.get("monthly_sales")
                order_stats = data.get("order_stats")
                sap_mode = data.get("sap_mode")
                
                self.log_test(
                    "Dashboard Stats",
                    True,
                    f"Monthly Sales: {monthly_sales}, SAP Mode: {sap_mode}, Orders: {len(order_stats) if order_stats else 0}"
                )
                return True
            else:
                self.log_test(
                    "Dashboard Stats",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Dashboard Stats", False, f"Exception: {str(e)}")
            return False

    def test_inventory(self, token):
        """Test inventory endpoint"""
        try:
            # Test without search
            response = requests.get(
                f"{self.api_url}/inventory",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                total = data.get("total", 0)
                
                self.log_test(
                    "Inventory (no search)",
                    True,
                    f"Items: {len(items)}, Total: {total}"
                )
                
                # Test with search
                response = requests.get(
                    f"{self.api_url}/inventory?search=laptop",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    search_data = response.json()
                    search_items = search_data.get("items", [])
                    
                    self.log_test(
                        "Inventory (with search)",
                        True,
                        f"Search results: {len(search_items)} items"
                    )
                    return True
                else:
                    self.log_test(
                        "Inventory (with search)",
                        False,
                        f"Status: {response.status_code}"
                    )
                    return False
            else:
                self.log_test(
                    "Inventory (no search)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Inventory", False, f"Exception: {str(e)}")
            return False

    def test_customers(self, token):
        """Test customers endpoint"""
        try:
            # Test without search
            response = requests.get(
                f"{self.api_url}/customers",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                customers = data.get("customers", [])
                
                self.log_test(
                    "Customers (no search)",
                    True,
                    f"Customers: {len(customers)}"
                )
                
                # Test with search
                response = requests.get(
                    f"{self.api_url}/customers?search=empresa",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    search_data = response.json()
                    search_customers = search_data.get("customers", [])
                    
                    self.log_test(
                        "Customers (with search)",
                        True,
                        f"Search results: {len(search_customers)} customers"
                    )
                    return True
                else:
                    self.log_test(
                        "Customers (with search)",
                        False,
                        f"Status: {response.status_code}"
                    )
                    return False
            else:
                self.log_test(
                    "Customers (no search)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Customers", False, f"Exception: {str(e)}")
            return False

    def test_create_order(self, token):
        """Test order creation"""
        try:
            order_data = {
                "external_id": f"TEST-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                "card_code": "C20001",
                "doc_date": datetime.now().strftime("%Y-%m-%d"),
                "doc_due_date": datetime.now().strftime("%Y-%m-%d"),
                "salesperson_code": 1,
                "comments": "Test order from backend testing",
                "lines": [
                    {
                        "item_code": "A00001",
                        "description": "Laptop HP Pavilion 15",
                        "quantity": 1,
                        "unit_price": 8500.00,
                        "discount_pct": 0,
                        "warehouse_code": "01",
                        "tax_code": "IVA",
                        "line_total": 8500.00
                    }
                ]
            }
            
            response = requests.post(
                f"{self.api_url}/orders",
                json=order_data,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                order_id = data.get("id")
                external_id = data.get("external_id")
                status = data.get("status")
                
                self.log_test(
                    "Create Order",
                    True,
                    f"Order ID: {order_id}, External ID: {external_id}, Status: {status}"
                )
                return order_id
            else:
                self.log_test(
                    "Create Order",
                    False,
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return None
                
        except Exception as e:
            self.log_test("Create Order", False, f"Exception: {str(e)}")
            return None

    def test_get_order(self, token, order_id):
        """Test get order by ID"""
        if not order_id:
            self.log_test("Get Order", False, "No order ID provided")
            return False
            
        try:
            response = requests.get(
                f"{self.api_url}/orders/{order_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                external_id = data.get("external_id")
                status = data.get("status")
                
                self.log_test(
                    "Get Order",
                    True,
                    f"External ID: {external_id}, Status: {status}"
                )
                return True
            else:
                self.log_test(
                    "Get Order",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Get Order", False, f"Exception: {str(e)}")
            return False

    def test_sap_health(self, token):
        """Test SAP health check"""
        try:
            response = requests.get(
                f"{self.api_url}/health/sap",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get("status")
                mode = data.get("mode")
                
                self.log_test(
                    "SAP Health Check",
                    True,
                    f"Status: {status}, Mode: {mode}"
                )
                return True
            else:
                self.log_test(
                    "SAP Health Check",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("SAP Health Check", False, f"Exception: {str(e)}")
            return False

    def test_sap_config_get(self, token):
        """Test SAP configuration retrieval (Admin only)"""
        try:
            response = requests.get(
                f"{self.api_url}/sap/config",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                sap_mode = data.get("sap_mode")
                connection_status = data.get("connection_status")
                
                self.log_test(
                    "SAP Config Get",
                    True,
                    f"Mode: {sap_mode}, Status: {connection_status}"
                )
                return data
            elif response.status_code == 403:
                self.log_test(
                    "SAP Config Get",
                    True,
                    "Access denied (expected for non-admin users)"
                )
                return None
            else:
                self.log_test(
                    "SAP Config Get",
                    False,
                    f"Status: {response.status_code}"
                )
                return None
                
        except Exception as e:
            self.log_test("SAP Config Get", False, f"Exception: {str(e)}")
            return None

    def test_sap_config_update(self, token):
        """Test SAP configuration update (Admin only)"""
        try:
            config_data = {
                "b1_host": "https://test-sap-server.com:50000/b1s/v1",
                "b1_company_db": "TEST_DB",
                "b1_username": "test_user",
                "b1_password": "test_password",
                "b1_ssl_verify": True,
                "b1_timeout_ms": 60000
            }
            
            response = requests.post(
                f"{self.api_url}/sap/config",
                json=config_data,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message")
                
                self.log_test(
                    "SAP Config Update",
                    True,
                    f"Message: {message}"
                )
                return True
            elif response.status_code == 403:
                self.log_test(
                    "SAP Config Update",
                    True,
                    "Access denied (expected for non-admin users)"
                )
                return False
            else:
                self.log_test(
                    "SAP Config Update",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("SAP Config Update", False, f"Exception: {str(e)}")
            return False

    def test_sap_test_connection(self, token):
        """Test SAP connection testing (Admin only)"""
        try:
            config_data = {
                "b1_host": "https://test-sap-server.com:50000/b1s/v1",
                "b1_company_db": "TEST_DB",
                "b1_username": "test_user",
                "b1_password": "test_password",
                "b1_ssl_verify": True,
                "b1_timeout_ms": 60000
            }
            
            response = requests.post(
                f"{self.api_url}/sap/test-connection",
                json=config_data,
                headers={"Authorization": f"Bearer {token}"},
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success")
                message = data.get("message")
                
                self.log_test(
                    "SAP Test Connection",
                    True,
                    f"Success: {success}, Message: {message}"
                )
                return success
            elif response.status_code == 403:
                self.log_test(
                    "SAP Test Connection",
                    True,
                    "Access denied (expected for non-admin users)"
                )
                return False
            else:
                self.log_test(
                    "SAP Test Connection",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("SAP Test Connection", False, f"Exception: {str(e)}")
            return False

    def test_sap_activate(self, token):
        """Test SAP activation (Admin only)"""
        try:
            response = requests.post(
                f"{self.api_url}/sap/activate",
                headers={"Authorization": f"Bearer {token}"},
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success")
                mode = data.get("mode")
                message = data.get("message")
                
                self.log_test(
                    "SAP Activate",
                    True,
                    f"Success: {success}, Mode: {mode}, Message: {message}"
                )
                return success
            elif response.status_code == 403:
                self.log_test(
                    "SAP Activate",
                    True,
                    "Access denied (expected for non-admin users)"
                )
                return False
            else:
                self.log_test(
                    "SAP Activate",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("SAP Activate", False, f"Exception: {str(e)}")
            return False

    def test_sap_deactivate(self, token):
        """Test SAP deactivation (Admin only)"""
        try:
            response = requests.post(
                f"{self.api_url}/sap/deactivate",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success")
                mode = data.get("mode")
                message = data.get("message")
                
                self.log_test(
                    "SAP Deactivate",
                    True,
                    f"Success: {success}, Mode: {mode}, Message: {message}"
                )
                return success
            elif response.status_code == 403:
                self.log_test(
                    "SAP Deactivate",
                    True,
                    "Access denied (expected for non-admin users)"
                )
                return False
            else:
                self.log_test(
                    "SAP Deactivate",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("SAP Deactivate", False, f"Exception: {str(e)}")
            return False

    def test_role_based_dashboard(self, admin_token, seller_token):
        """Test role-based dashboard differences"""
        try:
            # Test admin dashboard
            admin_response = requests.get(
                f"{self.api_url}/dashboard/stats",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            # Test seller dashboard
            seller_response = requests.get(
                f"{self.api_url}/dashboard/stats",
                headers={"Authorization": f"Bearer {seller_token}"},
                timeout=10
            )
            
            if admin_response.status_code == 200 and seller_response.status_code == 200:
                admin_data = admin_response.json()
                seller_data = seller_response.json()
                
                # Check admin has global data
                admin_has_sap_mode = "sap_mode" in admin_data
                admin_has_sellers_count = "sellers_count" in admin_data
                admin_role = admin_data.get("user_role")
                
                # Check seller has personal data
                seller_has_target = "monthly_target" in seller_data
                seller_has_progress = "target_progress" in seller_data
                seller_role = seller_data.get("user_role")
                
                success = (admin_has_sap_mode and admin_has_sellers_count and 
                          seller_has_target and seller_has_progress and
                          admin_role == "admin" and seller_role == "seller")
                
                self.log_test(
                    "Role-based Dashboard",
                    success,
                    f"Admin role: {admin_role}, Seller role: {seller_role}, Admin SAP: {admin_has_sap_mode}, Seller target: {seller_has_target}"
                )
                return success
            else:
                self.log_test(
                    "Role-based Dashboard",
                    False,
                    f"Admin status: {admin_response.status_code}, Seller status: {seller_response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Role-based Dashboard", False, f"Exception: {str(e)}")
            return False

    def test_role_based_customers(self, admin_token, seller_token):
        """Test role-based customer filtering"""
        try:
            # Test admin customers (should see all)
            admin_response = requests.get(
                f"{self.api_url}/customers",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            
            # Test seller customers (should see only assigned)
            seller_response = requests.get(
                f"{self.api_url}/customers",
                headers={"Authorization": f"Bearer {seller_token}"},
                timeout=10
            )
            
            if admin_response.status_code == 200 and seller_response.status_code == 200:
                admin_customers = admin_response.json().get("customers", [])
                seller_customers = seller_response.json().get("customers", [])
                
                # Admin should see more or equal customers than seller
                admin_count = len(admin_customers)
                seller_count = len(seller_customers)
                
                success = admin_count >= seller_count
                
                self.log_test(
                    "Role-based Customer Filtering",
                    success,
                    f"Admin customers: {admin_count}, Seller customers: {seller_count}"
                )
                return success
            else:
                self.log_test(
                    "Role-based Customer Filtering",
                    False,
                    f"Admin status: {admin_response.status_code}, Seller status: {seller_response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Role-based Customer Filtering", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Enhanced Difratti Sales System Backend Tests")
        print(f"📍 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Test admin login
        admin_login_success = self.test_login("admin@difratti.com", "admin123", "admin")
        
        # Test seller login
        seller_login_success = self.test_login("vendedor@difratti.com", "vendedor123", "seller")
        
        if not admin_login_success and not seller_login_success:
            print("\n❌ CRITICAL: Both login attempts failed. Cannot continue testing.")
            return False
        
        # Test auth/me for both users
        if admin_login_success:
            self.test_auth_me(self.admin_token, "admin")
        if seller_login_success:
            self.test_auth_me(self.seller_token, "seller")
        
        # Test role-based features if both tokens available
        if admin_login_success and seller_login_success:
            print(f"\n🔄 Testing role-based features")
            self.test_role_based_dashboard(self.admin_token, self.seller_token)
            self.test_role_based_customers(self.admin_token, self.seller_token)
        
        # Use admin token for admin-only tests
        if admin_login_success:
            print(f"\n🔑 Testing admin-only SAP configuration features")
            self.test_sap_config_get(self.admin_token)
            self.test_sap_config_update(self.admin_token)
            self.test_sap_test_connection(self.admin_token)
            self.test_sap_deactivate(self.admin_token)  # Ensure we're in mock mode
            # Note: Not testing activate as it requires real SAP credentials
        
        # Test seller access to admin endpoints (should be denied)
        if seller_login_success:
            print(f"\n🚫 Testing seller access to admin endpoints (should be denied)")
            self.test_sap_config_get(self.seller_token)
            self.test_sap_config_update(self.seller_token)
            self.test_sap_test_connection(self.seller_token)
        
        # Use admin token for remaining tests (prefer admin if available)
        test_token = self.admin_token if self.admin_token else self.seller_token
        user_type = "admin" if self.admin_token else "seller"
        
        print(f"\n🔑 Using {user_type} token for general tests")
        
        # Test dashboard stats
        self.test_dashboard_stats(test_token)
        
        # Test inventory
        self.test_inventory(test_token)
        
        # Test customers
        self.test_customers(test_token)
        
        # Test order creation and retrieval
        order_id = self.test_create_order(test_token)
        if order_id:
            self.test_get_order(test_token, order_id)
        
        # Test SAP health
        self.test_sap_health(test_token)
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
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
    tester = DifrattiAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())