-- =====================================================
-- CRONOGRAMA SYSTEM - Integrated Schedule Management
-- =====================================================
-- Sistema de cronograma integrado com obras, projetos e tarefas
-- Permite gestão completa de cronogramas no estilo planilha
-- com dependências, hierarquia e cálculo automático

-- =====================================================
-- Tabela Principal de Cronogramas
-- =====================================================
CREATE TABLE IF NOT EXISTS cronogramas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,

  -- Tipo de cronograma e suas referências
  tipo TEXT NOT NULL CHECK (tipo IN ('obra', 'projeto', 'geral')),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Datas globais do cronograma
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,

  -- Status e progresso geral
  status TEXT DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'ativo', 'pausado', 'concluido', 'cancelado')),
  progresso_percentual DECIMAL(5,2) DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),

  -- Configurações do cronograma
  exibir_caminho_critico BOOLEAN DEFAULT true,
  exibir_folgas BOOLEAN DEFAULT true,
  unidade_tempo TEXT DEFAULT 'dias' CHECK (unidade_tempo IN ('horas', 'dias', 'semanas')),

  -- Responsável e permissões
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  equipe_acesso UUID[] DEFAULT '{}', -- IDs dos usuários com acesso

  -- Metadados
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT cronograma_referencia_check CHECK (
    (tipo = 'obra' AND obra_id IS NOT NULL AND project_id IS NULL) OR
    (tipo = 'projeto' AND project_id IS NOT NULL AND obra_id IS NULL) OR
    (tipo = 'geral' AND obra_id IS NULL AND project_id IS NULL)
  )
);

-- =====================================================
-- Tabela de Atividades do Cronograma
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,

  -- Hierarquia (para estrutura em árvore)
  parent_id UUID REFERENCES cronograma_atividades(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  nivel INTEGER DEFAULT 0, -- Nível na hierarquia (0 = raiz)

  -- Identificação da atividade
  codigo TEXT, -- WBS code (ex: 1.2.3)
  nome TEXT NOT NULL,
  descricao TEXT,

  -- Tipo e categoria
  tipo TEXT DEFAULT 'atividade' CHECK (tipo IN ('fase', 'atividade', 'marco')),
  categoria TEXT, -- Customizável pelo usuário (ex: 'fundação', 'estrutura', 'acabamento')

  -- Datas planejadas
  data_inicio_planejada DATE NOT NULL,
  data_fim_planejada DATE NOT NULL,
  duracao_planejada DECIMAL(10,2) NOT NULL, -- Em dias, horas, etc

  -- Datas reais
  data_inicio_real DATE,
  data_fim_real DATE,
  duracao_real DECIMAL(10,2),

  -- Status e progresso
  status TEXT DEFAULT 'nao_iniciada' CHECK (status IN ('nao_iniciada', 'em_andamento', 'concluida', 'atrasada', 'pausada', 'cancelada')),
  progresso_percentual DECIMAL(5,2) DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),

  -- Recursos e custos
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  equipe_atribuida UUID[] DEFAULT '{}',
  custo_planejado DECIMAL(15,2),
  custo_real DECIMAL(15,2),

  -- Análise de caminho crítico
  eh_caminho_critico BOOLEAN DEFAULT false,
  folga_total DECIMAL(10,2) DEFAULT 0, -- Em dias
  folga_livre DECIMAL(10,2) DEFAULT 0,

  -- Datas calculadas (Early/Late Start/Finish)
  inicio_mais_cedo DATE,
  fim_mais_cedo DATE,
  inicio_mais_tarde DATE,
  fim_mais_tarde DATE,

  -- Integrações com outras entidades
  obra_etapa_id UUID REFERENCES obra_etapas(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Observações e notas
  observacoes TEXT,
  riscos TEXT,

  -- Campos customizados (JSON para flexibilidade total)
  campos_customizados JSONB DEFAULT '{}',

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Dependências entre Atividades
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_dependencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Atividades relacionadas
  atividade_id UUID NOT NULL REFERENCES cronograma_atividades(id) ON DELETE CASCADE,
  atividade_predecessor_id UUID NOT NULL REFERENCES cronograma_atividades(id) ON DELETE CASCADE,

  -- Tipo de dependência
  tipo TEXT DEFAULT 'finish_to_start' CHECK (tipo IN (
    'finish_to_start',  -- FS: Predecessora termina, sucessora inicia
    'start_to_start',   -- SS: Predecessora inicia, sucessora inicia
    'finish_to_finish', -- FF: Predecessora termina, sucessora termina
    'start_to_finish'   -- SF: Predecessora inicia, sucessora termina
  )),

  -- Lag time (atraso ou antecipação em dias)
  lag_dias DECIMAL(10,2) DEFAULT 0, -- Positivo = atraso, Negativo = antecipação

  -- Observações
  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: uma atividade não pode depender dela mesma
  CONSTRAINT no_self_dependency CHECK (atividade_id != atividade_predecessor_id)
);

