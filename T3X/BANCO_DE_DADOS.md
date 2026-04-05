# Banco de Dados — Sarke

Registro de todas as migrações SQL do projeto.
Cada arquivo deve ser executado **na ordem abaixo** no SQL Editor do Supabase.

---

## Regras gerais

- Sempre execute na ordem numérica (01 → 02 → 03 …)
- Cada arquivo é idempotente: pode ser rodado mais de uma vez sem quebrar
- Antes de criar um novo arquivo, registre aqui o motivo e os campos
- Nunca adicione tabelas ao `all_migrations.sql` — crie um novo arquivo numerado

---

## Arquivos criados

---

### `01_auth_profiles.sql`
**Status:** ✅ Executado
**Motivo:** Base de autenticação. Sem essa tabela nenhum usuário consegue logar na plataforma.

#### Funções e triggers

| Nome | Tipo | Descrição |
|---|---|---|
| `is_admin()` | Função | Retorna `true` se o usuário logado tem `role = 'admin'`. Usada em todas as políticas RLS. |
| `update_updated_at()` | Função + Trigger | Atualiza o campo `updated_at` automaticamente em qualquer UPDATE. |
| `handle_new_user()` | Função + Trigger | Cria automaticamente uma linha em `profiles` quando um usuário é registrado no Supabase Auth. |
| `on_auth_user_created` | Trigger em `auth.users` | Dispara `handle_new_user()` após INSERT em `auth.users`. |
| `trg_profiles_updated_at` | Trigger em `profiles` | Dispara `update_updated_at()` antes de qualquer UPDATE em `profiles`. |

#### Tabela: `profiles`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK — mesmo ID do `auth.users` |
| `email` | TEXT | ✅ | E-mail único do usuário |
| `name` | TEXT | ✅ | Nome de exibição |
| `role` | TEXT | ✅ | Permissão: `admin`, `gerente`, `colaborador`, `juridico` (default: `colaborador`) |
| `setor` | TEXT | — | Setor de acesso: `dashboard`, `tarefas`, `comercial`, `financeiro`, `juridico`, `calendario`, `gestao_equipe`, `chat_interno`, `ferramentas`, `gestao_obra`, `cronograma`, `memorial` |
| `avatar_url` | TEXT | — | URL da foto de perfil |
| `telefone` | TEXT | — | Telefone de contato |
| `cargo` | TEXT | — | Cargo na empresa |
| `departamento` | TEXT | — | Departamento |
| `created_at` | TIMESTAMPTZ | — | Data de criação (default: NOW()) |
| `updated_at` | TIMESTAMPTZ | — | Última atualização (default: NOW()) |

#### Índices
| Nome | Coluna |
|---|---|
| `idx_profiles_role` | `role` |
| `idx_profiles_email` | `email` |

#### Políticas RLS

| Política | Operação | Regra |
|---|---|---|
| Usuário vê próprio perfil | SELECT | `auth.uid() = id` |
| Usuário atualiza próprio perfil | UPDATE | `auth.uid() = id` |
| Admin acessa tudo em profiles | ALL | `is_admin()` |

---

### `02_comercial.sql`
**Status:** ✅ Executado
**Motivo:** Módulo comercial (CRM + Pipeline de vendas). Necessário para gerenciar clientes, funil de negócios, histórico de atividades e notificações.

#### Tabela: `clients`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `name` | TEXT | ✅ | Nome do cliente |
| `email` | TEXT | — | E-mail |
| `phone` | TEXT | — | Telefone |
| `cpf_cnpj` | TEXT | — | CPF ou CNPJ |
| `type` | TEXT | — | `pessoa_fisica` ou `pessoa_juridica` |
| `address_street` | TEXT | — | Rua |
| `address_number` | TEXT | — | Número |
| `address_complement` | TEXT | — | Complemento |
| `address_neighborhood` | TEXT | — | Bairro |
| `address_city` | TEXT | — | Cidade |
| `address_state` | TEXT | — | Estado |
| `address_zip` | TEXT | — | CEP |
| `notes` | TEXT | — | Observações |
| `status` | TEXT | — | `active`, `inactive`, `prospect` (default: `active`) |
| `created_by` | UUID | — | FK → `profiles` |
| `created_at` | TIMESTAMPTZ | — | Data de criação |
| `updated_at` | TIMESTAMPTZ | — | Última atualização |

