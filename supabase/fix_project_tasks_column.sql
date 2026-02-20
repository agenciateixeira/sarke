-- =====================================================
-- CORREÇÃO: Atribuir column_id para tarefas de projeto existentes
-- =====================================================
-- Executar DEPOIS de executar a migration atualizada
-- =====================================================

-- Atualizar todas as tarefas de projeto que não têm coluna
-- Atribui à primeira coluna (menor order_index)
UPDATE tasks
SET column_id = (
  SELECT id
  FROM pipeline_columns
  ORDER BY order_index ASC
  LIMIT 1
)
WHERE is_project_task = true
  AND column_id IS NULL;

-- Verificar resultado
SELECT
  id,
  title,
  is_project_task,
  column_id,
  project_id
FROM tasks
WHERE is_project_task = true
ORDER BY created_at DESC;
