-- =====================================================
-- DIAGNÓSTICO: Verificar se trigger está criado
-- =====================================================

-- 1. Verificar se os campos existem na tabela tasks
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('is_project_task', 'projeto_area', 'project_id')
ORDER BY column_name;

-- 2. Verificar se o campo existe na tabela subtasks
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subtasks'
  AND column_name = 'projeto_etapa';

-- 3. Verificar se a função existe
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('criar_tarefa_projeto', 'sync_projeto_from_subtask')
ORDER BY routine_name;

-- 4. Verificar se os triggers existem
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_criar_tarefa_projeto', 'trigger_sync_projeto_subtask_insert')
ORDER BY trigger_name;

-- 5. Verificar projetos criados recentemente
SELECT
  id,
  nome,
  created_by,
  created_at
FROM projetos
ORDER BY created_at DESC
LIMIT 5;

-- 6. Verificar se existem tasks de projeto
SELECT
  t.id,
  t.title,
  t.project_id,
  t.is_project_task,
  t.created_at,
  p.nome as projeto_nome
FROM tasks t
LEFT JOIN projetos p ON t.project_id = p.id
WHERE t.is_project_task = true
ORDER BY t.created_at DESC
LIMIT 5;

-- 7. Verificar subtasks de tarefas de projeto
SELECT
  s.id,
  s.title,
  s.projeto_etapa,
  s.task_id,
  t.title as task_title,
  s.created_at
FROM subtasks s
JOIN tasks t ON s.task_id = t.id
WHERE s.projeto_etapa IS NOT NULL
ORDER BY s.created_at DESC
LIMIT 10;
