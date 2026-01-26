#!/bin/bash

# =============================================
# AgroLink - Migrar de HTTP para HTTPS
# =============================================
# Migra instalação existente de HTTP para HTTPS
# De: http://76.13.167.251
# Para: https://crem.agrolink.com.br
#
# Execute com: sudo ./migrate-to-https.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
INSTALL_DIR="/opt/agrolink"
DOMAIN="crem.agrolink.com.br"
BACKEND_URL="https://${DOMAIN}"

echo -e "${GREEN}"
echo "============================================="
echo "   AgroLink - Migração HTTP → HTTPS"
echo "============================================="
echo -e "${NC}"
echo "De:   http://76.13.167.251"
echo "Para: ${BACKEND_URL}"
echo ""

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Execute como root: sudo ./migrate-to-https.sh${NC}"
    exit 1
fi

# Verificar se instalação existe
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}Instalação não encontrada em ${INSTALL_DIR}${NC}"
    echo "Execute primeiro: sudo ./install-http.sh"
    exit 1
fi

# Verificar DNS
echo -e "${YELLOW}Verificando DNS do domínio...${NC}"
DOMAIN_IP=$(dig +short ${DOMAIN} | head -1)
SERVER_IP=$(curl -s ifconfig.me)

echo "IP do domínio ${DOMAIN}: $DOMAIN_IP"
echo "IP deste servidor: $SERVER_IP"

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${RED}"
    echo "ERRO: O domínio não aponta para este servidor!"
    echo "Configure o DNS antes de continuar."
    echo -e "${NC}"
    exit 1
fi

echo -e "${GREEN}DNS OK!${NC}"
echo ""

# Confirmação
read -p "Deseja continuar com a migração? (s/N): " confirm
if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Migração cancelada."
    exit 0
fi

# =============================================
# 1. INSTALAR CERTBOT
# =============================================
echo -e "\n${BLUE}[1/5] Instalando Certbot...${NC}"
apt install -y certbot python3-certbot-nginx dnsutils

# =============================================
# 2. ATUALIZAR BACKEND .env
# =============================================
echo -e "\n${BLUE}[2/5] Atualizando configuração do Backend...${NC}"

# Backup
cp ${INSTALL_DIR}/backend/.env ${INSTALL_DIR}/backend/.env.backup.http

# Atualizar CORS
sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=\"https://${DOMAIN}\"|" ${INSTALL_DIR}/backend/.env

echo "Backend .env atualizado"

# =============================================
# 3. ATUALIZAR FRONTEND .env E REBUILD
# =============================================
echo -e "\n${BLUE}[3/5] Atualizando Frontend e fazendo rebuild...${NC}"

# Backup
cp ${INSTALL_DIR}/frontend/.env ${INSTALL_DIR}/frontend/.env.backup.http

# Atualizar URL
cat > ${INSTALL_DIR}/frontend/.env << EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
EOF

# Rebuild
cd ${INSTALL_DIR}/frontend
yarn build
chown -R www-data:www-data build

echo "Frontend rebuild concluído"

# =============================================
# 4. ATUALIZAR NGINX (HTTP temporário)
# =============================================
echo -e "\n${BLUE}[4/5] Atualizando Nginx para novo domínio...${NC}"

# Backup
cp /etc/nginx/sites-available/agrolink /etc/nginx/sites-available/agrolink.backup.http

cat > /etc/nginx/sites-available/agrolink << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    access_log /var/log/nginx/agrolink_access.log;
    error_log /var/log/nginx/agrolink_error.log;

    location / {
        root ${INSTALL_DIR}/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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
# 5. GERAR CERTIFICADO SSL
# =============================================
echo -e "\n${BLUE}[5/5] Gerando certificado SSL...${NC}"

certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect

# =============================================
# 6. REINICIAR SERVIÇOS
# =============================================
echo -e "\n${BLUE}Reiniciando serviços...${NC}"
systemctl restart agrolink-backend
systemctl restart nginx

# Ativar renovação automática
systemctl enable certbot.timer

# =============================================
# FINALIZAÇÃO
# =============================================
echo -e "\n${GREEN}"
echo "============================================="
echo "   MIGRAÇÃO CONCLUÍDA COM SUCESSO!"
echo "============================================="
echo -e "${NC}"

echo -e "${YELLOW}Novo endereço:${NC} ${BACKEND_URL}"
echo ""
echo -e "${BLUE}Backups criados:${NC}"
echo "   ${INSTALL_DIR}/backend/.env.backup.http"
echo "   ${INSTALL_DIR}/frontend/.env.backup.http"
echo "   /etc/nginx/sites-available/agrolink.backup.http"
echo ""
echo -e "${GREEN}Para reverter para HTTP:${NC}"
echo "   sudo ./revert-to-http.sh"
echo ""
echo -e "${BLUE}Comandos úteis:${NC}"
echo "   Ver status:     sudo systemctl status agrolink-backend"
echo "   Renovar SSL:    sudo certbot renew"
echo "   Ver cert:       sudo certbot certificates"
