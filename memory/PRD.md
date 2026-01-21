# AgroLink - CRM para Crédito Rural

## Problema Original
Sistema CRM chamado AgroLink para controle de clientes que desejam fazer empréstimo de crédito rural. O sistema deve gerenciar todo processo e acompanhamento de empréstimos dos clientes.

## User Personas
1. **Usuário Master**: Administrador completo do sistema - pode fazer tudo
2. **Usuário Admin**: Administrador parcial - pode cadastrar parceiros, usuários e etapas
3. **Usuário Analista**: Operador do sistema - apenas cadastra clientes e gerencia projetos

## Core Requirements (Estático)
- Sistema com Login e senha (Criados apenas pelo Admin e Master)
- Cadastro de Cliente (Nome, CPF, Endereço, Telefone, Data Nascimento, Valor Crédito, Indicação)
- Upload de Documentos (CCU/Título, Saldo IAGRO, CAR) com validação
- Fluxo de 7 etapas configuráveis
- Dashboard interativo com filtros
- Gestão de pendências e observações
- Relatórios com exportação PDF
- Tema claro/escuro alternável

## O que foi Implementado (22/01/2025)

### Backend (FastAPI + MongoDB)
- ✅ Autenticação JWT com 3 níveis de permissão
- ✅ CRUD completo de Clientes
- ✅ CRUD de Parceiros com comissão
- ✅ CRUD de Usuários com permissões
- ✅ Gestão de Etapas configuráveis
- ✅ Sistema de Projetos com timeline
- ✅ Upload de documentos (até 10MB)
- ✅ Checklist de documentos obrigatórios
- ✅ Pendências e Observações por etapa
- ✅ Relatórios com filtros
- ✅ Dashboard com estatísticas

### Frontend (React + Tailwind + Shadcn)
- ✅ Login com tema agrícola
- ✅ Layout responsivo (Desktop/Tablet/Mobile)
- ✅ Dashboard com cards de estatísticas
- ✅ Tabela de projetos com expansão para timeline
- ✅ Formulário de cadastro de cliente
- ✅ Listagem de clientes com busca
- ✅ Página de iniciar projeto
- ✅ Timeline visual de etapas
- ✅ Gestão de documentos com upload/download
- ✅ Painel administrativo (Parceiros, Usuários, Etapas, Config)
- ✅ Relatórios com filtros e exportação PDF
- ✅ Tema claro/escuro alternável
- ✅ Logo customizável

## Credenciais Padrão
- Login: admin
- Senha: #Sti93qn06301616

## Prioritized Backlog

### P0 - Crítico (Concluído)
- [x] Login e autenticação
- [x] Dashboard principal
- [x] Cadastro de clientes
- [x] Fluxo de projetos
- [x] Upload de documentos

### P1 - Importante (Concluído)
- [x] Gestão de pendências
- [x] Timeline visual
- [x] Relatórios básicos
- [x] Tema dark/light

### P2 - Desejável (Próximas Iterações)
- [ ] Notificações por email
- [ ] Histórico de alterações (audit log)
- [ ] Backup automático de documentos
- [ ] Dashboard com gráficos de evolução
- [ ] Integração com APIs externas (IAGRO, CAR)

## Próximas Tarefas
1. Testar fluxo completo de um projeto do início ao fim
2. Configurar backup automático do MongoDB
3. Implementar notificações visuais de pendências vencidas
4. Adicionar mais filtros nos relatórios
5. Melhorar exportação PDF com mais detalhes

## Stack Técnica
- **Backend**: FastAPI, Python 3.11, Motor (MongoDB async)
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI
- **Database**: MongoDB
- **Auth**: JWT + BCrypt
