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
- [Configuração do Nginx](#configuração-do-nginx)
- [SSL/HTTPS com Certbot](#sslhttps-com-certbot)
- [Systemd Services](#systemd-services)
- [Credenciais Padrão](#credenciais-padrão)
- [Estrutura do Projeto](#estrutura-do-projeto)
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

# 3. Configure os arquivos .env
nano backend/.env
nano frontend/.env

# 4. Inicie os serviços
sudo systemctl start agrolink-backend
sudo systemctl start agrolink-frontend
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
CORS_ORIGINS="https://seudominio.com.br"
JWT_SECRET_KEY="gere-uma-chave-segura-com-openssl-rand-hex-32"
```

### 5. Configurar o Frontend

```bash
cd /opt/agrolink/frontend

# Instalar dependências
yarn install

# Configurar variáveis de ambiente
cp .env.example .env
nano .env
```

**Edite o arquivo `/opt/agrolink/frontend/.env`:**

```env
REACT_APP_BACKEND_URL=https://seudominio.com.br
```

### 6. Build do Frontend

```bash
cd /opt/agrolink/frontend
yarn build
```

O build será gerado em `/opt/agrolink/frontend/build/`

---

## Configuração do Nginx

### Criar arquivo de configuração

```bash
sudo nano /etc/nginx/sites-available/agrolink
```

**Conteúdo do arquivo:**

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com.br www.seudominio.com.br;

    # Certificados SSL (serão criados pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;
    
    # Configurações SSL recomendadas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Logs
    access_log /var/log/nginx/agrolink_access.log;
    error_log /var/log/nginx/agrolink_error.log;

    # Frontend (arquivos estáticos)
    location / {
        root /opt/agrolink/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Para uploads grandes
        client_max_body_size 50M;
    }

    # Uploads de arquivos
    location /uploads/ {
        alias /opt/agrolink/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

### Ativar a configuração

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/agrolink /etc/nginx/sites-enabled/

# Remover site default (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## SSL/HTTPS com Certbot

### Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obter Certificado SSL

```bash
# Antes de executar, comente as linhas ssl_certificate no nginx
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

### Renovação Automática

```bash
# Testar renovação
sudo certbot renew --dry-run

# O Certbot configura automaticamente um cron job para renovação
```

---

## Systemd Services

### Backend Service

Criar arquivo `/etc/systemd/system/agrolink-backend.service`:

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

### Ajustar permissões

```bash
# Criar diretório de uploads se não existir
sudo mkdir -p /opt/agrolink/backend/uploads
sudo chown -R www-data:www-data /opt/agrolink/backend/uploads
sudo chown -R www-data:www-data /opt/agrolink/frontend/build
```

### Habilitar e iniciar serviços

```bash
# Recarregar systemd
sudo systemctl daemon-reload

# Habilitar serviços para iniciar no boot
sudo systemctl enable agrolink-backend
sudo systemctl enable mongod
sudo systemctl enable nginx

# Iniciar serviços
sudo systemctl start mongod
sudo systemctl start agrolink-backend
sudo systemctl start nginx

# Verificar status
sudo systemctl status agrolink-backend
```

---

## Credenciais Padrão

Após a primeira execução, o sistema cria automaticamente um usuário administrador:

| Campo    | Valor              |
|----------|-------------------|
| **Login**    | `admin`           |
| **Senha**    | `#Sti93qn06301616` |
| **Nível**    | Master            |

⚠️ **IMPORTANTE**: Altere a senha padrão após o primeiro login!

---

## Estrutura do Projeto

```
agrolink/
├── backend/
│   ├── server.py           # API FastAPI principal
│   ├── requirements.txt    # Dependências Python
│   ├── uploads/           # Arquivos enviados
│   ├── .env.example       # Exemplo de configuração
│   └── tests/             # Testes automatizados
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas da aplicação
│   │   └── lib/           # Utilitários e API
│   ├── public/            # Arquivos públicos
│   ├── build/             # Build de produção
│   ├── package.json       # Dependências Node
│   └── .env.example       # Exemplo de configuração
├── install.sh             # Script de instalação
└── README.md              # Esta documentação
```

---

## Comandos Úteis

### Logs

```bash
# Logs do Backend
sudo journalctl -u agrolink-backend -f

# Logs do Nginx
sudo tail -f /var/log/nginx/agrolink_error.log
sudo tail -f /var/log/nginx/agrolink_access.log

# Logs do MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### Reiniciar Serviços

```bash
# Reiniciar backend (após alterações no código)
sudo systemctl restart agrolink-backend

# Reiniciar Nginx (após alterações na configuração)
sudo systemctl restart nginx

# Reiniciar MongoDB
sudo systemctl restart mongod
```

### Atualizar Aplicação

```bash
cd /opt/agrolink

# Baixar atualizações
git pull origin main

# Backend - reinstalar dependências se necessário
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart agrolink-backend

# Frontend - rebuild
cd ../frontend
yarn install
yarn build
```

### Backup do MongoDB

```bash
# Criar backup
mongodump --db agrolink --out /backup/mongodb/$(date +%Y%m%d)

# Restaurar backup
mongorestore --db agrolink /backup/mongodb/20250122/agrolink
```

---

## Firewall (UFW)

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH, HTTP e HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Verificar status
sudo ufw status
```

---

## Troubleshooting

### Backend não inicia

```bash
# Verificar logs
sudo journalctl -u agrolink-backend -n 50

# Verificar se MongoDB está rodando
sudo systemctl status mongod

# Testar conexão MongoDB
mongosh --eval "db.adminCommand('ping')"
```

### Erro 502 Bad Gateway

```bash
# Verificar se backend está rodando
curl http://localhost:8001/api/health

# Verificar configuração do Nginx
sudo nginx -t
```

### Problemas de Permissão

```bash
# Corrigir permissões
sudo chown -R www-data:www-data /opt/agrolink/backend/uploads
sudo chmod -R 755 /opt/agrolink/frontend/build
```

---

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório:
https://github.com/tecnunes/agrolink/issues

---

## Licença

Este projeto é proprietário. Todos os direitos reservados.