#### Políticas RLS — `clients`

| Política | Operação | Regra |
|---|---|---|
| Todos autenticados veem clientes | SELECT | `true` |
| Autenticados criam clientes | INSERT | `created_by = auth.uid()` ou `is_admin()` |
| Criador ou admin atualiza cliente | UPDATE | `created_by = auth.uid()` ou `is_admin()` |
| Apenas admin deleta cliente | DELETE | `is_admin()` |

---

#### Tabela: `pipeline_stages`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `name` | TEXT | ✅ | Nome do estágio |
| `description` | TEXT | — | Descrição |
| `order_index` | INTEGER | ✅ | Ordem de exibição (único) |
| `color` | TEXT | — | Cor em hex (default: `#3B82F6`) |
| `created_at` | TIMESTAMPTZ | — | Data de criação |

**Dados padrão inseridos** *(alinhados com a esteira comercial da Sarke — ver `doc/reuniao_pipeline_calendario.md`)*:

| Ordem | Nome | Cor |
|---|---|---|
| 1 | Reunião | `#6B7280` |
| 2 | Diagnóstico | `#3B82F6` |
| 3 | Negociação | `#F59E0B` |
| 4 | Contrato | `#10B981` |
| 5 | Pós-Venda | `#8B5CF6` |

> ⚠️ Se os estágios antigos já foram inseridos, execute `DELETE FROM public.pipeline_stages;` antes de rodar o arquivo novamente.

#### Políticas RLS — `pipeline_stages`

| Política | Operação | Regra |
|---|---|---|
| Todos veem estágios | SELECT | `true` |
| Admin gerencia estágios | ALL | `is_admin()` |

---

#### Tabela: `deals`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `title` | TEXT | ✅ | Nome do negócio |
| `description` | TEXT | — | Descrição |
| `client_id` | UUID | — | FK → `clients` |
| `stage_id` | UUID | ✅ | FK → `pipeline_stages` |
| `owner_id` | UUID | — | FK → `profiles` (responsável) |
| `value` | DECIMAL(15,2) | — | Valor do negócio |
| `probability` | INTEGER | — | Probabilidade de fechamento (0–100, default: 50) |
| `expected_close_date` | DATE | — | Previsão de fechamento |
| `actual_close_date` | DATE | — | Data real de fechamento |
| `status` | TEXT | — | `open`, `won`, `lost` (default: `open`) |
| `lost_reason` | TEXT | — | Motivo da perda |
| `created_at` | TIMESTAMPTZ | — | Data de criação |
| `updated_at` | TIMESTAMPTZ | — | Última atualização |

#### Políticas RLS — `deals`

| Política | Operação | Regra |
|---|---|---|
| Todos autenticados veem deals | SELECT | `true` |
| Autenticados criam deals | INSERT | `owner_id = auth.uid()` ou `is_admin()` |
| Dono ou admin atualiza deal | UPDATE | `owner_id = auth.uid()` ou `is_admin()` |
| Apenas admin deleta deal | DELETE | `is_admin()` |

---

