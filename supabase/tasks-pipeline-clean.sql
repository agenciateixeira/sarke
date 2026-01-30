-- =============================================
-- SARKE - TASK PIPELINE SYSTEM (Estilo ClickUp)
-- LIMPAR E RECRIAR TUDO DO ZERO
-- =============================================

-- PASSO 0: DROPAR TUDO (se existir)
-- =============================================

DROP VIEW IF EXISTS tasks_with_details CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS pipeline_columns CASCADE;

-- PASSO 1: Criar tabela de colunas do pipeline
-- =============================================

CREATE TABLE pipeline_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  color TEXT DEFAULT '#3b82f6',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(order_index)
);

-- PASSO 2: Criar tabela de tarefas
-- =============================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,

  -- Pipeline
  column_id UUID REFERENCES pipeline_columns(id) ON DELETE SET NULL,
  order_in_column INTEGER DEFAULT 0,

  -- Metadados
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Responsável e datas
  assigned_to UUID,
  due_date DATE,
  start_date DATE,
  completed_date TIMESTAMPTZ,

  -- Tracking de tempo
  estimated_time_minutes INTEGER,
  tracked_time_minutes INTEGER DEFAULT 0,

  -- Cliente/Projeto (opcional)
  client_id UUID,
  project_id UUID,

  -- Flags
  is_completed BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,

  -- Metadados
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 3: Criar tabela de subtarefas
-- =============================================

CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,

  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,

  -- Metadados
  order_index INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Responsável e datas
  assigned_to UUID,
  due_date DATE,

  -- Flags
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID,

  -- Metadados
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 4: Criar tabela de comentários nas tarefas
-- =============================================

CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,

  content TEXT NOT NULL,

  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 5: Criar tabela de anexos
-- =============================================

CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,

  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 6: Inserir colunas padrão do pipeline
-- =============================================

INSERT INTO pipeline_columns (name, order_index, color) VALUES
  ('Planejamento', 1, '#94a3b8'),
  ('Pré-Briefing', 2, '#3b82f6'),
  ('Criação', 3, '#f59e0b'),
  ('Revisão', 4, '#8b5cf6'),
  ('Aprovação', 5, '#10b981'),
  ('Execução', 6, '#ff2697'),
  ('Concluído', 7, '#059669');

-- PASSO 7: Criar índices para performance
-- =============================================

CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_completed ON tasks(is_completed);

CREATE INDEX idx_subtasks_task ON subtasks(task_id);
CREATE INDEX idx_subtasks_completed ON subtasks(is_completed);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);

-- PASSO 8: Criar triggers para updated_at (se a função existir)
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_pipeline_columns_updated_at ON pipeline_columns;
    CREATE TRIGGER update_pipeline_columns_updated_at
      BEFORE UPDATE ON pipeline_columns
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
    CREATE TRIGGER update_tasks_updated_at
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
    CREATE TRIGGER update_subtasks_updated_at
      BEFORE UPDATE ON subtasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
    CREATE TRIGGER update_task_comments_updated_at
      BEFORE UPDATE ON task_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  ELSE
    -- Criar a função se não existir
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Criar os triggers
    DROP TRIGGER IF EXISTS update_pipeline_columns_updated_at ON pipeline_columns;
    CREATE TRIGGER update_pipeline_columns_updated_at
      BEFORE UPDATE ON pipeline_columns
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
    CREATE TRIGGER update_tasks_updated_at
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_subtasks_updated_at ON subtasks;
    CREATE TRIGGER update_subtasks_updated_at
      BEFORE UPDATE ON subtasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
    CREATE TRIGGER update_task_comments_updated_at
      BEFORE UPDATE ON task_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- PASSO 9: Habilitar RLS
-- =============================================

ALTER TABLE pipeline_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- PASSO 10: Criar Policies
-- =============================================

-- Policies para pipeline_columns
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar colunas" ON pipeline_columns;
CREATE POLICY "Usuários autenticados podem visualizar colunas"
  ON pipeline_columns FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar colunas" ON pipeline_columns;
CREATE POLICY "Usuários autenticados podem gerenciar colunas"
  ON pipeline_columns FOR ALL TO authenticated USING (true);

-- Policies para tasks
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar tarefas" ON tasks;
CREATE POLICY "Usuários autenticados podem visualizar tarefas"
  ON tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar tarefas" ON tasks;
CREATE POLICY "Usuários autenticados podem criar tarefas"
  ON tasks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar tarefas" ON tasks;
CREATE POLICY "Usuários podem atualizar tarefas"
  ON tasks FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários podem deletar tarefas" ON tasks;
CREATE POLICY "Usuários podem deletar tarefas"
  ON tasks FOR DELETE TO authenticated USING (true);

-- Policies para subtasks
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar subtarefas" ON subtasks;
CREATE POLICY "Usuários autenticados podem visualizar subtarefas"
  ON subtasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar subtarefas" ON subtasks;
CREATE POLICY "Usuários autenticados podem criar subtarefas"
  ON subtasks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar subtarefas" ON subtasks;
CREATE POLICY "Usuários podem atualizar subtarefas"
  ON subtasks FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários podem deletar subtarefas" ON subtasks;
CREATE POLICY "Usuários podem deletar subtarefas"
  ON subtasks FOR DELETE TO authenticated USING (true);

-- Policies para task_comments
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar comentários" ON task_comments;
CREATE POLICY "Usuários autenticados podem visualizar comentários"
  ON task_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar comentários" ON task_comments;
CREATE POLICY "Usuários autenticados podem criar comentários"
  ON task_comments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar seus comentários" ON task_comments;
CREATE POLICY "Usuários podem atualizar seus comentários"
  ON task_comments FOR UPDATE TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar seus comentários" ON task_comments;
CREATE POLICY "Usuários podem deletar seus comentários"
  ON task_comments FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Policies para task_attachments
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar anexos" ON task_attachments;
CREATE POLICY "Usuários autenticados podem visualizar anexos"
  ON task_attachments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar anexos" ON task_attachments;
CREATE POLICY "Usuários autenticados podem criar anexos"
  ON task_attachments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem deletar anexos" ON task_attachments;
CREATE POLICY "Usuários podem deletar anexos"
  ON task_attachments FOR DELETE TO authenticated USING (true);

-- PASSO 11: Criar Views úteis
-- =============================================

CREATE OR REPLACE VIEW tasks_with_details AS
SELECT
  t.*,

  -- Informações da coluna
  pc.name as column_name,
  pc.color as column_color,

  -- Contadores
  COUNT(DISTINCT st.id) as subtasks_count,
  COUNT(DISTINCT CASE WHEN st.is_completed = true THEN st.id END) as completed_subtasks_count,
  COUNT(DISTINCT tc.id) as comments_count,
  COUNT(DISTINCT ta.id) as attachments_count

FROM tasks t
LEFT JOIN pipeline_columns pc ON t.column_id = pc.id
LEFT JOIN subtasks st ON t.id = st.task_id
LEFT JOIN task_comments tc ON t.id = tc.task_id
LEFT JOIN task_attachments ta ON t.id = ta.task_id
GROUP BY t.id, pc.id, pc.name, pc.color;

-- =============================================
-- FIM DO TASK PIPELINE SYSTEM
-- =============================================

SELECT 'Task Pipeline System completo! ✅' as message;

SELECT
  'Tabelas criadas: ' || COUNT(*) as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('pipeline_columns', 'tasks', 'subtasks', 'task_comments', 'task_attachments');
