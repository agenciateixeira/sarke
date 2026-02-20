-- =====================================================
-- LIMPAR: Remover subtarefas antigas de projetos
-- =====================================================
-- Remove as subtarefas antigas (4 subtarefas genéricas)
-- Para depois criar as novas (15 subtarefas específicas)
-- =====================================================

-- 1. Ver as subtarefas que serão deletadas
SELECT
  p.nome as projeto,
  t.title as tarefa,
  s.title as subtarefa,
  s.projeto_etapa,
  s.created_at
FROM subtasks s
JOIN tasks t ON s.task_id = t.id
JOIN projetos p ON t.project_id = p.id
WHERE t.is_project_task = true
ORDER BY p.created_at DESC, s.order_index;

-- 2. Deletar TODAS as subtarefas de tarefas de projeto
-- (elas serão recriadas automaticamente quando criar novos projetos)
DELETE FROM subtasks
WHERE task_id IN (
  SELECT id FROM tasks WHERE is_project_task = true
);

-- 3. Verificar que foram deletadas
SELECT
  COUNT(*) as subtarefas_restantes
FROM subtasks s
JOIN tasks t ON s.task_id = t.id
WHERE t.is_project_task = true;

-- IMPORTANTE: Após executar isso, crie um NOVO projeto para testar
-- O trigger vai criar automaticamente as 15 subtarefas corretas
