-- =====================================================
-- DIAGNÓSTICO: Por que deal creation está falhando?
-- =====================================================

-- 1. Ver TODOS os triggers ativos na tabela deals
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgtype::int & 1
    WHEN 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END as level,
  CASE tgtype::int & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE
    WHEN tgtype::int & 4 = 4 THEN 'INSERT'
    WHEN tgtype::int & 8 = 8 THEN 'DELETE'
    WHEN tgtype::int & 16 = 16 THEN 'UPDATE'
    WHEN tgtype::int & 32 = 32 THEN 'TRUNCATE'
  END as event,
  pg_get_functiondef(tgfoid) as function_code
FROM pg_trigger
WHERE tgrelid = 'deals'::regclass
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- 2. Testar INSERT simples com erro detalhado
DO $$
DECLARE
  v_client_id UUID;
  v_stage_id UUID;
  v_pipeline_id UUID;
  v_owner_id UUID;
  v_new_deal_id UUID;
BEGIN
  -- Pegar IDs necessários
  SELECT id INTO v_client_id FROM clients LIMIT 1;
  SELECT id INTO v_stage_id FROM pipeline_stages WHERE name = 'Proposta' LIMIT 1;
  SELECT id INTO v_pipeline_id FROM pipelines LIMIT 1;
  SELECT id INTO v_owner_id FROM profiles LIMIT 1;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE: Criar deal simples';
  RAISE NOTICE 'Client: %', v_client_id;
  RAISE NOTICE 'Stage: %', v_stage_id;
  RAISE NOTICE 'Pipeline: %', v_pipeline_id;
  RAISE NOTICE 'Owner: %', v_owner_id;
  RAISE NOTICE '───────────────────────────────────────';

  -- Tentar INSERT
  BEGIN
    INSERT INTO deals (
      title,
      client_id,
      pipeline_id,
      stage_id,
      owner_id,
      value,
      currency,
      status
    ) VALUES (
      'TESTE DIAGNÓSTICO',
      v_client_id,
      v_pipeline_id,
      v_stage_id,
      v_owner_id,
      5000,
      'BRL',
      'open'
    )
    RETURNING id INTO v_new_deal_id;

    RAISE NOTICE '✅ Deal criado com sucesso! ID: %', v_new_deal_id;

    -- Deletar o deal de teste
    DELETE FROM deals WHERE id = v_new_deal_id;
    RAISE NOTICE '🗑️ Deal de teste deletado';

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO AO CRIAR DEAL:';
    RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
    RAISE NOTICE '   SQLERRM: %', SQLERRM;
    RAISE NOTICE '   CONTEXT: %', PG_EXCEPTION_CONTEXT;
  END;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- 3. Ver se há policies bloqueando INSERT
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'deals'
  AND cmd IN ('ALL', 'INSERT')
ORDER BY policyname;
