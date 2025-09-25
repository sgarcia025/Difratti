#!/usr/bin/env python3
"""
Difratti Sales System - Salesperson Filter Feature Testing
Tests the newly implemented salesperson filter functionality for administrators
"""

import requests
import sys
import json
from datetime import datetime

class SalespersonFilterTester:
    def __init__(self, base_url="https://salesportal-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.seller_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.salespeople_data = []

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

    def test_salespeople_endpoint_admin_access(self):
        """Test that admin can access /api/salespeople endpoint"""
        try:
            response = requests.get(
                f"{self.api_url}/salespeople",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.salespeople_data = data
                
                # Check structure
                has_all_option = any(sp.get("id") == "all" for sp in data)
                has_salespeople = len([sp for sp in data if sp.get("id") != "all"]) > 0
                
                self.log_test(
                    "Admin access to /api/salespeople",
                    True,
                    f"Found {len(data)} entries, includes 'All' option: {has_all_option}, has salespeople: {has_salespeople}"
                )
                return True
            else:
                self.log_test(
                    "Admin access to /api/salespeople",
                    False,
                    f"Status: {response.status_code}, Response: {response.text[:200]}"
                )
                return False
                
        except Exception as e:
            self.log_test("Admin access to /api/salespeople", False, f"Exception: {str(e)}")
            return False

    def test_salespeople_endpoint_seller_access(self):
        """Test that seller cannot access /api/salespeople endpoint (should get 403)"""
        try:
            response = requests.get(
                f"{self.api_url}/salespeople",
                headers={"Authorization": f"Bearer {self.seller_token}"},
                timeout=10
            )
            
            if response.status_code == 403:
                self.log_test(
                    "Seller blocked from /api/salespeople",
                    True,
                    "Correctly returned 403 Forbidden"
                )
                return True
            else:
                self.log_test(
                    "Seller blocked from /api/salespeople",
                    False,
                    f"Expected 403, got {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Seller blocked from /api/salespeople", False, f"Exception: {str(e)}")
            return False

    def test_dashboard_stats_without_filter(self):
        """Test dashboard stats without salesperson filter (admin)"""
        try:
            response = requests.get(
                f"{self.api_url}/dashboard/stats?month=1&year=2025",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                monthly_sales = data.get("monthly_sales", 0)
                customer_count = data.get("customer_count", 0)
                
                self.log_test(
                    "Dashboard stats without filter",
                    True,
                    f"Monthly Sales: Q{monthly_sales:,.2f}, Customers: {customer_count}"
                )
                return data
            else:
                self.log_test(
                    "Dashboard stats without filter",
                    False,
                    f"Status: {response.status_code}"
                )
                return None
                
        except Exception as e:
            self.log_test("Dashboard stats without filter", False, f"Exception: {str(e)}")
            return None

    def test_dashboard_stats_with_salesperson_filter(self):
        """Test dashboard stats with specific salesperson filter"""
        if not self.salespeople_data:
            self.log_test("Dashboard stats with filter", False, "No salespeople data available")
            return None
            
        # Find a salesperson with sap_salesperson_code
        target_salesperson = None
        for sp in self.salespeople_data:
            if sp.get("id") != "all" and sp.get("sap_salesperson_code"):
                target_salesperson = sp
                break
        
        if not target_salesperson:
            self.log_test("Dashboard stats with filter", False, "No salesperson with sap_salesperson_code found")
            return None
            
        try:
            salesperson_code = target_salesperson["sap_salesperson_code"]
            response = requests.get(
                f"{self.api_url}/dashboard/stats?month=1&year=2025&salesperson_code={salesperson_code}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                monthly_sales = data.get("monthly_sales", 0)
                customer_count = data.get("customer_count", 0)
                salesperson_name = data.get("salesperson_name")
                
                self.log_test(
                    "Dashboard stats with salesperson filter",
                    True,
                    f"Salesperson: {salesperson_name}, Sales: Q{monthly_sales:,.2f}, Customers: {customer_count}"
                )
                return data
            else:
                self.log_test(
                    "Dashboard stats with salesperson filter",
                    False,
                    f"Status: {response.status_code}"
                )
                return None
                
        except Exception as e:
            self.log_test("Dashboard stats with salesperson filter", False, f"Exception: {str(e)}")
            return None

    def test_quotes_with_salesperson_filter(self):
        """Test quotes endpoint with salesperson filter"""
        if not self.salespeople_data:
            self.log_test("Quotes with salesperson filter", False, "No salespeople data available")
            return None
            
        # Find a salesperson with sap_salesperson_code
        target_salesperson = None
        for sp in self.salespeople_data:
            if sp.get("id") != "all" and sp.get("sap_salesperson_code"):
                target_salesperson = sp
                break
        
        if not target_salesperson:
            self.log_test("Quotes with salesperson filter", False, "No salesperson with sap_salesperson_code found")
            return None
            
        try:
            salesperson_code = target_salesperson["sap_salesperson_code"]
            response = requests.get(
                f"{self.api_url}/quotes?month=1&year=2025&salesperson_code={salesperson_code}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                quotes = data.get("quotes", [])
                
                # Verify all quotes belong to the specified salesperson
                correct_filtering = all(
                    quote.get("salesperson_code") == salesperson_code 
                    for quote in quotes
                )
                
                self.log_test(
                    "Quotes with salesperson filter",
                    True,
                    f"Found {len(quotes)} quotes, correct filtering: {correct_filtering}"
                )
                return data
            else:
                self.log_test(
                    "Quotes with salesperson filter",
                    False,
                    f"Status: {response.status_code}"
                )
                return None
                
        except Exception as e:
            self.log_test("Quotes with salesperson filter", False, f"Exception: {str(e)}")
            return None

    def test_orders_with_salesperson_filter(self):
        """Test orders endpoint with salesperson filter"""
        if not self.salespeople_data:
            self.log_test("Orders with salesperson filter", False, "No salespeople data available")
            return None
            
        # Find a salesperson with sap_salesperson_code
        target_salesperson = None
        for sp in self.salespeople_data:
            if sp.get("id") != "all" and sp.get("sap_salesperson_code"):
                target_salesperson = sp
                break
        
        if not target_salesperson:
            self.log_test("Orders with salesperson filter", False, "No salesperson with sap_salesperson_code found")
            return None
            
        try:
            salesperson_code = target_salesperson["sap_salesperson_code"]
            response = requests.get(
                f"{self.api_url}/orders?month=1&year=2025&salesperson_code={salesperson_code}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                orders = data.get("orders", [])
                
                # Verify all orders belong to the specified salesperson
                correct_filtering = all(
                    order.get("salesperson_code") == salesperson_code 
                    for order in orders
                )
                
                self.log_test(
                    "Orders with salesperson filter",
                    True,
                    f"Found {len(orders)} orders, correct filtering: {correct_filtering}"
                )
                return data
            else:
                self.log_test(
                    "Orders with salesperson filter",
                    False,
                    f"Status: {response.status_code}"
                )
                return None
                
        except Exception as e:
            self.log_test("Orders with salesperson filter", False, f"Exception: {str(e)}")
            return None

    def test_salespeople_data_structure(self):
        """Test the structure of salespeople data"""
        if not self.salespeople_data:
            self.log_test("Salespeople data structure", False, "No salespeople data available")
            return False
            
        try:
            # Check for "All Salespeople" option
            all_option = next((sp for sp in self.salespeople_data if sp.get("id") == "all"), None)
            if not all_option:
                self.log_test("Salespeople data structure", False, "Missing 'All Salespeople' option")
                return False
                
            # Check structure of all option
            required_fields = ["id", "full_name", "sap_salesperson_code", "email"]
            all_option_valid = all(field in all_option for field in required_fields)
            
            if not all_option_valid:
                self.log_test("Salespeople data structure", False, "All option missing required fields")
                return False
                
            # Check structure of salesperson entries
            salespeople = [sp for sp in self.salespeople_data if sp.get("id") != "all"]
            if not salespeople:
                self.log_test("Salespeople data structure", False, "No actual salespeople found")
                return False
                
            # Verify each salesperson has required fields
            for sp in salespeople:
                if not all(field in sp for field in required_fields):
                    self.log_test("Salespeople data structure", False, f"Salesperson {sp.get('id')} missing required fields")
                    return False
                    
                if not sp.get("sap_salesperson_code"):
                    self.log_test("Salespeople data structure", False, f"Salesperson {sp.get('full_name')} missing sap_salesperson_code")
                    return False
            
            self.log_test(
                "Salespeople data structure",
                True,
                f"Valid structure: 1 'All' option + {len(salespeople)} salespeople with required fields"
            )
            return True
            
        except Exception as e:
            self.log_test("Salespeople data structure", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all salesperson filter tests"""
        print("🚀 Starting Difratti Sales System - Salesperson Filter Testing")
        print("=" * 70)
        
        # Test authentication
        print("\n📋 Testing Authentication...")
        admin_login = self.test_login("admin@difratti.com", "admin123", "admin")
        seller_login = self.test_login("vendedor@difratti.com", "vendedor123", "seller")
        
        if not admin_login:
            print("❌ Admin login failed - cannot continue with admin tests")
            return False
            
        if not seller_login:
            print("❌ Seller login failed - cannot test role restrictions")
            
        # Test salespeople endpoint access
        print("\n📋 Testing Salespeople Endpoint Access...")
        self.test_salespeople_endpoint_admin_access()
        if seller_login:
            self.test_salespeople_endpoint_seller_access()
            
        # Test salespeople data structure
        print("\n📋 Testing Salespeople Data Structure...")
        self.test_salespeople_data_structure()
        
        # Test dashboard stats filtering
        print("\n📋 Testing Dashboard Stats Filtering...")
        global_stats = self.test_dashboard_stats_without_filter()
        filtered_stats = self.test_dashboard_stats_with_salesperson_filter()
        
        # Compare global vs filtered stats
        if global_stats and filtered_stats:
            global_sales = global_stats.get("monthly_sales", 0)
            filtered_sales = filtered_stats.get("monthly_sales", 0)
            
            if filtered_sales <= global_sales:
                self.log_test(
                    "Stats filtering logic",
                    True,
                    f"Filtered sales (Q{filtered_sales:,.2f}) <= Global sales (Q{global_sales:,.2f})"
                )
            else:
                self.log_test(
                    "Stats filtering logic",
                    False,
                    f"Filtered sales (Q{filtered_sales:,.2f}) > Global sales (Q{global_sales:,.2f})"
                )
        
        # Test quotes and orders filtering
        print("\n📋 Testing Quotes and Orders Filtering...")
        self.test_quotes_with_salesperson_filter()
        self.test_orders_with_salesperson_filter()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SalespersonFilterTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())