-- =====================================================
-- Tabela de Recursos (Mão de obra, equipamentos, materiais)
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,

  -- Identificação do recurso
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('mao_de_obra', 'equipamento', 'material', 'outro')),
  unidade TEXT, -- hora, dia, m², unidade, etc

  -- Custos
  custo_unitario DECIMAL(15,2),

  -- Disponibilidade
  disponibilidade_maxima DECIMAL(10,2), -- Máximo disponível por período

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Alocação de Recursos às Atividades
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_alocacao_recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  atividade_id UUID NOT NULL REFERENCES cronograma_atividades(id) ON DELETE CASCADE,
  recurso_id UUID NOT NULL REFERENCES cronograma_recursos(id) ON DELETE CASCADE,

  -- Quantidade alocada
  quantidade_planejada DECIMAL(10,2) NOT NULL,
  quantidade_real DECIMAL(10,2),

  -- Custo total
  custo_planejado DECIMAL(15,2),
  custo_real DECIMAL(15,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Baselines (Versões salvas do cronograma)
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  descricao TEXT,
  data_snapshot TIMESTAMPTZ DEFAULT NOW(),

  -- Snapshot completo do cronograma (JSON)
  dados_cronograma JSONB NOT NULL,

  -- É a baseline ativa?
  is_ativa BOOLEAN DEFAULT false,

  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Histórico de Alterações
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,
  atividade_id UUID REFERENCES cronograma_atividades(id) ON DELETE CASCADE,

  -- Tipo de alteração
  tipo_alteracao TEXT NOT NULL CHECK (tipo_alteracao IN (
    'criacao',
    'atualizacao_datas',
    'atualizacao_progresso',
    'atualizacao_status',
    'atualizacao_recursos',
    'atualizacao_dependencias',
    'exclusao'
  )),

  -- Dados da alteração
  dados_anteriores JSONB,
  dados_novos JSONB,
  motivo TEXT,

  -- Usuário e timestamp
  alterado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Cronogramas
CREATE INDEX idx_cronogramas_tipo ON cronogramas(tipo);
CREATE INDEX idx_cronogramas_obra_id ON cronogramas(obra_id) WHERE obra_id IS NOT NULL;
CREATE INDEX idx_cronogramas_project_id ON cronogramas(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_cronogramas_status ON cronogramas(status);
CREATE INDEX idx_cronogramas_responsavel ON cronogramas(responsavel_id);

-- Atividades
CREATE INDEX idx_atividades_cronograma ON cronograma_atividades(cronograma_id);
CREATE INDEX idx_atividades_parent ON cronograma_atividades(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_atividades_ordem ON cronograma_atividades(cronograma_id, ordem);
CREATE INDEX idx_atividades_nivel ON cronograma_atividades(nivel);
CREATE INDEX idx_atividades_status ON cronograma_atividades(status);
CREATE INDEX idx_atividades_responsavel ON cronograma_atividades(responsavel_id);
CREATE INDEX idx_atividades_critico ON cronograma_atividades(eh_caminho_critico) WHERE eh_caminho_critico = true;
CREATE INDEX idx_atividades_datas ON cronograma_atividades(data_inicio_planejada, data_fim_planejada);
CREATE INDEX idx_atividades_obra_etapa ON cronograma_atividades(obra_etapa_id) WHERE obra_etapa_id IS NOT NULL;
CREATE INDEX idx_atividades_task ON cronograma_atividades(task_id) WHERE task_id IS NOT NULL;

-- Dependências
CREATE INDEX idx_dependencias_atividade ON cronograma_dependencias(atividade_id);
CREATE INDEX idx_dependencias_predecessor ON cronograma_dependencias(atividade_predecessor_id);

-- Recursos
CREATE INDEX idx_recursos_cronograma ON cronograma_recursos(cronograma_id);
CREATE INDEX idx_recursos_tipo ON cronograma_recursos(tipo);

-- Alocação
CREATE INDEX idx_alocacao_atividade ON cronograma_alocacao_recursos(atividade_id);
CREATE INDEX idx_alocacao_recurso ON cronograma_alocacao_recursos(recurso_id);

-- Histórico
CREATE INDEX idx_historico_cronograma ON cronograma_historico(cronograma_id);
CREATE INDEX idx_historico_atividade ON cronograma_historico(atividade_id) WHERE atividade_id IS NOT NULL;
CREATE INDEX idx_historico_data ON cronograma_historico(created_at DESC);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_cronograma_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cronogramas_updated_at
  BEFORE UPDATE ON cronogramas
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

CREATE TRIGGER trigger_cronograma_atividades_updated_at
  BEFORE UPDATE ON cronograma_atividades
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

CREATE TRIGGER trigger_cronograma_recursos_updated_at
  BEFORE UPDATE ON cronograma_recursos
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

CREATE TRIGGER trigger_cronograma_alocacao_updated_at
  BEFORE UPDATE ON cronograma_alocacao_recursos
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

-- =====================================================
-- FUNCTION: Calcular Progresso do Cronograma
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_progresso_cronograma(cronograma_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  progresso DECIMAL(5,2);
BEGIN
  SELECT COALESCE(AVG(progresso_percentual), 0)
  INTO progresso
  FROM cronograma_atividades
  WHERE cronograma_id = cronograma_uuid
    AND tipo = 'atividade' -- Apenas atividades, não fases
    AND parent_id IS NULL; -- Apenas atividades de nível raiz

  RETURN progresso;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Atualizar Status Automático da Atividade
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_status_atividade()
RETURNS TRIGGER AS $$
BEGIN
  -- Se progresso = 100%, marcar como concluída
  IF NEW.progresso_percentual >= 100 THEN
    NEW.status = 'concluida';
    IF NEW.data_fim_real IS NULL THEN
      NEW.data_fim_real = CURRENT_DATE;
    END IF;

  -- Se progresso > 0% e < 100%, marcar como em andamento
  ELSIF NEW.progresso_percentual > 0 AND NEW.progresso_percentual < 100 THEN
    IF NEW.status = 'nao_iniciada' THEN
      NEW.status = 'em_andamento';
      IF NEW.data_inicio_real IS NULL THEN
        NEW.data_inicio_real = CURRENT_DATE;
      END IF;
    END IF;

  -- Se passou da data fim planejada e não está concluída, marcar como atrasada
  ELSIF NEW.data_fim_planejada < CURRENT_DATE
        AND NEW.status NOT IN ('concluida', 'cancelada') THEN
    NEW.status = 'atrasada';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_status_atividade
  BEFORE UPDATE OF progresso_percentual ON cronograma_atividades
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_status_atividade();

-- =====================================================
-- FUNCTION: Registrar Alteração no Histórico
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_historico_cronograma()
RETURNS TRIGGER AS $$
BEGIN
  -- Em updates, registrar o que mudou
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO cronograma_historico (
      cronograma_id,
      atividade_id,
      tipo_alteracao,
      dados_anteriores,
      dados_novos,
      alterado_por
    ) VALUES (
      NEW.cronograma_id,
      NEW.id,
      CASE
        WHEN OLD.data_inicio_planejada != NEW.data_inicio_planejada
          OR OLD.data_fim_planejada != NEW.data_fim_planejada THEN 'atualizacao_datas'
        WHEN OLD.progresso_percentual != NEW.progresso_percentual THEN 'atualizacao_progresso'
        WHEN OLD.status != NEW.status THEN 'atualizacao_status'
        ELSE 'atualizacao_recursos'
      END,
      row_to_json(OLD.*),
      row_to_json(NEW.*),
      auth.uid()
    );

  -- Em inserts, registrar criação
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO cronograma_historico (
      cronograma_id,
      atividade_id,
      tipo_alteracao,
      dados_novos,
      alterado_por
    ) VALUES (
      NEW.cronograma_id,
      NEW.id,
      'criacao',
      row_to_json(NEW.*),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_historico_atividades
  AFTER INSERT OR UPDATE ON cronograma_atividades
  FOR EACH ROW
  EXECUTE FUNCTION registrar_historico_cronograma();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE cronogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_dependencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_alocacao_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_historico ENABLE ROW LEVEL SECURITY;

-- Policies para cronogramas
CREATE POLICY "Usuários podem ver cronogramas da sua equipe"
  ON cronogramas FOR SELECT
  USING (
    created_by = auth.uid()
    OR responsavel_id = auth.uid()
    OR auth.uid() = ANY(equipe_acesso)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem criar cronogramas"
  ON cronogramas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Responsáveis e admins podem editar cronogramas"
  ON cronogramas FOR UPDATE
  USING (
    responsavel_id = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- Policies para atividades (herdam acesso do cronograma pai)
CREATE POLICY "Usuários podem ver atividades dos cronogramas que têm acesso"
  ON cronograma_atividades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cronogramas c
      WHERE c.id = cronograma_id
        AND (
          c.created_by = auth.uid()
          OR c.responsavel_id = auth.uid()
          OR auth.uid() = ANY(c.equipe_acesso)
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente')
          )
        )
    )
  );

CREATE POLICY "Usuários podem inserir atividades em cronogramas que têm acesso"
  ON cronograma_atividades FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cronogramas c
      WHERE c.id = cronograma_id
        AND (
          c.responsavel_id = auth.uid()
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente')
          )
        )
    )
  );

CREATE POLICY "Usuários podem atualizar atividades em cronogramas que têm acesso"
  ON cronograma_atividades FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cronogramas c
      WHERE c.id = cronograma_id
        AND (
          c.responsavel_id = auth.uid()
          OR c.created_by = auth.uid()
          OR auth.uid() = ANY(c.equipe_acesso)
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'gerente')
          )
        )
    )
  );

