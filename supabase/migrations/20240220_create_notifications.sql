-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_due_soon', 'task_overdue', 'task_completed', 'comment_added', 'project_updated')),
  related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  related_subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE,
  related_project_id UUID REFERENCES projetos(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias notificações
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem marcar suas notificações como lidas
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Sistema pode criar notificações
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trigger_notify_task_assigned
  AFTER INSERT OR UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();

-- Função para notificar sobre tarefas próximas do vencimento (executar diariamente)
CREATE OR REPLACE FUNCTION check_due_soon_tasks()
RETURNS void AS $$
DECLARE
  task_record RECORD;
BEGIN
  -- Buscar tarefas que vencem em 2 dias e ainda não estão completas
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
  -- Buscar tarefas atrasadas
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
