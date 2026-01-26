#!/bin/bash

# =============================================
# AgroLink - Diagnóstico do Sistema
# =============================================
# Execute com: sudo ./diagnostico.sh

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/opt/agrolink"

echo -e "${BLUE}"
echo "============================================="
echo "   AgroLink - Diagnóstico do Sistema"
echo "============================================="
echo -e "${NC}"

# =============================================
# 1. VERIFICAR SERVIÇOS
# =============================================
echo -e "\n${YELLOW}[1] STATUS DOS SERVIÇOS${NC}"
echo "----------------------------------------"

echo -n "MongoDB:   "
if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}✓ Rodando${NC}"
else
    echo -e "${RED}✗ Parado${NC}"
    echo -e "${YELLOW}   Iniciando MongoDB...${NC}"
    sudo systemctl start mongod
fi

echo -n "Backend:   "
if systemctl is-active --quiet agrolink-backend; then
    echo -e "${GREEN}✓ Rodando${NC}"
else
    echo -e "${RED}✗ Parado${NC}"
fi

echo -n "Nginx:     "
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Rodando${NC}"
else
    echo -e "${RED}✗ Parado${NC}"
fi

# =============================================
# 2. TESTAR CONEXÕES
# =============================================
echo -e "\n${YELLOW}[2] TESTE DE CONEXÕES${NC}"
echo "----------------------------------------"

echo -n "MongoDB (porta 27017): "
if nc -z localhost 27017 2>/dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Sem conexão${NC}"
fi

echo -n "Backend (porta 8001):  "
if nc -z localhost 8001 2>/dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Sem conexão${NC}"
fi

echo -n "Nginx (porta 80):      "
if nc -z localhost 80 2>/dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Sem conexão${NC}"
fi

# =============================================
# 3. TESTAR API
# =============================================
echo -e "\n${YELLOW}[3] TESTE DA API${NC}"
echo "----------------------------------------"

echo -n "Health Check: "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/health 2>/dev/null)
if [ "$HEALTH" == "200" ]; then
    echo -e "${GREEN}✓ OK (200)${NC}"
else
    echo -e "${RED}✗ Erro ($HEALTH)${NC}"
fi

# =============================================
# 4. VERIFICAR LOGS DE ERRO
# =============================================
echo -e "\n${YELLOW}[4] ÚLTIMOS ERROS DO BACKEND${NC}"
echo "----------------------------------------"
echo -e "${RED}"
journalctl -u agrolink-backend -n 20 --no-pager 2>/dev/null | tail -15
echo -e "${NC}"

# =============================================
# 5. VERIFICAR ARQUIVOS
# =============================================
echo -e "\n${YELLOW}[5] VERIFICAR ARQUIVOS${NC}"
echo "----------------------------------------"

echo -n "Backend .env:    "
if [ -f "$INSTALL_DIR/backend/.env" ]; then
    echo -e "${GREEN}✓ Existe${NC}"
else
    echo -e "${RED}✗ Não existe${NC}"
fi

echo -n "Frontend .env:   "
if [ -f "$INSTALL_DIR/frontend/.env" ]; then
    echo -e "${GREEN}✓ Existe${NC}"
else
    echo -e "${RED}✗ Não existe${NC}"
fi

echo -n "Frontend build:  "
if [ -d "$INSTALL_DIR/frontend/build" ]; then
    echo -e "${GREEN}✓ Existe${NC}"
else
    echo -e "${RED}✗ Não existe${NC}"
fi

echo -n "Python venv:     "
if [ -d "$INSTALL_DIR/backend/venv" ]; then
    echo -e "${GREEN}✓ Existe${NC}"
else
    echo -e "${RED}✗ Não existe${NC}"
fi

# =============================================
# 6. VERIFICAR PERMISSÕES
# =============================================
echo -e "\n${YELLOW}[6] VERIFICAR PERMISSÕES${NC}"
echo "----------------------------------------"

echo -n "Uploads dir:     "
if [ -w "$INSTALL_DIR/backend/uploads" ]; then
    echo -e "${GREEN}✓ Gravável${NC}"
else
    echo -e "${RED}✗ Sem permissão${NC}"
fi

# =============================================
# 7. SUGESTÕES
# =============================================
echo -e "\n${YELLOW}[7] COMANDOS PARA CORRIGIR${NC}"
echo "----------------------------------------"

if ! systemctl is-active --quiet agrolink-backend; then
    echo -e "${BLUE}Backend parado. Execute:${NC}"
    echo "   sudo systemctl start agrolink-backend"
    echo "   sudo journalctl -u agrolink-backend -f"
    echo ""
fi

echo -e "${BLUE}Para reiniciar tudo:${NC}"
echo "   sudo systemctl restart mongod"
echo "   sudo systemctl restart agrolink-backend"
echo "   sudo systemctl restart nginx"
echo ""

echo -e "${BLUE}Para ver logs em tempo real:${NC}"
echo "   sudo journalctl -u agrolink-backend -f"
echo ""

echo -e "${BLUE}Para testar manualmente o backend:${NC}"
echo "   cd $INSTALL_DIR/backend"
echo "   source venv/bin/activate"
echo "   python -c 'from server import app; print(\"OK\")'"
echo ""
