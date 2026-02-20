-- =====================================================
-- TESTE: Verificar se as 15 subtarefas estão sendo criadas
-- =====================================================

-- 1. Verificar a função existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'criar_tarefa_projeto';

-- 2. Verificar subtarefas de projetos recentes
SELECT
  p.nome as projeto_nome,
  p.created_at as projeto_criado_em,
  t.title as tarefa_titulo,
  COUNT(s.id) as total_subtarefas,
  COUNT(s.id) FILTER (WHERE s.projeto_etapa = 'planejamento') as planejamento,
  COUNT(s.id) FILTER (WHERE s.projeto_etapa = 'planta_baixa') as planta_baixa,
  COUNT(s.id) FILTER (WHERE s.projeto_etapa = '3d') as modelo_3d,
  COUNT(s.id) FILTER (WHERE s.projeto_etapa = 'executivo') as executivo
FROM projetos p
LEFT JOIN tasks t ON t.project_id = p.id AND t.is_project_task = true
LEFT JOIN subtasks s ON s.task_id = t.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.nome, p.created_at, t.title
ORDER BY p.created_at DESC;

-- 3. Listar todas as subtarefas agrupadas por etapa
SELECT
  s.projeto_etapa as etapa,
  s.order_index as ordem,
  s.title as titulo,
  s.description as descricao,
  s.priority as prioridade,
  t.title as tarefa_pai,
  p.nome as projeto_nome
FROM subtasks s
JOIN tasks t ON s.task_id = t.id
JOIN projetos p ON t.project_id = p.id
WHERE t.is_project_task = true
  AND p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC, s.order_index ASC;

-- 4. Contagem por etapa
SELECT
  projeto_etapa,
  COUNT(*) as quantidade
FROM subtasks s
JOIN tasks t ON s.task_id = t.id
WHERE t.is_project_task = true
  AND t.created_at > NOW() - INTERVAL '7 days'
GROUP BY projeto_etapa
ORDER BY projeto_etapa;
