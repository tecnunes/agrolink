#!/bin/bash

# =============================================
# AgroLink - Script de Instalação Automática
# =============================================
# Execute com: sudo ./install.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório de instalação
INSTALL_DIR="/opt/agrolink"

echo -e "${GREEN}"
echo "============================================="
echo "   AgroLink - Instalação Automática"
echo "============================================="
echo -e "${NC}"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Por favor, execute como root (sudo ./install.sh)${NC}"
    exit 1
fi

# Detectar sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
fi

echo -e "${YELLOW}Sistema detectado: $OS $VER${NC}"

# =============================================
# 1. Atualizar sistema
# =============================================
echo -e "\n${GREEN}[1/8] Atualizando sistema...${NC}"
apt update && apt upgrade -y

# =============================================
# 2. Instalar dependências básicas
# =============================================
echo -e "\n${GREEN}[2/8] Instalando dependências básicas...${NC}"
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates git

# =============================================
# 3. Instalar Python 3.10+
# =============================================
echo -e "\n${GREEN}[3/8] Instalando Python...${NC}"
apt install -y python3 python3-pip python3-venv

# =============================================
# 4. Instalar Node.js 20 LTS
# =============================================
echo -e "\n${GREEN}[4/8] Instalando Node.js 20 LTS...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Instalar Yarn
npm install -g yarn

# =============================================
# 5. Instalar MongoDB 7.0
# =============================================
echo -e "\n${GREEN}[5/8] Instalando MongoDB 7.0...${NC}"
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt update
    apt install -y mongodb-org
fi

# Iniciar MongoDB
systemctl start mongod
systemctl enable mongod

# =============================================
# 6. Instalar Nginx
# =============================================
echo -e "\n${GREEN}[6/8] Instalando Nginx...${NC}"
apt install -y nginx

# =============================================
# 7. Configurar Backend
# =============================================
echo -e "\n${GREEN}[7/8] Configurando Backend...${NC}"

# Verificar se estamos no diretório correto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Se não estiver em /opt/agrolink, copiar para lá
if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    echo "Copiando arquivos para $INSTALL_DIR..."
    mkdir -p $INSTALL_DIR
    cp -r "$SCRIPT_DIR"/* $INSTALL_DIR/
fi

cd $INSTALL_DIR/backend

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências Python
pip install --upgrade pip
pip install -r requirements.txt

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    cp .env.example .env
    # Gerar JWT_SECRET_KEY
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/sua-chave-secreta-aqui/$JWT_SECRET/" .env
    echo -e "${YELLOW}Arquivo .env criado. Configure as variáveis de ambiente.${NC}"
fi

# Criar diretório de uploads
mkdir -p uploads
chown -R www-data:www-data uploads

deactivate

# =============================================
# 8. Configurar Frontend
# =============================================
echo -e "\n${GREEN}[8/8] Configurando Frontend...${NC}"
cd $INSTALL_DIR/frontend

# Instalar dependências Node
yarn install

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Arquivo .env do frontend criado. Configure REACT_APP_BACKEND_URL.${NC}"
fi

# Build do frontend (será feito após configuração manual do .env)
# yarn build

# =============================================
# 9. Criar serviço systemd
# =============================================
echo -e "\n${GREEN}[Bônus] Criando serviço systemd...${NC}"

cat > /etc/systemd/system/agrolink-backend.service << EOF
[Unit]
Description=AgroLink Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd
systemctl daemon-reload

# =============================================
# Finalização
# =============================================
echo -e "\n${GREEN}"
echo "============================================="
echo "   Instalação concluída!"
echo "============================================="
echo -e "${NC}"

echo -e "${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1. Configure o backend:"
echo "   nano $INSTALL_DIR/backend/.env"
echo ""
echo "2. Configure o frontend com seu domínio:"
echo "   nano $INSTALL_DIR/frontend/.env"
echo "   (Defina REACT_APP_BACKEND_URL=https://seudominio.com.br)"
echo ""
echo "3. Faça o build do frontend:"
echo "   cd $INSTALL_DIR/frontend && yarn build"
echo ""
echo "4. Configure o Nginx (veja README.md)"
echo ""
echo "5. Configure SSL com Certbot:"
echo "   sudo certbot --nginx -d seudominio.com.br"
echo ""
echo "6. Inicie o backend:"
echo "   sudo systemctl start agrolink-backend"
echo "   sudo systemctl enable agrolink-backend"
echo ""
echo -e "${GREEN}Credenciais padrão:${NC}"
echo "   Login: admin"
echo "   Senha: #Sti93qn06301616"
echo ""
echo -e "${RED}IMPORTANTE: Altere a senha após o primeiro login!${NC}"