#### Tabela: `deal_activities`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `deal_id` | UUID | ✅ | FK → `deals` (CASCADE) |
| `type` | TEXT | ✅ | `note`, `call`, `email`, `meeting`, `task`, `status_change` |
| `title` | TEXT | ✅ | Título da atividade |
| `description` | TEXT | — | Detalhes |
| `created_by` | UUID | ✅ | FK → `profiles(id)` (CASCADE) — **corrigido em `04_pipeline_extendido.sql`**, era `auth.users` |
| `due_date` | TIMESTAMPTZ | — | Prazo (para tarefas) |
| `completed_at` | TIMESTAMPTZ | — | Data de conclusão |
| `duration_minutes` | INTEGER | — | Duração (para calls e reuniões) |
| `metadata` | JSONB | — | Dados extras (default: `{}`) |
| `created_at` | TIMESTAMPTZ | — | Data de criação |
| `updated_at` | TIMESTAMPTZ | — | Última atualização |

#### Políticas RLS — `deal_activities`

| Política | Operação | Regra |
|---|---|---|
| Todos autenticados veem atividades | SELECT | `true` |
| Autenticados criam atividades | INSERT | `created_by = auth.uid()` ou `is_admin()` |
| Criador ou admin atualiza atividade | UPDATE | `created_by = auth.uid()` ou `is_admin()` |
| Admin deleta atividade | DELETE | `is_admin()` |

---

#### Tabela: `notifications`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `user_id` | UUID | ✅ | FK → `auth.users` (CASCADE) — destinatário |
| `type` | TEXT | ✅ | Tipo da notificação (ex: `deal_stage_changed`, `access_approved`) |
| `title` | TEXT | ✅ | Título exibido |
| `message` | TEXT | ✅ | Corpo da mensagem |
| `link` | TEXT | — | URL de destino ao clicar |
| `deal_id` | UUID | — | FK → `deals` (CASCADE) |
| `read` | BOOLEAN | — | Se foi lida (default: `false`) |
| `read_at` | TIMESTAMPTZ | — | Quando foi lida |
| `priority` | TEXT | — | `low`, `normal`, `high` (default: `normal`) |
| `data` | JSONB | — | Dados adicionais (default: `{}`) |
| `created_at` | TIMESTAMPTZ | — | Data de criação |
| `expires_at` | TIMESTAMPTZ | — | Expiração automática |

#### Índices — `notifications`
| Nome | Colunas |
|---|---|
| `idx_notifications_user` | `user_id` |
| `idx_notifications_unread` | `(user_id, read) WHERE read = false` |
| `idx_notifications_deal` | `deal_id` |

#### Políticas RLS — `notifications`

| Política | Operação | Regra |
|---|---|---|
| Usuário vê próprias notificações | SELECT | `auth.uid() = user_id` |
| Usuário marca notificação como lida | UPDATE | `auth.uid() = user_id` |
| Sistema cria notificações | INSERT | `true` |

---

### `03_sistema_base.sql`
**Status:** ✅ Executado
**Motivo:** Tabelas de suporte usadas automaticamente pela plataforma em background — convites de equipe e controle de acesso. Necessário para que os hooks `useTeam` e `useNotifications` funcionem sem erros.

#### Funções RPC

| Nome | Parâmetros | Retorno | Descrição |
|---|---|---|---|
| `has_approved_access(p_user_id)` | `UUID` | `BOOLEAN` | Retorna `true` se o usuário tem uma solicitação de acesso aprovada e ainda válida. |
| `review_access_request(p_request_id, p_admin_id, p_approved, p_hours_valid)` | `UUID, UUID, BOOLEAN, INTEGER` | `JSONB` | Admin aprova ou rejeita uma solicitação. Retorna `{ success, message }`. |

---

#### Tabela: `team_invites`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `email` | TEXT | ✅ | E-mail do convidado |
| `role` | TEXT | ✅ | Role que será atribuído ao aceitar: `admin`, `gerente`, `colaborador`, `juridico` (default: `colaborador`) |
| `token` | TEXT | ✅ | Token único para aceite do convite (gerado automaticamente, UNIQUE) |
| `invited_by` | UUID | — | FK → `profiles` (quem convidou) |
| `accepted_at` | TIMESTAMPTZ | — | Quando o convite foi aceito |
| `expires_at` | TIMESTAMPTZ | — | Expiração (default: NOW() + 7 dias) |
| `created_at` | TIMESTAMPTZ | — | Data de criação |
| `updated_at` | TIMESTAMPTZ | — | Última atualização |

