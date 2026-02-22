-- =====================================================
-- DEBUG: Verificar automações
-- =====================================================

-- 1. Ver todas as regras e seu status
SELECT
  id,
  name,
  is_active,
  trigger_type,
  action_type,
  conditions,
  action_params,
  execution_count,
  last_execution_at
FROM pipeline_automation_rules
ORDER BY priority;

-- 2. Ver logs recentes de execução
SELECT
  l.id,
  l.executed_at,
  l.status,
  l.error_message,
  r.name as rule_name,
  l.trigger_data,
  l.action_result
FROM pipeline_automation_logs l
JOIN pipeline_automation_rules r ON r.id = l.rule_id
ORDER BY l.executed_at DESC
LIMIT 20;

-- 3. Ver ações executadas
SELECT
  a.id,
  a.created_at,
  a.action_type,
  a.action_details,
  a.previous_state,
  a.can_undo,
  a.undone_at
FROM pipeline_automation_actions a
ORDER BY a.created_at DESC
LIMIT 20;

-- 4. Verificar se trigger está ativo
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype
FROM pg_trigger
WHERE tgname = 'deals_automation_trigger';

-- 5. Verificar último deal atualizado
SELECT
  id,
  title,
  stage_id,
  value,
  temperature,
  updated_at
FROM deals
ORDER BY updated_at DESC
LIMIT 5;
