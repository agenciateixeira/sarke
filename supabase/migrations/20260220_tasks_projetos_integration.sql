-- =====================================================
-- INTEGRAÇÃO TAREFAS ↔ PROJETOS
-- =====================================================
-- Data: 2026-02-20
-- Descrição: Sistema de tarefas vinculadas a projetos
-- Modelo: 1 tarefa por projeto com 4 subtarefas (etapas)
-- =====================================================

-- =====================================================
-- 1. CRIAR TABELAS DE TAREFAS (SE NÃO EXISTIREM)
-- =====================================================

-- Colunas do Pipeline (Kanban)
CREATE TABLE IF NOT EXISTS pipeline_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  color TEXT DEFAULT '#94a3b8',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tarefas
CREATE TABLE IF NOT EXISTS tasks (
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
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  start_date DATE,
  completed_date TIMESTAMP WITH TIME ZONE,

  -- Tracking de tempo
  estimated_time_minutes INTEGER,
  tracked_time_minutes INTEGER DEFAULT 0,

  -- Relacionamentos
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projetos(id) ON DELETE CASCADE,

  -- NOVOS CAMPOS PARA INTEGRAÇÃO COM PROJETOS
  is_project_task BOOLEAN DEFAULT false, -- Marca tarefas criadas automaticamente para projetos
  projeto_area TEXT, -- 'residencial', 'comercial', 'corporativo' (cópia do projeto)

  -- Flags
  is_completed BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Metadados
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subtarefas
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,

  -- NOVO CAMPO: Indica qual etapa do projeto esta subtarefa representa
  projeto_etapa TEXT CHECK (projeto_etapa IN ('planejamento', 'planta_baixa', '3d', 'executivo')),

  -- Metadados
  order_index INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Responsável e datas
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,

  -- Flags
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Metadados
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Anexos
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time tracking
CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT,
  is_running BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_is_project_task ON tasks(is_project_task) WHERE is_project_task = true;

CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_etapa ON subtasks(projeto_etapa) WHERE projeto_etapa IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_task ON task_time_entries(task_id);

-- =====================================================
-- 3. FUNÇÃO: CRIAR TAREFA AO CRIAR PROJETO
-- =====================================================

CREATE OR REPLACE FUNCTION criar_tarefa_projeto()
RETURNS TRIGGER AS $$
DECLARE
  nova_tarefa_id UUID;
BEGIN
  -- Criar 1 tarefa principal para o projeto
  INSERT INTO tasks (
    title,
    description,
    project_id,
    client_id,
    is_project_task,
    projeto_area,
    status,
    priority,
    created_by
  ) VALUES (
    NEW.nome || ' - ' || CASE
      WHEN NEW.area = 'residencial' THEN 'Residencial'
      WHEN NEW.area = 'comercial' THEN 'Comercial'
      WHEN NEW.area = 'corporativo' THEN 'Corporativo'
    END,
    COALESCE(NEW.descricao, 'Tarefa principal do projeto ' || NEW.nome),
    NEW.id,
    NEW.cliente_id,
    true,
    NEW.area,
    'todo',
    'high',
    NEW.created_by
  )
  RETURNING id INTO nova_tarefa_id;

  -- Criar 4 subtarefas (uma para cada etapa do projeto)
  INSERT INTO subtasks (task_id, title, description, projeto_etapa, order_index, priority, created_by)
  VALUES
    -- Etapa 1: Planejamento
    (
      nova_tarefa_id,
      '1. Planejamento',
      'Formulário inicial, visita técnica, briefing e aprovação',
      'planejamento',
      1,
      'high',
      NEW.created_by
    ),
    -- Etapa 2: Planta Baixa
    (
      nova_tarefa_id,
      '2. Planta Baixa',
      'Conceito, setorização, estudos, análise normativa e aprovação do cliente',
      'planta_baixa',
      2,
      'high',
      NEW.created_by
    ),
    -- Etapa 3: Modelo 3D
    (
      nova_tarefa_id,
      '3. Modelo 3D',
      'Modelagem, renders, pós-produção e aprovação do cliente',
      '3d',
      3,
      'medium',
      NEW.created_by
    ),
    -- Etapa 4: Executivo
    (
      nova_tarefa_id,
      '4. Executivo',
      'Detalhamentos ARQ e INT, memorial técnico e entrega final',
      'executivo',
      4,
      'medium',
      NEW.created_by
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_criar_tarefa_projeto ON projetos;
CREATE TRIGGER trigger_criar_tarefa_projeto
  AFTER INSERT ON projetos
  FOR EACH ROW
  EXECUTE FUNCTION criar_tarefa_projeto();

-- =====================================================
-- 4. FUNÇÃO: SINCRONIZAR PROJETO QUANDO SUBTAREFA ATUALIZA
-- =====================================================

CREATE OR REPLACE FUNCTION sync_projeto_from_subtask()
RETURNS TRIGGER AS $$
DECLARE
  v_task_id UUID;
  v_project_id UUID;
  v_etapa TEXT;
  v_total_subtasks INTEGER;
  v_completed_subtasks INTEGER;
  v_progresso INTEGER;
  v_novo_status TEXT;
BEGIN
  -- Obter task_id e verificar se é tarefa de projeto
  SELECT t.id, t.project_id
  INTO v_task_id, v_project_id
  FROM tasks t
  WHERE t.id = NEW.task_id AND t.is_project_task = true;

  -- Se não for tarefa de projeto, não fazer nada
  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obter a etapa desta subtarefa
  v_etapa := NEW.projeto_etapa;

  -- Se a subtarefa não tem etapa definida, não fazer nada
  IF v_etapa IS NULL THEN
    RETURN NEW;
  END IF;

  -- Contar total de subtarefas e concluídas DESTA ETAPA
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_completed = true)
  INTO v_total_subtasks, v_completed_subtasks
  FROM subtasks
  WHERE task_id = v_task_id
    AND projeto_etapa = v_etapa;

  -- Calcular progresso (0-100)
  IF v_total_subtasks > 0 THEN
    v_progresso := (v_completed_subtasks * 100) / v_total_subtasks;
  ELSE
    v_progresso := 0;
  END IF;

  -- Determinar status baseado no progresso
  IF v_progresso = 100 THEN
    v_novo_status := 'concluido';
  ELSIF v_progresso > 0 THEN
    v_novo_status := 'em_andamento';
  ELSE
    v_novo_status := 'pendente';
  END IF;

  -- Atualizar a etapa correspondente no projeto
  IF v_etapa = 'planejamento' THEN
    UPDATE projetos SET
      planejamento_progresso = v_progresso,
      planejamento_status = v_novo_status,
      updated_at = NOW()
    WHERE id = v_project_id;

  ELSIF v_etapa = 'planta_baixa' THEN
    UPDATE projetos SET
      planta_baixa_progresso = v_progresso,
      planta_baixa_status = v_novo_status,
      updated_at = NOW()
    WHERE id = v_project_id;

  ELSIF v_etapa = '3d' THEN
    UPDATE projetos SET
      modelo_3d_progresso = v_progresso,
      modelo_3d_status = v_novo_status,
      updated_at = NOW()
    WHERE id = v_project_id;

  ELSIF v_etapa = 'executivo' THEN
    UPDATE projetos SET
      executivo_progresso = v_progresso,
      executivo_status = v_novo_status,
      updated_at = NOW()
    WHERE id = v_project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para INSERT e UPDATE de subtasks
DROP TRIGGER IF EXISTS trigger_sync_projeto_subtask_insert ON subtasks;
CREATE TRIGGER trigger_sync_projeto_subtask_insert
  AFTER INSERT OR UPDATE OF is_completed ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_projeto_from_subtask();

-- =====================================================
-- 5. RLS POLICIES (Row Level Security)
-- =====================================================

-- Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem visualizar tarefas" ON tasks;
CREATE POLICY "Todos podem visualizar tarefas"
  ON tasks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Colaboradores podem criar tarefas" ON tasks;
CREATE POLICY "Colaboradores podem criar tarefas"
  ON tasks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Colaboradores podem atualizar tarefas" ON tasks;
CREATE POLICY "Colaboradores podem atualizar tarefas"
  ON tasks FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admin e gerente podem deletar tarefas" ON tasks;
CREATE POLICY "Admin e gerente podem deletar tarefas"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gerente')
    )
  );

