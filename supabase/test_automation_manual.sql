-- =====================================================
-- TESTE MANUAL: Executar automação em um deal específico
-- =====================================================

-- INSTRUÇÕES:
-- 1. Substitua 'SEU_DEAL_ID_AQUI' pelo ID do deal que você quer testar
-- 2. Execute este script no SQL Editor

-- Teste: Processar todas as automações de "value_changed" para um deal
SELECT process_deal_automations(
  'SEU_DEAL_ID_AQUI'::uuid,  -- <-- SUBSTITUA PELO ID DO SEU DEAL
  'value_changed'
);

-- Ver resultado imediato
SELECT
  l.executed_at,
  l.status,
  l.error_message,
  r.name as rule_name,
  l.action_result
FROM pipeline_automation_logs l
JOIN pipeline_automation_rules r ON r.id = l.rule_id
WHERE l.deal_id = 'SEU_DEAL_ID_AQUI'::uuid  -- <-- SUBSTITUA PELO ID DO SEU DEAL
ORDER BY l.executed_at DESC
LIMIT 5;
