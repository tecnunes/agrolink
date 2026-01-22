# AgroLink - Sistema de Gestão de Crédito Rural

Sistema CRM para controle e acompanhamento de clientes que desejam fazer empréstimo de crédito rural.

## 🌱 Funcionalidades

### Gestão de Clientes
- Cadastro completo (Nome, CPF, Endereço, Telefone, Data de Nascimento, Valor do Crédito)
- Indicação por parceiros
- Upload de documentos obrigatórios (CCU/Título, Saldo IAGRO, CAR)
- Validação de documentos com checklist

### Fluxo de Projetos
- Etapas configuráveis: Cadastro → Coleta de Documentos → Desenvolvimento do Projeto → Coletar Assinaturas → Protocolo CENOP → Instrumento de Crédito → GTA e Nota Fiscal → Projeto Creditado
- Timeline interativo com duração por etapa
- Checkboxes específicos por etapa:
  - **Coleta de Documentos**: CCU/Título, Saldo IAGRO, CAR
  - **Desenvolvimento do Projeto**: Projeto Implementado
  - **Coletar Assinaturas**: Projeto Assinado
  - **Protocolo CENOP**: Projeto Protocolado
  - **Instrumento de Crédito**: Assinatura na Agência, Upload Contrato, Número do Contrato
  - **GTA e Nota Fiscal**: GTA Emitido, Nota Fiscal Emitida
  - **Projeto Creditado**: Comprovante de Serviço Pago, Valor do Serviço
- Gestão de pendências e observações
- Opção de desistência com motivo
- Arquivamento de projetos finalizados

### Dashboard
- Visão geral de projetos ativos
- Filtros por mês, nome e pendências
- Indicadores: Total de projetos, Clientes, Pendências, Valor total de crédito, Valor de serviços
- Alertas visuais para projetos com pendência (linha vermelha)

### Administração
- Cadastro de parceiros com comissão
- Gestão de usuários com níveis de permissão (Master, Admin, Analista)
- Configuração de etapas
- Upload de logo para relatórios

### Relatórios
- Filtros por etapa, valores, mês, pendências
- Exportação em PDF
- Resumo estatístico

## 🔐 Níveis de Permissão

| Permissão | Master | Admin | Analista |
|-----------|--------|-------|----------|
| Cadastrar clientes | ✅ | ✅ | ✅ |
| Gerenciar projetos | ✅ | ✅ | ✅ |
| Cadastrar parceiros | ✅ | ✅ | ❌ |
| Cadastrar usuários | ✅ | ✅* | ❌ |
| Configurar etapas | ✅ | ✅ | ❌ |
| Alterar Admin | ✅ | ❌ | ❌ |

*Admin só pode criar usuários Analista

## 🚀 Instalação em Ambiente Linux (Produção)

### Pré-requisitos
- Ubuntu 20.04+ ou CentOS 8+
- Node.js 18+
- Python 3.11+
- MongoDB 6.0+
- Nginx (recomendado como proxy reverso)
- Certificado SSL (Let's Encrypt recomendado)

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/agrolink.git
cd agrolink
```

### 2. Configurar Backend (FastAPI)
```bash
cd backend

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Criar arquivo .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=agrolink
CORS_ORIGINS=https://seu-dominio.com
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Criar pasta de uploads
mkdir -p uploads/config
```

### 3. Configurar Frontend (React)
```bash
cd ../frontend

# Instalar dependências
yarn install

# Criar arquivo .env
cat > .env << EOF
REACT_APP_BACKEND_URL=https://seu-dominio.com
EOF

# Build para produção
yarn build
```

### 4. Configurar MongoDB
```bash
# Instalar MongoDB (Ubuntu)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 5. Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/agrolink
```

Conteúdo do arquivo:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # Frontend (arquivos estáticos)
    location / {
        root /var/www/agrolink/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/agrolink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Configurar SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### 7. Configurar Serviço do Backend (systemd)
```bash
sudo nano /etc/systemd/system/agrolink-backend.service
```

Conteúdo:
```ini
[Unit]
Description=AgroLink Backend
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/agrolink/backend
Environment="PATH=/var/www/agrolink/backend/venv/bin"
ExecStart=/var/www/agrolink/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Iniciar serviço
sudo systemctl daemon-reload
sudo systemctl start agrolink-backend
sudo systemctl enable agrolink-backend
```

### 8. Deploy dos Arquivos
```bash
# Copiar arquivos para o servidor
sudo mkdir -p /var/www/agrolink
sudo cp -r backend /var/www/agrolink/
sudo cp -r frontend /var/www/agrolink/

# Ajustar permissões
sudo chown -R www-data:www-data /var/www/agrolink
sudo chmod -R 755 /var/www/agrolink
```

## 🔑 Acesso Inicial

Após a primeira execução, use as credenciais padrão:

- **Login:** admin
- **Senha:** #Sti93qn06301616

> ⚠️ **IMPORTANTE:** Altere a senha do usuário Master após o primeiro acesso!

## 📱 Responsividade

O sistema é otimizado para:
- 💻 Desktop (1920px+)
- 📱 Tablet (768px+)
- 📲 Smartphone (320px+)

## 🎨 Temas

- ☀️ Modo Claro (padrão)
- 🌙 Modo Escuro

Alternável pelo ícone de sol/lua no header.

## 📂 Estrutura de Arquivos de Upload

```
backend/uploads/
├── config/
│   └── logo.png          # Logo da empresa
├── {cliente_id}/
│   ├── DOCUMENTO1.PDF
│   └── DOCUMENTO2.JPG
```

- Arquivos são renomeados para MAIÚSCULAS
- Limite: 10MB por arquivo
- Pastas organizadas por ID do cliente

## 🛠️ Tecnologias

### Backend
- FastAPI (Python)
- MongoDB (Motor async)
- JWT Authentication
- BCrypt (senhas)

### Frontend
- React 19
- Tailwind CSS
- Shadcn/UI Components
- Axios
- React Router DOM
- Recharts (gráficos)
- date-fns

## 📞 Suporte

Em caso de dúvidas ou problemas, entre em contato com o administrador do sistema.

---

**AgroLink** - Sistema de Gestão de Crédito Rural
© 2024 - Todos os direitos reservados
