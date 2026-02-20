-- =============================================
-- SARKE - SISTEMA DE COMENTÁRIOS E MENÇÕES
-- =============================================
-- Adiciona suporte a menções em comentários
-- =============================================

-- =============================================
-- 1. ADICIONAR COLUNA DE MENÇÕES
-- =============================================

-- Adicionar coluna mentioned_users (array de UUIDs) se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_comments' AND column_name = 'mentioned_users'
  ) THEN
    ALTER TABLE task_comments ADD COLUMN mentioned_users UUID[];
  END IF;
END $$;

-- =============================================
-- 2. FUNÇÃO: NOTIFICAR USUÁRIOS MENCIONADOS
-- =============================================

CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user_id UUID;
  task_title TEXT;
  commenter_name TEXT;
BEGIN
  -- Se não há menções, retornar
  IF NEW.mentioned_users IS NULL OR array_length(NEW.mentioned_users, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar título da tarefa
  SELECT title INTO task_title
  FROM tasks
  WHERE id = NEW.task_id;

  -- Buscar nome do comentador
  SELECT name INTO commenter_name
  FROM profiles
  WHERE id = NEW.created_by;

  -- Para cada usuário mencionado, criar notificação
  FOREACH mentioned_user_id IN ARRAY NEW.mentioned_users
  LOOP
    -- Não notificar o próprio autor do comentário
    IF mentioned_user_id != NEW.created_by THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        reference_id,
        reference_type
      ) VALUES (
        mentioned_user_id,
        'Você foi mencionado',
        commenter_name || ' mencionou você em "' || task_title || '"',
        'mention',
        NEW.task_id::text,
        'task'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. CRIAR TRIGGER PARA NOTIFICAÇÕES
-- =============================================

DROP TRIGGER IF EXISTS trigger_notify_mentioned_users ON task_comments;
CREATE TRIGGER trigger_notify_mentioned_users
  AFTER INSERT ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_mentioned_users();

-- =============================================
-- 4. ÍNDICES
-- =============================================

-- Índice para buscar comentários por menções
CREATE INDEX IF NOT EXISTS idx_task_comments_mentioned_users
  ON task_comments USING GIN (mentioned_users);

-- =============================================
-- 5. POLÍTICAS RLS
-- =============================================

-- Permitir usuários autenticados verem comentários de tarefas
DROP POLICY IF EXISTS "Usuários podem ver comentários" ON task_comments;
CREATE POLICY "Usuários podem ver comentários"
  ON task_comments FOR SELECT
  TO authenticated
  USING (true);

-- Permitir usuários criarem comentários
DROP POLICY IF EXISTS "Usuários podem criar comentários" ON task_comments;
CREATE POLICY "Usuários podem criar comentários"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Permitir usuários editarem seus próprios comentários
DROP POLICY IF EXISTS "Usuários podem editar seus comentários" ON task_comments;
CREATE POLICY "Usuários podem editar seus comentários"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Permitir usuários deletarem seus próprios comentários
DROP POLICY IF EXISTS "Usuários podem deletar seus comentários" ON task_comments;
CREATE POLICY "Usuários podem deletar seus comentários"
  ON task_comments FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- =============================================
-- 6. VERIFICAÇÃO
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SISTEMA DE COMENTÁRIOS E MENÇÕES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Recursos:';
  RAISE NOTICE '   - Coluna mentioned_users adicionada';
  RAISE NOTICE '   - Trigger de notificações criado';
  RAISE NOTICE '   - Políticas RLS configuradas';
  RAISE NOTICE '   - Índice GIN para menções';
  RAISE NOTICE '';
  RAISE NOTICE '🔔 Notificações:';
  RAISE NOTICE '   - Usuários mencionados recebem notificação';
  RAISE NOTICE '   - Autor não recebe notificação própria';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