#### Índices — `team_invites`
| Nome | Coluna |
|---|---|
| `idx_team_invites_email` | `email` |
| `idx_team_invites_token` | `token` |
| `idx_team_invites_expires` | `expires_at` |

#### Políticas RLS — `team_invites`

| Política | Operação | Regra |
|---|---|---|
| Admin vê convites | SELECT | `is_admin()` |
| Admin cria convites | INSERT | `is_admin()` |
| Admin deleta convites | DELETE | `is_admin()` |
| Aceitar via token | UPDATE | `true` |

---

#### Tabela: `access_requests`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `user_id` | UUID | ✅ | FK → `auth.users` (CASCADE) — quem solicitou |
| `reason` | TEXT | — | Motivo da solicitação |
| `status` | TEXT | ✅ | `pending`, `approved`, `rejected` (default: `pending`) |
| `reviewed_by` | UUID | — | FK → `profiles` (admin que revisou) |
| `reviewed_at` | TIMESTAMPTZ | — | Quando foi revisado |
| `valid_until` | TIMESTAMPTZ | — | Validade do acesso aprovado |
| `created_at` | TIMESTAMPTZ | — | Data de criação |
| `updated_at` | TIMESTAMPTZ | — | Última atualização |

#### Índices — `access_requests`
| Nome | Coluna |
|---|---|
| `idx_access_requests_user` | `user_id` |
| `idx_access_requests_status` | `status` |

#### Políticas RLS — `access_requests`

| Política | Operação | Regra |
|---|---|---|
| Usuário vê próprias solicitações | SELECT | `auth.uid() = user_id` ou `is_admin()` |
| Usuário cria solicitação | INSERT | `auth.uid() = user_id` |
| Admin atualiza solicitações | UPDATE | `is_admin()` |

---

### `04_pipeline_extendido.sql`
**Status:** ⏳ Pendente execução
**Motivo:** A tabela `deals` criada no `02_comercial.sql` é básica. O pipeline comercial (kanban, drag & drop, qualificação de leads, follow-up, arquivamento) precisa de colunas extras que não existem ainda. Esse arquivo adiciona todas elas via `ALTER TABLE`.

**Dependência:** Executar após `02_comercial.sql`.

#### Colunas adicionadas em `deals`

**Arquivamento:**
| Campo | Tipo | Descrição |
|---|---|---|
| `archived` | BOOLEAN | Se o deal está arquivado (default: `false`) |
| `archived_at` | TIMESTAMPTZ | Quando foi arquivado |
| `archived_by` | UUID | FK → `profiles` (quem arquivou) |

**Qualificação do Lead:**
| Campo | Tipo | Valores válidos |
|---|---|---|
| `lead_source` | TEXT | `website`, `indicacao`, `instagram`, `facebook`, `linkedin`, `google_ads`, `facebook_ads`, `evento`, `cold_call`, `email_marketing`, `parceria`, `retorno`, `outros` |
| `lead_source_detail` | TEXT | Detalhe (ex: nome de quem indicou) |
| `business_type` | TEXT | `residencial`, `comercial`, `industrial`, `publico` |
| `service_type` | TEXT | `projeto_arquitetonico`, `projeto_arquitetonico_completo`, `projeto_interiores`, `gestao_obra`, `consultoria`, `regularizacao`, `reformas`, `acompanhamento`, `outros` |
| `temperature` | TEXT | `quente`, `morno`, `frio` (default: `morno`) |
| `urgency` | TEXT | `alta`, `media`, `baixa` (default: `media`) |

**Follow-up:**
| Campo | Tipo | Descrição |
|---|---|---|
| `last_contact_date` | TIMESTAMPTZ | Última data de contato |
| `next_follow_up_date` | TIMESTAMPTZ | Próximo follow-up agendado |

