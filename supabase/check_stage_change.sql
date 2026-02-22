-- Ver qual etapa o deal "teste" está
SELECT
  d.id,
  d.title,
  d.value,
  d.original_value,
  d.stage_id,
  s.name as stage_atual,
  d.stage_updated_at
FROM deals d
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.title = 'teste';

-- Ver se o trigger AFTER está ativo
SELECT
  tgname,
  tgenabled,
  CASE tgenabled WHEN 'O' THEN 'ATIVO' ELSE 'DESABILITADO' END as status
FROM pg_trigger
WHERE tgrelid = 'deals'::regclass
  AND tgname = 'change_stage_after_value_change';

-- Ver código do trigger AFTER
SELECT pg_get_functiondef((
  SELECT tgfoid FROM pg_trigger
  WHERE tgname = 'change_stage_after_value_change'
    AND tgrelid = 'deals'::regclass
));
