-- =====================================================
-- DIAGNÓSTICO COMPLETO: Por que automação não funciona
-- =====================================================

-- 1. Verificar se os triggers estão ativos
SELECT
  tgname as trigger_name,
  tgenabled as status,
  CASE tgenabled
    WHEN 'O' THEN '✅ ATIVO'
    WHEN 'D' THEN '❌ DESABILITADO'
    ELSE '⚠️ OUTRO'
  END as status_text,
  CASE tgtype & 1
    WHEN 1 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE tgtype & 66
    WHEN 2 THEN 'INSERT'
    WHEN 4 THEN 'DELETE'
    WHEN 8 THEN 'UPDATE'
    ELSE 'MULTIPLE'
  END as event
FROM pg_trigger
WHERE tgrelid = 'deals'::regclass
  AND tgname IN (
    'set_original_value_on_insert',
    'create_tasks_before_value_change',
    'change_stage_after_value_change'
  )
ORDER BY tgname;

-- 2. Ver um deal específico
SELECT
  id,
  title,
  value,
  original_value,
  stage_id,
  (SELECT name FROM pipeline_stages WHERE id = deals.stage_id) as stage_name,
  updated_at
FROM deals
ORDER BY updated_at DESC
LIMIT 3;

-- 3. Teste MANUAL de UPDATE
-- Pegar o último deal e diminuir o valor
DO $$
DECLARE
  v_deal_id UUID;
  v_old_value NUMERIC;
  v_new_value NUMERIC := 100;
  v_stage_before UUID;
  v_stage_after UUID;
  v_tasks_before INT;
  v_tasks_after INT;
BEGIN
  -- Pegar último deal
  SELECT id, value, stage_id
  INTO v_deal_id, v_old_value, v_stage_before
  FROM deals
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Contar tasks antes
  SELECT COUNT(*) INTO v_tasks_before
  FROM deal_activities
  WHERE deal_id = v_deal_id AND type = 'task';

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE MANUAL DE AUTOMAÇÃO';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Deal ID: %', v_deal_id;
  RAISE NOTICE 'Valor Antes: %', v_old_value;
  RAISE NOTICE 'Valor Novo: %', v_new_value;
  RAISE NOTICE 'Stage Antes: %', v_stage_before;
  RAISE NOTICE 'Tasks Antes: %', v_tasks_before;
  RAISE NOTICE '───────────────────────────────────────';
  RAISE NOTICE 'Executando UPDATE...';

  -- Fazer UPDATE
  UPDATE deals
  SET value = v_new_value
  WHERE id = v_deal_id;

  -- Esperar um momento
  PERFORM pg_sleep(0.5);

  -- Verificar resultado
  SELECT stage_id INTO v_stage_after
  FROM deals WHERE id = v_deal_id;

  SELECT COUNT(*) INTO v_tasks_after
  FROM deal_activities
  WHERE deal_id = v_deal_id AND type = 'task';

  RAISE NOTICE '───────────────────────────────────────';
  RAISE NOTICE 'RESULTADO:';
  RAISE NOTICE 'Stage Depois: %', v_stage_after;
  RAISE NOTICE 'Tasks Depois: %', v_tasks_after;

  IF v_stage_after != v_stage_before THEN
    RAISE NOTICE '✅ Stage MUDOU!';
  ELSE
    RAISE NOTICE '❌ Stage NÃO MUDOU';
  END IF;

  IF v_tasks_after > v_tasks_before THEN
    RAISE NOTICE '✅ Task CRIADA! (% novas)', v_tasks_after - v_tasks_before;
  ELSE
    RAISE NOTICE '❌ Task NÃO CRIADA';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERRO: %', SQLERRM;
END $$;

-- 4. Ver últimas tasks criadas
SELECT
  da.id,
  da.deal_id,
  da.type,
  da.title,
  da.created_at,
  d.title as deal_title
FROM deal_activities da
JOIN deals d ON d.id = da.deal_id
WHERE da.type = 'task'
ORDER BY da.created_at DESC
LIMIT 5;

-- 5. Ver warnings do PostgreSQL (se houver)
-- Isso mostraria os RAISE WARNING que colocamos
SELECT 'Verifique os NOTICE acima para ver o que aconteceu' as instruction;
