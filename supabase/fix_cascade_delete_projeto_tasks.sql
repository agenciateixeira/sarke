-- =====================================================
-- FIX CASCADE DELETE: Limpar dados órfãos antes de adicionar constraint
-- =====================================================

-- 1. PRIMEIRO: Deletar tarefas órfãs (que apontam para projetos que não existem)
DELETE FROM tasks
WHERE project_id IS NOT NULL
  AND project_id NOT IN (SELECT id FROM projetos);

-- Verificar quantas foram deletadas
SELECT COUNT(*) as tarefas_orfaos_deletadas
FROM tasks
WHERE project_id IS NOT NULL
  AND project_id NOT IN (SELECT id FROM projetos);

-- 2. Dropar a constraint antiga (se existir)
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Buscar nome da constraint
  SELECT conname INTO constraint_name_var
  FROM pg_constraint
  WHERE conrelid = 'tasks'::regclass
    AND contype = 'f'
    AND confrelid = 'projetos'::regclass
  LIMIT 1;

  -- Se encontrou, dropar
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT ' || constraint_name_var;
    RAISE NOTICE 'Constraint % removida', constraint_name_var;
  ELSE
    RAISE NOTICE 'Nenhuma constraint encontrada para dropar';
  END IF;
END $$;

-- 3. Adicionar nova constraint COM CASCADE DELETE
ALTER TABLE tasks
ADD CONSTRAINT tasks_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projetos(id)
ON DELETE CASCADE;

-- 4. Verificar que funcionou
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  CASE confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS delete_action
FROM pg_constraint
WHERE conrelid = 'tasks'::regclass
  AND confrelid = 'projetos'::regclass;

-- 5. Testar: Ver relação entre projetos e tarefas
SELECT
  p.id as projeto_id,
  p.nome as projeto_nome,
  COUNT(t.id) as total_tarefas
FROM projetos p
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.nome
ORDER BY p.created_at DESC
LIMIT 10;