-- Policies para outras tabelas (similar, herdando do cronograma)
CREATE POLICY "Acesso a dependências baseado no cronograma"
  ON cronograma_dependencias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cronograma_atividades ca
      JOIN cronogramas c ON c.id = ca.cronograma_id
      WHERE ca.id = atividade_id
        AND (
          c.created_by = auth.uid()
          OR c.responsavel_id = auth.uid()
          OR auth.uid() = ANY(c.equipe_acesso)
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
        )
    )
  );

CREATE POLICY "Acesso a recursos baseado no cronograma"
  ON cronograma_recursos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cronogramas c
      WHERE c.id = cronograma_id
        AND (
          c.created_by = auth.uid()
          OR c.responsavel_id = auth.uid()
          OR auth.uid() = ANY(c.equipe_acesso)
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
        )
    )
  );

CREATE POLICY "Acesso a alocação baseado no cronograma"
  ON cronograma_alocacao_recursos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cronograma_atividades ca
      JOIN cronogramas c ON c.id = ca.cronograma_id
      WHERE ca.id = atividade_id
        AND (
          c.created_by = auth.uid()
          OR c.responsavel_id = auth.uid()
          OR auth.uid() = ANY(c.equipe_acesso)
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
        )
    )
  );

CREATE POLICY "Todos podem ver baselines"
  ON cronograma_baselines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cronogramas c
      WHERE c.id = cronograma_id
        AND (
          c.created_by = auth.uid()
          OR c.responsavel_id = auth.uid()
          OR auth.uid() = ANY(c.equipe_acesso)
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
        )
    )
  );

