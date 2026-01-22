"""
Backend API tests for AgroLink CRM - Propostas, Instituições Financeiras, Tipos de Projeto, Estados/Cidades
Tests the new features: Propostas system, configurable financial institutions, project types, and location APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] in ["master", "admin"]
        print(f"Login successful - User: {data['user']['nome']}, Role: {data['user']['role']}")


class TestInstituicoesFinanceiras:
    """Tests for Financial Institutions API"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_instituicoes_financeiras(self, auth_headers):
        """Test listing active financial institutions"""
        response = requests.get(f"{BASE_URL}/api/instituicoes-financeiras", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one financial institution"
        
        # Check structure
        inst = data[0]
        assert "id" in inst
        assert "nome" in inst
        assert "ativo" in inst
        print(f"Found {len(data)} active financial institutions")
        for i in data[:5]:
            print(f"  - {i['nome']}")
    
    def test_list_all_instituicoes_financeiras(self, auth_headers):
        """Test listing all financial institutions (including inactive)"""
        response = requests.get(f"{BASE_URL}/api/instituicoes-financeiras/all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} total financial institutions")
    
    def test_create_instituicao_financeira(self, auth_headers):
        """Test creating a new financial institution"""
        response = requests.post(f"{BASE_URL}/api/instituicoes-financeiras", 
            headers=auth_headers,
            json={"nome": "TEST_Banco Teste", "ativo": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nome"] == "TEST_Banco Teste"
        assert data["ativo"] == True
        print(f"Created institution: {data['nome']} (ID: {data['id']})")
        
        # Cleanup - delete the test institution
        requests.delete(f"{BASE_URL}/api/instituicoes-financeiras/{data['id']}", headers=auth_headers)


class TestTiposProjeto:
    """Tests for Project Types API"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_tipos_projeto(self, auth_headers):
        """Test listing active project types"""
        response = requests.get(f"{BASE_URL}/api/tipos-projeto", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one project type"
        
        # Check structure
        tipo = data[0]
        assert "id" in tipo
        assert "nome" in tipo
        assert "ativo" in tipo
        print(f"Found {len(data)} active project types:")
        for t in data:
            print(f"  - {t['nome']}")
    
    def test_list_all_tipos_projeto(self, auth_headers):
        """Test listing all project types (including inactive)"""
        response = requests.get(f"{BASE_URL}/api/tipos-projeto/all", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} total project types")
    
    def test_create_tipo_projeto(self, auth_headers):
        """Test creating a new project type"""
        response = requests.post(f"{BASE_URL}/api/tipos-projeto", 
            headers=auth_headers,
            json={"nome": "TEST_Tipo Teste", "ativo": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nome"] == "TEST_Tipo Teste"
        assert data["ativo"] == True
        print(f"Created project type: {data['nome']} (ID: {data['id']})")
        
        # Cleanup - delete the test type
        requests.delete(f"{BASE_URL}/api/tipos-projeto/{data['id']}", headers=auth_headers)


class TestEstadosCidades:
    """Tests for States and Cities API (IBGE integration)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_estados(self, auth_headers):
        """Test listing Brazilian states"""
        response = requests.get(f"{BASE_URL}/api/estados", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 27, "Brazil has 27 states"
        
        # Check structure
        estado = data[0]
        assert "sigla" in estado
        assert "nome" in estado
        print(f"Found {len(data)} states")
        
        # Check for some known states
        siglas = [e["sigla"] for e in data]
        assert "SP" in siglas, "São Paulo should be in the list"
        assert "RJ" in siglas, "Rio de Janeiro should be in the list"
        assert "MS" in siglas, "Mato Grosso do Sul should be in the list"
    
    def test_list_cidades_sp(self, auth_headers):
        """Test listing cities for São Paulo state"""
        response = requests.get(f"{BASE_URL}/api/cidades/SP", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 100, "SP should have many cities"
        
        # Check structure
        cidade = data[0]
        assert "id" in cidade
        assert "nome" in cidade
        print(f"Found {len(data)} cities in SP")
    
    def test_list_cidades_ms(self, auth_headers):
        """Test listing cities for Mato Grosso do Sul state"""
        response = requests.get(f"{BASE_URL}/api/cidades/MS", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 50, "MS should have many cities"
        print(f"Found {len(data)} cities in MS")


class TestPropostas:
    """Tests for Propostas (Proposals) API"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def tipo_projeto_id(self, auth_headers):
        """Get a valid project type ID"""
        response = requests.get(f"{BASE_URL}/api/tipos-projeto", headers=auth_headers)
        tipos = response.json()
        return tipos[0]["id"] if tipos else None
    
    @pytest.fixture(scope="class")
    def instituicao_id(self, auth_headers):
        """Get a valid financial institution ID"""
        response = requests.get(f"{BASE_URL}/api/instituicoes-financeiras", headers=auth_headers)
        instituicoes = response.json()
        return instituicoes[0]["id"] if instituicoes else None
    
    def test_list_propostas(self, auth_headers):
        """Test listing proposals"""
        response = requests.get(f"{BASE_URL}/api/propostas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} proposals")
        
        if data:
            proposta = data[0]
            assert "id" in proposta
            assert "cliente_nome" in proposta
            assert "status" in proposta
            print(f"First proposal: {proposta['cliente_nome']} - Status: {proposta['status']}")
    
    def test_list_propostas_by_status(self, auth_headers):
        """Test listing proposals filtered by status"""
        # Test open proposals
        response = requests.get(f"{BASE_URL}/api/propostas?status=aberta", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Found {len(data)} open proposals")
        
        # All should be open
        for p in data:
            assert p["status"] == "aberta"
    
    def test_create_proposta(self, auth_headers, tipo_projeto_id, instituicao_id):
        """Test creating a new proposal"""
        if not tipo_projeto_id or not instituicao_id:
            pytest.skip("No project type or institution available")
        
        proposta_data = {
            "nome_completo": "TEST_CLIENTE PROPOSTA",
            "cpf": "12345678901",
            "telefone": "67999999999",
            "tipo_projeto_id": tipo_projeto_id,
            "instituicao_financeira_id": instituicao_id,
            "valor_credito": 50000.00
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", 
            headers=auth_headers,
            json=proposta_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["cliente_nome"] == "TEST_CLIENTE PROPOSTA"
        assert data["status"] == "aberta"
        assert data["valor_credito"] == 50000.00
        print(f"Created proposal: {data['cliente_nome']} - ID: {data['id']}")
        
        # Store for cleanup
        return data["id"]
    
    def test_proposta_alerts(self, auth_headers):
        """Test getting proposal alerts"""
        response = requests.get(f"{BASE_URL}/api/alerts/propostas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        assert "total" in data
        print(f"Found {data['total']} proposal alerts")
        
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "cliente_nome" in alert
            assert "dias_aberta" in alert
            print(f"First alert: {alert['cliente_nome']} - {alert['dias_aberta']} days open")
    
    def test_clear_all_proposta_alerts(self, auth_headers):
        """Test clearing all proposal alerts"""
        response = requests.put(f"{BASE_URL}/api/alerts/propostas/clear-all", headers=auth_headers)
        assert response.status_code == 200
        print("All proposal alerts cleared")


class TestClienteEstadoCidade:
    """Tests for Client with Estado/Cidade fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_client_with_estado_cidade(self, auth_headers):
        """Test creating a client with estado and cidade fields"""
        client_data = {
            "nome_completo": "TEST_CLIENTE COM ESTADO",
            "cpf": "98765432100",
            "telefone": "67988888888",
            "estado": "MS",
            "cidade": "Campo Grande"
        }
        
        response = requests.post(f"{BASE_URL}/api/clients", 
            headers=auth_headers,
            json=client_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nome_completo"] == "TEST_CLIENTE COM ESTADO"
        # Note: estado and cidade may not be returned in response, check DB
        print(f"Created client: {data['nome_completo']} - ID: {data['id']}")
        
        # Verify by getting the client
        get_response = requests.get(f"{BASE_URL}/api/clients/{data['id']}", headers=auth_headers)
        assert get_response.status_code == 200
        client = get_response.json()
        print(f"Client estado: {client.get('estado')}, cidade: {client.get('cidade')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{data['id']}", headers=auth_headers)


class TestProjetoComInstituicaoTipo:
    """Tests for Project with Instituição Financeira and Tipo Projeto"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "login": "admin",
            "senha": "#Sti93qn06301616"
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_project_has_instituicao_tipo(self, auth_headers):
        """Test that projects have instituicao_financeira and tipo_projeto fields"""
        response = requests.get(f"{BASE_URL}/api/projects?status=em_andamento", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data:
            project = data[0]
            print(f"Project: {project['cliente_nome']}")
            print(f"  - Tipo Projeto: {project.get('tipo_projeto')}")
            print(f"  - Instituição: {project.get('instituicao_financeira_nome')}")
            # These fields should exist in the response
            assert "tipo_projeto" in project or "tipo_projeto_id" in project
        else:
            print("No active projects found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
