-- =====================================================
-- ATUALIZAÇÃO: Trigger para criar 15 subtarefas
-- =====================================================
-- Baseado na estrutura do ClickUp atual da equipe
-- Total: 15 subtarefas (6 + 4 + 3 + 2)
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

  -- Criar subtarefas agrupadas por etapa (baseado no ClickUp)
  INSERT INTO subtasks (task_id, title, description, projeto_etapa, order_index, priority, created_by)
  VALUES
    -- ========================================
    -- ETAPA 1: PLANEJAMENTO (6 subtarefas)
    -- ========================================
    (
      nova_tarefa_id,
      'Forms',
      'Formulários iniciais e documentação',
      'planejamento',
      1,
      'high',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Visita e medição',
      'Visita técnica ao local e medições',
      'planejamento',
      2,
      'high',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'As built',
      'Levantamento do estado atual',
      'planejamento',
      3,
      'medium',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Análise',
      'Análise técnica e normativa',
      'planejamento',
      4,
      'high',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Planejamento',
      'Planejamento geral do projeto',
      'planejamento',
      5,
      'medium',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Entrevista de alinhamento',
      'Entrevista inicial com cliente',
      'planejamento',
      6,
      'high',
      NEW.created_by
    ),

    -- ========================================
    -- ETAPA 2: PLANTA BAIXA (4 subtarefas)
    -- ========================================
    (
      nova_tarefa_id,
      'Criação de conceito',
      'Desenvolvimento do conceito inicial',
      'planta_baixa',
      7,
      'high',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Setorização e estudo de fluxo',
      'Definição de setores e fluxos',
      'planta_baixa',
      8,
      'high',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Elaboração',
      'Elaboração da planta baixa',
      'planta_baixa',
      9,
      'medium',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Apresentação',
      'Apresentação ao cliente',
      'planta_baixa',
      10,
      'high',
      NEW.created_by
    ),

    -- ========================================
    -- ETAPA 3: MODELO 3D (3 subtarefas)
    -- ========================================
    (
      nova_tarefa_id,
      'Modelagem',
      'Modelagem 3D do projeto',
      '3d',
      11,
      'high',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Render',
      'Renderização de imagens',
      '3d',
      12,
      'high',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Apresentação',
      'Apresentação ou passeio virtual',
      '3d',
      13,
      'medium',
      NEW.created_by
    ),

    -- ========================================
    -- ETAPA 4: EXECUTIVO (2 subtarefas)
    -- ========================================
    (
      nova_tarefa_id,
      'Caderno executivo',
      'Elaboração do caderno executivo',
      'executivo',
      14,
      'high',
      NEW.created_by
    ),
    (
      nova_tarefa_id,
      'Caderno final',
      'Finalização e entrega do caderno',
      'executivo',
      15,
      'high',
      NEW.created_by
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se a função foi criada corretamente
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'criar_tarefa_projeto';
