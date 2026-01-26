# AgroLink - CRM de Crédito Rural

Sistema de gerenciamento de propostas e projetos de crédito rural desenvolvido com React, FastAPI e MongoDB.

![AgroLink](https://img.shields.io/badge/AgroLink-CRM-green)
![React](https://img.shields.io/badge/React-19.0-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)

---

## 📋 Índice

- [Requisitos](#requisitos)
- [Instalação Rápida](#instalação-rápida)
- [Instalação Detalhada](#instalação-detalhada)
- [Configuração HTTP (sem SSL)](#configuração-http-sem-ssl)
- [Configuração HTTPS (com SSL)](#configuração-https-com-ssl)
- [Systemd Services](#systemd-services)
- [Credenciais Padrão](#credenciais-padrão)
- [Comandos Úteis](#comandos-úteis)

---

## Requisitos

- **Sistema Operacional**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **Python**: 3.10+
- **Node.js**: 18+ (recomendado 20 LTS)
- **MongoDB**: 6.0+ ou 7.0+
- **Nginx**: 1.18+
- **RAM mínima**: 2GB
- **Disco**: 20GB+

---

## Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/tecnunes/agrolink.git
cd agrolink

# 2. Execute o script de instalação
chmod +x install.sh
sudo ./install.sh

# 3. Configure os arquivos .env (veja seção abaixo)

# 4. Escolha HTTP ou HTTPS (veja seções específicas)
```

---

## Instalação Detalhada

### 1. Atualizar o Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Dependências do Sistema

```bash
# Instalar Python e pip
sudo apt install -y python3 python3-pip python3-venv

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Yarn
sudo npm install -g yarn

# Instalar MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Instalar Nginx
sudo apt install -y nginx
```

### 3. Clonar o Repositório

```bash
cd /opt
sudo git clone https://github.com/tecnunes/agrolink.git
sudo chown -R $USER:$USER /opt/agrolink
cd /opt/agrolink
```

### 4. Configurar o Backend

```bash
cd /opt/agrolink/backend

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install --upgrade pip
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
nano .env
```

**Edite o arquivo `/opt/agrolink/backend/.env`:**

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="agrolink"
CORS_ORIGINS="*"
JWT_SECRET_KEY="gere-uma-chave-segura-com-openssl-rand-hex-32"
```

> 💡 **Gerar JWT_SECRET_KEY**: `openssl rand -hex 32`

### 5. Configurar o Frontend

```bash
cd /opt/agrolink/frontend

# Instalar dependências
yarn install

# Configurar variáveis de ambiente
cp .env.example .env
nano .env
```

---

## Configuração HTTP (sem SSL)

Use esta configuração para:
- Testes locais
- Redes internas
- Quando não precisa de HTTPS

### 1. Configurar Frontend (.env)

```env
# Para HTTP com domínio
REACT_APP_BACKEND_URL=http://seudominio.com.br

# Para HTTP com IP
REACT_APP_BACKEND_URL=http://192.168.1.100

# Para localhost
REACT_APP_BACKEND_URL=http://localhost
```

### 2. Build do Frontend

```bash
cd /opt/agrolink/frontend
yarn build
```

### 3. Configurar Nginx (HTTP)

```bash
# Copiar configuração HTTP
sudo cp /opt/agrolink/nginx/agrolink-http.conf /etc/nginx/sites-available/agrolink

# Editar o arquivo e substituir 'seudominio.com.br' pelo seu domínio ou IP
sudo nano /etc/nginx/sites-available/agrolink
```

**Para usar com IP (sem domínio)**, edite a linha `server_name`:
```nginx
server_name _;  # Aceita qualquer host
```

**Para usar com domínio**:
```nginx
server_name seudominio.com.br www.seudominio.com.br;
```

### 4. Ativar Configuração

```bash
# Criar link simbólico
sudo ln -sf /etc/nginx/sites-available/agrolink /etc/nginx/sites-enabled/

# Remover site default
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 5. Iniciar Backend

```bash
sudo systemctl start agrolink-backend
sudo systemctl enable agrolink-backend
```

### 6. Acessar

```
http://seudominio.com.br
# ou
http://192.168.1.100
```

---

## Configuração HTTPS (com SSL)

Use esta configuração para:
- Produção
- Acesso público pela internet
- Maior segurança

### 1. Configurar Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://seudominio.com.br
```

### 2. Build do Frontend

```bash
cd /opt/agrolink/frontend
yarn build
```

### 3. Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 4. Configurar Nginx Temporário (para Certbot)

Primeiro, configure apenas HTTP para o Certbot gerar o certificado:

```bash
sudo cp /opt/agrolink/nginx/agrolink-http.conf /etc/nginx/sites-available/agrolink
sudo nano /etc/nginx/sites-available/agrolink
# Substitua 'seudominio.com.br' pelo seu domínio real

sudo ln -sf /etc/nginx/sites-available/agrolink /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Gerar Certificado SSL

```bash
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

Siga as instruções do Certbot. Ele irá:
1. Gerar o certificado SSL
2. Modificar automaticamente a configuração do Nginx

### 6. (Alternativa) Configurar HTTPS Manualmente

Se preferir configurar manualmente ou já tiver certificados:

```bash
# Copiar configuração HTTPS
sudo cp /opt/agrolink/nginx/agrolink-https.conf /etc/nginx/sites-available/agrolink

# Editar o arquivo
sudo nano /etc/nginx/sites-available/agrolink
```

Substitua:
- `seudominio.com.br` pelo seu domínio
- Caminhos dos certificados se diferentes

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Renovação Automática do SSL

O Certbot configura automaticamente a renovação. Para testar:

```bash
sudo certbot renew --dry-run
```

---

## Systemd Services

### Criar Serviço do Backend

```bash
sudo nano /etc/systemd/system/agrolink-backend.service
```

**Conteúdo:**

```ini
[Unit]
Description=AgroLink Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/agrolink/backend
Environment="PATH=/opt/agrolink/backend/venv/bin"
ExecStart=/opt/agrolink/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Ajustar Permissões

```bash
sudo chown -R www-data:www-data /opt/agrolink/backend/uploads
sudo chown -R www-data:www-data /opt/agrolink/frontend/build
```

### Habilitar e Iniciar

```bash
sudo systemctl daemon-reload
sudo systemctl enable agrolink-backend
sudo systemctl enable mongod
sudo systemctl enable nginx

sudo systemctl start mongod
sudo systemctl start agrolink-backend
sudo systemctl start nginx
```

---

## Credenciais Padrão

| Campo    | Valor              |
|----------|-------------------|
| **Login**    | `admin`           |
| **Senha**    | `#Sti93qn06301616` |
| **Nível**    | Master            |

⚠️ **IMPORTANTE**: Altere a senha após o primeiro login!

---

## Estrutura do Projeto

```
agrolink/
├── backend/
│   ├── server.py           # API FastAPI
│   ├── requirements.txt    # Dependências Python
│   ├── uploads/            # Arquivos enviados
│   └── .env.example        # Exemplo de config
├── frontend/
│   ├── src/                # Código fonte React
│   ├── build/              # Build de produção
│   ├── package.json        # Dependências Node
│   └── .env.example        # Exemplo de config
├── nginx/
│   ├── agrolink-http.conf  # Config Nginx HTTP
│   └── agrolink-https.conf # Config Nginx HTTPS
├── install.sh              # Script de instalação
└── README.md               # Esta documentação
```

---

## Comandos Úteis

### Status dos Serviços

```bash
sudo systemctl status agrolink-backend
sudo systemctl status nginx
sudo systemctl status mongod
```

### Logs

```bash
# Backend
sudo journalctl -u agrolink-backend -f

# Nginx
sudo tail -f /var/log/nginx/agrolink_error.log

# MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### Reiniciar Serviços

```bash
sudo systemctl restart agrolink-backend
sudo systemctl restart nginx
```

### Atualizar Aplicação

```bash
cd /opt/agrolink
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart agrolink-backend

# Frontend
cd ../frontend
yarn install
yarn build
```

### Backup MongoDB

```bash
# Criar backup
mongodump --db agrolink --out /backup/$(date +%Y%m%d)

# Restaurar
mongorestore --db agrolink /backup/20250122/agrolink
```

### Testar API

```bash
# Health check
curl http://localhost:8001/api/health

# Com domínio HTTP
curl http://seudominio.com.br/api/health

# Com domínio HTTPS
curl https://seudominio.com.br/api/health
```

---

## Firewall (UFW)

### HTTP Only

```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw enable
```

### HTTP + HTTPS

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Troubleshooting

### Backend não inicia

```bash
# Verificar logs
sudo journalctl -u agrolink-backend -n 50

# Verificar MongoDB
sudo systemctl status mongod

# Testar manualmente
cd /opt/agrolink/backend
source venv/bin/activate
python -c "from server import app; print('OK')"
```

### Erro 502 Bad Gateway

```bash
# Backend está rodando?
curl http://localhost:8001/api/health

# Verificar Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Permissões

```bash
sudo chown -R www-data:www-data /opt/agrolink/backend/uploads
sudo chmod -R 755 /opt/agrolink/frontend/build
```

---

## Suporte

Para dúvidas ou problemas:
https://github.com/tecnunes/agrolink/issues

---

## Licença

Este projeto é proprietário. Todos os direitos reservados.
