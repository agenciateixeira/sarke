-- =====================================================
-- TESTE: Automação no deal "teste"
-- =====================================================

-- 1. Ver informações do deal
SELECT
  id,
  title,
  stage_id,
  value,
  temperature,
  status,
  business_type,
  lead_source
FROM deals
WHERE id = '363d1700-d68e-4caa-aa94-b3a41a8c0186';

-- 2. Ver qual etapa o deal está
SELECT
  d.title as deal_title,
  s.name as stage_name,
  s.id as stage_id
FROM deals d
JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.id = '363d1700-d68e-4caa-aa94-b3a41a8c0186';

-- 3. Ver todas as regras ativas de value_changed
SELECT
  id,
  name,
  is_active,
  trigger_type,
  conditions,
  action_type,
  action_params
FROM pipeline_automation_rules
WHERE trigger_type = 'value_changed'
AND is_active = true;

-- 4. Testar se as condições são atendidas para cada regra
DO $$
DECLARE
  v_rule RECORD;
  v_conditions_met BOOLEAN;
BEGIN
  FOR v_rule IN
    SELECT id, name, conditions
    FROM pipeline_automation_rules
    WHERE trigger_type = 'value_changed' AND is_active = true
  LOOP
    v_conditions_met := check_automation_conditions(
      '363d1700-d68e-4caa-aa94-b3a41a8c0186'::uuid,
      v_rule.conditions
    );

    RAISE NOTICE 'Regra "%": Condições atendidas = %', v_rule.name, v_conditions_met;
  END LOOP;
END $$;

-- 5. Executar automações manualmente
SELECT process_deal_automations(
  '363d1700-d68e-4caa-aa94-b3a41a8c0186'::uuid,
  'value_changed'
);

-- 6. Ver logs criados
SELECT
  l.executed_at,
  l.status,
  l.error_message,
  r.name as rule_name,
  r.trigger_type,
  r.action_type,
  l.trigger_data,
  l.action_result
FROM pipeline_automation_logs l
JOIN pipeline_automation_rules r ON r.id = l.rule_id
WHERE l.deal_id = '363d1700-d68e-4caa-aa94-b3a41a8c0186'
ORDER BY l.executed_at DESC
LIMIT 10;

-- 7. Ver se a etapa mudou
SELECT
  d.title as deal_title,
  s.name as stage_name,
  d.value,
  d.updated_at
FROM deals d
JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.id = '363d1700-d68e-4caa-aa94-b3a41a8c0186';