-- Subtasks
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem visualizar subtarefas" ON subtasks;
CREATE POLICY "Todos podem visualizar subtarefas"
  ON subtasks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Colaboradores podem criar subtarefas" ON subtasks;
CREATE POLICY "Colaboradores podem criar subtarefas"
  ON subtasks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Colaboradores podem atualizar subtarefas" ON subtasks;
CREATE POLICY "Colaboradores podem atualizar subtarefas"
  ON subtasks FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admin e gerente podem deletar subtarefas" ON subtasks;
CREATE POLICY "Admin e gerente podem deletar subtarefas"
  ON subtasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gerente')
    )
  );

-- Task Comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem visualizar comentários" ON task_comments;
CREATE POLICY "Todos podem visualizar comentários"
  ON task_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Colaboradores podem criar comentários" ON task_comments;
CREATE POLICY "Colaboradores podem criar comentários"
  ON task_comments FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Autor pode atualizar seus comentários" ON task_comments;
CREATE POLICY "Autor pode atualizar seus comentários"
  ON task_comments FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Autor pode deletar seus comentários" ON task_comments;
CREATE POLICY "Autor pode deletar seus comentários"
  ON task_comments FOR DELETE
  USING (created_by = auth.uid());

-- Task Attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem visualizar anexos" ON task_attachments;
CREATE POLICY "Todos podem visualizar anexos"
  ON task_attachments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Colaboradores podem criar anexos" ON task_attachments;