**Organização:**
| Campo | Tipo | Descrição |
|---|---|---|
| `tags` | TEXT[] | Array de tags para filtros |
| `notes` | TEXT | Anotações internas |
| `competitors` | TEXT | Concorrentes identificados |
| `decision_deadline` | DATE | Prazo de decisão do cliente |

#### Correção aplicada

O `04_pipeline_extendido.sql` também:
- Corrige o FK de `deal_activities.created_by`: de `auth.users` → `profiles(id)`, para que o join `creator:profiles!created_by` funcione no Supabase PostgREST
- Cria a tabela `deal_attachments` (anexos de deals e atividades)
- Cria a view `deal_activity_stats` (estatísticas por deal, usada no hook `useDealActivities`)

#### Tabela: `deal_attachments`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `deal_id` | UUID | ✅ | FK → `deals` (CASCADE) |
| `activity_id` | UUID | — | FK → `deal_activities` (SET NULL) |
| `file_name` | TEXT | ✅ | Nome do arquivo |
| `file_path` | TEXT | ✅ | Caminho no Supabase Storage |
| `file_size` | INTEGER | ✅ | Tamanho em bytes |
| `file_type` | TEXT | ✅ | MIME type |
| `uploaded_by` | UUID | ✅ | FK → `profiles` (CASCADE) |
| `uploaded_at` | TIMESTAMPTZ | — | Data do upload (default: NOW()) |
| `description` | TEXT | — | Descrição do arquivo |
| `created_at` | TIMESTAMPTZ | — | Data de criação |

#### View: `deal_activity_stats`

Agrega estatísticas de `deal_activities` por deal. Usada pelo hook `useDealActivities`.

| Campo | Descrição |
|---|---|
| `deal_id` | Referência ao deal |
| `total_activities` | Total de atividades |
| `notes_count` | Notas |
| `calls_count` | Ligações |
| `emails_count` | E-mails |
| `meetings_count` | Reuniões |
| `tasks_count` | Tarefas |
| `completed_tasks_count` | Tarefas concluídas |
| `overdue_tasks_count` | Tarefas em atraso |
| `last_activity_at` | Data da última atividade |

---

## Alterações de código (sem migração SQL)

Correções e melhorias feitas diretamente nos arquivos do projeto.

### `components/comercial/DealDialog.tsx`

| # | Alteração | Motivo |
|---|---|---|
| 1 | `handleSaveClient`: `owner_id` → `created_by` | Coluna da tabela `clients` é `created_by`, não `owner_id` |
| 2 | `handleSaveClient`: log detalhado do erro (`error.code`, `error.message`, `error.details`, `error.hint`) | Erro Supabase mostra `{}` no `console.error` — propiedades não-enumeráveis |
| 3 | Novos `ServiceType` no array `SERVICE_TYPES`: `projeto_arquitetonico_completo`, `projeto_interiores` | Solicitação do cliente Guilherme |

### `components/comercial/DealsListView.tsx`

| # | Alteração | Motivo |
|---|---|---|
| 1 | Cards de `won`/`lost`: fundo suave com `bg-green-50/50` / `bg-red-50/50` + borda colorida apenas à esquerda | Melhor legibilidade em light e dark mode |
| 2 | Cards `archived`: sem fundo colorido — usa `bg-card` padrão com borda esquerda neutra | Cards arquivados não devem ter aparência degradada |
| 3 | Tipo `archived`: badge "Arquivado" + botão "Restaurar" e ícone de exclusão **sempre visíveis** (sem depender de hover) | Facilitar ação de desarquivar e excluir |
| 4 | Tipo `won`/`lost`: badges "Ganho"/"Perdido" em vez de emojis no título | Visual mais limpo e consistente |

### `types/pipeline.ts`

