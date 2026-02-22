-- =====================================================
-- TESTE: Verificar por que o trigger está falando
-- =====================================================

-- 1. Ver o deal que você está tentando atualizar (último modificado)
SELECT
  d.id,
  d.title,
  d.client_id,
  d.value,
  d.original_value,
  d.stage_id,
  d.owner_id,
  c.name as client_name,
  c.company_name,
  c.email as client_email,
  s.name as stage_name
FROM deals d
LEFT JOIN clients c ON c.id = d.client_id
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
ORDER BY d.updated_at DESC
LIMIT 1;

-- 2. Ver se o cliente existe
SELECT
  d.client_id,
  CASE WHEN d.client_id IS NULL THEN '❌ SEM CLIENTE' ELSE '✅ TEM CLIENTE' END as has_client,
  c.name,
  c.company_name,
  c.email
FROM deals d
LEFT JOIN clients c ON c.id = d.client_id
ORDER BY d.updated_at DESC
LIMIT 1;

-- 3. Ver se existe etapa de negociação
SELECT
  id,
  name,
  CASE WHEN name ILIKE '%negocia%' THEN '✅ MATCH' ELSE '❌ NO MATCH' END as matches
FROM pipeline_stages;

-- 4. Teste manual do trigger
-- IMPORTANTE: Copie o ID do deal acima e cole aqui
DO $$
DECLARE
  v_deal_id UUID := (SELECT id FROM deals ORDER BY updated_at DESC LIMIT 1);
  v_old_value NUMERIC;
  v_new_value NUMERIC;
  v_client_name TEXT;
  v_stage_negociacao UUID;
BEGIN
  -- Pegar valores do deal
  SELECT value, original_value INTO v_new_value, v_old_value
  FROM deals WHERE id = v_deal_id;

  RAISE NOTICE 'Deal ID: %', v_deal_id;
  RAISE NOTICE 'Valor Original: %', v_old_value;
  RAISE NOTICE 'Valor Atual: %', v_new_value;

  -- Testar busca do cliente
  SELECT
    COALESCE(c.name, c.company_name, c.email, 'Cliente não identificado')
  INTO v_client_name
  FROM deals d
  LEFT JOIN clients c ON c.id = d.client_id
  WHERE d.id = v_deal_id;

  RAISE NOTICE 'Cliente encontrado: %', v_client_name;

  -- Testar busca da etapa
  SELECT id INTO v_stage_negociacao
  FROM pipeline_stages WHERE name ILIKE '%negocia%' LIMIT 1;

  RAISE NOTICE 'Etapa negociação encontrada: %', COALESCE(v_stage_negociacao::TEXT, 'NÃO ENCONTRADA');

  -- Verificar se deveria mover
  IF v_new_value < v_old_value THEN
    RAISE NOTICE '✅ DEVERIA CRIAR TASK - Valor diminuiu de % para %', v_old_value, v_new_value;
  ELSE
    RAISE NOTICE '❌ NÃO DEVERIA CRIAR TASK - Valor não diminuiu';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERRO NO TRIGGER: %', SQLERRM;
END $$;

-- 5. Verificar se há erros no log do PostgreSQL
-- (Isso vai mostrar warnings do RAISE WARNING)
SELECT
  NOW() as current_time,
  'Verifique os NOTICE acima para ver o que está acontecendo' as instruction;
