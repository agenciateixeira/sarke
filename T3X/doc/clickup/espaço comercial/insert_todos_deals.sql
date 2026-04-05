-- ============================================================
-- Importação de tarefas ClickUp → tabela deals (Supabase)
-- Exportado em: 2026-04-05
-- Espaços: Diagnóstico | Proposta (2), Negociação (2), Contrato (10)
-- Total: 14 registros
--
-- Mapeamentos de prefixo → service_type:
--   INT        → projeto_interiores
--   ADM        → gestao_obra
--   ARQ        → projeto_arquitetonico
--   ARQ+INT    → projeto_arquitetonico_completo
--   3D / PREF  → null (prefixo não mapeado)
--
-- Mapeamentos de sufixo → business_type:
--   _RES  → residencial
--   _COM  → comercial
--   _CORP → comercial
--
-- stage_id resolvido via subquery por nome do estágio
-- owner_id fixo: 08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b
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

-- ============================================================
-- DIAGNÓSTICO | PROPOSTA
-- ============================================================

-- 1. 3D_Bendita Carrinho_COM
(
  gen_random_uuid(),
  '3D_Bendita Carrinho_COM',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%diagn%' OR LOWER(name) LIKE '%proposta%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-25', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'outros',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868hxftbt', null, null
),

-- 2. Diagnóstico - Reunião (⚠️ vencido: 28/09/2025, urgente)
(
  gen_random_uuid(),
  'Diagnóstico - Reunião',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%diagn%' OR LOWER(name) LIKE '%proposta%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2025-09-28', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  null, null,
  'morno', 'alta',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868d99g8b', null, null
),

-- ============================================================
-- NEGOCIAÇÃO
-- ============================================================

-- 3. INT_Flow Maringá A11_CORP
(
  gen_random_uuid(),
  'INT_Flow Maringá A11_CORP',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%negoci%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-20', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'projeto_interiores',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868hp90c2', null, null
),

-- 4. ARQ_Jairo_CORP
(
  gen_random_uuid(),
  'ARQ_Jairo_CORP',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%negoci%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-20', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'projeto_arquitetonico',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868gzvjg1', null, null
),

-- ============================================================
-- CONTRATO
-- ============================================================

-- 5. ADM_Andre e Mariana_RES
(
  gen_random_uuid(),
  'ADM_Andre e Mariana_RES',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-18', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'residencial', 'gestao_obra',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868j20mvq', null, null
),

-- 6. ADM_Flow Maringa_CORP
(
  gen_random_uuid(),
  'ADM_Flow Maringa_CORP',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-18', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'gestao_obra',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868ht65ku', null, null
),

-- 7. PREF_Darlen_RES (prefixo PREF não mapeado)
(
  gen_random_uuid(),
  'PREF_Darlen_RES',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-20', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'residencial', null,
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868hrbjmw', null, null
),

-- 8. INT_Angelinos_COM
(
  gen_random_uuid(),
  'INT_Angelinos_COM',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-20', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'projeto_interiores',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868hnuguq', null, null
),

-- 9. ARQ+INT_Tc Thiago_RES (projeto arquitetônico completo)
(
  gen_random_uuid(),
  'ARQ+INT_Tc Thiago_RES',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-19', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'residencial', 'projeto_arquitetonico_completo',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868hnugh2', null, null
),

-- 10. INT_Adata_CORP
(
  gen_random_uuid(),
  'INT_Adata_CORP',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-18', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'projeto_interiores',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868hce547', null, null
),

-- 11. INT_Bronco_COM
(
  gen_random_uuid(),
  'INT_Bronco_COM',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-18', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'projeto_interiores',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868gcmtca', null, null
),

-- 12. ARQ_Eduardo Atibaia_COM
(
  gen_random_uuid(),
  'ARQ_Eduardo Atibaia_COM',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2026-05-18', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  'comercial', 'projeto_arquitetonico',
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868fb49um', null, null
),

-- 13. Reunião (⚠️ vencido: 25/11/2025 — possível tarefa interna)
(
  gen_random_uuid(),
  'Reunião',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2025-11-25', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  null, null,
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868d396n7', null, null
),

-- 14. Aguardar a confirmação da reunião do Aldo (⚠️ vencido: 27/10/2025 — possível tarefa interna)
(
  gen_random_uuid(),
  'Aguardar a confirmação da reunião do Aldo (apenas finalização de Executivo)',
  null, null,
  (SELECT id FROM pipeline_stages WHERE LOWER(name) LIKE '%contrato%' LIMIT 1),
  '08051ddf-f2b1-4ada-85d5-e94a6bb9cd2b',
  null, 50, '2025-10-27', null,
  'open', null, NOW(), NOW(),
  false, null, null,
  'outros', null,
  null, null,
  'morno', 'media',
  null, null,
  ARRAY[]::text[], 'ClickUp: https://app.clickup.com/t/868cn8z6g', null, null
)

ON CONFLICT DO NOTHING;
