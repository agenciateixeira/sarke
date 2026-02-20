-- =====================================================
-- INTEGRAÇÃO TAREFAS ↔ PROJETOS
-- =====================================================
-- Data: 2026-02-20
-- Descrição: Sistema de tarefas vinculadas a projetos
-- Modelo: 1 tarefa por projeto com 4 subtarefas (etapas)
-- =====================================================

-- =====================================================
-- 1. ADICIONAR CAMPOS NOVOS ÀS TABELAS EXISTENTES
-- =====================================================

-- Adicionar campos na tabela tasks (se não existirem)
DO $$
BEGIN
  -- Campo is_project_task
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'is_project_task'
  ) THEN
    ALTER TABLE tasks ADD COLUMN is_project_task BOOLEAN DEFAULT false;
  END IF;

  -- Campo projeto_area
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'projeto_area'
  ) THEN
    ALTER TABLE tasks ADD COLUMN projeto_area TEXT;
  END IF;

  -- Verificar se coluna project_id existe e criar se necessário
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN project_id UUID REFERENCES projetos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar campo projeto_etapa na tabela subtasks (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subtasks' AND column_name = 'projeto_etapa'
  ) THEN
    ALTER TABLE subtasks ADD COLUMN projeto_etapa TEXT CHECK (projeto_etapa IN ('planejamento', 'planta_baixa', '3d', 'executivo'));
  END IF;
END $$;

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
  primeira_coluna_id UUID;
BEGIN
  -- Buscar a primeira coluna do pipeline (menor order_index)
  SELECT id INTO primeira_coluna_id
  FROM pipeline_columns
  ORDER BY order_index ASC
  LIMIT 1;

  -- Criar 1 tarefa principal para o projeto
  INSERT INTO tasks (
    title,
    description,
    project_id,
    client_id,
    is_project_task,
    projeto_area,
    column_id,
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
    primeira_coluna_id,
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
-- 5. ATUALIZAR VIEW EXISTENTE (se existir)
-- =====================================================

-- Recriar view tasks_with_details para incluir campos de projeto
DROP VIEW IF EXISTS tasks_with_details;
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
  -- Projeto (NOVOS CAMPOS)
  proj.nome as project_name,
  proj.area as project_area,
  proj.etapa_atual as project_etapa_atual,
  proj.progresso_percentual as project_progresso,
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
-- MIGRATION COMPLETA
-- =====================================================
