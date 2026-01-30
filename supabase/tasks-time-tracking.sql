-- =============================================
-- SARKE - TIME TRACKING E MELHORIAS
-- Sistema de cronômetro com histórico de trabalho
-- =============================================

-- PASSO 1: Criar tabela de time entries (histórico de tempo)
-- =============================================

CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,

  -- Quem trabalhou
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT, -- Guardar nome para histórico

  -- Tempo
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER, -- Calculado quando finalizar

  -- Notas
  notes TEXT,

  -- Status
  is_running BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 2: Criar índices
-- =============================================

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON task_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_running ON task_time_entries(is_running);

-- PASSO 3: Criar trigger para updated_at
-- =============================================

DROP TRIGGER IF EXISTS update_task_time_entries_updated_at ON task_time_entries;
CREATE TRIGGER update_task_time_entries_updated_at
  BEFORE UPDATE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PASSO 4: Habilitar RLS
-- =============================================

ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

-- PASSO 5: Criar Policies
-- =============================================

DROP POLICY IF EXISTS "Usuários autenticados podem visualizar time entries" ON task_time_entries;
CREATE POLICY "Usuários autenticados podem visualizar time entries"
  ON task_time_entries FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar time entries" ON task_time_entries;
CREATE POLICY "Usuários autenticados podem criar time entries"
  ON task_time_entries FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar seus time entries" ON task_time_entries;
CREATE POLICY "Usuários podem atualizar seus time entries"
  ON task_time_entries FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar seus time entries" ON task_time_entries;
CREATE POLICY "Usuários podem deletar seus time entries"
  ON task_time_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

-- PASSO 6: Atualizar view tasks_with_details para incluir info de profiles e clients
-- =============================================

DROP VIEW IF EXISTS tasks_with_details CASCADE;

CREATE OR REPLACE VIEW tasks_with_details AS
SELECT
  t.*,

  -- Informações do responsável
  p.name as assigned_to_name,
  p.avatar_url as assigned_to_avatar,

  -- Informações da coluna
  pc.name as column_name,
  pc.color as column_color,

  -- Informações do cliente
  c.name as client_name,

  -- Contadores
  COUNT(DISTINCT st.id) as subtasks_count,
  COUNT(DISTINCT CASE WHEN st.is_completed = true THEN st.id END) as completed_subtasks_count,
  COUNT(DISTINCT tc.id) as comments_count,
  COUNT(DISTINCT ta.id) as attachments_count,

  -- Time tracking
  COUNT(DISTINCT tte.id) as time_entries_count,
  SUM(CASE WHEN tte.is_running = false THEN tte.duration_minutes ELSE 0 END) as total_tracked_minutes,

  -- Verificar se há timer rodando
  BOOL_OR(tte.is_running) as has_running_timer,

  -- Criado por
  cp.name as created_by_name

FROM tasks t
LEFT JOIN profiles p ON t.assigned_to = p.id
LEFT JOIN pipeline_columns pc ON t.column_id = pc.id
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN subtasks st ON t.id = st.task_id
LEFT JOIN task_comments tc ON t.id = tc.task_id
LEFT JOIN task_attachments ta ON t.id = ta.task_id
LEFT JOIN task_time_entries tte ON t.id = tte.task_id
LEFT JOIN profiles cp ON t.created_by = cp.id
GROUP BY t.id, p.id, p.name, p.avatar_url, pc.id, pc.name, pc.color, c.name, cp.name;

-- PASSO 7: Criar view para subtasks com detalhes
-- =============================================

CREATE OR REPLACE VIEW subtasks_with_details AS
SELECT
  st.*,

  -- Informações do responsável
  p.name as assigned_to_name,
  p.avatar_url as assigned_to_avatar,

  -- Informações de quem completou
  pc.name as completed_by_name,

  -- Criado por
  cp.name as created_by_name

FROM subtasks st
LEFT JOIN profiles p ON st.assigned_to = p.id
LEFT JOIN profiles pc ON st.completed_by = pc.id
LEFT JOIN profiles cp ON st.created_by = cp.id;

-- =============================================
-- FIM DO TIME TRACKING
-- =============================================

SELECT 'Time Tracking System completo! ✅' as message;

SELECT
  'Tabela criada: task_time_entries' as status;
