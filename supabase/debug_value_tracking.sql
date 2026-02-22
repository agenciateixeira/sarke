-- =====================================================
-- DEBUG: Value Tracking Automation
-- =====================================================

-- 1. Verificar se o trigger existe e está ativo
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname IN ('check_value_change_trigger', 'set_original_value_on_insert')
  AND tgrelid = 'deals'::regclass;

-- 2. Ver todos os nomes das etapas do pipeline
SELECT
  id,
  name,
  CASE
    WHEN name ILIKE '%negocia%' THEN '✅ MATCH Negociação'
    WHEN name ILIKE '%fechamento%' THEN '✅ MATCH Fechamento'
    ELSE '❌ NO MATCH'
  END as pattern_match
FROM pipeline_stages
ORDER BY name;

-- 3. Testar se as etapas são encontradas pela função
DO $$
DECLARE
  v_stage_negociacao UUID;
  v_stage_fechamento UUID;
BEGIN
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name ILIKE '%negocia%' LIMIT 1;
  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name ILIKE '%fechamento%' LIMIT 1;

  RAISE NOTICE 'Etapa Negociação encontrada: %', COALESCE(v_stage_negociacao::TEXT, 'NÃO ENCONTRADA');
  RAISE NOTICE 'Etapa Fechamento encontrada: %', COALESCE(v_stage_fechamento::TEXT, 'NÃO ENCONTRADA');
END $$;

-- 4. Ver todos os deals com seus valores (original vs atual)
SELECT
  id,
  title,
  original_value,
  value as current_value,
  value - original_value as difference,
  CASE
    WHEN value < original_value THEN '📉 DIMINUIU'
    WHEN value > original_value THEN '📈 AUMENTOU'
    ELSE '➡️ IGUAL'
  END as change_type,
  stage_id,
  (SELECT name FROM pipeline_stages WHERE id = deals.stage_id) as current_stage,
  owner_id
FROM deals
WHERE original_value IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verificar se há deals sem owner_id (necessário para notificações)
SELECT
  COUNT(*) as total_deals,
  COUNT(owner_id) as deals_with_owner,
  COUNT(*) - COUNT(owner_id) as deals_without_owner
FROM deals;

-- 6. Testar a função manualmente com um deal específico
-- Primeiro, vamos ver qual deal você testou
SELECT
  id,
  title,
  original_value,
  value,
  stage_id,
  (SELECT name FROM pipeline_stages WHERE id = deals.stage_id) as stage_name,
  owner_id
FROM deals
ORDER BY updated_at DESC
LIMIT 5;

-- 7. Ver logs de atividades criadas recentemente (tasks de valor reduzido)
SELECT
  da.id,
  da.deal_id,
  da.type,
  da.title,
  da.description,
  da.created_at,
  d.title as deal_title
FROM deal_activities da
JOIN deals d ON d.id = da.deal_id
WHERE da.title ILIKE '%valor%'
ORDER BY da.created_at DESC
LIMIT 10;

-- 8. Ver notificações criadas recentemente sobre valor
SELECT
  n.id,
  n.title,
  n.message,
  n.deal_id,
  n.created_at,
  d.title as deal_title
FROM notifications n
JOIN deals d ON d.id = n.deal_id
WHERE n.title ILIKE '%valor%'
ORDER BY n.created_at DESC
LIMIT 10;

-- 9. Verificar ordem dos triggers (importante - check_value_change deve rodar BEFORE)
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
  END as event
FROM pg_trigger
WHERE tgrelid = 'deals'::regclass
  AND NOT tgisinternal
ORDER BY tgname;

SELECT '✅ Debug concluído! Verifique os resultados acima.' as message;
