#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class AgroLinkAPITester:
    def __init__(self, base_url="https://farm-loans-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resources = {
            'clients': [],
            'partners': [],
            'users': [],
            'projects': []
        }

    def log_result(self, test_name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
            if expected_status and actual_status:
                print(f"   Expected status: {expected_status}, Got: {actual_status}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'expected_status': expected_status,
            'actual_status': actual_status
        })

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            return response.status_code == expected_status, response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return False, None

    def test_login(self):
        """Test login with admin credentials"""
        print("\n🔐 Testing Authentication...")
        
        success, response = self.make_request(
            'POST', 
            'auth/login',
            data={"login": "admin", "senha": "#Sti93qn06301616"},
            expected_status=200
        )
        
        if success and response:
            try:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.token = data['token']
                    self.log_result("Login with admin credentials", True)
                    print(f"   User: {data['user']['nome']} ({data['user']['role']})")
                    return True
                else:
                    self.log_result("Login with admin credentials", False, "Missing token or user in response")
            except Exception as e:
                self.log_result("Login with admin credentials", False, f"JSON parse error: {str(e)}")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Login with admin credentials", False, f"Request failed", 200, status)
        
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n📊 Testing Dashboard...")
        
        success, response = self.make_request('GET', 'dashboard/stats')
        
        if success and response:
            try:
                data = response.json()
                required_fields = ['total_projetos_ativos', 'total_clientes', 'projetos_com_pendencia', 'valor_total_credito']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Dashboard stats endpoint", True)
                    print(f"   Total projetos ativos: {data['total_projetos_ativos']}")
                    print(f"   Total clientes: {data['total_clientes']}")
                    return True
                else:
                    self.log_result("Dashboard stats endpoint", False, f"Missing fields: {missing_fields}")
            except Exception as e:
                self.log_result("Dashboard stats endpoint", False, f"JSON parse error: {str(e)}")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Dashboard stats endpoint", False, "Request failed", 200, status)
        
        return False

    def test_partners_crud(self):
        """Test partners CRUD operations"""
        print("\n🤝 Testing Partners Management...")
        
        # Create partner
        partner_data = {
            "nome": "Parceiro Teste",
            "comissao": 500.0,
            "telefone": "11999999999",
            "ativo": True
        }
        
        success, response = self.make_request('POST', 'partners', data=partner_data, expected_status=200)
        
        if success and response:
            try:
                partner = response.json()
                partner_id = partner['id']
                self.created_resources['partners'].append(partner_id)
                self.log_result("Create partner", True)
                print(f"   Created partner: {partner['nome']} (ID: {partner_id})")
                
                # List partners
                success, response = self.make_request('GET', 'partners')
                if success and response:
                    partners = response.json()
                    if isinstance(partners, list) and len(partners) > 0:
                        self.log_result("List partners", True)
                        print(f"   Found {len(partners)} partners")
                    else:
                        self.log_result("List partners", False, "No partners returned")
                else:
                    self.log_result("List partners", False, "Request failed")
                
                return True
            except Exception as e:
                self.log_result("Create partner", False, f"JSON parse error: {str(e)}")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Create partner", False, "Request failed", 200, status)
        
        return False

    def test_clients_crud(self):
        """Test clients CRUD operations"""
        print("\n👥 Testing Client Management...")
        
        # Create client
        client_data = {
            "nome_completo": "João Silva Teste",
            "cpf": "12345678901",
            "endereco": "Rua Teste, 123, Centro, Cidade - SP",
            "telefone": "11987654321",
            "data_nascimento": "1980-01-01",
            "valor_credito": 50000.0,
            "parceiro_id": None
        }
        
        success, response = self.make_request('POST', 'clients', data=client_data, expected_status=200)
        
        if success and response:
            try:
                client = response.json()
                client_id = client['id']
                self.created_resources['clients'].append(client_id)
                self.log_result("Create client", True)
                print(f"   Created client: {client['nome_completo']} (ID: {client_id})")
                
                # List clients
                success, response = self.make_request('GET', 'clients')
                if success and response:
                    clients = response.json()
                    if isinstance(clients, list) and len(clients) > 0:
                        self.log_result("List clients", True)
                        print(f"   Found {len(clients)} clients")
                    else:
                        self.log_result("List clients", False, "No clients returned")
                else:
                    self.log_result("List clients", False, "Request failed")
                
                # Get specific client
                success, response = self.make_request('GET', f'clients/{client_id}')
                if success and response:
                    client_detail = response.json()
                    if client_detail['id'] == client_id:
                        self.log_result("Get client by ID", True)
                    else:
                        self.log_result("Get client by ID", False, "Wrong client returned")
                else:
                    self.log_result("Get client by ID", False, "Request failed")
                
                return client_id
            except Exception as e:
                self.log_result("Create client", False, f"JSON parse error: {str(e)}")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Create client", False, "Request failed", 200, status)
        
        return None

    def test_projects_crud(self, client_id):
        """Test projects CRUD operations"""
        print("\n📁 Testing Project Management...")
        
        if not client_id:
            self.log_result("Create project", False, "No client ID available")
            return None
        
        # Create project
        project_data = {"cliente_id": client_id}
        
        success, response = self.make_request('POST', 'projects', data=project_data, expected_status=200)
        
        if success and response:
            try:
                project = response.json()
                project_id = project['id']
                self.created_resources['projects'].append(project_id)
                self.log_result("Create project", True)
                print(f"   Created project for client: {project['cliente_nome']} (ID: {project_id})")
                
                # List projects
                success, response = self.make_request('GET', 'projects')
                if success and response:
                    projects = response.json()
                    if isinstance(projects, list) and len(projects) > 0:
                        self.log_result("List projects", True)
                        print(f"   Found {len(projects)} projects")
                    else:
                        self.log_result("List projects", False, "No projects returned")
                else:
                    self.log_result("List projects", False, "Request failed")
                
                # Get specific project
                success, response = self.make_request('GET', f'projects/{project_id}')
                if success and response:
                    project_detail = response.json()
                    if project_detail['id'] == project_id:
                        self.log_result("Get project by ID", True)
                    else:
                        self.log_result("Get project by ID", False, "Wrong project returned")
                else:
                    self.log_result("Get project by ID", False, "Request failed")
                
                return project_id
            except Exception as e:
                self.log_result("Create project", False, f"JSON parse error: {str(e)}")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Create project", False, "Request failed", 200, status)
        
        return None

    def test_project_timeline_features(self, project_id):
        """Test project timeline features"""
        print("\n⏱️ Testing Project Timeline Features...")
        
        if not project_id:
            self.log_result("Add pendencia to project", False, "No project ID available")
            return
        
        # Add pendencia
        pendencia_data = {"descricao": "Documento CCU pendente"}
        success, response = self.make_request('POST', f'projects/{project_id}/pendencia', data=pendencia_data)
        
        if success:
            self.log_result("Add pendencia to project", True)
        else:
            status = response.status_code if response else "No response"
            self.log_result("Add pendencia to project", False, "Request failed", 200, status)
        
        # Add observacao
        observacao_data = {"texto": "Cliente contatado por telefone"}
        success, response = self.make_request('POST', f'projects/{project_id}/observacao', data=observacao_data)
        
        if success:
            self.log_result("Add observacao to project", True)
        else:
            status = response.status_code if response else "No response"
            self.log_result("Add observacao to project", False, "Request failed", 200, status)
        
        # Update documents
        docs_data = {"ccu_titulo": True, "saldo_iagro": False, "car": True}
        success, response = self.make_request('PUT', f'projects/{project_id}/documents', data=docs_data)
        
        if success:
            self.log_result("Update project documents", True)
        else:
            status = response.status_code if response else "No response"
            self.log_result("Update project documents", False, "Request failed", 200, status)

    def test_users_crud(self):
        """Test users CRUD operations (Admin only)"""
        print("\n👤 Testing User Management...")
        
        # Create user
        user_data = {
            "nome": "Analista Teste",
            "email": "analista.teste@agrolink.com",
            "senha": "senha123",
            "role": "analista",
            "ativo": True
        }
        
        success, response = self.make_request('POST', 'users', data=user_data, expected_status=200)
        
        if success and response:
            try:
                user = response.json()
                user_id = user['id']
                self.created_resources['users'].append(user_id)
                self.log_result("Create user", True)
                print(f"   Created user: {user['nome']} ({user['role']})")
                
                # List users
                success, response = self.make_request('GET', 'users')
                if success and response:
                    users = response.json()
                    if isinstance(users, list) and len(users) > 0:
                        self.log_result("List users", True)
                        print(f"   Found {len(users)} users")
                    else:
                        self.log_result("List users", False, "No users returned")
                else:
                    self.log_result("List users", False, "Request failed")
                
                return True
            except Exception as e:
                self.log_result("Create user", False, f"JSON parse error: {str(e)}")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Create user", False, "Request failed", 200, status)
        
        return False

    def test_etapas(self):
        """Test etapas (stages) endpoint"""
        print("\n📋 Testing Etapas (Stages)...")
        
        success, response = self.make_request('GET', 'etapas')
        
        if success and response:
            try:
                etapas = response.json()
                if isinstance(etapas, list) and len(etapas) > 0:
                    self.log_result("List etapas", True)
                    print(f"   Found {len(etapas)} etapas")
                    for etapa in etapas[:3]:  # Show first 3
                        print(f"   - {etapa['nome']} (ordem: {etapa['ordem']})")
                else:
                    self.log_result("List etapas", False, "No etapas returned")
            except Exception as e:
                self.log_result("List etapas", False, f"JSON parse error: {str(e)}")
        else:
            status = response.status_code if response else "No response"
            self.log_result("List etapas", False, "Request failed", 200, status)

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete projects first (they depend on clients)
        for project_id in self.created_resources['projects']:
            try:
                success, response = self.make_request('PUT', f'projects/{project_id}/cancel', 
                                                    data={"motivo": "Teste automatizado"})
                if success:
                    print(f"   Deleted project: {project_id}")
            except:
                pass
        
        # Delete clients
        for client_id in self.created_resources['clients']:
            try:
                success, response = self.make_request('DELETE', f'clients/{client_id}')
                if success:
                    print(f"   Deleted client: {client_id}")
            except:
                pass
        
        # Delete users
        for user_id in self.created_resources['users']:
            try:
                success, response = self.make_request('DELETE', f'users/{user_id}')
                if success:
                    print(f"   Deleted user: {user_id}")
            except:
                pass
        
        # Delete partners
        for partner_id in self.created_resources['partners']:
            try:
                success, response = self.make_request('DELETE', f'partners/{partner_id}')
                if success:
                    print(f"   Deleted partner: {partner_id}")
            except:
                pass

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AgroLink CRM API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication is required for all endpoints
        if not self.test_login():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Test core functionality
        self.test_dashboard_stats()
        self.test_etapas()
        self.test_partners_crud()
        client_id = self.test_clients_crud()
        project_id = self.test_projects_crud(client_id)
        self.test_project_timeline_features(project_id)
        self.test_users_crud()
        
        # Cleanup
        self.cleanup_resources()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AgroLinkAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())