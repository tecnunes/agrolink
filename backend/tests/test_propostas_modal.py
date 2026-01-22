"""
Test suite for Propostas Modal functionality - Testing both flows:
1. Create proposta with existing client (client_id)
2. Create proposta with new client (nome_completo, cpf, telefone)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_LOGIN = "admin"
TEST_PASSWORD = "#Sti93qn06301616"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "login": TEST_LOGIN,
        "senha": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def tipo_projeto_id(auth_headers):
    """Get first tipo projeto ID"""
    response = requests.get(f"{BASE_URL}/api/tipos-projeto", headers=auth_headers)
    assert response.status_code == 200
    tipos = response.json()
    assert len(tipos) > 0, "No tipos de projeto found"
    return tipos[0]["id"]


@pytest.fixture(scope="module")
def instituicao_id(auth_headers):
    """Get first instituicao financeira ID"""
    response = requests.get(f"{BASE_URL}/api/instituicoes-financeiras", headers=auth_headers)
    assert response.status_code == 200
    instituicoes = response.json()
    assert len(instituicoes) > 0, "No instituicoes financeiras found"
    return instituicoes[0]["id"]


@pytest.fixture(scope="module")
def existing_client_id(auth_headers):
    """Get first existing client ID"""
    response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
    assert response.status_code == 200
    clients = response.json()
    if len(clients) > 0:
        return clients[0]["id"]
    # Create a test client if none exists
    new_client = {
        "nome_completo": "TEST_EXISTING_CLIENT",
        "cpf": "99988877766",
        "telefone": "11999887766"
    }
    response = requests.post(f"{BASE_URL}/api/clients", json=new_client, headers=auth_headers)
    assert response.status_code == 200
    return response.json()["id"]


class TestPropostasAPI:
    """Test Propostas API endpoints"""
    
    def test_list_propostas(self, auth_headers):
        """Test GET /api/propostas - List all propostas"""
        response = requests.get(f"{BASE_URL}/api/propostas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} propostas")
    
    def test_list_clients_for_combobox(self, auth_headers):
        """Test GET /api/clients - List clients for combobox search"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} clients")
    
    def test_search_clients(self, auth_headers):
        """Test GET /api/clients?search= - Search clients"""
        response = requests.get(f"{BASE_URL}/api/clients?search=test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} clients matching 'test'")


