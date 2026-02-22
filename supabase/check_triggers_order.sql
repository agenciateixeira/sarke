-- =====================================================
-- VERIFICAR: Ordem dos triggers e possíveis conflitos
-- =====================================================

-- 1. Ver TODOS os triggers na tabela deals
SELECT
  tgname as trigger_name,
  CASE tgtype & 1
    WHEN 1 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE tgtype & 66
    WHEN 2 THEN 'INSERT'
    WHEN 4 THEN 'DELETE'
    WHEN 8 THEN 'UPDATE'
    WHEN 16 THEN 'TRUNCATE'
    ELSE 'MULTIPLE'
  END as event,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    ELSE tgenabled::TEXT
  END as status,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'deals'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

-- 2. Testar manualmente a mudança de etapa
DO $$
DECLARE
  v_deal_id UUID := '363d1700-d68e-4caa-aa94-b3a41a8c0186';
  v_stage_negociacao UUID;
  v_current_stage UUID;
  v_current_value NUMERIC;
BEGIN
  -- Pegar estado atual
  SELECT stage_id, value INTO v_current_stage, v_current_value
  FROM deals WHERE id = v_deal_id;

  -- Pegar ID da etapa Negociação
  SELECT id INTO v_stage_negociacao
  FROM pipeline_stages WHERE name = 'Negociação';

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE MANUAL DE MUDANÇA DE ETAPA';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Deal ID: %', v_deal_id;
  RAISE NOTICE 'Etapa Atual ID: %', v_current_stage;
  RAISE NOTICE 'Etapa Negociação ID: %', v_stage_negociacao;
  RAISE NOTICE 'Valor Atual: %', v_current_value;
  RAISE NOTICE '───────────────────────────────────────';

  -- Tentar diminuir valor (isso deveria acionar o trigger)
  RAISE NOTICE 'Diminuindo valor para 1500...';
  UPDATE deals
  SET value = 1500
  WHERE id = v_deal_id;

  -- Verificar se mudou
  SELECT stage_id INTO v_current_stage
  FROM deals WHERE id = v_deal_id;

  RAISE NOTICE 'Etapa APÓS UPDATE: %', v_current_stage;

  IF v_current_stage = v_stage_negociacao THEN
    RAISE NOTICE '✅ MUDOU PARA NEGOCIAÇÃO!';
  ELSE
    RAISE NOTICE '❌ NÃO MUDOU! Ainda está em: %',
      (SELECT name FROM pipeline_stages WHERE id = v_current_stage);
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- 3. Ver resultado final
SELECT
  d.id,
  d.title,
  d.value,
  d.original_value,
  s.name as stage_name,
  d.updated_at
FROM deals d
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.id = '363d1700-d68e-4caa-aa94-b3a41a8c0186';
