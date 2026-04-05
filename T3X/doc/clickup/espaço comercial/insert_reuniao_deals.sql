-- ============================================================
-- Importação de tarefas ClickUp → tabela deals (Supabase)
-- Status: REUNIÃO | Espaço: Comercial
-- Gerado em: 2026-04-04
--
-- Mapeamentos aplicados:
--   Prefixo INT  → service_type: projeto_interiores
--   Prefixo ADM  → service_type: gestao_obra
--   Prefixo ARQ  → service_type: projeto_arquitetonico
--   Sufixo _RES  → business_type: residencial
--   Sufixo _COM  → business_type: comercial
--   Sufixo _CORP → business_type: comercial
--
-- stage_id usado = e84fbb50-e666-4b22-906f-14456c5edf3b (REUNIÃO)
-- owner_id usado = 08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b
-- ============================================================

INSERT INTO "public"."deals" (
  "id", "title", "description", "client_id", "stage_id", "owner_id",
  "value", "probability", "expected_close_date", "actual_close_date",
  "status", "lost_reason", "created_at", "updated_at",
  "archived", "archived_at", "archived_by",
  "lead_source", "lead_source_detail",
  "business_type", "service_type",
  "temperature", "urgency",
  "last_contact_date", "next_follow_up_date",
  "tags", "notes", "competitors", "decision_deadline"
)
VALUES

-- 1. INT_Thomas Blumel_RES
-- ClickUp: https://app.clickup.com/t/868j3wzng | Vencimento: 26/05/2026
(
  '9b1612d7-5a61-4620-937b-7460c2aa2412',
  'INT_Thomas Blumel_RES',
  null, null,
  'e84fbb50-e666-4b22-906f-14456c5edf3b',
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-26', null,
  'open', null,
  NOW(), NOW(),
  false, null, null,
  'outros', null,
  'residencial', 'projeto_interiores',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868j3wzng', null, null
),

-- 2. ADM_Juicy_COM
-- ClickUp: https://app.clickup.com/t/868hp90ex | Vencimento: 19/05/2026
(
  gen_random_uuid(),
  'ADM_Juicy_COM',
  null, null,
  'e84fbb50-e666-4b22-906f-14456c5edf3b',
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-19', null,
  'open', null,
  NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'gestao_obra',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868hp90ex', null, null
),

-- 3. INT_CaioPiracicaba_COM
-- ClickUp: https://app.clickup.com/t/868h93xcz | Vencimento: 19/05/2026
(
  gen_random_uuid(),
  'INT_CaioPiracicaba_COM',
  null, null,
  'e84fbb50-e666-4b22-906f-14456c5edf3b',
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-19', null,
  'open', null,
  NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'projeto_interiores',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868h93xcz', null, null
),

-- 4. ARQ_Container Castelo_COM
-- ClickUp: https://app.clickup.com/t/868fthy8r | Vencimento: 19/05/2026
(
  gen_random_uuid(),
  'ARQ_Container Castelo_COM',
  null, null,
  'e84fbb50-e666-4b22-906f-14456c5edf3b',
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-19', null,
  'open', null,
  NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'projeto_arquitetonico',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868fthy8r', null, null
),

-- 5. ADM_Flowinvest_CORP
-- ClickUp: https://app.clickup.com/t/868dj74cu | Vencimento: 25/05/2026
-- Prioridade: URGENTE | Responsáveis: Guilherme Santinon, Sarke Studio, Diego Gusmão
(
  gen_random_uuid(),
  'ADM_Flowinvest_CORP',
  null, null,
  'e84fbb50-e666-4b22-906f-14456c5edf3b',
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-25', null,
  'open', null,
  NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'gestao_obra',
  'quente', 'alta',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868dj74cu', null, null
)

ON CONFLICT (id) DO NOTHING;
