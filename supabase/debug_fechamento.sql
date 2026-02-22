-- Ver qual é o valor atual e original do deal teste
SELECT
  d.id,
  d.title,
  d.value as valor_atual,
  d.original_value as valor_original,
  d.value > d.original_value as "aumentou?",
  s.name as etapa_atual
FROM deals d
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.title = 'teste';

-- Simular aumento de valor
DO $$
DECLARE
  v_deal_id UUID;
  v_original NUMERIC;
  v_stage_before UUID;
  v_stage_after UUID;
  v_stage_fechamento UUID;
BEGIN
  -- Pegar deal
  SELECT id, original_value, stage_id
  INTO v_deal_id, v_original, v_stage_before
  FROM deals WHERE title = 'teste';

  -- Pegar ID de Fechamento
  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento';

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Deal: %', v_deal_id;
  RAISE NOTICE 'Original: %', v_original;
  RAISE NOTICE 'Fechamento ID: %', v_stage_fechamento;
  RAISE NOTICE '───────────────────────────────────────';

  -- Atualizar para valor MAIOR que original
  UPDATE deals
  SET value = v_original + 10000
  WHERE id = v_deal_id;

  -- Ver resultado
  SELECT stage_id INTO v_stage_after FROM deals WHERE id = v_deal_id;

  RAISE NOTICE 'Stage antes: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_before);
  RAISE NOTICE 'Stage depois: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_after);

  IF v_stage_after = v_stage_fechamento THEN
    RAISE NOTICE '✅ FOI PARA FECHAMENTO!';
  ELSE
    RAISE NOTICE '❌ NÃO FOI - Está em: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_after);
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;
