# AgroLink - CRM para Crédito Rural

## Problema Original
Sistema CRM chamado AgroLink para controle de clientes que desejam fazer empréstimo de crédito rural. O sistema deve gerenciar todo processo e acompanhamento de empréstimos dos clientes.

## User Personas
1. **Usuário Master**: Administrador completo do sistema - pode fazer tudo
2. **Usuário Admin**: Administrador parcial - pode cadastrar parceiros, usuários e etapas
3. **Usuário Analista**: Operador do sistema - apenas cadastra clientes e gerencia projetos

## Core Requirements (Estático)
- Sistema com Login e senha (Criados apenas pelo Admin e Master)
- Cadastro de Cliente (Nome, CPF, Endereço, Telefone, Estado, Cidade, Data Nascimento, Valor Crédito, Indicação)
- Upload de Documentos (CCU/Título, Saldo IAGRO, CAR) com validação
- Fluxo de 8 etapas configuráveis
- Dashboard interativo com filtros
- Sistema de Propostas para prospecção de clientes
- Gestão de pendências e observações
- Relatórios com exportação PDF
- Tema claro/escuro alternável

## O que foi Implementado

### Backend (FastAPI + MongoDB)
- ✅ Autenticação JWT com 3 níveis de permissão
- ✅ CRUD completo de Clientes
- ✅ CRUD de Parceiros com comissão
- ✅ CRUD de Usuários com permissões
- ✅ Gestão de Etapas configuráveis (8 etapas)
- ✅ Sistema de Projetos com timeline
- ✅ Upload de documentos (até 10MB)
- ✅ Checklist de documentos obrigatórios por etapa
- ✅ Pendências e Observações por etapa
- ✅ Relatórios com filtros
- ✅ Dashboard com estatísticas
- ✅ **Sistema de Propostas** (criar, converter em projeto, desistir, excluir)
- ✅ **Alertas de propostas em aberto** (notifica 3x a cada 3 dias)
- ✅ **Instituições Financeiras configuráveis** (11 default)
- ✅ **Tipos de Projeto configuráveis** (PRONAF A, PRONAF B, CUSTEIO)
- ✅ **Requisitos de Etapa configuráveis**
- ✅ **API de Estados e Cidades** (integração IBGE)
- ✅ **Histórico completo do cliente** (projetos + propostas)
- ✅ **Contador de dias por etapa**

### Frontend (React + Tailwind + Shadcn)
- ✅ Login com tema agrícola
- ✅ Layout responsivo (Desktop/Tablet/Mobile)
- ✅ Dashboard com 5 cards de estatísticas
- ✅ **Visualização Kanban** (nova!) - colunas por etapa, cards com detalhes
- ✅ **Toggle Tabela/Kanban** - alterna entre visualizações
- ✅ Tabela de projetos com expansão para timeline
- ✅ Formulário de cadastro de cliente (com Estado/Cidade)
- ✅ Listagem de clientes com busca
- ✅ **Página de Propostas** (listagem, criar, converter, desistir, excluir)
- ✅ **Botão Limpar Alertas** na página de propostas
- ✅ Página de iniciar projeto (com Instituição Financeira)
- ✅ Timeline visual de etapas (com contador de dias)
- ✅ Gestão de documentos com upload/download
- ✅ Painel administrativo:
  - Parceiros
  - Usuários
  - Etapas
  - **Configurações** (Instituições Financeiras, Tipos de Projeto, Requisitos)
- ✅ Relatórios com filtros e exportação PDF
- ✅ Tema claro/escuro alternável
- ✅ Logo customizável
- ✅ **Sino de notificação mostrando propostas em aberto**

## Credenciais Padrão
- Login: admin
- Senha: #Sti93qn06301616

## Instituições Financeiras (Default)
1. Banco do Brasil
2. Sicredi
3. Sicoob
4. Cresol
5. Caixa Econômica Federal
6. Banco do Nordeste (BNB)
7. Banco da Amazônia
8. Itaú Unibanco
9. Bradesco
10. Santander
11. Credicoamo

