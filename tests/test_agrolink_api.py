"""
AgroLink CRM API Tests
Tests for authentication, dashboard, alerts, projects, and stage advancement blocking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://creditrural-app.preview.emergentagent.com')

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "master"
        assert data["user"]["email"] == "admin@agrolink.com"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "wrong",
            "senha": "wrongpassword"
        })
        assert response.status_code == 401


class TestDashboard:
    """Dashboard statistics tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        return response.json()["token"]
    
    def test_dashboard_stats(self, auth_token):
        """Test dashboard statistics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required stats are present
        assert "total_projetos_ativos" in data
        assert "projetos_mes_atual" in data
        assert "projetos_finalizados_mes" in data
        assert "total_clientes" in data
        assert "projetos_com_pendencia" in data
        assert "valor_total_credito" in data
        assert "valor_total_servico" in data
        
        # Verify data types
        assert isinstance(data["total_projetos_ativos"], int)
        assert isinstance(data["total_clientes"], int)
        assert isinstance(data["valor_total_credito"], (int, float))


class TestAlerts:
    """Notification bell alerts tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        return response.json()["token"]
    
    def test_alerts_all_endpoint(self, auth_token):
        """Test alerts/all endpoint for notification bell"""
        response = requests.get(
            f"{BASE_URL}/api/alerts/all",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "alerts" in data
        assert "total" in data
        assert isinstance(data["alerts"], list)
        
        # If there are alerts, verify structure
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "id" in alert
            assert "cliente_nome" in alert
            assert "dias_sem_projeto" in alert
    
    def test_alerts_check_endpoint(self, auth_token):
        """Test alerts check endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/alerts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data


class TestProjects:
    """Project management tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        return response.json()["token"]
    
    def test_list_active_projects(self, auth_token):
        """Test listing active projects"""
        response = requests.get(
            f"{BASE_URL}/api/projects?status=em_andamento",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If there are projects, verify structure
        if data:
            project = data[0]
            assert "id" in project
            assert "cliente_nome" in project
            assert "etapa_atual_nome" in project
            assert "documentos_check" in project
            assert "tem_pendencia" in project
    
    def test_list_archived_projects(self, auth_token):
        """Test listing archived projects"""
        response = requests.get(
            f"{BASE_URL}/api/projects?status=arquivado",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify archived projects have required fields
        if data:
            project = data[0]
            assert project["status"] == "arquivado"
            assert "data_arquivamento" in project
            assert "historico_etapas" in project


class TestStageAdvancementBlocking:
    """Stage advancement blocking logic tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        return response.json()["token"]
    
    def test_stage_advancement_blocked_with_pending_requirements(self, auth_token):
        """Test that stage advancement is blocked when requirements are not met"""
        # Get active projects
        response = requests.get(
            f"{BASE_URL}/api/projects?status=em_andamento",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        projects = response.json()
        
        if not projects:
            pytest.skip("No active projects to test")
        
        # Find a project with pending requirements
        project_with_pending = None
        for project in projects:
            if project.get("tem_pendencia"):
                project_with_pending = project
                break
        
        if not project_with_pending:
            pytest.skip("No projects with pending requirements")
        
        # Try to advance the stage
        response = requests.put(
            f"{BASE_URL}/api/projects/{project_with_pending['id']}/next-stage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should be blocked with 400 status
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Pendências" in data["detail"] or "pendência" in data["detail"].lower()


class TestEtapas:
    """Stage (Etapas) management tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        return response.json()["token"]
    
    def test_list_etapas(self, auth_token):
        """Test listing all stages"""
        response = requests.get(
            f"{BASE_URL}/api/etapas",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify 8 stages exist
        assert len(data) >= 8
        
        # Verify stage structure
        stage_names = [s["nome"] for s in data]
        expected_stages = [
            "Cadastro",
            "Coleta de Documentos",
            "Desenvolvimento do Projeto",
            "Coletar Assinaturas",
            "Protocolo CENOP",
            "Instrumento de Crédito",
            "GTA e Nota Fiscal",
            "Projeto Creditado"
        ]
        
        for expected in expected_stages:
            assert expected in stage_names, f"Stage '{expected}' not found"


class TestClients:
    """Client management tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        return response.json()["token"]
    
    def test_list_clients(self, auth_token):
        """Test listing clients"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify client structure
        if data:
            client = data[0]
            assert "id" in client
            assert "nome_completo" in client
            assert "cpf" in client
            assert "telefone" in client


class TestDocumentsCheck:
    """Document checklist tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        return response.json()["token"]
    
    def test_documents_check_fields(self, auth_token):
        """Test that documents check includes rg_cnh and conta_banco_brasil"""
        response = requests.get(
            f"{BASE_URL}/api/projects?status=em_andamento",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        projects = response.json()
        
        if not projects:
            pytest.skip("No active projects to test")
        
        project = projects[0]
        docs = project.get("documentos_check", {})
        
        # Verify required document fields exist
        assert "rg_cnh" in docs, "rg_cnh field missing from documentos_check"
        assert "conta_banco_brasil" in docs, "conta_banco_brasil field missing from documentos_check"
        assert "ccu_titulo" in docs
        assert "saldo_iagro" in docs
        assert "car" in docs
        assert "projeto_implementado" in docs
        assert "projeto_assinado" in docs
        assert "projeto_protocolado" in docs
        assert "assinatura_agencia" in docs
        assert "upload_contrato" in docs
        assert "gta_emitido" in docs
        assert "nota_fiscal_emitida" in docs
        assert "comprovante_servico_pago" in docs


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
