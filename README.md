# AgroLink - CRM de Crédito Rural

Sistema de gerenciamento de propostas e projetos de crédito rural.

---

## 🚀 Instalação Rápida

### Opção 1: HTTP (Teste) - http://76.13.167.251

```bash
git clone https://github.com/tecnunes/agrolink.git
cd agrolink
sudo ./install-http.sh
```

### Opção 2: HTTPS (Produção) - https://crem.agrolink.com.br

```bash
git clone https://github.com/tecnunes/agrolink.git
cd agrolink
sudo ./install-https.sh
```

---

## 📁 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `install-http.sh` | Instalação completa para HTTP (teste com IP) |
| `install-https.sh` | Instalação completa para HTTPS (produção com domínio) |
| `migrate-to-https.sh` | Migrar de HTTP para HTTPS |
| `revert-to-http.sh` | Reverter de HTTPS para HTTP |

---

## 🔄 Migrar de HTTP para HTTPS

Após testar com HTTP, migre para produção:

```bash
cd /opt/agrolink
sudo ./migrate-to-https.sh
```

**Pré-requisito:** O domínio `crem.agrolink.com.br` deve apontar para o IP do servidor.

---

## 🔐 Credenciais Padrão

| Campo | Valor |
|-------|-------|
| **Login** | `admin` |
| **Senha** | `#Sti93qn06301616` |

⚠️ **Altere a senha após o primeiro login!**

---

## 📋 Requisitos do Servidor

- Ubuntu 20.04+ / Debian 11+
- 2GB RAM mínimo
- 20GB disco
- Portas 80 e 443 liberadas

---

## 🛠️ Comandos Úteis

```bash
# Status do backend
sudo systemctl status agrolink-backend

# Ver logs em tempo real
sudo journalctl -u agrolink-backend -f

# Reiniciar backend
sudo systemctl restart agrolink-backend

# Reiniciar nginx
sudo systemctl restart nginx

# Testar API
curl http://localhost:8001/api/health
```

---

## 📦 Atualizar Aplicação

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

---

## 🔧 Configurações

### Arquivos de Ambiente

| Arquivo | Descrição |
|---------|-----------|
| `/opt/agrolink/backend/.env` | Configuração do backend (MongoDB, JWT) |
| `/opt/agrolink/frontend/.env` | URL do backend |

### Estrutura

```
/opt/agrolink/
├── backend/
│   ├── server.py          # API FastAPI
│   ├── requirements.txt   # Dependências Python
│   ├── uploads/           # Arquivos dos clientes
│   └── .env               # Configuração
├── frontend/
│   ├── src/               # Código React
│   ├── build/             # Build de produção
│   └── .env               # URL do backend
└── nginx/
    ├── agrolink-http.conf
    └── agrolink-https.conf
```

---

## 🆘 Troubleshooting

### Backend não inicia
```bash
sudo journalctl -u agrolink-backend -n 50
sudo systemctl status mongod
```

### Erro 502 Bad Gateway
```bash
curl http://localhost:8001/api/health
sudo nginx -t
```

### Problemas de SSL
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

---

## 📞 Suporte

Issues: https://github.com/tecnunes/agrolink/issues
