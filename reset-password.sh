#!/bin/bash

# =============================================
# AgroLink - Resetar Senha do Admin
# =============================================
# Execute com: sudo ./reset-password.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/opt/agrolink"

echo -e "${GREEN}"
echo "============================================="
echo "   AgroLink - Resetar Senha Admin"
echo "============================================="
echo -e "${NC}"

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Execute como root: sudo ./reset-password.sh${NC}"
    exit 1
fi

# Verificar se MongoDB está rodando
if ! systemctl is-active --quiet mongod; then
    echo -e "${RED}MongoDB não está rodando. Iniciando...${NC}"
    systemctl start mongod
    sleep 2
fi

# Senha padrão
DEFAULT_PASSWORD='#Sti93qn06301616'

echo -e "${YELLOW}Escolha uma opção:${NC}"
echo "1) Resetar para senha padrão: ${DEFAULT_PASSWORD}"
echo "2) Definir nova senha"
echo ""
read -p "Opção (1 ou 2): " option

if [ "$option" == "2" ]; then
    read -sp "Digite a nova senha: " NEW_PASSWORD
    echo ""
    read -sp "Confirme a nova senha: " CONFIRM_PASSWORD
    echo ""
    
    if [ "$NEW_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
        echo -e "${RED}Senhas não conferem!${NC}"
        exit 1
    fi
else
    NEW_PASSWORD="$DEFAULT_PASSWORD"
fi

# Gerar hash da senha usando Python
echo -e "\n${BLUE}Gerando hash da senha...${NC}"

cd $INSTALL_DIR/backend
source venv/bin/activate

HASHED_PASSWORD=$(python3 << EOF
import bcrypt
password = "${NEW_PASSWORD}"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print(hashed.decode('utf-8'))
EOF
)

deactivate

echo -e "${BLUE}Atualizando no MongoDB...${NC}"

# Atualizar senha no MongoDB
mongosh agrolink --quiet --eval "
    // Verificar se usuário admin existe
    var user = db.users.findOne({login: 'admin'});
    
    if (user) {
        // Atualizar senha
        db.users.updateOne(
            {login: 'admin'},
            {\$set: {senha: '${HASHED_PASSWORD}'}}
        );
        print('Senha do admin atualizada com sucesso!');
    } else {
        // Criar usuário admin
        db.users.insertOne({
            id: UUID().toString().replace(/-/g, ''),
            nome: 'Administrador Master',
            login: 'admin',
            senha: '${HASHED_PASSWORD}',
            role: 'master',
            ativo: true,
            created_at: new Date().toISOString()
        });
        print('Usuário admin criado com sucesso!');
    }
"

# Reiniciar backend para limpar cache
echo -e "${BLUE}Reiniciando backend...${NC}"
systemctl restart agrolink-backend

echo -e "\n${GREEN}"
echo "============================================="
echo "   SENHA ATUALIZADA COM SUCESSO!"
echo "============================================="
echo -e "${NC}"

echo -e "${YELLOW}Credenciais:${NC}"
echo "   Login: admin"
if [ "$option" == "1" ]; then
    echo "   Senha: ${DEFAULT_PASSWORD}"
else
    echo "   Senha: (a que você definiu)"
fi
echo ""
echo -e "${BLUE}Teste agora o login no sistema.${NC}"
