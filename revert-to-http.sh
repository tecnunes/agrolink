#!/bin/bash

# =============================================
# AgroLink - Reverter de HTTPS para HTTP
# =============================================
# Reverte a migração caso necessário
# Execute com: sudo ./revert-to-http.sh

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

echo -e "${YELLOW}"
echo "============================================="
echo "   AgroLink - Reverter para HTTP"
echo "============================================="
echo -e "${NC}"

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Execute como root: sudo ./revert-to-http.sh${NC}"
    exit 1
fi

read -p "Tem certeza que deseja reverter para HTTP? (s/N): " confirm
if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Operação cancelada."
    exit 0
fi

# =============================================
# 1. RESTAURAR BACKEND .env
# =============================================
echo -e "\n${BLUE}[1/4] Restaurando Backend...${NC}"

if [ -f "${INSTALL_DIR}/backend/.env.backup.http" ]; then
    cp ${INSTALL_DIR}/backend/.env.backup.http ${INSTALL_DIR}/backend/.env
    echo "Restaurado do backup"
else
    cat > ${INSTALL_DIR}/backend/.env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="agrolink"
CORS_ORIGINS="*"
JWT_SECRET_KEY="$(grep JWT_SECRET_KEY ${INSTALL_DIR}/backend/.env | cut -d'=' -f2 | tr -d '"')"
EOF
    echo "Recriado manualmente"
fi

# =============================================
# 2. RESTAURAR FRONTEND
# =============================================
echo -e "\n${BLUE}[2/4] Restaurando Frontend...${NC}"

cat > ${INSTALL_DIR}/frontend/.env << EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
EOF

cd ${INSTALL_DIR}/frontend
yarn build
chown -R www-data:www-data build

# =============================================
# 3. RESTAURAR NGINX
# =============================================
echo -e "\n${BLUE}[3/4] Restaurando Nginx...${NC}"

cat > /etc/nginx/sites-available/agrolink << EOF
server {
    listen 80;
    server_name ${SERVER_IP} _;

    access_log /var/log/nginx/agrolink_access.log;
    error_log /var/log/nginx/agrolink_error.log;

    location / {
        root ${INSTALL_DIR}/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

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

    location /uploads/ {
        alias ${INSTALL_DIR}/backend/uploads/;
        expires 30d;
    }
}
EOF

nginx -t
systemctl reload nginx

# =============================================
# 4. REINICIAR SERVIÇOS
# =============================================
echo -e "\n${BLUE}[4/4] Reiniciando serviços...${NC}"
systemctl restart agrolink-backend
systemctl restart nginx

# =============================================
# FINALIZAÇÃO
# =============================================
echo -e "\n${GREEN}"
echo "============================================="
echo "   REVERSÃO CONCLUÍDA!"
echo "============================================="
echo -e "${NC}"

echo -e "${YELLOW}Endereço:${NC} ${BACKEND_URL}"
echo ""
echo -e "${BLUE}Nota:${NC} Os certificados SSL ainda existem."
echo "Para removê-los: sudo certbot delete"
