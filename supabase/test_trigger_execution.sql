-- =====================================================
-- TESTE: Verificar execução do trigger
-- =====================================================

-- 1. Verificar se o trigger está ativo
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN '✅ ATIVO'
    WHEN 'D' THEN '❌ DESATIVADO'
    ELSE '⚠️ OUTRO STATUS'
  END as status
FROM pg_trigger
WHERE tgname = 'check_value_change_trigger'
  AND tgrelid = 'deals'::regclass;

-- 2. Ver últimos deals modificados
SELECT
  d.id,
  d.title,
  d.value,
  d.original_value,
  d.stage_id,
  s.name as stage_name,
  d.updated_at
FROM deals d
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
ORDER BY d.updated_at DESC
LIMIT 5;

-- 3. Verificar se as etapas existem com os nomes corretos
SELECT
  id,
  name,
  CASE
    WHEN name ILIKE '%negocia%' THEN '✅ Match Negociação'
    WHEN name ILIKE '%fechamento%' THEN '✅ Match Fechamento'
    ELSE '❌ Não match'
  END as pattern_match
FROM pipeline_stages
ORDER BY name;

-- 4. Ver as últimas 10 tasks criadas (de QUALQUER tipo)
SELECT
  da.id,
  da.deal_id,
  da.type,
  da.title,
  da.description,
  da.created_by,
  da.created_at,
  d.title as deal_title
FROM deal_activities da
LEFT JOIN deals d ON d.id = da.deal_id
ORDER BY da.created_at DESC
LIMIT 10;

-- 5. Contar tasks por tipo
SELECT
  type,
  COUNT(*) as total
FROM deal_activities
GROUP BY type;

-- 6. Ver se há tasks sem created_by (pode estar NULL e causando problemas)
SELECT
  COUNT(*) as total_tasks,
  COUNT(created_by) as tasks_with_creator,
  COUNT(*) - COUNT(created_by) as tasks_without_creator
FROM deal_activities;

-- 7. Testar manualmente o trigger em um deal específico
-- Pegando o último deal atualizado
DO $$
DECLARE
  v_deal_id UUID;
  v_current_value NUMERIC;
  v_original_value NUMERIC;
  v_new_test_value NUMERIC;
BEGIN
  -- Pegar último deal
  SELECT id, value, original_value
  INTO v_deal_id, v_current_value, v_original_value
  FROM deals
  ORDER BY updated_at DESC
  LIMIT 1;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE MANUAL DO TRIGGER';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Deal ID: %', v_deal_id;
  RAISE NOTICE 'Valor Original: %', v_original_value;
  RAISE NOTICE 'Valor Atual: %', v_current_value;

  -- Simular redução de valor
  v_new_test_value := v_original_value - 100;
  RAISE NOTICE 'Valor Teste (reduzido): %', v_new_test_value;

  RAISE NOTICE '───────────────────────────────────────';
  RAISE NOTICE 'Executando UPDATE simulado...';
  RAISE NOTICE '───────────────────────────────────────';

  -- Atualizar com valor reduzido (isso vai disparar o trigger)
  UPDATE deals
  SET value = v_new_test_value
  WHERE id = v_deal_id;

  RAISE NOTICE '✅ UPDATE executado!';
  RAISE NOTICE 'Verifique os NOTICE acima para ver se o trigger foi ativado';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- 8. Ver resultado do teste
SELECT
  d.id,
  d.title,
  d.value,
  d.original_value,
  s.name as stage_name,
  d.updated_at
FROM deals d
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
ORDER BY d.updated_at DESC
LIMIT 1;

-- 9. Ver se task foi criada
SELECT
  da.id,
  da.title,
  da.description,
  da.created_at
FROM deal_activities da
ORDER BY da.created_at DESC
LIMIT 3;
