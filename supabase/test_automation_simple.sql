-- =====================================================
-- TESTE SIMPLES: Ver se automação funciona
-- =====================================================

-- 1. Status dos triggers
SELECT
  'TRIGGERS' as section,
  tgname as name,
  CASE tgenabled
    WHEN 'O' THEN 'ATIVO'
    WHEN 'D' THEN 'DESABILITADO'
  END as status
FROM pg_trigger
WHERE tgrelid = 'deals'::regclass
  AND tgname IN (
    'set_original_value_on_insert',
    'create_tasks_before_value_change',
    'change_stage_after_value_change'
  );

-- 2. Pegar último deal
WITH last_deal AS (
  SELECT id, title, value, original_value, stage_id
  FROM deals
  ORDER BY updated_at DESC
  LIMIT 1
)
SELECT
  'ULTIMO DEAL' as section,
  id::TEXT,
  title,
  value::TEXT,
  original_value::TEXT,
  (value < original_value)::TEXT as "valor_diminuiu?"
FROM last_deal;

-- 3. Fazer UPDATE de teste
WITH last_deal AS (
  SELECT id FROM deals ORDER BY updated_at DESC LIMIT 1
),
update_result AS (
  UPDATE deals
  SET value = 50
  WHERE id = (SELECT id FROM last_deal)
  RETURNING id, value, stage_id
)
SELECT
  'APOS UPDATE' as section,
  id::TEXT,
  value::TEXT as novo_valor,
  stage_id::TEXT,
  (SELECT name FROM pipeline_stages WHERE id = update_result.stage_id) as stage_name
FROM update_result;

-- 4. Esperar 1 segundo e verificar tasks
SELECT pg_sleep(1);

-- 5. Ver se task foi criada
WITH last_deal AS (
  SELECT id FROM deals ORDER BY updated_at DESC LIMIT 1
)
SELECT
  'TASKS CRIADAS' as section,
  COUNT(*)::TEXT as total_tasks,
  MAX(created_at)::TEXT as ultima_task
FROM deal_activities
WHERE deal_id = (SELECT id FROM last_deal)
  AND type = 'task'
  AND title ILIKE '%valor%';

-- 6. Ver a task mais recente
SELECT
  'ULTIMA TASK' as section,
  title,
  LEFT(description, 100) as descricao_preview,
  created_at::TEXT
FROM deal_activities
WHERE type = 'task'
ORDER BY created_at DESC
LIMIT 1;
