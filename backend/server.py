from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
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
    endereco: str
    telefone: str
    data_nascimento: str
    valor_credito: float
    parceiro_id: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    parceiro_nome: Optional[str] = None

class DocumentoCheck(BaseModel):
    ccu_titulo: bool = False
    saldo_iagro: bool = False
    car: bool = False

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

class ProjetoCreate(BaseModel):
    cliente_id: str

class ProjetoResponse(ProjetoBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    cliente_nome: str
    cliente_cpf: str
    valor_credito: float
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

async def get_current_user(token: str = None):
    if not token:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    try:
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
            {"id": str(uuid.uuid4()), "nome": "Projeto Creditado", "ordem": 7, "ativo": True},
        ]
        await db.etapas.insert_many(default_etapas)
    
    # Create default config if not exists
    existing_config = await db.config.find_one({})
    if not existing_config:
        await db.config.insert_one({"logo_path": None, "campos_extras_cliente": []})

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
async def get_me(authorization: str = None):
    user = await get_current_user(authorization)
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
async def create_user(user_data: UserCreate, authorization: str = None):
    current_user = await get_current_user(authorization)
    
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
async def list_users(authorization: str = None):
    current_user = await get_current_user(authorization)
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    users = await db.users.find({}, {"_id": 0, "senha": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: dict, authorization: str = None):
    current_user = await get_current_user(authorization)
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
async def delete_user(user_id: str, authorization: str = None):
    current_user = await get_current_user(authorization)
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
async def create_partner(partner_data: PartnerCreate, authorization: str = None):
    current_user = await get_current_user(authorization)
    
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
async def list_partners(authorization: str = None):
    await get_current_user(authorization)
    partners = await db.partners.find({}, {"_id": 0}).to_list(1000)
    return [PartnerResponse(**p) for p in partners]

@api_router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, partner_data: dict, authorization: str = None):
    current_user = await get_current_user(authorization)
    
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
async def delete_partner(partner_id: str, authorization: str = None):
    current_user = await get_current_user(authorization)
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    await db.partners.delete_one({"id": partner_id})
    return {"message": "Parceiro excluído com sucesso"}

# ==================== CLIENT ROUTES ====================

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(client_data: ClientCreate, authorization: str = None):
    await get_current_user(authorization)
    
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
        "endereco": client_data.endereco,
        "telefone": client_data.telefone,
        "data_nascimento": client_data.data_nascimento,
        "valor_credito": client_data.valor_credito,
        "parceiro_id": client_data.parceiro_id,
        "parceiro_nome": parceiro_nome,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clients.insert_one(new_client)
    
    # Create client folder for documents
    client_folder = UPLOAD_DIR / new_client["id"]
    client_folder.mkdir(exist_ok=True)
    
    return ClientResponse(**new_client)

@api_router.get("/clients", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    authorization: str = None
):
    await get_current_user(authorization)
    
    query = {}
    if search:
        query["$or"] = [
            {"nome_completo": {"$regex": search, "$options": "i"}},
            {"cpf": {"$regex": search}}
        ]
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    return [ClientResponse(**c) for c in clients]

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, authorization: str = None):
    await get_current_user(authorization)
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    return ClientResponse(**client)

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_data: dict, authorization: str = None):
    await get_current_user(authorization)
    
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    update_data = {}
    allowed_fields = ["nome_completo", "endereco", "telefone", "data_nascimento", "valor_credito", "parceiro_id"]
    
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
async def delete_client(client_id: str, authorization: str = None):
    await get_current_user(authorization)
    
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
async def list_etapas(authorization: str = None):
    await get_current_user(authorization)
    etapas = await db.etapas.find({"ativo": True}, {"_id": 0}).sort("ordem", 1).to_list(100)
    return [EtapaResponse(**e) for e in etapas]

@api_router.post("/etapas", response_model=EtapaResponse)
async def create_etapa(etapa_data: EtapaCreate, authorization: str = None):
    current_user = await get_current_user(authorization)
    
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
async def update_etapa(etapa_id: str, etapa_data: dict, authorization: str = None):
    current_user = await get_current_user(authorization)
    
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
async def delete_etapa(etapa_id: str, authorization: str = None):
    current_user = await get_current_user(authorization)
    
    if current_user["role"] == UserRole.ANALISTA:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    await db.etapas.update_one({"id": etapa_id}, {"$set": {"ativo": False}})
    return {"message": "Etapa desativada com sucesso"}

# ==================== PROJECT ROUTES ====================

@api_router.post("/projects", response_model=ProjetoResponse)
async def create_project(project_data: ProjetoCreate, authorization: str = None):
    await get_current_user(authorization)
    
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
    
    now = datetime.now(timezone.utc).isoformat()
    
    new_project = {
        "id": str(uuid.uuid4()),
        "cliente_id": client["id"],
        "etapa_atual_id": first_etapa["id"],
        "etapa_atual_nome": first_etapa["nome"],
        "status": "em_andamento",
        "motivo_desistencia": None,
        "documentos_check": {"ccu_titulo": False, "saldo_iagro": False, "car": False},
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
        "data_arquivamento": None
    }
    
    await db.projects.insert_one(new_project)
    
    return ProjetoResponse(
        **new_project,
        cliente_nome=client["nome_completo"],
        cliente_cpf=client["cpf"],
        valor_credito=client["valor_credito"],
        tem_pendencia=False
    )

