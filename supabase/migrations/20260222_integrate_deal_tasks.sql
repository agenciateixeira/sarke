-- =====================================================
-- INTEGRAÇÃO: deal_activities na página de Tarefas
-- =====================================================

-- Dropar views existentes primeiro
DROP VIEW IF EXISTS tasks_with_details CASCADE;
DROP VIEW IF EXISTS unified_tasks_view CASCADE;

-- Criar view que combina tasks de pipeline_columns E deal_activities
CREATE OR REPLACE VIEW unified_tasks_view AS
-- Tasks normais do sistema
SELECT
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.due_date,
  t.completed_date as completed_at,
  t.column_id,
  t.order_in_column,
  t.assigned_to,
  t.created_by,
  t.created_at,
  t.updated_at,
  t.is_archived,
  NULL::UUID as deal_id,
  NULL::TEXT as deal_title,
  'pipeline' as source
FROM tasks t
WHERE t.is_archived = false

UNION ALL

-- Tasks de deals (deal_activities)
SELECT
  da.id,
  da.title,
  da.description,
  'todo' as status, -- Mapear para status da task
  CASE
    WHEN da.title ILIKE '%urgente%' THEN 'urgent'
    WHEN da.title ILIKE '%alta%' OR da.title ILIKE '%reduz%' THEN 'high'
    ELSE 'medium'
  END as priority,
  da.due_date,
  da.completed_at,
  NULL::UUID as column_id, -- Deal tasks não têm coluna
  0 as order_in_column,
  da.created_by as assigned_to,
  da.created_by,
  da.created_at,
  da.created_at as updated_at,
  false as is_archived,
  da.deal_id,
  d.title as deal_title,
  'deal' as source
FROM deal_activities da
LEFT JOIN deals d ON d.id = da.deal_id
WHERE da.type = 'task' -- Apenas atividades do tipo task
  AND da.completed_at IS NULL; -- Apenas não completadas

-- Comentar a view
COMMENT ON VIEW unified_tasks_view IS 'View unificada que combina tasks do pipeline E tasks de deals (deal_activities)';

-- Agora modificar a view tasks_with_details para incluir as informações de deal
CREATE OR REPLACE VIEW tasks_with_details AS
SELECT
  t.*,
  p.name as assigned_to_name,
  p.email as assigned_to_email,
  c.name as creator_name,
  c.email as creator_email,
  col.name as column_name,
  col.color as column_color,
  -- Informações do deal (se for task de deal)
  t.deal_id,
  t.deal_title,
  t.source
FROM unified_tasks_view t
LEFT JOIN profiles p ON p.id = t.assigned_to
LEFT JOIN profiles c ON c.id = t.created_by
LEFT JOIN pipeline_columns col ON col.id = t.column_id
ORDER BY
  CASE
    WHEN t.source = 'deal' THEN 0 -- Deal tasks primeiro
    ELSE 1
  END,
  t.created_at DESC;

SELECT '✅ Views criadas com sucesso!' as message;
SELECT 'Agora a página de Tarefas vai mostrar:' as info;
SELECT '  • Tasks do pipeline normal' as item_1;
SELECT '  • Tasks de deals (automações)' as item_2;
SELECT '  • Marcadas com source="deal" ou "pipeline"' as item_3;