CREATE POLICY "Apenas admins e responsáveis podem criar baselines"
  ON cronograma_baselines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cronogramas c
      WHERE c.id = cronograma_id
        AND (c.responsavel_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Todos podem ver histórico"
  ON cronograma_historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cronogramas c
      WHERE c.id = cronograma_id
        AND (
          c.created_by = auth.uid()
          OR c.responsavel_id = auth.uid()
          OR auth.uid() = ANY(c.equipe_acesso)
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
        )
    )
  );

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE cronogramas IS 'Cronogramas de projetos e obras com gestão integrada';
COMMENT ON TABLE cronograma_atividades IS 'Atividades do cronograma com estrutura hierárquica e análise de caminho crítico';
COMMENT ON TABLE cronograma_dependencias IS 'Dependências entre atividades (FS, SS, FF, SF) com lag time';
COMMENT ON TABLE cronograma_recursos IS 'Recursos disponíveis (mão de obra, equipamentos, materiais)';
COMMENT ON TABLE cronograma_alocacao_recursos IS 'Alocação de recursos às atividades';
COMMENT ON TABLE cronograma_baselines IS 'Snapshots/versões salvas do cronograma para comparação';
COMMENT ON TABLE cronograma_historico IS 'Histórico completo de alterações no cronograma';
