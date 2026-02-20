-- =====================================================
-- CASCADE DELETE: Quando deletar projeto, deletar tarefas vinculadas
-- =====================================================

-- 1. Ver a constraint atual de project_id na tabela tasks
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  confdeltype AS delete_action
FROM pg_constraint
WHERE conrelid = 'tasks'::regclass
  AND confrelid = 'projetos'::regclass;

-- 2. Dropar a constraint antiga (se existir) e recriar com ON DELETE CASCADE
-- Primeiro, encontrar o nome exato da constraint
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Buscar nome da constraint
  SELECT conname INTO constraint_name_var
  FROM pg_constraint
  WHERE conrelid = 'tasks'::regclass
    AND confrelid = 'projetos'::regclass
  LIMIT 1;

  -- Se encontrou, dropar
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT ' || constraint_name_var;
    RAISE NOTICE 'Constraint % removida', constraint_name_var;
  END IF;
END $$;

-- 3. Adicionar nova constraint COM CASCADE DELETE
ALTER TABLE tasks
ADD CONSTRAINT tasks_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES projetos(id)
ON DELETE CASCADE;

-- 4. Verificar que a constraint foi criada corretamente
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
