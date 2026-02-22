-- Ver todas as etapas do pipeline
SELECT
  id,
  name,
  CASE
    WHEN name ILIKE '%negocia%' THEN '✅ MATCH para Negociação'
    WHEN name ILIKE '%fechamento%' THEN '✅ MATCH para Fechamento'
    ELSE '❌ Sem match'
  END as pattern_match
FROM pipeline_stages
ORDER BY name;

-- Testar se o trigger encontra as etapas
DO $$
DECLARE
  v_stage_negociacao UUID;
  v_stage_fechamento UUID;
BEGIN
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name ILIKE '%negocia%' LIMIT 1;
  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name ILIKE '%fechamento%' LIMIT 1;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Etapa Negociação ID: %', COALESCE(v_stage_negociacao::TEXT, '❌ NÃO ENCONTRADA');
  RAISE NOTICE 'Etapa Fechamento ID: %', COALESCE(v_stage_fechamento::TEXT, '❌ NÃO ENCONTRADA');
  RAISE NOTICE '═══════════════════════════════════════';
END $$;
