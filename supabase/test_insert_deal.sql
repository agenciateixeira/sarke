-- =====================================================
-- TESTE: Inserir deal manualmente para ver erro
-- =====================================================

-- Tentar inserir um deal simples
DO $$
DECLARE
  v_deal_id UUID;
  v_stage_id UUID;
  v_client_id UUID;
BEGIN
  -- Pegar primeira etapa
  SELECT id INTO v_stage_id FROM pipeline_stages LIMIT 1;

  -- Pegar primeiro cliente
  SELECT id INTO v_client_id FROM clients LIMIT 1;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Tentando criar deal...';
  RAISE NOTICE 'Stage ID: %', v_stage_id;
  RAISE NOTICE 'Client ID: %', v_client_id;
  RAISE NOTICE '═══════════════════════════════════════';

  INSERT INTO deals (
    title,
    stage_id,
    client_id,
    value,
    status,
    created_at,
    updated_at
  ) VALUES (
    'Deal de Teste SQL',
    v_stage_id,
    v_client_id,
    5000,
    'open',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_deal_id;

  RAISE NOTICE '✅ Deal criado com sucesso! ID: %', v_deal_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERRO AO CRIAR DEAL: %', SQLERRM;
  RAISE NOTICE 'Detail: %', SQLSTATE;
END $$;

-- Ver se o deal foi criado
SELECT
  id,
  title,
  value,
  original_value,
  created_at
FROM deals
WHERE title = 'Deal de Teste SQL'
ORDER BY created_at DESC
LIMIT 1;