| # | Alteração | Motivo |
|---|---|---|
| 1 | `ServiceType`: adicionados `projeto_arquitetonico_completo` e `projeto_interiores` | Novos tipos de serviço solicitados |

---

---

### `05_documentos.sql`
**Status:** ⏳ Pendente execução
**Motivo:** A aba "Documentos" dentro de um deal usa tabelas e buckets de storage que não existiam. Esse arquivo cria tudo.

**Dependência:** Executar após `04_pipeline_extendido.sql`.

#### Storage buckets criados

| Bucket | Acesso | Limite | Uso |
|---|---|---|---|
| `documents` | Privado (autenticados) | 50MB | Documentos de deals (PDF, Word, Excel, imagens) |
| `deals` | Privado (autenticados) | 50MB | Anexos de atividades (`useDealActivities`) |

#### Tabela: `deal_documents`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `deal_id` | UUID | ✅ | FK → `deals` (CASCADE) |
| `category` | TEXT | ✅ | `proposta`, `contrato`, `planta`, `orcamento`, `planilha`, `rrt_art`, `imagem`, `email`, `outro` |
| `file_name` | TEXT | ✅ | Nome original do arquivo |
| `file_path` | TEXT | ✅ | Caminho no bucket `documents` |
| `file_size` | INTEGER | ✅ | Tamanho em bytes |
| `file_type` | TEXT | ✅ | MIME type |
| `version` | INTEGER | ✅ | Versão atual (default: 1) |
| `is_current` | BOOLEAN | ✅ | Se é a versão mais recente (default: true) |
| `parent_document_id` | UUID | — | FK → `deal_documents` (versão anterior) |
| `description` | TEXT | — | Descrição do documento |
| `tags` | TEXT[] | — | Tags para filtro |
| `status` | TEXT | ✅ | `draft`, `pending_approval`, `approved`, `rejected` |
| `requires_approval` | BOOLEAN | — | Se precisa de aprovação |
| `is_shared` | BOOLEAN | — | Se está compartilhado |
| `shared_with_client` | BOOLEAN | — | Se foi compartilhado com o cliente |
| `uploaded_by` | UUID | ✅ | FK → `profiles` |
| `uploaded_at` | TIMESTAMPTZ | — | Data do upload |
| `created_at` | TIMESTAMPTZ | — | Data de criação |
| `updated_at` | TIMESTAMPTZ | — | Última atualização |

#### Tabela: `document_versions`

Histórico de todas as versões de um documento.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `document_id` | UUID | ✅ | FK → `deal_documents` (CASCADE) |
| `version` | INTEGER | ✅ | Número da versão |
| `file_path` | TEXT | ✅ | Caminho no storage |
| `file_size` | INTEGER | ✅ | Tamanho em bytes |
| `changes_description` | TEXT | — | O que mudou nessa versão |
| `uploaded_by` | UUID | ✅ | FK → `profiles` |
| `uploaded_at` | TIMESTAMPTZ | — | Data do upload |

#### Tabela: `document_shared_links`

Links de compartilhamento com acesso controlado.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | PK |
| `document_id` | UUID | FK → `deal_documents` |
| `token` | TEXT | Token único para acesso (UNIQUE) |
| `password_hash` | TEXT | Senha opcional |
| `expires_at` | TIMESTAMPTZ | Expiração do link |
| `max_downloads` | INTEGER | Limite de downloads |
| `download_count` | INTEGER | Contador de downloads |
| `created_by` | UUID | FK → `profiles` |

#### Tabela: `document_comments`

Comentários sobre documentos.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | PK |
| `document_id` | UUID | FK → `deal_documents` (CASCADE) |
| `user_id` | UUID | FK → `profiles` |
| `comment` | TEXT | Texto do comentário |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

---

### `06_calendario.sql`
**Status:** ✅ Executado
**Motivo:** Integração com Google Calendar via OAuth 2.0. Necessário para que cada usuário conecte sua conta Google e visualize eventos na plataforma.

