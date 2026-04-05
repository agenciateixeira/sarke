# Reunião — Pipeline Comercial e Calendário
**Participantes:** Guilherme
**Registrado por:** T3X
**Referência:** Especificação para migração do ClickUp e implementação do Calendário na plataforma SARKE

---

## 1. Visão Geral

O **SARKE** é um ERP focado em construção civil que centraliza CRM, gestão de obras e financeiro. O objetivo imediato é substituir o **ClickUp** e unificar as agendas do Guilherme, integrando operações da **Sarke** e da **Curli** em uma única interface.

---

## 2. Fase 1 — Migração do ClickUp (Esteira Comercial)

### 2.1. Estágios do Pipeline Comercial

A estrutura deve seguir a ordem cronológica definida pelo Guilherme:

| Ordem | Nome | Descrição |
|---|---|---|
| 1 | Reunião | Primeiro contato e triagem |
| 2 | Diagnóstico | Visita técnica e levantamento de necessidades |
| 3 | Negociação | Fase de apresentação e ajuste de propostas |
| 4 | Contrato | Fase final de fechamento |
| 5 | Pós-Venda | CSAT / CRM — relacionamento e pesquisa de satisfação após entrega |

> ⚠️ **Impacto no banco:** Os estágios padrão do `02_comercial.sql` foram atualizados para refletir essa estrutura. Ver seção de alterações abaixo.

### 2.2. Campos obrigatórios dos Cards (Deals)

| Campo | Observação |
|---|---|
| Nome do Cliente | Essencial para diferenciar contratos da mesma empresa |
| Nome da Empresa (CNPJ) | Identificação jurídica |
| Data de Início | — |
| Data de Vencimento | — |
| Status | — |
| Histórico / Notas | Todo o histórico de comentários do ClickUp deve ser preservado |
| Valor do Contrato | Vinculado ao financeiro para previsibilidade de caixa |
| Forma de Pagamento | Para gerar alertas de meta (ex: R$ 50k/mês) |

---

## 3. Fase 2 — Calendário Unificado

Consolidar compromissos de múltiplos e-mails:
- `@gstudio.com.br`
- `@sark.com`
- `@curliagencia.com.br`

### 3.1. Sistema de Cores por Categoria

| Cor | Categoria |
|---|---|
| 🔵 Azul Claro | Assuntos Pessoais (Guilherme) |
| 🟢 Verde Escuro | Projetos Sarke |
| 🟣 Roxo Escuro | ADM de Obras Sarke |
| 🩷 Rosa | Sarke Company (gestão física do complexo/prédio) |
| 🟡 Amarelo | Curli Eventos |
| 🟩 Verde | Curli Shop |
| 🔴 Vermelho | Curli Live |
| ⬜ Branco | Convites externos recebidos (não confirmados) |

### 3.2. Funcionalidade de Convite (Invite)

Ao criar um evento, o sistema deve perguntar qual empresa o usuário representa (Sarke ou Curli) para disparar o e-mail correto ao destinatário.

---

## 4. Integrações e Automações (Roadmap)

### 4.1. Autentique (Assinatura Digital)
- Sincronização de status em tempo real (quem já assinou)
- Automação via bot: enviar link de assinatura pelo WhatsApp do cliente quando o contrato for enviado

### 4.2. Agente de IA
- Criação de compromissos via chat
- Extração de dados da plataforma via chat
- Validação de campos antes de avançar processos (CEP, dados bancários, etc.)

---

## 5. Ordem de Implementação por Setor

| Prioridade | Setor | Responsável | Foco |
|---|---|---|---|
| 1 | Comercial | Guilherme | Pipeline + Calendário |
| 2 | Financeiro / Jurídico | Vini | Controle de caixa + Contratos |
| 3 | Engenharia / Obras | Diego | RDO + Cronogramas |

---

## 6. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| Segurança | RLS + permissões por setor (Admin, Comercial, Obra, Financeiro) |
