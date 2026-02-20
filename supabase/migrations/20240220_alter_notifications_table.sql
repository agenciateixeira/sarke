-- Adicionar colunas que faltam na tabela notifications existente
DO $$
BEGIN
  -- Adicionar coluna is_read se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notifications' AND column_name='is_read') THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;

  -- Adicionar coluna read_at se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notifications' AND column_name='read_at') THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Adicionar coluna message se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notifications' AND column_name='message') THEN
    ALTER TABLE notifications ADD COLUMN message TEXT;
  END IF;

  -- Adicionar coluna related_task_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notifications' AND column_name='related_task_id') THEN
    ALTER TABLE notifications ADD COLUMN related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;

  -- Adicionar coluna related_subtask_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notifications' AND column_name='related_subtask_id') THEN
    ALTER TABLE notifications ADD COLUMN related_subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE;
  END IF;

  -- Adicionar coluna related_project_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notifications' AND column_name='related_project_id') THEN
    ALTER TABLE notifications ADD COLUMN related_project_id UUID REFERENCES projetos(id) ON DELETE CASCADE;
  END IF;

  -- Adicionar coluna updated_at se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='notifications' AND column_name='updated_at') THEN
    ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Sincronizar dados: se existe coluna 'read' mas não 'is_read', copiar valores
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='notifications' AND column_name='read') THEN
    UPDATE notifications SET is_read = read WHERE is_read IS NULL;
  END IF;
END $$;

-- Adicionar constraint de CHECK para type se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'notifications' AND constraint_name LIKE '%type_check%'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'access_request',
      'access_approved',
      'access_denied',
      'mention',
      'task_assigned',
      'task_due_soon',
      'task_overdue',
      'task_completed',
      'comment_added',
      'project_updated',
      'message'
    ));
  END IF;
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at_trigger ON notifications;

CREATE TRIGGER update_notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Função para criar notificação quando tarefa é atribuída
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a tarefa foi atribuída a alguém
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO notifications (user_id, title, message, type, related_subtask_id)
    VALUES (
      NEW.assigned_to,
      'Nova tarefa atribuída',
      'Você foi atribuído à tarefa: ' || NEW.title,
      'task_assigned',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON subtasks;

CREATE TRIGGER trigger_notify_task_assigned
  AFTER INSERT OR UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();

-- Função para notificar sobre tarefas próximas do vencimento
CREATE OR REPLACE FUNCTION check_due_soon_tasks()
RETURNS void AS $$
DECLARE
  task_record RECORD;
BEGIN
  FOR task_record IN
    SELECT id, title, assigned_to, due_date
    FROM subtasks
    WHERE is_completed = FALSE
      AND assigned_to IS NOT NULL
      AND due_date IS NOT NULL
      AND due_date::date = (CURRENT_DATE + INTERVAL '2 days')::date
      AND NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE related_subtask_id = subtasks.id
          AND type = 'task_due_soon'
          AND created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_subtask_id)
    VALUES (
      task_record.assigned_to,
      'Tarefa vence em breve',
      'A tarefa "' || task_record.title || '" vence em 2 dias',
      'task_due_soon',
      task_record.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para notificar sobre tarefas atrasadas
CREATE OR REPLACE FUNCTION check_overdue_tasks()
RETURNS void AS $$
DECLARE
  task_record RECORD;
BEGIN
  FOR task_record IN
    SELECT id, title, assigned_to, due_date
    FROM subtasks
    WHERE is_completed = FALSE
      AND assigned_to IS NOT NULL
      AND due_date IS NOT NULL
      AND due_date::date < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE related_subtask_id = subtasks.id
          AND type = 'task_overdue'
          AND created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_subtask_id)
    VALUES (
      task_record.assigned_to,
      'Tarefa atrasada',
      'A tarefa "' || task_record.title || '" está atrasada desde ' || task_record.due_date::date,
      'task_overdue',
      task_record.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