## Fluxo de Propostas
1. Criar proposta: Nome, CPF, Telefone, Tipo Projeto, Instituição Financeira, Valor
2. Sistema notifica 3x a cada 3 dias sobre propostas em aberto
3. Ao entrar em contato, pode:
   - **Converter em Projeto**: Cria projeto automaticamente com os dados da proposta
   - **Desistir**: Marca como desistida (mantém cadastro do cliente)

## Etapas do Fluxo de Projeto
1. Cadastro
2. Coleta de Documentos (RG/CNH, Conta BB, CCU/Título, Saldo IAGRO, CAR)
3. Desenvolvimento do Projeto
4. Coletar Assinaturas
5. Protocolo CENOP
6. Instrumento de Crédito (Assinatura Agência, Upload Contrato)
7. GTA e Nota Fiscal
8. Projeto Creditado

## Prioritized Backlog

### P0 - Crítico (Concluído)
- [x] Login e autenticação
- [x] Dashboard principal
- [x] Cadastro de clientes
- [x] Fluxo de projetos
- [x] Upload de documentos
- [x] Sistema de Propostas completo
- [x] Instituições Financeiras configuráveis
- [x] Tipos de Projeto configuráveis
- [x] Campo Estado/Cidade no cadastro de cliente
- [x] Botão Limpar Alertas

### P1 - Importante (Concluído)
- [x] Gestão de pendências
- [x] Timeline visual com contador de dias
- [x] Relatórios básicos
- [x] Tema dark/light
- [x] Requisitos de Etapa configuráveis

### P2 - Desejável (Próximas Iterações)
- [ ] **Filtros avançados nas tabelas** (Clientes, Dashboard, Projetos Finalizados)
- [ ] Histórico completo do cliente na página de detalhes
- [ ] Notificações por email
- [ ] Histórico de alterações (audit log)
- [ ] Backup automático de documentos
- [ ] Dashboard com gráficos de evolução
- [ ] Integração com APIs externas (IAGRO, CAR)

## API Endpoints Principais
- `POST /api/auth/login` - Login
- `GET, POST /api/clients` - Clientes
- `GET /api/clients/{id}/history` - Histórico do cliente
- `GET, POST /api/propostas` - Propostas
- `PUT /api/propostas/{id}/converter` - Converter em projeto
- `PUT /api/propostas/{id}/desistir` - Desistir
- `GET, POST /api/projects` - Projetos
- `GET /api/alerts/propostas` - Alertas de propostas
- `PUT /api/alerts/propostas/clear-all` - Limpar alertas
- `GET, POST /api/instituicoes-financeiras` - Instituições Financeiras
- `GET, POST /api/tipos-projeto` - Tipos de Projeto
- `GET, POST /api/requisitos-etapa` - Requisitos de Etapa
- `GET /api/estados` - Lista de estados (27)
- `GET /api/cidades/{sigla}` - Cidades por estado (IBGE)

## Stack Técnica
- **Backend**: FastAPI, Python 3.11, Motor (MongoDB async)
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI
- **Database**: MongoDB
- **Auth**: JWT + BCrypt
- **API Externa**: IBGE (cidades)

## Última Atualização: 22/01/2026
- Sistema de Propostas completo implementado
- Página de Configurações com 3 abas (Instituições, Tipos, Requisitos)
- Campos Estado e Cidade no cadastro de cliente
- Sino de notificação agora mostra propostas em aberto
- **Visualização Kanban** no Dashboard com toggle para alternar com Tabela
- **Modal de Nova Proposta aprimorado** - permite selecionar cliente existente ou criar novo
- **Documentação para Deploy em Linux** - README.md completo com instruções
- **Script de instalação automática** (install.sh)
- **Health check endpoint** (/api/health)
- Testes: 100% de sucesso (backend e frontend)

## Deploy em Produção
Veja o arquivo README.md na raiz do projeto para instruções detalhadas de instalação em servidor Linux com HTTPS.

### Arquivos de Configuração
- `/backend/.env.example` - Exemplo de configuração do backend
- `/frontend/.env.example` - Exemplo de configuração do frontend
- `/install.sh` - Script de instalação automática
- `/.gitignore` - Arquivos ignorados pelo Git
