-- =====================================================
-- TESTE FORÇADO: Mudança de etapa
-- =====================================================

-- 1. Ver estado atual
SELECT
  d.id,
  d.title,
  d.value,
  d.original_value,
  d.stage_id,
  s.name as stage_name
FROM deals d
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.id = '363d1700-d68e-4caa-aa94-b3a41a8c0186';

-- 2. Mudar diretamente para Negociação
UPDATE deals
SET stage_id = (SELECT id FROM pipeline_stages WHERE name = 'Negociação')
WHERE id = '363d1700-d68e-4caa-aa94-b3a41a8c0186';

-- 3. Verificar se mudou
SELECT
  d.id,
  d.title,
  d.value,
  d.original_value,
  d.stage_id,
  s.name as stage_name
FROM deals d
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.id = '363d1700-d68e-4caa-aa94-b3a41a8c0186';

-- 4. Agora vamos olhar o código do trigger para debug
SELECT pg_get_functiondef((
  SELECT pg_trigger.tgfoid
  FROM pg_trigger
  WHERE tgname = 'check_value_change_trigger'
    AND tgrelid = 'deals'::regclass
  LIMIT 1
));

-- 5. Verificar se há OUTRO trigger que pode estar interferindo
SELECT
  tgname,
  CASE tgtype & 1 WHEN 1 THEN 'BEFORE' ELSE 'AFTER' END as timing,
  tgenabled,
  substring(pg_get_triggerdef(oid) from 'EXECUTE (FUNCTION|PROCEDURE) ([a-zA-Z_]+)') as function_name
FROM pg_trigger
WHERE tgrelid = 'deals'::regclass
  AND NOT tgisinternal
  AND tgenabled = 'O'
ORDER BY
  CASE tgtype & 1 WHEN 1 THEN 1 ELSE 2 END, -- BEFORE primeiro
  tgname;