CREATE POLICY "Colaboradores podem criar anexos"
  ON task_attachments FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Uploader pode deletar anexos" ON task_attachments;
CREATE POLICY "Uploader pode deletar anexos"
  ON task_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- Time Entries
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário pode ver seus time entries" ON task_time_entries;
CREATE POLICY "Usuário pode ver seus time entries"
  ON task_time_entries FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'gerente')
  ));

DROP POLICY IF EXISTS "Usuário pode criar seus time entries" ON task_time_entries;
CREATE POLICY "Usuário pode criar seus time entries"
  ON task_time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuário pode atualizar seus time entries" ON task_time_entries;
CREATE POLICY "Usuário pode atualizar seus time entries"
  ON task_time_entries FOR UPDATE
  USING (user_id = auth.uid());

-- Pipeline Columns
ALTER TABLE pipeline_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem visualizar colunas" ON pipeline_columns;
CREATE POLICY "Todos podem visualizar colunas"
  ON pipeline_columns FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin pode gerenciar colunas" ON pipeline_columns;
CREATE POLICY "Admin pode gerenciar colunas"
  ON pipeline_columns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 6. VIEWS PARA FACILITAR QUERIES
-- =====================================================

CREATE OR REPLACE VIEW tasks_with_details AS
SELECT
  t.*,
  -- Responsável
  p_assigned.name as assigned_to_name,
  p_assigned.avatar_url as assigned_to_avatar,
  -- Coluna
  pc.name as column_name,
  pc.color as column_color,
  -- Cliente
  c.name as client_name,
  -- Projeto
  proj.nome as project_name,
  proj.area as project_area,
  -- Contadores
  (SELECT COUNT(*) FROM subtasks WHERE subtasks.task_id = t.id) as subtasks_count,
  (SELECT COUNT(*) FROM subtasks WHERE subtasks.task_id = t.id AND subtasks.is_completed = true) as completed_subtasks_count,
  (SELECT COUNT(*) FROM task_comments WHERE task_comments.task_id = t.id) as comments_count,
  (SELECT COUNT(*) FROM task_attachments WHERE task_attachments.task_id = t.id) as attachments_count,
  -- Time tracking
  (SELECT COUNT(*) FROM task_time_entries WHERE task_time_entries.task_id = t.id) as time_entries_count,
  (SELECT COALESCE(SUM(duration_minutes), 0) FROM task_time_entries WHERE task_time_entries.task_id = t.id) as total_tracked_minutes,
  (SELECT EXISTS(SELECT 1 FROM task_time_entries WHERE task_time_entries.task_id = t.id AND is_running = true)) as has_running_timer,
  -- Criador
  p_created.name as created_by_name
FROM tasks t
LEFT JOIN profiles p_assigned ON t.assigned_to = p_assigned.id
LEFT JOIN pipeline_columns pc ON t.column_id = pc.id
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN projetos proj ON t.project_id = proj.id
LEFT JOIN profiles p_created ON t.created_by = p_created.id;

-- =====================================================
-- 7. INSERIR COLUNAS PADRÃO DO PIPELINE (SE NÃO EXISTIREM)
-- =====================================================

INSERT INTO pipeline_columns (name, order_index, color)
SELECT * FROM (VALUES
  ('A Fazer', 1, '#94a3b8'),
  ('Em Andamento', 2, '#3b82f6'),
  ('Em Revisão', 3, '#f59e0b'),
  ('Concluído', 4, '#10b981'),
  ('Bloqueado', 5, '#ef4444')
) AS v(name, order_index, color)
WHERE NOT EXISTS (SELECT 1 FROM pipeline_columns LIMIT 1);

-- =====================================================
-- MIGRATION COMPLETA
-- =====================================================