class TestFlow1ExistingClient:
    """Test Flow 1: Create proposta with existing client"""
    
    def test_create_proposta_with_existing_client(self, auth_headers, existing_client_id, tipo_projeto_id, instituicao_id):
        """Test POST /api/propostas with client_id (existing client)"""
        payload = {
            "client_id": existing_client_id,
            "tipo_projeto_id": tipo_projeto_id,
            "instituicao_financeira_id": instituicao_id,
            "valor_credito": 100000.00
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create proposta: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["cliente_id"] == existing_client_id
        assert data["tipo_projeto_id"] == tipo_projeto_id
        assert data["instituicao_financeira_id"] == instituicao_id
        assert data["valor_credito"] == 100000.00
        assert data["status"] == "aberta"
        assert "cliente_nome" in data
        assert "cliente_cpf" in data
        print(f"Created proposta {data['id']} for existing client {data['cliente_nome']}")
        
        # Cleanup - delete the proposta
        delete_response = requests.delete(f"{BASE_URL}/api/propostas/{data['id']}", headers=auth_headers)
        assert delete_response.status_code == 200
        print(f"Cleaned up proposta {data['id']}")
    
    def test_create_proposta_with_invalid_client_id(self, auth_headers, tipo_projeto_id, instituicao_id):
        """Test POST /api/propostas with invalid client_id"""
        payload = {
            "client_id": "invalid-client-id-12345",
            "tipo_projeto_id": tipo_projeto_id,
            "instituicao_financeira_id": instituicao_id,
            "valor_credito": 50000.00
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", json=payload, headers=auth_headers)
        assert response.status_code == 404
        assert "Cliente não encontrado" in response.json()["detail"]
        print("Correctly rejected invalid client_id")


class TestFlow2NewClient:
    """Test Flow 2: Create proposta with new client"""
    
    def test_create_proposta_with_new_client(self, auth_headers, tipo_projeto_id, instituicao_id):
        """Test POST /api/propostas with new client data (nome, cpf, telefone)"""
        unique_cpf = f"TEST{str(uuid.uuid4())[:7].replace('-', '')}"[:11].ljust(11, '0')
        
        payload = {
            "nome_completo": "TEST_NEW_CLIENT_API",
            "cpf": unique_cpf,
            "telefone": "11888887777",
            "tipo_projeto_id": tipo_projeto_id,
            "instituicao_financeira_id": instituicao_id,
            "valor_credito": 75000.00
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create proposta: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["cliente_nome"] == "TEST_NEW_CLIENT_API"
        assert data["tipo_projeto_id"] == tipo_projeto_id
        assert data["instituicao_financeira_id"] == instituicao_id
        assert data["valor_credito"] == 75000.00
        assert data["status"] == "aberta"
        print(f"Created proposta {data['id']} with new client {data['cliente_nome']}")
        
        # Verify client was created
        clients_response = requests.get(f"{BASE_URL}/api/clients?search=TEST_NEW_CLIENT_API", headers=auth_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        assert len(clients) > 0, "New client was not created"
        print(f"Verified new client was created: {clients[0]['nome_completo']}")
        
        # Cleanup - delete the proposta
        delete_response = requests.delete(f"{BASE_URL}/api/propostas/{data['id']}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Cleanup - delete the client
        client_id = data["cliente_id"]
        delete_client_response = requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=auth_headers)
        assert delete_client_response.status_code == 200
        print(f"Cleaned up proposta and client")
    
    def test_create_proposta_missing_new_client_data(self, auth_headers, tipo_projeto_id, instituicao_id):
        """Test POST /api/propostas without client_id and missing new client data"""
        payload = {
            "nome_completo": "TEST_INCOMPLETE",
            # Missing cpf and telefone
            "tipo_projeto_id": tipo_projeto_id,
            "instituicao_financeira_id": instituicao_id,
            "valor_credito": 50000.00
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", json=payload, headers=auth_headers)
        assert response.status_code == 400
        assert "informe nome, CPF e telefone" in response.json()["detail"]
        print("Correctly rejected incomplete new client data")
    
    def test_create_proposta_invalid_cpf(self, auth_headers, tipo_projeto_id, instituicao_id):
        """Test POST /api/propostas with invalid CPF"""
        payload = {
            "nome_completo": "TEST_INVALID_CPF",
            "cpf": "123",  # Invalid CPF (too short)
            "telefone": "11999998888",
            "tipo_projeto_id": tipo_projeto_id,
            "instituicao_financeira_id": instituicao_id,
            "valor_credito": 50000.00
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", json=payload, headers=auth_headers)
        assert response.status_code == 400
        assert "CPF inválido" in response.json()["detail"]
        print("Correctly rejected invalid CPF")


class TestValidation:
    """Test validation for required fields"""
    
    def test_create_proposta_missing_tipo_projeto(self, auth_headers, existing_client_id, instituicao_id):
        """Test POST /api/propostas without tipo_projeto_id"""
        payload = {
            "client_id": existing_client_id,
            # Missing tipo_projeto_id
            "instituicao_financeira_id": instituicao_id,
            "valor_credito": 50000.00
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", json=payload, headers=auth_headers)
        assert response.status_code == 422  # Validation error
        print("Correctly rejected missing tipo_projeto_id")
    
    def test_create_proposta_missing_instituicao(self, auth_headers, existing_client_id, tipo_projeto_id):
        """Test POST /api/propostas without instituicao_financeira_id"""
        payload = {
            "client_id": existing_client_id,
            "tipo_projeto_id": tipo_projeto_id,
            # Missing instituicao_financeira_id
            "valor_credito": 50000.00
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", json=payload, headers=auth_headers)
        assert response.status_code == 422  # Validation error
        print("Correctly rejected missing instituicao_financeira_id")
    
    def test_create_proposta_missing_valor(self, auth_headers, existing_client_id, tipo_projeto_id, instituicao_id):
        """Test POST /api/propostas without valor_credito"""
        payload = {
            "client_id": existing_client_id,
            "tipo_projeto_id": tipo_projeto_id,
            "instituicao_financeira_id": instituicao_id
            # Missing valor_credito
        }
        
        response = requests.post(f"{BASE_URL}/api/propostas", json=payload, headers=auth_headers)
        assert response.status_code == 422  # Validation error
        print("Correctly rejected missing valor_credito")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
