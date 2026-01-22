from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import shutil
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'agrolink-secret-key-2024-rural-credit')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# File upload settings
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Create the main app
app = FastAPI(title="AgroLink API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserRole:
    MASTER = "master"
    ADMIN = "admin"
    ANALISTA = "analista"

class UserBase(BaseModel):
    nome: str
    email: EmailStr
    role: str = UserRole.ANALISTA
    ativo: bool = True

class UserCreate(UserBase):
    senha: str

class UserLogin(BaseModel):
    login: str
    senha: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    email: str
    role: str
    ativo: bool
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class PartnerBase(BaseModel):
    nome: str
    comissao: float = 0.0
    telefone: Optional[str] = None
    ativo: bool = True

class PartnerCreate(PartnerBase):
    pass

class PartnerResponse(PartnerBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str

class ClientBase(BaseModel):
    nome_completo: str
    cpf: str
    endereco: Optional[str] = None
    telefone: str
    data_nascimento: Optional[str] = None
    parceiro_id: Optional[str] = None
    estado: Optional[str] = None
    cidade: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    parceiro_nome: Optional[str] = None
    tem_projeto_ativo: Optional[bool] = False
    tem_proposta_aberta: Optional[bool] = False
    ultimo_alerta: Optional[str] = None
    qtd_alertas: Optional[int] = 0

# ==================== INSTITUICAO FINANCEIRA MODELS ====================

class InstituicaoFinanceiraBase(BaseModel):
    nome: str
    ativo: bool = True

class InstituicaoFinanceiraCreate(InstituicaoFinanceiraBase):
    pass

class InstituicaoFinanceiraResponse(InstituicaoFinanceiraBase):
    model_config = ConfigDict(extra="ignore")
    id: str

# ==================== TIPO PROJETO MODELS ====================

class TipoProjetoBase(BaseModel):
    nome: str
    ativo: bool = True

class TipoProjetoCreate(TipoProjetoBase):
    pass

class TipoProjetoResponse(TipoProjetoBase):
    model_config = ConfigDict(extra="ignore")
    id: str

# ==================== PROPOSTA MODELS ====================

class PropostaBase(BaseModel):
    cliente_id: str
    tipo_projeto_id: str
    instituicao_financeira_id: str
    valor_credito: float
    status: str = "aberta"  # aberta, convertida, desistida
    motivo_desistencia: Optional[str] = None

class PropostaCreate(BaseModel):
    # Se client_id for fornecido, usa o cliente existente
    client_id: Optional[str] = None
    # Se client_id não for fornecido, cria um novo cliente com estes dados
    nome_completo: Optional[str] = None
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    # Campos obrigatórios da proposta
    tipo_projeto_id: str
    instituicao_financeira_id: str
    valor_credito: float

class PropostaResponse(PropostaBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    cliente_nome: str
    cliente_cpf: str
    cliente_telefone: Optional[str] = None
    tipo_projeto_nome: str
    instituicao_financeira_nome: str
    created_at: str
    updated_at: Optional[str] = None
    qtd_alertas: int = 0
    ultimo_alerta: Optional[str] = None
    dias_aberta: int = 0

# ==================== REQUISITO ETAPA MODELS ====================

class RequisitoEtapaBase(BaseModel):
    etapa_id: str
    nome: str
    campo: str  # nome do campo no documentos_check
    ativo: bool = True

class RequisitoEtapaCreate(RequisitoEtapaBase):
    pass

class RequisitoEtapaResponse(RequisitoEtapaBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class DocumentoCheck(BaseModel):
    # Documentos Pessoais Obrigatórios
    rg_cnh: bool = False
    conta_banco_brasil: bool = False
    # Etapa Coleta de Documentos
    ccu_titulo: bool = False
    saldo_iagro: bool = False
    car: bool = False
    # Etapa Desenvolvimento do Projeto
    projeto_implementado: bool = False
    # Etapa Coletar Assinaturas
    projeto_assinado: bool = False
    # Etapa Protocolo CENOP
    projeto_protocolado: bool = False
    # Etapa Instrumento de Crédito
    assinatura_agencia: bool = False
    upload_contrato: bool = False
    # Etapa GTA e Nota Fiscal
    gta_emitido: bool = False
    nota_fiscal_emitida: bool = False
    # Etapa Projeto Creditado
    comprovante_servico_pago: bool = False

class PendenciaBase(BaseModel):
    descricao: str
    resolvida: bool = False
    data_criacao: str = ""
    data_resolucao: Optional[str] = None

class ObservacaoBase(BaseModel):
    texto: str
    usuario_nome: str
    data: str

class EtapaBase(BaseModel):
    nome: str
    ordem: int
    ativo: bool = True

class EtapaCreate(EtapaBase):
    pass

class EtapaResponse(EtapaBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class ProjetoEtapa(BaseModel):
    etapa_id: str
    etapa_nome: str
    data_inicio: str
    data_fim: Optional[str] = None
    dias_duracao: int = 0
    pendencias: List[PendenciaBase] = []
    observacoes: List[ObservacaoBase] = []

class ProjetoBase(BaseModel):
    cliente_id: str
    etapa_atual_id: str
    etapa_atual_nome: str
    status: str = "em_andamento"  # em_andamento, arquivado, desistido
    motivo_desistencia: Optional[str] = None
    documentos_check: DocumentoCheck = DocumentoCheck()
    historico_etapas: List[ProjetoEtapa] = []
    data_inicio: str
    data_arquivamento: Optional[str] = None
    numero_contrato: Optional[str] = None
    valor_servico: Optional[float] = None
    valor_credito: float = 0.0
    tipo_projeto: str = "PRONAF A"  # PRONAF A, PRONAF B, CUSTEIO
    tipo_projeto_id: Optional[str] = None
    instituicao_financeira_id: Optional[str] = None
    instituicao_financeira_nome: Optional[str] = None
    proposta_id: Optional[str] = None  # Link para proposta original

class ProjetoCreate(BaseModel):
    cliente_id: str
    valor_credito: float
    tipo_projeto: str = "PRONAF A"
    tipo_projeto_id: Optional[str] = None
    instituicao_financeira_id: Optional[str] = None
    proposta_id: Optional[str] = None  # Se convertido de uma proposta

class ProjetoResponse(ProjetoBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    cliente_nome: str
    cliente_cpf: str
    cliente_telefone: Optional[str] = None
    tem_pendencia: bool = False

class ConfigBase(BaseModel):
    logo_path: Optional[str] = None
    campos_extras_cliente: List[dict] = []

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    try:
        token = authorization
        if token.startswith("Bearer "):
            token = token[7:]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        if not user.get("ativo", True):
            raise HTTPException(status_code=401, detail="Usuário desativado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_auth_user(authorization: str = Header(None)):
    """Wrapper to get current user from header"""
    return await get_current_user(authorization)

def require_role(allowed_roles: List[str]):
    async def check_role(token: str = None):
        user = await get_current_user(token)
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permissão negada")
        return user
    return check_role

# ==================== INIT DEFAULT DATA ====================

async def init_default_data():
    # Create master user if not exists
    existing_master = await db.users.find_one({"email": "admin@agrolink.com"})
    if not existing_master:
        master_user = {
            "id": str(uuid.uuid4()),
            "nome": "Administrador Master",
            "email": "admin@agrolink.com",
            "senha": hash_password("#Sti93qn06301616"),
            "role": UserRole.MASTER,
            "ativo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(master_user)
    
    # Create default stages if not exists
    existing_etapas = await db.etapas.count_documents({})
    if existing_etapas == 0:
        default_etapas = [
            {"id": str(uuid.uuid4()), "nome": "Cadastro", "ordem": 1, "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Coleta de Documentos", "ordem": 2, "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Desenvolvimento do Projeto", "ordem": 3, "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Coletar Assinaturas", "ordem": 4, "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Protocolo CENOP", "ordem": 5, "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Instrumento de Crédito", "ordem": 6, "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "GTA e Nota Fiscal", "ordem": 7, "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Projeto Creditado", "ordem": 8, "ativo": True},
        ]
        await db.etapas.insert_many(default_etapas)
    
    # Create default config if not exists
    existing_config = await db.config.find_one({})
    if not existing_config:
        await db.config.insert_one({"logo_path": None, "campos_extras_cliente": []})
    
    # Create default instituicoes financeiras if not exists
    existing_instituicoes = await db.instituicoes_financeiras.count_documents({})
    if existing_instituicoes == 0:
        default_instituicoes = [
            {"id": str(uuid.uuid4()), "nome": "Banco do Brasil", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Sicredi", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Sicoob", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Cresol", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Caixa Econômica Federal", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Banco do Nordeste (BNB)", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Banco da Amazônia", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Itaú Unibanco", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Bradesco", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Santander", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "Credicoamo", "ativo": True},
        ]
        await db.instituicoes_financeiras.insert_many(default_instituicoes)
    
    # Create default tipos de projeto if not exists
    existing_tipos = await db.tipos_projeto.count_documents({})
    if existing_tipos == 0:
        default_tipos = [
            {"id": str(uuid.uuid4()), "nome": "PRONAF A", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "PRONAF B", "ativo": True},
            {"id": str(uuid.uuid4()), "nome": "CUSTEIO", "ativo": True},
        ]
        await db.tipos_projeto.insert_many(default_tipos)

@app.on_event("startup")
async def startup_event():
    await init_default_data()

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({
        "$or": [
            {"email": credentials.login},
            {"nome": credentials.login}
        ]
    }, {"_id": 0})
    
    if not user:
        # Try login as "admin"
        if credentials.login == "admin":
            user = await db.users.find_one({"role": UserRole.MASTER}, {"_id": 0})
    
    if not user or not verify_password(credentials.senha, user["senha"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not user.get("ativo", True):
        raise HTTPException(status_code=401, detail="Usuário desativado")
    
    token = create_token(user["id"], user["role"])
    
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            nome=user["nome"],
            email=user["email"],
            role=user["role"],
            ativo=user["ativo"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_auth_user)):
    user = current_user
    return UserResponse(
        id=user["id"],
        nome=user["nome"],
        email=user["email"],
        role=user["role"],
        ativo=user["ativo"],
        created_at=user["created_at"]
    )

# ==================== USER ROUTES ====================

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    # Check permissions
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Analistas não podem criar usuários")
    
    if current_user["role"] == UserRole.ADMIN and user_data.role in [UserRole.MASTER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admins não podem criar usuários Master ou Admin")
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "nome": user_data.nome,
        "email": user_data.email,
        "senha": hash_password(user_data.senha),
        "role": user_data.role,
        "ativo": user_data.ativo,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    return UserResponse(
        id=new_user["id"],
        nome=new_user["nome"],
        email=new_user["email"],
        role=new_user["role"],
        ativo=new_user["ativo"],
        created_at=new_user["created_at"]
    )

@api_router.get("/users", response_model=List[UserResponse])
async def list_users(current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    users = await db.users.find({}, {"_id": 0, "senha": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: dict, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Permission checks
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    if current_user["role"] == UserRole.ADMIN:
        if target_user["role"] in [UserRole.MASTER, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Admins não podem alterar Master ou outros Admins")
    
    update_data = {}
    if "nome" in user_data:
        update_data["nome"] = user_data["nome"]
    if "email" in user_data:
        update_data["email"] = user_data["email"]
    if "ativo" in user_data:
        update_data["ativo"] = user_data["ativo"]
    if "role" in user_data:
        if current_user["role"] != UserRole.MASTER:
            raise HTTPException(status_code=403, detail="Apenas Master pode alterar roles")
        update_data["role"] = user_data["role"]
    if "senha" in user_data and user_data["senha"]:
        update_data["senha"] = hash_password(user_data["senha"])
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "Usuário atualizado com sucesso"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if target_user["role"] == UserRole.MASTER:
        raise HTTPException(status_code=403, detail="Não é possível excluir usuário Master")
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    if current_user["role"] == UserRole.ADMIN and target_user["role"] == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admins não podem excluir outros Admins")
    
    await db.users.delete_one({"id": user_id})
    return {"message": "Usuário excluído com sucesso"}

# ==================== PARTNER ROUTES ====================

@api_router.post("/partners", response_model=PartnerResponse)
async def create_partner(partner_data: PartnerCreate, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    new_partner = {
        "id": str(uuid.uuid4()),
        "nome": partner_data.nome,
        "comissao": partner_data.comissao,
        "telefone": partner_data.telefone,
        "ativo": partner_data.ativo,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.partners.insert_one(new_partner)
    
    return PartnerResponse(**new_partner)

@api_router.get("/partners", response_model=List[PartnerResponse])
async def list_partners(current_user = Depends(get_auth_user)):
    pass  # user auth verified
    partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    return [PartnerResponse(**p) for p in partners]

@api_router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, partner_data: dict, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    update_data = {k: v for k, v in partner_data.items() if k in ["nome", "comissao", "telefone", "ativo"]}
    
    if update_data:
        await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    
    return {"message": "Parceiro atualizado com sucesso"}

@api_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    await db.partners.delete_one({"id": partner_id})
    return {"message": "Parceiro excluído com sucesso"}

# ==================== CLIENT ROUTES ====================

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(client_data: ClientCreate, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    # Validate CPF format (basic)
    cpf_clean = re.sub(r'\D', '', client_data.cpf)
    if len(cpf_clean) != 11:
        raise HTTPException(status_code=400, detail="CPF inválido")
    
    # Check if CPF exists
    existing = await db.clients.find_one({"cpf": cpf_clean})
    if existing:
        raise HTTPException(status_code=400, detail="CPF já cadastrado")
    
    parceiro_nome = None
    if client_data.parceiro_id:
        parceiro = await db.partners.find_one({"id": client_data.parceiro_id}, {"_id": 0})
        if parceiro:
            parceiro_nome = parceiro["nome"]
    
    new_client = {
        "id": str(uuid.uuid4()),
        "nome_completo": client_data.nome_completo.upper(),
        "cpf": cpf_clean,
        "endereco": client_data.endereco or "",
        "telefone": client_data.telefone,
        "data_nascimento": client_data.data_nascimento or "",
        "parceiro_id": client_data.parceiro_id,
        "parceiro_nome": parceiro_nome,
        "estado": client_data.estado,
        "cidade": client_data.cidade,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ultimo_alerta": None,
        "qtd_alertas": 0
    }
    
    await db.clients.insert_one(new_client)
    
    # Create client folder for documents
    client_folder = UPLOAD_DIR / new_client["id"]
    client_folder.mkdir(exist_ok=True)
    
    return ClientResponse(**new_client)

@api_router.get("/clients", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    current_user = Depends(get_auth_user)
):
    pass  # user auth verified
    
    query = {}
    if search:
        query["$or"] = [
            {"nome_completo": {"$regex": search, "$options": "i"}},
            {"cpf": {"$regex": search}}
        ]
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for c in clients:
        # Check if client has active project
        active_project = await db.projects.find_one({
            "cliente_id": c["id"],
            "status": "em_andamento"
        })
        c["tem_projeto_ativo"] = active_project is not None
        c["ultimo_alerta"] = c.get("ultimo_alerta")
        c["qtd_alertas"] = c.get("qtd_alertas", 0)
        result.append(ClientResponse(**c))
    
    return result

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Check if client has active project
    active_project = await db.projects.find_one({
        "cliente_id": client_id,
        "status": "em_andamento"
    })
    client["tem_projeto_ativo"] = active_project is not None
    
    return ClientResponse(**client)

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_data: dict, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    update_data = {}
    allowed_fields = ["nome_completo", "endereco", "telefone", "data_nascimento", "valor_credito", "parceiro_id", "estado", "cidade"]
    
    for field in allowed_fields:
        if field in client_data:
            if field == "nome_completo":
                update_data[field] = client_data[field].upper()
            else:
                update_data[field] = client_data[field]
    
    if "parceiro_id" in update_data and update_data["parceiro_id"]:
        parceiro = await db.partners.find_one({"id": update_data["parceiro_id"]}, {"_id": 0})
        if parceiro:
            update_data["parceiro_nome"] = parceiro["nome"]
    
    if update_data:
        await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    return {"message": "Cliente atualizado com sucesso"}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    # Check if client has active project
    project = await db.projects.find_one({"cliente_id": client_id, "status": "em_andamento"})
    if project:
        raise HTTPException(status_code=400, detail="Cliente possui projeto em andamento")
    
    # Delete client folder
    client_folder = UPLOAD_DIR / client_id
    if client_folder.exists():
        shutil.rmtree(client_folder)
    
    await db.clients.delete_one({"id": client_id})
    return {"message": "Cliente excluído com sucesso"}

# ==================== ETAPA ROUTES ====================

@api_router.get("/etapas", response_model=List[EtapaResponse])
async def list_etapas(current_user = Depends(get_auth_user)):
    pass  # user auth verified
    etapas = await db.etapas.find({"ativo": True}, {"_id": 0}).sort("ordem", 1).to_list(100)
    return [EtapaResponse(**e) for e in etapas]

@api_router.post("/etapas", response_model=EtapaResponse)
async def create_etapa(etapa_data: EtapaCreate, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    new_etapa = {
        "id": str(uuid.uuid4()),
        "nome": etapa_data.nome,
        "ordem": etapa_data.ordem,
        "ativo": etapa_data.ativo
    }
    
    await db.etapas.insert_one(new_etapa)
    return EtapaResponse(**new_etapa)

@api_router.put("/etapas/{etapa_id}")
async def update_etapa(etapa_id: str, etapa_data: dict, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    etapa = await db.etapas.find_one({"id": etapa_id})
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    
    update_data = {k: v for k, v in etapa_data.items() if k in ["nome", "ordem", "ativo"]}
    
    if update_data:
        await db.etapas.update_one({"id": etapa_id}, {"$set": update_data})
    
    return {"message": "Etapa atualizada com sucesso"}

@api_router.delete("/etapas/{etapa_id}")
async def delete_etapa(etapa_id: str, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    await db.etapas.update_one({"id": etapa_id}, {"$set": {"ativo": False}})
    return {"message": "Etapa desativada com sucesso"}

# ==================== PROJECT ROUTES ====================

@api_router.post("/projects", response_model=ProjetoResponse)
async def create_project(project_data: ProjetoCreate, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    # Check if client exists
    client = await db.clients.find_one({"id": project_data.cliente_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Check if client already has active project
    existing_project = await db.projects.find_one({
        "cliente_id": project_data.cliente_id,
        "status": "em_andamento"
    })
    if existing_project:
        raise HTTPException(status_code=400, detail="Cliente já possui projeto em andamento")
    
    # Get first stage
    first_etapa = await db.etapas.find_one({"ativo": True}, {"_id": 0}, sort=[("ordem", 1)])
    if not first_etapa:
        raise HTTPException(status_code=400, detail="Nenhuma etapa configurada")
    
    # Get instituicao financeira name if provided
    instituicao_nome = None
    if project_data.instituicao_financeira_id:
        instituicao = await db.instituicoes_financeiras.find_one({"id": project_data.instituicao_financeira_id}, {"_id": 0})
        if instituicao:
            instituicao_nome = instituicao["nome"]
    
    # Get tipo projeto name if ID provided
    tipo_projeto_nome = project_data.tipo_projeto
    if project_data.tipo_projeto_id:
        tipo = await db.tipos_projeto.find_one({"id": project_data.tipo_projeto_id}, {"_id": 0})
        if tipo:
            tipo_projeto_nome = tipo["nome"]
    
    now = datetime.now(timezone.utc).isoformat()
    
    new_project = {
        "id": str(uuid.uuid4()),
        "cliente_id": client["id"],
        "etapa_atual_id": first_etapa["id"],
        "etapa_atual_nome": first_etapa["nome"],
        "status": "em_andamento",
        "motivo_desistencia": None,
        "documentos_check": {
            "rg_cnh": False,
            "conta_banco_brasil": False,
            "ccu_titulo": False,
            "saldo_iagro": False,
            "car": False,
            "projeto_implementado": False,
            "projeto_assinado": False,
            "projeto_protocolado": False,
            "assinatura_agencia": False,
            "upload_contrato": False,
            "gta_emitido": False,
            "nota_fiscal_emitida": False,
            "comprovante_servico_pago": False
        },
        "historico_etapas": [{
            "etapa_id": first_etapa["id"],
            "etapa_nome": first_etapa["nome"],
            "data_inicio": now,
            "data_fim": None,
            "dias_duracao": 0,
            "pendencias": [],
            "observacoes": []
        }],
        "data_inicio": now,
        "data_arquivamento": None,
        "valor_credito": project_data.valor_credito,
        "tipo_projeto": tipo_projeto_nome,
        "tipo_projeto_id": project_data.tipo_projeto_id,
        "instituicao_financeira_id": project_data.instituicao_financeira_id,
        "instituicao_financeira_nome": instituicao_nome,
        "proposta_id": project_data.proposta_id,
        "numero_contrato": None,
        "valor_servico": None
    }
    
    await db.projects.insert_one(new_project)
    
    return ProjetoResponse(
        **new_project,
        cliente_nome=client["nome_completo"],
        cliente_cpf=client["cpf"],
        cliente_telefone=client.get("telefone"),
        tem_pendencia=False
    )

@api_router.get("/projects", response_model=List[ProjetoResponse])
async def list_projects(
    status: Optional[str] = "em_andamento",
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    nome: Optional[str] = None,
    pendencia: Optional[bool] = None,
    current_user = Depends(get_auth_user)
):
    pass  # user auth verified
    
    query = {}
    if status:
        query["status"] = status
    
    if mes and ano:
        start_date = datetime(ano, mes, 1, tzinfo=timezone.utc).isoformat()
        if mes == 12:
            end_date = datetime(ano + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            end_date = datetime(ano, mes + 1, 1, tzinfo=timezone.utc).isoformat()
        query["data_inicio"] = {"$gte": start_date, "$lt": end_date}
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for proj in projects:
        client = await db.clients.find_one({"id": proj["cliente_id"]}, {"_id": 0})
        if not client:
            continue
        
        # Apply name filter
        if nome and nome.lower() not in client["nome_completo"].lower():
            continue
        
        # Check for pending issues
        tem_pendencia = False
        for etapa in proj.get("historico_etapas", []):
            for pend in etapa.get("pendencias", []):
                if not pend.get("resolvida", False):
                    tem_pendencia = True
                    break
        
        # Check documents and stage requirements
        docs = proj.get("documentos_check", {})
        etapa_nome = proj.get("etapa_atual_nome", "")
        
        # Check stage-specific requirements
        if "Coleta de Documentos" in etapa_nome:
            if not all([docs.get("rg_cnh"), docs.get("conta_banco_brasil"), docs.get("ccu_titulo"), docs.get("saldo_iagro"), docs.get("car")]):
                tem_pendencia = True
        elif "Desenvolvimento do Projeto" in etapa_nome:
            if not docs.get("projeto_implementado"):
                tem_pendencia = True
        elif "Coletar Assinaturas" in etapa_nome:
            if not docs.get("projeto_assinado"):
                tem_pendencia = True
        elif "Protocolo CENOP" in etapa_nome:
            if not docs.get("projeto_protocolado"):
                tem_pendencia = True
        elif "Instrumento de Crédito" in etapa_nome:
            if not all([docs.get("assinatura_agencia"), docs.get("upload_contrato")]):
                tem_pendencia = True
        elif "GTA e Nota Fiscal" in etapa_nome:
            if not all([docs.get("gta_emitido"), docs.get("nota_fiscal_emitida")]):
                tem_pendencia = True
        elif "Projeto Creditado" in etapa_nome:
            if not docs.get("comprovante_servico_pago"):
                tem_pendencia = True
        
        # Apply pendencia filter
        if pendencia is not None and tem_pendencia != pendencia:
            continue
        
        result.append(ProjetoResponse(
            **proj,
            cliente_nome=client["nome_completo"],
            cliente_cpf=client["cpf"],
            cliente_telefone=client.get("telefone"),
            tem_pendencia=tem_pendencia
        ))
    
    return result

@api_router.get("/projects/{project_id}", response_model=ProjetoResponse)
async def get_project(project_id: str, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    client = await db.clients.find_one({"id": project["cliente_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    tem_pendencia = False
    for etapa in project.get("historico_etapas", []):
        for pend in etapa.get("pendencias", []):
            if not pend.get("resolvida", False):
                tem_pendencia = True
                break
    
    # Check stage-specific requirements
    docs = project.get("documentos_check", {})
    etapa_nome = project.get("etapa_atual_nome", "")
    
    if "Coleta de Documentos" in etapa_nome:
        if not all([docs.get("rg_cnh"), docs.get("conta_banco_brasil"), docs.get("ccu_titulo"), docs.get("saldo_iagro"), docs.get("car")]):
            tem_pendencia = True
    elif "Desenvolvimento do Projeto" in etapa_nome:
        if not docs.get("projeto_implementado"):
            tem_pendencia = True
    elif "Coletar Assinaturas" in etapa_nome:
        if not docs.get("projeto_assinado"):
            tem_pendencia = True
    elif "Protocolo CENOP" in etapa_nome:
        if not docs.get("projeto_protocolado"):
            tem_pendencia = True
    elif "Instrumento de Crédito" in etapa_nome:
        if not all([docs.get("assinatura_agencia"), docs.get("upload_contrato")]):
            tem_pendencia = True
    elif "GTA e Nota Fiscal" in etapa_nome:
        if not all([docs.get("gta_emitido"), docs.get("nota_fiscal_emitida")]):
            tem_pendencia = True
    elif "Projeto Creditado" in etapa_nome:
        if not docs.get("comprovante_servico_pago"):
            tem_pendencia = True
    
    return ProjetoResponse(
        **project,
        cliente_nome=client["nome_completo"],
        cliente_cpf=client["cpf"],
        cliente_telefone=client.get("telefone"),
        tem_pendencia=tem_pendencia
    )

@api_router.put("/projects/{project_id}/next-stage")
async def advance_project_stage(project_id: str, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    if project["status"] != "em_andamento":
        raise HTTPException(status_code=400, detail="Projeto não está em andamento")
    
    # Check for pending requirements based on current stage
    docs = project.get("documentos_check", {})
    etapa_nome = project.get("etapa_atual_nome", "")
    
    # Check pendencies on current stage
    pendencias_etapa = []
    
    # Check for unresolved pendencies
    historico = project.get("historico_etapas", [])
    if historico:
        current_hist = historico[-1]
        for pend in current_hist.get("pendencias", []):
            if not pend.get("resolvida", False):
                pendencias_etapa.append("Existem pendências não resolvidas")
                break
    
    # Check stage-specific requirements
    if "Coleta de Documentos" in etapa_nome:
        if not docs.get("rg_cnh"):
            pendencias_etapa.append("RG ou CNH não verificado")
        if not docs.get("conta_banco_brasil"):
            pendencias_etapa.append("Conta Banco do Brasil não verificada")
        if not docs.get("ccu_titulo"):
            pendencias_etapa.append("CCU/Título não verificado")
        if not docs.get("saldo_iagro"):
            pendencias_etapa.append("Saldo IAGRO não verificado")
        if not docs.get("car"):
            pendencias_etapa.append("CAR não verificado")
    elif "Desenvolvimento do Projeto" in etapa_nome:
        if not docs.get("projeto_implementado"):
            pendencias_etapa.append("Projeto não implementado")
    elif "Coletar Assinaturas" in etapa_nome:
        if not docs.get("projeto_assinado"):
            pendencias_etapa.append("Projeto não assinado")
    elif "Protocolo CENOP" in etapa_nome:
        if not docs.get("projeto_protocolado"):
            pendencias_etapa.append("Projeto não protocolado")
    elif "Instrumento de Crédito" in etapa_nome:
        if not docs.get("assinatura_agencia"):
            pendencias_etapa.append("Assinatura na agência pendente")
        if not docs.get("upload_contrato"):
            pendencias_etapa.append("Upload do contrato pendente")
    elif "GTA e Nota Fiscal" in etapa_nome:
        if not docs.get("gta_emitido"):
            pendencias_etapa.append("GTA não emitido")
        if not docs.get("nota_fiscal_emitida"):
            pendencias_etapa.append("Nota fiscal não emitida")
    elif "Projeto Creditado" in etapa_nome:
        if not docs.get("comprovante_servico_pago"):
            pendencias_etapa.append("Comprovante de serviço não pago")
    
    if pendencias_etapa:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível avançar. Pendências: {', '.join(pendencias_etapa)}"
        )
    
    # Get current stage order
    current_etapa = await db.etapas.find_one({"id": project["etapa_atual_id"]}, {"_id": 0})
    if not current_etapa:
        raise HTTPException(status_code=400, detail="Etapa atual não encontrada")
    
    # Get next stage
    next_etapa = await db.etapas.find_one(
        {"ordem": {"$gt": current_etapa["ordem"]}, "ativo": True},
        {"_id": 0},
        sort=[("ordem", 1)]
    )
    
    if not next_etapa:
        raise HTTPException(status_code=400, detail="Já está na última etapa")
    
    now = datetime.now(timezone.utc)
    
    # Update current stage end date and calculate duration
    if historico:
        last_etapa = historico[-1]
        start = datetime.fromisoformat(last_etapa["data_inicio"].replace('Z', '+00:00'))
        last_etapa["data_fim"] = now.isoformat()
        last_etapa["dias_duracao"] = (now - start).days
    
    # Add new stage to history
    historico.append({
        "etapa_id": next_etapa["id"],
        "etapa_nome": next_etapa["nome"],
        "data_inicio": now.isoformat(),
        "data_fim": None,
        "dias_duracao": 0,
        "pendencias": [],
        "observacoes": []
    })
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "etapa_atual_id": next_etapa["id"],
            "etapa_atual_nome": next_etapa["nome"],
            "historico_etapas": historico
        }}
    )
    
    return {"message": "Projeto avançado para próxima etapa", "nova_etapa": next_etapa["nome"]}

@api_router.put("/projects/{project_id}/archive")
async def archive_project(project_id: str, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    # Check if it's on the last stage
    etapas = await db.etapas.find({"ativo": True}, {"_id": 0}).sort("ordem", -1).to_list(1)
    if etapas and project["etapa_atual_id"] != etapas[0]["id"]:
        raise HTTPException(status_code=400, detail="Projeto precisa estar na última etapa para ser arquivado")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update last stage end date
    historico = project.get("historico_etapas", [])
    if historico:
        last_etapa = historico[-1]
        if not last_etapa.get("data_fim"):
            start = datetime.fromisoformat(last_etapa["data_inicio"].replace('Z', '+00:00'))
            last_etapa["data_fim"] = now
            last_etapa["dias_duracao"] = (datetime.now(timezone.utc) - start).days
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "status": "arquivado",
            "data_arquivamento": now,
            "historico_etapas": historico
        }}
    )
    
    return {"message": "Projeto arquivado com sucesso"}

@api_router.put("/projects/{project_id}/cancel")
async def cancel_project(project_id: str, data: dict, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    motivo = data.get("motivo", "")
    if not motivo:
        raise HTTPException(status_code=400, detail="Motivo da desistência é obrigatório")
    
    # Delete client documents
    client_folder = UPLOAD_DIR / project["cliente_id"]
    if client_folder.exists():
        shutil.rmtree(client_folder)
        client_folder.mkdir(exist_ok=True)
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {
            "status": "desistido",
            "motivo_desistencia": motivo
        }}
    )
    
    return {"message": "Projeto cancelado"}

@api_router.post("/projects/{project_id}/pendencia")
async def add_pendencia(project_id: str, data: dict, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    descricao = data.get("descricao", "")
    if not descricao:
        raise HTTPException(status_code=400, detail="Descrição da pendência é obrigatória")
    
    now = datetime.now(timezone.utc).isoformat()
    
    nova_pendencia = {
        "descricao": descricao,
        "resolvida": False,
        "data_criacao": now,
        "data_resolucao": None
    }
    
    historico = project.get("historico_etapas", [])
    if historico:
        historico[-1]["pendencias"].append(nova_pendencia)
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"historico_etapas": historico}}
    )
    
    return {"message": "Pendência adicionada"}

@api_router.put("/projects/{project_id}/pendencia/{pendencia_index}/resolve")
async def resolve_pendencia(project_id: str, pendencia_index: int, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    historico = project.get("historico_etapas", [])
    if not historico:
        raise HTTPException(status_code=400, detail="Nenhuma etapa encontrada")
    
    current_etapa = historico[-1]
    if pendencia_index >= len(current_etapa.get("pendencias", [])):
        raise HTTPException(status_code=404, detail="Pendência não encontrada")
    
    current_etapa["pendencias"][pendencia_index]["resolvida"] = True
    current_etapa["pendencias"][pendencia_index]["data_resolucao"] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"historico_etapas": historico}}
    )
    
    return {"message": "Pendência resolvida"}

@api_router.post("/projects/{project_id}/observacao")
async def add_observacao(project_id: str, data: dict, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    texto = data.get("texto", "")
    if not texto:
        raise HTTPException(status_code=400, detail="Texto da observação é obrigatório")
    
    nova_observacao = {
        "texto": texto,
        "usuario_nome": current_user["nome"],
        "data": datetime.now(timezone.utc).isoformat()
    }
    
    historico = project.get("historico_etapas", [])
    if historico:
        historico[-1]["observacoes"].append(nova_observacao)
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"historico_etapas": historico}}
    )
    
    return {"message": "Observação adicionada"}

@api_router.put("/projects/{project_id}/documents")
async def update_documents_check(project_id: str, data: dict, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    docs_check = project.get("documentos_check", {})
    
    # Campos de checklist por etapa
    check_fields = [
        "rg_cnh", "conta_banco_brasil",  # Documentos Pessoais Obrigatórios
        "ccu_titulo", "saldo_iagro", "car",  # Coleta de Documentos
        "projeto_implementado",  # Desenvolvimento do Projeto
        "projeto_assinado",  # Coletar Assinaturas
        "projeto_protocolado",  # Protocolo CENOP
        "assinatura_agencia", "upload_contrato",  # Instrumento de Crédito
        "gta_emitido", "nota_fiscal_emitida",  # GTA e Nota Fiscal
        "comprovante_servico_pago"  # Projeto Creditado
    ]
    
    for field in check_fields:
        if field in data:
            docs_check[field] = data[field]
    
    update_data = {"documentos_check": docs_check}
    
    # Campos extras do projeto
    if "numero_contrato" in data:
        update_data["numero_contrato"] = data["numero_contrato"]
    if "valor_servico" in data:
        update_data["valor_servico"] = float(data["valor_servico"]) if data["valor_servico"] else None
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    
    return {"message": "Dados atualizados"}

# ==================== FILE UPLOAD ROUTES ====================

@api_router.post("/upload/{client_id}")
async def upload_file(
    client_id: str,
    file: UploadFile = File(...),
    current_user = Depends(get_auth_user)
):
    pass  # user auth verified
    
    # Check client exists
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo excede o limite de 10MB")
    
    # Create client folder
    client_folder = UPLOAD_DIR / client_id
    client_folder.mkdir(exist_ok=True)
    
    # Rename file to uppercase
    original_name = file.filename
    name_parts = original_name.rsplit('.', 1)
    if len(name_parts) == 2:
        new_name = f"{name_parts[0].upper()}.{name_parts[1].upper()}"
    else:
        new_name = original_name.upper()
    
    file_path = client_folder / new_name
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    return {"message": "Arquivo enviado com sucesso", "filename": new_name}

@api_router.get("/files/{client_id}")
async def list_files(client_id: str, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    client_folder = UPLOAD_DIR / client_id
    if not client_folder.exists():
        return {"files": []}
    
    files = []
    for f in client_folder.iterdir():
        if f.is_file():
            stat = f.stat()
            files.append({
                "name": f.name,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
            })
    
    return {"files": files}

@api_router.get("/files/{client_id}/{filename}")
async def download_file(client_id: str, filename: str, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    file_path = UPLOAD_DIR / client_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    return FileResponse(file_path, filename=filename)

@api_router.delete("/files/{client_id}/{filename}")
async def delete_file(client_id: str, filename: str, current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    file_path = UPLOAD_DIR / client_id / filename
    if file_path.exists():
        file_path.unlink()
    
    return {"message": "Arquivo excluído"}

# ==================== CONFIG ROUTES ====================

@api_router.get("/config")
async def get_config(current_user = Depends(get_auth_user)):
    pass  # user auth verified
    config = await db.config.find_one({}, {"_id": 0})
    return config or {"logo_path": None, "campos_extras_cliente": []}

@api_router.post("/config/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user = Depends(get_auth_user)
):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    # Save logo
    logo_folder = UPLOAD_DIR / "config"
    logo_folder.mkdir(exist_ok=True)
    
    # Remove old logo
    for old_file in logo_folder.glob("logo.*"):
        old_file.unlink()
    
    ext = file.filename.rsplit('.', 1)[-1].lower()
    logo_path = logo_folder / f"logo.{ext}"
    
    contents = await file.read()
    with open(logo_path, "wb") as f:
        f.write(contents)
    
    relative_path = f"/api/config/logo-image"
    
    await db.config.update_one({}, {"$set": {"logo_path": relative_path}}, upsert=True)
    
    return {"message": "Logo atualizado", "path": relative_path}

@api_router.get("/config/logo-image")
async def get_logo_image():
    logo_folder = UPLOAD_DIR / "config"
    for ext in ["png", "jpg", "jpeg", "svg", "webp"]:
        logo_path = logo_folder / f"logo.{ext}"
        if logo_path.exists():
            return FileResponse(logo_path)
    
    raise HTTPException(status_code=404, detail="Logo não encontrado")

@api_router.put("/config/campos-extras")
async def update_campos_extras(data: dict, current_user = Depends(get_auth_user)):
    # Auth handled by Depends
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    campos = data.get("campos", [])
    
    await db.config.update_one({}, {"$set": {"campos_extras_cliente": campos}}, upsert=True)
    
    return {"message": "Campos extras atualizados"}

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports/summary")
async def get_reports_summary(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    etapa_id: Optional[str] = None,
    pendencia: Optional[bool] = None,
    valor_min: Optional[float] = None,
    valor_max: Optional[float] = None,
    current_user = Depends(get_auth_user)
):
    pass  # user auth verified
    
    query = {}
    
    if mes and ano:
        start_date = datetime(ano, mes, 1, tzinfo=timezone.utc).isoformat()
        if mes == 12:
            end_date = datetime(ano + 1, 1, 1, tzinfo=timezone.utc).isoformat()
        else:
            end_date = datetime(ano, mes + 1, 1, tzinfo=timezone.utc).isoformat()
        query["data_inicio"] = {"$gte": start_date, "$lt": end_date}
    
    if etapa_id:
        query["etapa_atual_id"] = etapa_id
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(10000)
    
    result = []
    total_credito = 0
    por_etapa = {}
    por_status = {"em_andamento": 0, "arquivado": 0, "desistido": 0}
    com_pendencia = 0
    
    for proj in projects:
        client = await db.clients.find_one({"id": proj["cliente_id"]}, {"_id": 0})
        if not client:
            continue
        
        # Value filter
        if valor_min and client["valor_credito"] < valor_min:
            continue
        if valor_max and client["valor_credito"] > valor_max:
            continue
        
        # Check pendencias
        tem_pendencia = False
        for etapa in proj.get("historico_etapas", []):
            for pend in etapa.get("pendencias", []):
                if not pend.get("resolvida", False):
                    tem_pendencia = True
                    break
        
        docs = proj.get("documentos_check", {})
        if not all([docs.get("ccu_titulo"), docs.get("saldo_iagro"), docs.get("car")]):
            tem_pendencia = True
        
        if pendencia is not None and tem_pendencia != pendencia:
            continue
        
        if tem_pendencia:
            com_pendencia += 1
        
        total_credito += client["valor_credito"]
        
        etapa_nome = proj.get("etapa_atual_nome", "N/A")
        por_etapa[etapa_nome] = por_etapa.get(etapa_nome, 0) + 1
        
        por_status[proj.get("status", "em_andamento")] += 1
        
        # Calculate total duration
        duracao_total = 0
        for etapa in proj.get("historico_etapas", []):
            duracao_total += etapa.get("dias_duracao", 0)
        
        result.append({
            "id": proj["id"],
            "cliente_nome": client["nome_completo"],
            "cliente_cpf": client["cpf"],
            "valor_credito": client["valor_credito"],
            "etapa_atual": etapa_nome,
            "status": proj.get("status"),
            "data_inicio": proj.get("data_inicio"),
            "duracao_total_dias": duracao_total,
            "tem_pendencia": tem_pendencia,
            "parceiro": client.get("parceiro_nome", "N/A")
        })
    
    return {
        "projetos": result,
        "resumo": {
            "total_projetos": len(result),
            "total_credito": total_credito,
            "por_etapa": por_etapa,
            "por_status": por_status,
            "com_pendencia": com_pendencia
        }
    }

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user = Depends(get_auth_user)):
    pass  # user auth verified
    
    # Get current month stats
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
    
    total_projects = await db.projects.count_documents({"status": "em_andamento"})
    projects_this_month = await db.projects.count_documents({
        "data_inicio": {"$gte": start_of_month},
        "status": "em_andamento"
    })
    archived_this_month = await db.projects.count_documents({
        "data_arquivamento": {"$gte": start_of_month}
    })
    
    total_clients = await db.clients.count_documents({})
    
    # Get projects with pendencias
    projects = await db.projects.find({"status": "em_andamento"}, {"_id": 0}).to_list(10000)
    com_pendencia = 0
    total_credito = 0
    total_servico = 0
    
    # Get all projects (including archived) for total service value
    all_projects = await db.projects.find({}, {"_id": 0}).to_list(10000)
    for proj in all_projects:
        if proj.get("valor_servico"):
            total_servico += proj.get("valor_servico", 0)
    
    for proj in projects:
        client = await db.clients.find_one({"id": proj["cliente_id"]}, {"_id": 0})
        if client:
            total_credito += client.get("valor_credito", 0)
        
        tem_pendencia = False
        for etapa in proj.get("historico_etapas", []):
            for pend in etapa.get("pendencias", []):
                if not pend.get("resolvida", False):
                    tem_pendencia = True
                    break
        
        # Check pendencias based on current stage
        docs = proj.get("documentos_check", {})
        etapa_nome = proj.get("etapa_atual_nome", "")
        
        # Verificar pendências de acordo com a etapa atual
        if "Coleta de Documentos" in etapa_nome:
            if not all([docs.get("ccu_titulo"), docs.get("saldo_iagro"), docs.get("car")]):
                tem_pendencia = True
        elif "Desenvolvimento do Projeto" in etapa_nome:
            if not docs.get("projeto_implementado"):
                tem_pendencia = True
        elif "Coletar Assinaturas" in etapa_nome:
            if not docs.get("projeto_assinado"):
                tem_pendencia = True
        elif "Protocolo CENOP" in etapa_nome:
            if not docs.get("projeto_protocolado"):
                tem_pendencia = True
        elif "Instrumento de Crédito" in etapa_nome:
            if not all([docs.get("assinatura_agencia"), docs.get("upload_contrato")]):
                tem_pendencia = True
        elif "GTA e Nota Fiscal" in etapa_nome:
            if not all([docs.get("gta_emitido"), docs.get("nota_fiscal_emitida")]):
                tem_pendencia = True
        elif "Projeto Creditado" in etapa_nome:
            if not docs.get("comprovante_servico_pago"):
                tem_pendencia = True
        
        if tem_pendencia:
            com_pendencia += 1
    
    return {
        "total_projetos_ativos": total_projects,
        "projetos_mes_atual": projects_this_month,
        "projetos_finalizados_mes": archived_this_month,
        "total_clientes": total_clients,
        "projetos_com_pendencia": com_pendencia,
        "valor_total_credito": total_credito,
        "valor_total_servico": total_servico
    }

@api_router.get("/alerts")
async def get_alerts(current_user = Depends(get_auth_user)):
    """Get clients without active projects that need follow-up"""
    pass  # user auth verified
    
    now = datetime.now(timezone.utc)
    three_days_ago = (now - timedelta(days=3)).isoformat()
    
    # Get all clients
    clients = await db.clients.find({}, {"_id": 0}).to_list(10000)
    
    alerts = []
    for client in clients:
        # Check if client has active project
        active_project = await db.projects.find_one({
            "cliente_id": client["id"],
            "status": "em_andamento"
        })
        
        if not active_project:
            qtd_alertas = client.get("qtd_alertas", 0)
            ultimo_alerta = client.get("ultimo_alerta")
            
            # Only alert up to 3 times, with 3 day intervals
            if qtd_alertas < 3:
                should_alert = False
                
                if ultimo_alerta is None:
                    should_alert = True
                else:
                    # Check if 3 days have passed since last alert
                    ultimo_dt = datetime.fromisoformat(ultimo_alerta.replace('Z', '+00:00'))
                    if (now - ultimo_dt).days >= 3:
                        should_alert = True
                
                if should_alert:
                    # Update alert count
                    await db.clients.update_one(
                        {"id": client["id"]},
                        {"$set": {
                            "ultimo_alerta": now.isoformat(),
                            "qtd_alertas": qtd_alertas + 1
                        }}
                    )
                    
                    alerts.append({
                        "id": client["id"],
                        "cliente_nome": client["nome_completo"],
                        "cliente_cpf": client["cpf"],
                        "telefone": client.get("telefone"),
                        "data_cadastro": client.get("created_at"),
                        "alerta_numero": qtd_alertas + 1,
                        "mensagem": f"Cliente cadastrado há {(now - datetime.fromisoformat(client.get('created_at', now.isoformat()).replace('Z', '+00:00'))).days} dias sem projeto ativo"
                    })
    
    return {"alerts": alerts}

@api_router.get("/alerts/all")
async def get_all_pending_alerts(current_user = Depends(get_auth_user)):
    """Get all clients without active projects"""
    pass  # user auth verified
    
    now = datetime.now(timezone.utc)
    
    # Get all clients
    clients = await db.clients.find({}, {"_id": 0}).to_list(10000)
    
    alerts = []
    for client in clients:
        # Check if client has active project
        active_project = await db.projects.find_one({
            "cliente_id": client["id"],
            "status": "em_andamento"
        })
        
        if not active_project:
            qtd_alertas = client.get("qtd_alertas", 0)
            if qtd_alertas < 3:  # Still within alert limit
                days_since_created = (now - datetime.fromisoformat(client.get('created_at', now.isoformat()).replace('Z', '+00:00'))).days
                alerts.append({
                    "id": client["id"],
                    "cliente_nome": client["nome_completo"],
                    "cliente_cpf": client["cpf"],
                    "telefone": client.get("telefone"),
                    "data_cadastro": client.get("created_at"),
                    "dias_sem_projeto": days_since_created,
                    "alerta_numero": qtd_alertas,
                    "mensagem": f"Cliente cadastrado há {days_since_created} dias sem projeto ativo"
                })
    
    return {"alerts": alerts, "total": len(alerts)}

# ==================== INSTITUICAO FINANCEIRA ROUTES ====================

@api_router.get("/instituicoes-financeiras", response_model=List[InstituicaoFinanceiraResponse])
async def list_instituicoes_financeiras(current_user = Depends(get_auth_user)):
    instituicoes = await db.instituicoes_financeiras.find({"ativo": True}, {"_id": 0}).to_list(100)
    return [InstituicaoFinanceiraResponse(**i) for i in instituicoes]

@api_router.get("/instituicoes-financeiras/all", response_model=List[InstituicaoFinanceiraResponse])
async def list_all_instituicoes_financeiras(current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    instituicoes = await db.instituicoes_financeiras.find({}, {"_id": 0}).to_list(100)
    return [InstituicaoFinanceiraResponse(**i) for i in instituicoes]

@api_router.post("/instituicoes-financeiras", response_model=InstituicaoFinanceiraResponse)
async def create_instituicao_financeira(data: InstituicaoFinanceiraCreate, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    new_instituicao = {
        "id": str(uuid.uuid4()),
        "nome": data.nome,
        "ativo": data.ativo
    }
    await db.instituicoes_financeiras.insert_one(new_instituicao)
    return InstituicaoFinanceiraResponse(**new_instituicao)

@api_router.put("/instituicoes-financeiras/{instituicao_id}")
async def update_instituicao_financeira(instituicao_id: str, data: dict, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    update_data = {k: v for k, v in data.items() if k in ["nome", "ativo"]}
    if update_data:
        await db.instituicoes_financeiras.update_one({"id": instituicao_id}, {"$set": update_data})
    return {"message": "Instituição atualizada"}

@api_router.delete("/instituicoes-financeiras/{instituicao_id}")
async def delete_instituicao_financeira(instituicao_id: str, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    await db.instituicoes_financeiras.update_one({"id": instituicao_id}, {"$set": {"ativo": False}})
    return {"message": "Instituição desativada"}

# ==================== TIPO PROJETO ROUTES ====================

@api_router.get("/tipos-projeto", response_model=List[TipoProjetoResponse])
async def list_tipos_projeto(current_user = Depends(get_auth_user)):
    tipos = await db.tipos_projeto.find({"ativo": True}, {"_id": 0}).to_list(100)
    return [TipoProjetoResponse(**t) for t in tipos]

@api_router.get("/tipos-projeto/all", response_model=List[TipoProjetoResponse])
async def list_all_tipos_projeto(current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    tipos = await db.tipos_projeto.find({}, {"_id": 0}).to_list(100)
    return [TipoProjetoResponse(**t) for t in tipos]

@api_router.post("/tipos-projeto", response_model=TipoProjetoResponse)
async def create_tipo_projeto(data: TipoProjetoCreate, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    new_tipo = {
        "id": str(uuid.uuid4()),
        "nome": data.nome,
        "ativo": data.ativo
    }
    await db.tipos_projeto.insert_one(new_tipo)
    return TipoProjetoResponse(**new_tipo)

@api_router.put("/tipos-projeto/{tipo_id}")
async def update_tipo_projeto(tipo_id: str, data: dict, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    update_data = {k: v for k, v in data.items() if k in ["nome", "ativo"]}
    if update_data:
        await db.tipos_projeto.update_one({"id": tipo_id}, {"$set": update_data})
    return {"message": "Tipo de projeto atualizado"}

@api_router.delete("/tipos-projeto/{tipo_id}")
async def delete_tipo_projeto(tipo_id: str, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    await db.tipos_projeto.update_one({"id": tipo_id}, {"$set": {"ativo": False}})
    return {"message": "Tipo de projeto desativado"}

# ==================== REQUISITOS ETAPA ROUTES ====================

@api_router.get("/requisitos-etapa", response_model=List[RequisitoEtapaResponse])
async def list_requisitos_etapa(etapa_id: Optional[str] = None, current_user = Depends(get_auth_user)):
    query = {"ativo": True}
    if etapa_id:
        query["etapa_id"] = etapa_id
    requisitos = await db.requisitos_etapa.find(query, {"_id": 0}).to_list(100)
    return [RequisitoEtapaResponse(**r) for r in requisitos]

@api_router.post("/requisitos-etapa", response_model=RequisitoEtapaResponse)
async def create_requisito_etapa(data: RequisitoEtapaCreate, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    new_requisito = {
        "id": str(uuid.uuid4()),
        "etapa_id": data.etapa_id,
        "nome": data.nome,
        "campo": data.campo,
        "ativo": data.ativo
    }
    await db.requisitos_etapa.insert_one(new_requisito)
    return RequisitoEtapaResponse(**new_requisito)

@api_router.put("/requisitos-etapa/{requisito_id}")
async def update_requisito_etapa(requisito_id: str, data: dict, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    update_data = {k: v for k, v in data.items() if k in ["nome", "campo", "ativo"]}
    if update_data:
        await db.requisitos_etapa.update_one({"id": requisito_id}, {"$set": update_data})
    return {"message": "Requisito atualizado"}

@api_router.delete("/requisitos-etapa/{requisito_id}")
async def delete_requisito_etapa(requisito_id: str, current_user = Depends(get_auth_user)):
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    await db.requisitos_etapa.update_one({"id": requisito_id}, {"$set": {"ativo": False}})
    return {"message": "Requisito desativado"}

# ==================== PROPOSTA ROUTES ====================

@api_router.post("/propostas", response_model=PropostaResponse)
async def create_proposta(data: PropostaCreate, current_user = Depends(get_auth_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    # Determinar o cliente (existente ou novo)
    if data.client_id:
        # Usar cliente existente
        existing_client = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
        if not existing_client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        client_id = data.client_id
        client_nome = existing_client["nome_completo"]
        client_cpf = existing_client["cpf"]
        client_telefone = existing_client.get("telefone", "")
    else:
        # Criar novo cliente ou atualizar existente pelo CPF
        if not data.nome_completo or not data.cpf or not data.telefone:
            raise HTTPException(status_code=400, detail="Para criar um novo cliente, informe nome, CPF e telefone")
        
        # Validate CPF
        cpf_clean = re.sub(r'\D', '', data.cpf)
        if len(cpf_clean) != 11:
            raise HTTPException(status_code=400, detail="CPF inválido")
        
        # Check if client already exists
        existing_client = await db.clients.find_one({"cpf": cpf_clean}, {"_id": 0})
        
        if existing_client:
            client_id = existing_client["id"]
            # Update client info if needed
            await db.clients.update_one(
                {"id": client_id},
                {"$set": {
                    "nome_completo": data.nome_completo.upper(),
                    "telefone": data.telefone
                }}
            )
        else:
            # Create new client
            client_id = str(uuid.uuid4())
            new_client = {
                "id": client_id,
                "nome_completo": data.nome_completo.upper(),
                "cpf": cpf_clean,
                "telefone": data.telefone,
                "endereco": "",
                "data_nascimento": "",
                "parceiro_id": None,
                "parceiro_nome": None,
                "estado": None,
                "cidade": None,
                "created_at": now,
                "ultimo_alerta": None,
                "qtd_alertas": 0
            }
            await db.clients.insert_one(new_client)
            
            # Create client folder
            client_folder = UPLOAD_DIR / client_id
            client_folder.mkdir(exist_ok=True)
        
        client_nome = data.nome_completo.upper()
        client_cpf = cpf_clean
        client_telefone = data.telefone
    
    # Get tipo projeto and instituicao names
    tipo_projeto = await db.tipos_projeto.find_one({"id": data.tipo_projeto_id}, {"_id": 0})
    instituicao = await db.instituicoes_financeiras.find_one({"id": data.instituicao_financeira_id}, {"_id": 0})
    
    if not tipo_projeto:
        raise HTTPException(status_code=400, detail="Tipo de projeto não encontrado")
    if not instituicao:
        raise HTTPException(status_code=400, detail="Instituição financeira não encontrada")
    
    # Create proposta
    new_proposta = {
        "id": str(uuid.uuid4()),
        "cliente_id": client_id,
        "tipo_projeto_id": data.tipo_projeto_id,
        "tipo_projeto_nome": tipo_projeto["nome"],
        "instituicao_financeira_id": data.instituicao_financeira_id,
        "instituicao_financeira_nome": instituicao["nome"],
        "valor_credito": data.valor_credito,
        "status": "aberta",
        "motivo_desistencia": None,
        "created_at": now,
        "updated_at": now,
        "qtd_alertas": 0,
        "ultimo_alerta": None
    }
    
    await db.propostas.insert_one(new_proposta)
    
    return PropostaResponse(
        **new_proposta,
        cliente_nome=client_nome,
        cliente_cpf=client_cpf,
        cliente_telefone=client_telefone,
        dias_aberta=0
    )

@api_router.get("/propostas", response_model=List[PropostaResponse])
async def list_propostas(
    status: Optional[str] = None,
    current_user = Depends(get_auth_user)
):
    query = {}
    if status:
        query["status"] = status
    
    propostas = await db.propostas.find(query, {"_id": 0}).to_list(10000)
    
    now = datetime.now(timezone.utc)
    result = []
    
    for proposta in propostas:
        client = await db.clients.find_one({"id": proposta["cliente_id"]}, {"_id": 0})
        if not client:
            continue
        
        created_at = datetime.fromisoformat(proposta.get('created_at', now.isoformat()).replace('Z', '+00:00'))
        dias_aberta = (now - created_at).days
        
        result.append(PropostaResponse(
            **proposta,
            cliente_nome=client["nome_completo"],
            cliente_cpf=client["cpf"],
            cliente_telefone=client.get("telefone"),
            dias_aberta=dias_aberta
        ))
    
    return result

@api_router.get("/propostas/{proposta_id}", response_model=PropostaResponse)
async def get_proposta(proposta_id: str, current_user = Depends(get_auth_user)):
    proposta = await db.propostas.find_one({"id": proposta_id}, {"_id": 0})
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    client = await db.clients.find_one({"id": proposta["cliente_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    now = datetime.now(timezone.utc)
    created_at = datetime.fromisoformat(proposta.get('created_at', now.isoformat()).replace('Z', '+00:00'))
    dias_aberta = (now - created_at).days
    
    return PropostaResponse(
        **proposta,
        cliente_nome=client["nome_completo"],
        cliente_cpf=client["cpf"],
        cliente_telefone=client.get("telefone"),
        dias_aberta=dias_aberta
    )

@api_router.put("/propostas/{proposta_id}/converter")
async def converter_proposta_para_projeto(proposta_id: str, current_user = Depends(get_auth_user)):
    """Converte uma proposta em projeto"""
    proposta = await db.propostas.find_one({"id": proposta_id}, {"_id": 0})
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    if proposta["status"] != "aberta":
        raise HTTPException(status_code=400, detail="Proposta não está aberta")
    
    # Check if client already has active project
    existing_project = await db.projects.find_one({
        "cliente_id": proposta["cliente_id"],
        "status": "em_andamento"
    })
    if existing_project:
        raise HTTPException(status_code=400, detail="Cliente já possui projeto em andamento")
    
    # Get first stage
    first_etapa = await db.etapas.find_one({"ativo": True}, {"_id": 0}, sort=[("ordem", 1)])
    if not first_etapa:
        raise HTTPException(status_code=400, detail="Nenhuma etapa configurada")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create project from proposta
    new_project = {
        "id": str(uuid.uuid4()),
        "cliente_id": proposta["cliente_id"],
        "etapa_atual_id": first_etapa["id"],
        "etapa_atual_nome": first_etapa["nome"],
        "status": "em_andamento",
        "motivo_desistencia": None,
        "documentos_check": {
            "rg_cnh": False,
            "conta_banco_brasil": False,
            "ccu_titulo": False,
            "saldo_iagro": False,
            "car": False,
            "projeto_implementado": False,
            "projeto_assinado": False,
            "projeto_protocolado": False,
            "assinatura_agencia": False,
            "upload_contrato": False,
            "gta_emitido": False,
            "nota_fiscal_emitida": False,
            "comprovante_servico_pago": False
        },
        "historico_etapas": [{
            "etapa_id": first_etapa["id"],
            "etapa_nome": first_etapa["nome"],
            "data_inicio": now,
            "data_fim": None,
            "dias_duracao": 0,
            "pendencias": [],
            "observacoes": []
        }],
        "data_inicio": now,
        "data_arquivamento": None,
        "valor_credito": proposta["valor_credito"],
        "tipo_projeto": proposta["tipo_projeto_nome"],
        "tipo_projeto_id": proposta["tipo_projeto_id"],
        "instituicao_financeira_id": proposta["instituicao_financeira_id"],
        "instituicao_financeira_nome": proposta["instituicao_financeira_nome"],
        "proposta_id": proposta_id,
        "numero_contrato": None,
        "valor_servico": None
    }
    
    await db.projects.insert_one(new_project)
    
    # Update proposta status
    await db.propostas.update_one(
        {"id": proposta_id},
        {"$set": {"status": "convertida", "updated_at": now}}
    )
    
    return {"message": "Proposta convertida em projeto", "project_id": new_project["id"]}

@api_router.put("/propostas/{proposta_id}/desistir")
async def desistir_proposta(proposta_id: str, data: dict, current_user = Depends(get_auth_user)):
    """Marca proposta como desistida"""
    proposta = await db.propostas.find_one({"id": proposta_id}, {"_id": 0})
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    if proposta["status"] != "aberta":
        raise HTTPException(status_code=400, detail="Proposta não está aberta")
    
    motivo = data.get("motivo", "")
    now = datetime.now(timezone.utc).isoformat()
    
    await db.propostas.update_one(
        {"id": proposta_id},
        {"$set": {
            "status": "desistida",
            "motivo_desistencia": motivo,
            "updated_at": now
        }}
    )
    
    return {"message": "Proposta marcada como desistida"}

@api_router.delete("/propostas/{proposta_id}")
async def delete_proposta(proposta_id: str, current_user = Depends(get_auth_user)):
    proposta = await db.propostas.find_one({"id": proposta_id}, {"_id": 0})
    if not proposta:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    await db.propostas.delete_one({"id": proposta_id})
    return {"message": "Proposta excluída"}

# ==================== ALERTS FOR PROPOSTAS ====================

@api_router.get("/alerts/propostas")
async def get_proposta_alerts(current_user = Depends(get_auth_user)):
    """Get open propostas that need follow-up (notifies 3x every 3 days)"""
    now = datetime.now(timezone.utc)
    
    # Get all open propostas
    propostas = await db.propostas.find({"status": "aberta"}, {"_id": 0}).to_list(10000)
    
    alerts = []
    for proposta in propostas:
        client = await db.clients.find_one({"id": proposta["cliente_id"]}, {"_id": 0})
        if not client:
            continue
        
        qtd_alertas = proposta.get("qtd_alertas", 0)
        ultimo_alerta = proposta.get("ultimo_alerta")
        
        # Calculate days open
        created_at = datetime.fromisoformat(proposta.get('created_at', now.isoformat()).replace('Z', '+00:00'))
        dias_aberta = (now - created_at).days
        
        # Check if should show alert (max 3 times, every 3 days)
        if qtd_alertas < 3:
            should_alert = False
            
            if ultimo_alerta is None:
                should_alert = True
            else:
                ultimo_dt = datetime.fromisoformat(ultimo_alerta.replace('Z', '+00:00'))
                if (now - ultimo_dt).days >= 3:
                    should_alert = True
            
            if should_alert:
                # Update alert count
                await db.propostas.update_one(
                    {"id": proposta["id"]},
                    {"$set": {
                        "ultimo_alerta": now.isoformat(),
                        "qtd_alertas": qtd_alertas + 1
                    }}
                )
                qtd_alertas += 1
            
            alerts.append({
                "id": proposta["id"],
                "tipo": "proposta",
                "cliente_id": client["id"],
                "cliente_nome": client["nome_completo"],
                "cliente_cpf": client["cpf"],
                "telefone": client.get("telefone"),
                "tipo_projeto": proposta.get("tipo_projeto_nome"),
                "instituicao": proposta.get("instituicao_financeira_nome"),
                "valor_credito": proposta["valor_credito"],
                "dias_aberta": dias_aberta,
                "alerta_numero": qtd_alertas,
                "data_cadastro": proposta.get("created_at"),
                "mensagem": f"Proposta aberta há {dias_aberta} dias"
            })
    
    return {"alerts": alerts, "total": len(alerts)}

@api_router.put("/alerts/propostas/{proposta_id}/clear")
async def clear_proposta_alert(proposta_id: str, current_user = Depends(get_auth_user)):
    """Clear alert for a specific proposta"""
    await db.propostas.update_one(
        {"id": proposta_id},
        {"$set": {"qtd_alertas": 3}}  # Set to max to stop showing
    )
    return {"message": "Alerta limpo"}

@api_router.put("/alerts/propostas/clear-all")
async def clear_all_proposta_alerts(current_user = Depends(get_auth_user)):
    """Clear all proposta alerts"""
    await db.propostas.update_many(
        {"status": "aberta"},
        {"$set": {"qtd_alertas": 3}}
    )
    return {"message": "Todos os alertas foram limpos"}

# ==================== CLIENT HISTORY ====================

@api_router.get("/clients/{client_id}/history")
async def get_client_history(client_id: str, current_user = Depends(get_auth_user)):
    """Get complete history of a client including projects and propostas"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Get all projects for this client
    projects = await db.projects.find({"cliente_id": client_id}, {"_id": 0}).to_list(100)
    
    # Get all propostas for this client
    propostas = await db.propostas.find({"cliente_id": client_id}, {"_id": 0}).to_list(100)
    
    return {
        "client": client,
        "projects": projects,
        "propostas": propostas,
        "total_projects": len(projects),
        "total_propostas": len(propostas)
    }

# ==================== ESTADOS E CIDADES ====================

ESTADOS_BRASIL = [
    {"sigla": "AC", "nome": "Acre"},
    {"sigla": "AL", "nome": "Alagoas"},
    {"sigla": "AP", "nome": "Amapá"},
    {"sigla": "AM", "nome": "Amazonas"},
    {"sigla": "BA", "nome": "Bahia"},
    {"sigla": "CE", "nome": "Ceará"},
    {"sigla": "DF", "nome": "Distrito Federal"},
    {"sigla": "ES", "nome": "Espírito Santo"},
    {"sigla": "GO", "nome": "Goiás"},
    {"sigla": "MA", "nome": "Maranhão"},
    {"sigla": "MT", "nome": "Mato Grosso"},
    {"sigla": "MS", "nome": "Mato Grosso do Sul"},
    {"sigla": "MG", "nome": "Minas Gerais"},
    {"sigla": "PA", "nome": "Pará"},
    {"sigla": "PB", "nome": "Paraíba"},
    {"sigla": "PR", "nome": "Paraná"},
    {"sigla": "PE", "nome": "Pernambuco"},
    {"sigla": "PI", "nome": "Piauí"},
    {"sigla": "RJ", "nome": "Rio de Janeiro"},
    {"sigla": "RN", "nome": "Rio Grande do Norte"},
    {"sigla": "RS", "nome": "Rio Grande do Sul"},
    {"sigla": "RO", "nome": "Rondônia"},
    {"sigla": "RR", "nome": "Roraima"},
    {"sigla": "SC", "nome": "Santa Catarina"},
    {"sigla": "SP", "nome": "São Paulo"},
    {"sigla": "SE", "nome": "Sergipe"},
    {"sigla": "TO", "nome": "Tocantins"},
]

@api_router.get("/estados")
async def list_estados():
    """List all Brazilian states"""
    return ESTADOS_BRASIL

@api_router.get("/cidades/{estado_sigla}")
async def list_cidades(estado_sigla: str):
    """List cities for a given state (using IBGE API)"""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://servicodados.ibge.gov.br/api/v1/localidades/estados/{estado_sigla}/municipios"
            )
            if response.status_code == 200:
                cidades = response.json()
                return [{"id": c["id"], "nome": c["nome"]} for c in cidades]
    except Exception as e:
        logger.error(f"Error fetching cities: {e}")
    
    return []

# ==================== MASTER ONLY: RESET DATA ====================

@api_router.delete("/master/reset-all-data")
async def reset_all_data(current_user = Depends(get_auth_user)):
    """
    MASTER ONLY: Delete all projects, propostas, and clients.
    This resets the system to a clean state.
    """
    if current_user["role"] != UserRole.MASTER:
        raise HTTPException(status_code=403, detail="Apenas usuário Master pode executar esta ação")
    
    # Count before deletion
    projects_count = await db.projects.count_documents({})
    propostas_count = await db.propostas.count_documents({})
    clients_count = await db.clients.count_documents({})
    
    # Delete all projects
    await db.projects.delete_many({})
    
    # Delete all propostas
    await db.propostas.delete_many({})
    
    # Delete all clients
    await db.clients.delete_many({})
    
    # Clean up upload folder
    import shutil
    if UPLOAD_DIR.exists():
        for folder in UPLOAD_DIR.iterdir():
            if folder.is_dir():
                shutil.rmtree(folder)
    
    return {
        "message": "Todos os dados foram eliminados com sucesso",
        "deleted": {
            "projects": projects_count,
            "propostas": propostas_count,
            "clients": clients_count
        }
    }

@api_router.get("/master/data-stats")
async def get_data_stats(current_user = Depends(get_auth_user)):
    """
    MASTER ONLY: Get statistics of data in the system.
    """
    if current_user["role"] != UserRole.MASTER:
        raise HTTPException(status_code=403, detail="Apenas usuário Master pode acessar")
    
    projects_count = await db.projects.count_documents({})
    propostas_count = await db.propostas.count_documents({})
    clients_count = await db.clients.count_documents({})
    
    return {
        "projects": projects_count,
        "propostas": propostas_count,
        "clients": clients_count,
        "total": projects_count + propostas_count + clients_count
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