@api_router.get("/projects", response_model=List[ProjetoResponse])
async def list_projects(
    status: Optional[str] = "em_andamento",
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    nome: Optional[str] = None,
    pendencia: Optional[bool] = None,
    authorization: str = None
):
    await get_current_user(authorization)
    
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
        
        # Check documents
        docs = proj.get("documentos_check", {})
        if not all([docs.get("ccu_titulo"), docs.get("saldo_iagro"), docs.get("car")]):
            tem_pendencia = True
        
        # Apply pendencia filter
        if pendencia is not None and tem_pendencia != pendencia:
            continue
        
        result.append(ProjetoResponse(
            **proj,
            cliente_nome=client["nome_completo"],
            cliente_cpf=client["cpf"],
            valor_credito=client["valor_credito"],
            tem_pendencia=tem_pendencia
        ))
    
    return result

@api_router.get("/projects/{project_id}", response_model=ProjetoResponse)
async def get_project(project_id: str, authorization: str = None):
    await get_current_user(authorization)
    
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
    
    docs = project.get("documentos_check", {})
    if not all([docs.get("ccu_titulo"), docs.get("saldo_iagro"), docs.get("car")]):
        tem_pendencia = True
    
    return ProjetoResponse(
        **project,
        cliente_nome=client["nome_completo"],
        cliente_cpf=client["cpf"],
        valor_credito=client["valor_credito"],
        tem_pendencia=tem_pendencia
    )

@api_router.put("/projects/{project_id}/next-stage")
async def advance_project_stage(project_id: str, authorization: str = None):
    current_user = await get_current_user(authorization)
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    if project["status"] != "em_andamento":
        raise HTTPException(status_code=400, detail="Projeto não está em andamento")
    
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
    historico = project.get("historico_etapas", [])
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
async def archive_project(project_id: str, authorization: str = None):
    await get_current_user(authorization)
    
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
async def cancel_project(project_id: str, data: dict, authorization: str = None):
    await get_current_user(authorization)
    
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
async def add_pendencia(project_id: str, data: dict, authorization: str = None):
    current_user = await get_current_user(authorization)
    
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
async def resolve_pendencia(project_id: str, pendencia_index: int, authorization: str = None):
    await get_current_user(authorization)
    
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
async def add_observacao(project_id: str, data: dict, authorization: str = None):
    current_user = await get_current_user(authorization)
    
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
async def update_documents_check(project_id: str, data: dict, authorization: str = None):
    await get_current_user(authorization)
    
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    docs_check = project.get("documentos_check", {})
    
    if "ccu_titulo" in data:
        docs_check["ccu_titulo"] = data["ccu_titulo"]
    if "saldo_iagro" in data:
        docs_check["saldo_iagro"] = data["saldo_iagro"]
    if "car" in data:
        docs_check["car"] = data["car"]
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"documentos_check": docs_check}}
    )
    
    return {"message": "Documentos atualizados"}

# ==================== FILE UPLOAD ROUTES ====================

@api_router.post("/upload/{client_id}")
async def upload_file(
    client_id: str,
    file: UploadFile = File(...),
    authorization: str = None
):
    await get_current_user(authorization)
    
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
async def list_files(client_id: str, authorization: str = None):
    await get_current_user(authorization)
    
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
async def download_file(client_id: str, filename: str, authorization: str = None):
    await get_current_user(authorization)
    
    file_path = UPLOAD_DIR / client_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    return FileResponse(file_path, filename=filename)

@api_router.delete("/files/{client_id}/{filename}")
async def delete_file(client_id: str, filename: str, authorization: str = None):
    await get_current_user(authorization)
    
    file_path = UPLOAD_DIR / client_id / filename
    if file_path.exists():
        file_path.unlink()
    
    return {"message": "Arquivo excluído"}

# ==================== CONFIG ROUTES ====================

@api_router.get("/config")
async def get_config(authorization: str = None):
    await get_current_user(authorization)
    config = await db.config.find_one({}, {"_id": 0})
    return config or {"logo_path": None, "campos_extras_cliente": []}

@api_router.post("/config/logo")
async def upload_logo(
    file: UploadFile = File(...),
    authorization: str = None
):
    current_user = await get_current_user(authorization)
    
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
async def update_campos_extras(data: dict, authorization: str = None):
    current_user = await get_current_user(authorization)
    
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
    authorization: str = None
):
    await get_current_user(authorization)
    
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
async def get_dashboard_stats(authorization: str = None):
    await get_current_user(authorization)
    
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
        
        docs = proj.get("documentos_check", {})
        if not all([docs.get("ccu_titulo"), docs.get("saldo_iagro"), docs.get("car")]):
            tem_pendencia = True
        
        if tem_pendencia:
            com_pendencia += 1
    
    return {
        "total_projetos_ativos": total_projects,
        "projetos_mes_atual": projects_this_month,
        "projetos_finalizados_mes": archived_this_month,
        "total_clientes": total_clients,
        "projetos_com_pendencia": com_pendencia,
        "valor_total_credito": total_credito
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
