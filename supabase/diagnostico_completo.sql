-- =====================================================
-- DIAGNÓSTICO COMPLETO - TAREFAS DE PROJETO
-- =====================================================

-- 1. Verificar se as tarefas de projeto existem na tabela tasks
SELECT
  id,
  title,
  is_project_task,
  project_id,
  projeto_area,
  status,
  created_by,
  created_at
FROM tasks
WHERE is_project_task = true
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar se a VIEW tasks_with_details existe
SELECT
  viewname,
  definition
FROM pg_views
WHERE viewname = 'tasks_with_details';

-- 3. Tentar consultar a view tasks_with_details
SELECT
  id,
  title,
  is_project_task,
  project_id,
  project_name,
  is_archived,
  created_at
FROM tasks_with_details
WHERE is_project_task = true
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar RLS (Row Level Security) na tabela tasks
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tasks';

-- 5. Verificar se o campo is_archived existe e seu valor
SELECT
  id,
  title,
  is_project_task,
  is_archived,
  COALESCE(is_archived, false) as is_archived_coalesce
FROM tasks
WHERE is_project_task = true
ORDER BY created_at DESC
LIMIT 10;

-- 6. Contar tarefas de projeto
SELECT
  COUNT(*) as total_project_tasks,
  COUNT(*) FILTER (WHERE is_archived = true) as archived,
  COUNT(*) FILTER (WHERE is_archived = false) as not_archived,
  COUNT(*) FILTER (WHERE is_archived IS NULL) as null_archived
FROM tasks
WHERE is_project_task = true;

-- 7. Verificar se os projetos têm tarefas vinculadas
SELECT
  p.id as projeto_id,
  p.nome as projeto_nome,
  p.created_at as projeto_created_at,
  t.id as task_id,
  t.title as task_title,
  t.is_project_task,
  t.is_archived
FROM projetos p
LEFT JOIN tasks t ON t.project_id = p.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC;