**Dependência:** Executar após `01_auth_profiles.sql` (usa FK → `profiles`).

#### Tabela: `calendar_integrations`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `user_id` | UUID | ✅ | FK → `profiles` (CASCADE) |
| `provider` | TEXT | ✅ | `google` ou `hostgator` (default: `google`) |
| `server_url` | TEXT | — | URL CalDAV — apenas Hostgator |
| `username` | TEXT | — | Usuário CalDAV — apenas Hostgator |
| `password_encrypted` | TEXT | — | Senha CalDAV — apenas Hostgator |
| `access_token` | TEXT | — | OAuth access token (Google) |
| `refresh_token` | TEXT | — | OAuth refresh token (Google) |
| `token_expires_at` | TIMESTAMPTZ | — | Expiração do access token |
| `provider_user_id` | TEXT | — | ID do usuário no Google |
| `provider_email` | TEXT | — | E-mail da conta Google conectada |
| `sync_enabled` | BOOLEAN | — | Sincronização ativa (default: true) |
| `last_sync_at` | TIMESTAMPTZ | — | Última sincronização bem-sucedida |
| `is_active` | BOOLEAN | — | Integração ativa (default: true) |
| `created_at` | TIMESTAMPTZ | — | Data de criação |
| `updated_at` | TIMESTAMPTZ | — | Última atualização |

**Constraint:** `UNIQUE(user_id, provider)` — um usuário só pode ter uma integração por provider.

#### Tabela: `calendar_events`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `integration_id` | UUID | ✅ | FK → `calendar_integrations` (CASCADE) |
| `external_id` | TEXT | ✅ | ID do evento no Google Calendar |
| `summary` | TEXT | ✅ | Título do evento |
| `description` | TEXT | — | Descrição |
| `location` | TEXT | — | Local |
| `start_date` | TIMESTAMPTZ | ✅ | Início |
| `end_date` | TIMESTAMPTZ | ✅ | Fim |
| `all_day` | BOOLEAN | — | Evento de dia inteiro (default: false) |
| `attendees` | TEXT[] | — | Array de e-mails dos participantes |
| `obra_id` | UUID | — | FK para obras — **pendente** (tabela não existe ainda) |
| `synced_at` | TIMESTAMPTZ | — | Quando foi sincronizado |
| `sync_status` | TEXT | — | `synced`, `error` (default: `synced`) |

> ⚠️ **Lembrete:** quando `obras` for criada, adicionar:
> `ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_obra FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL;`

#### Políticas RLS

| Tabela | Operação | Regra |
|---|---|---|
| `calendar_integrations` | SELECT / INSERT / UPDATE / DELETE | `auth.uid() = user_id` |
| `calendar_events` | SELECT / ALL | Usuário dono da integração via subquery |

---

### `08_fix_service_type.sql`
**Status:** ⏳ Pendente execução
**Motivo:** A constraint `service_type` criada pelas migrations antigas tinha apenas 7 valores. Faltavam `projeto_arquitetonico_completo` e `projeto_interiores`, que existem no frontend. Esse arquivo corrige a constraint.

**Dependência:** Executar após `04_pipeline_extendido.sql`.

#### Alteração aplicada em `deals`

| Constraint | Operação | Valores corrigidos |
|---|---|---|
| `deals_service_type_check` | DROP + ADD | Adicionados `projeto_arquitetonico_completo` e `projeto_interiores` |

---

## Próximos arquivos planejados

| Arquivo | Módulo | Quando criar |
|---|---|---|
| `09_chat.sql` | Chat interno | Quando for usar o chat da plataforma |
| `10_obras.sql` | Gestão de obras | Quando for usar o módulo de obras |
| `11_financeiro.sql` | Financeiro | Quando for usar o módulo financeiro |
| `12_tarefas.sql` | Tarefas / Kanban | Quando for usar o módulo de tarefas |
| `13_juridico.sql` | Jurídico | Quando for usar o módulo jurídico |
