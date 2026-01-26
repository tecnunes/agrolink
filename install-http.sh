#!/bin/bash

# =============================================
# AgroLink - Instalação Completa (HTTP - Teste)
# =============================================
# Servidor: http://76.13.167.251
# Execute com: sudo ./install-http.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
INSTALL_DIR="/opt/agrolink"
SERVER_IP="76.13.167.251"
BACKEND_URL="http://${SERVER_IP}"

echo -e "${GREEN}"
echo "============================================="
echo "   AgroLink - Instalação HTTP (Teste)"
echo "   Servidor: ${BACKEND_URL}"
echo "============================================="
echo -e "${NC}"

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Execute como root: sudo ./install-http.sh${NC}"
    exit 1
fi

# =============================================
# 1. ATUALIZAR SISTEMA
# =============================================
echo -e "\n${BLUE}[1/10] Atualizando sistema...${NC}"
apt update && apt upgrade -y

# =============================================
# 2. INSTALAR DEPENDÊNCIAS
# =============================================
echo -e "\n${BLUE}[2/10] Instalando dependências...${NC}"
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates git

# =============================================
# 3. INSTALAR PYTHON
# =============================================
echo -e "\n${BLUE}[3/10] Instalando Python 3...${NC}"
apt install -y python3 python3-pip python3-venv

# =============================================
# 4. INSTALAR NODE.JS 20
# =============================================
echo -e "\n${BLUE}[4/10] Instalando Node.js 20 LTS...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
npm install -g yarn

# =============================================
# 5. INSTALAR MONGODB
# =============================================
echo -e "\n${BLUE}[5/10] Instalando MongoDB 7.0...${NC}"
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt update
    apt install -y mongodb-org
fi
systemctl start mongod
systemctl enable mongod

# =============================================
# 6. INSTALAR NGINX
# =============================================
echo -e "\n${BLUE}[6/10] Instalando Nginx...${NC}"
apt install -y nginx

# =============================================
# 7. CONFIGURAR BACKEND
# =============================================
echo -e "\n${BLUE}[7/10] Configurando Backend...${NC}"

# Copiar arquivos se necessário
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    mkdir -p $INSTALL_DIR
    cp -r "$SCRIPT_DIR"/* $INSTALL_DIR/ 2>/dev/null || true
fi

cd $INSTALL_DIR/backend

# Ambiente virtual
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Configurar .env
JWT_SECRET=$(openssl rand -hex 32)
cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="agrolink"
CORS_ORIGINS="*"
JWT_SECRET_KEY="${JWT_SECRET}"
EOF

# Criar diretório de uploads
mkdir -p uploads
chown -R www-data:www-data uploads

deactivate

# =============================================
# 8. CONFIGURAR FRONTEND
# =============================================
echo -e "\n${BLUE}[8/10] Configurando Frontend...${NC}"
cd $INSTALL_DIR/frontend

# Configurar .env
cat > .env << EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
EOF

# Instalar dependências e build
yarn install
yarn build

# Permissões
chown -R www-data:www-data build

# =============================================
# 9. CONFIGURAR NGINX
# =============================================
echo -e "\n${BLUE}[9/10] Configurando Nginx...${NC}"

cat > /etc/nginx/sites-available/agrolink << EOF
server {
    listen 80;
    server_name ${SERVER_IP} _;

    access_log /var/log/nginx/agrolink_access.log;
    error_log /var/log/nginx/agrolink_error.log;

    # Frontend
    location / {
        root ${INSTALL_DIR}/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }

    # Uploads
    location /uploads/ {
        alias ${INSTALL_DIR}/backend/uploads/;
        expires 30d;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/agrolink /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# =============================================
# 10. CRIAR SERVIÇO SYSTEMD
# =============================================
echo -e "\n${BLUE}[10/10] Criando serviço do Backend...${NC}"

cat > /etc/systemd/system/agrolink-backend.service << EOF
[Unit]
Description=AgroLink Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${INSTALL_DIR}/backend
Environment="PATH=${INSTALL_DIR}/backend/venv/bin"
ExecStart=${INSTALL_DIR}/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable agrolink-backend
systemctl start agrolink-backend

# =============================================
# FINALIZAÇÃO
# =============================================
echo -e "\n${GREEN}"
echo "============================================="
echo "   INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "============================================="
echo -e "${NC}"

echo -e "${YELLOW}Acesse:${NC} ${BACKEND_URL}"
echo ""
echo -e "${YELLOW}Credenciais padrão:${NC}"
echo "   Login: admin"
echo "   Senha: #Sti93qn06301616"
echo ""
echo -e "${RED}IMPORTANTE: Altere a senha após o primeiro login!${NC}"
echo ""
echo -e "${BLUE}Comandos úteis:${NC}"
echo "   Ver status:  sudo systemctl status agrolink-backend"
echo "   Ver logs:    sudo journalctl -u agrolink-backend -f"
echo "   Reiniciar:   sudo systemctl restart agrolink-backend"
echo ""
echo -e "${GREEN}Para migrar para HTTPS (produção):${NC}"
echo "   sudo ./migrate-to-https.sh"
