-- =============================================
-- SARKE - FIX TASK COMMENTS FOREIGN KEYS
-- =============================================
-- Adiciona chaves estrangeiras para task_comments
-- =============================================

-- Adicionar chave estrangeira para created_by -> profiles
DO $$
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_comments_created_by_fkey'
    AND table_name = 'task_comments'
  ) THEN
    ALTER TABLE task_comments
    ADD CONSTRAINT task_comments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar chave estrangeira para task_id -> tasks
DO $$
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_comments_task_id_fkey'
    AND table_name = 'task_comments'
  ) THEN
    ALTER TABLE task_comments
    ADD CONSTRAINT task_comments_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================
-- VERIFICAÇÃO
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CHAVES ESTRANGEIRAS ADICIONADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Foreign Keys:';
  RAISE NOTICE '   - task_comments.created_by -> profiles.id';
  RAISE NOTICE '   - task_comments.task_id -> tasks.id';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
