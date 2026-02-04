-- Tabela de Obras
CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,

  -- Informações do projeto
  area_construida DECIMAL(10,2),
  area_terreno DECIMAL(10,2),
  tipo_obra TEXT, -- 'residencial', 'comercial', 'industrial', 'reforma'
  valor_contrato DECIMAL(15,2),

  -- Datas e prazos
  data_inicio DATE,
  data_previsao_termino DATE,
  data_termino_real DATE,
  duracao_meses INTEGER,

  -- Status e progresso
  status TEXT DEFAULT 'planejamento', -- 'planejamento', 'em_andamento', 'pausada', 'concluida', 'cancelada'
  progresso_percentual INTEGER DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),

  -- Responsáveis
  engenheiro_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  arquiteto_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fiscal_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Documentação
  alvara_numero TEXT,
  alvara_data_emissao DATE,
  art_rrt_numero TEXT,

  -- Observações e notas
  observacoes TEXT,
  riscos TEXT,

  -- Metadados
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Fotos da Obra
CREATE TABLE IF NOT EXISTS obra_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  url TEXT NOT NULL,
  tipo TEXT DEFAULT 'progresso', -- 'progresso', 'antes', 'durante', 'depois', 'problema', 'solucao'
  data_foto DATE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Documentos da Obra
CREATE TABLE IF NOT EXISTS obra_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT, -- 'projeto', 'memorial', 'orcamento', 'contrato', 'alvara', 'art_rrt', 'medicao', 'outro'
  url TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Medições da Obra
CREATE TABLE IF NOT EXISTS obra_medicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  numero_medicao INTEGER NOT NULL,
  data_medicao DATE NOT NULL,
  periodo_inicio DATE,
  periodo_fim DATE,
  percentual_executado DECIMAL(5,2),
  valor_medicao DECIMAL(15,2),
  status TEXT DEFAULT 'rascunho', -- 'rascunho', 'enviada', 'aprovada', 'rejeitada', 'paga'
  observacoes TEXT,
  medido_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  aprovado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_aprovacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(obra_id, numero_medicao)
);

-- Tabela de Etapas da Obra
CREATE TABLE IF NOT EXISTS obra_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL,
  data_inicio_prevista DATE,
  data_fim_prevista DATE,
  data_inicio_real DATE,
  data_fim_real DATE,
  status TEXT DEFAULT 'pendente', -- 'pendente', 'em_andamento', 'concluida', 'atrasada'
  progresso_percentual INTEGER DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de RDO (Relatório Diário de Obra)
CREATE TABLE IF NOT EXISTS obra_rdo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  clima TEXT, -- 'sol', 'chuva', 'nublado', 'parcialmente_nublado'
  temperatura_min DECIMAL(4,1),
  temperatura_max DECIMAL(4,1),

  -- Mão de obra
  num_operarios INTEGER DEFAULT 0,
  num_serventes INTEGER DEFAULT 0,
  num_mestres INTEGER DEFAULT 0,
  num_encarregados INTEGER DEFAULT 0,

  -- Atividades
  atividades_executadas TEXT,
  servicos_realizados TEXT,

  -- Equipamentos
  equipamentos_utilizados TEXT,

  -- Materiais
  materiais_recebidos TEXT,

  -- Ocorrências
  ocorrencias TEXT,
  problemas TEXT,
  solucoes TEXT,

  -- Observações
  observacoes TEXT,
  visitas TEXT,

  -- Fotos do dia
  fotos TEXT[], -- URLs das fotos

  elaborado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(obra_id, data)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_obras_cliente ON obras(cliente_id);
CREATE INDEX IF NOT EXISTS idx_obras_status ON obras(status);
CREATE INDEX IF NOT EXISTS idx_obras_created_at ON obras(created_at);
CREATE INDEX IF NOT EXISTS idx_obra_fotos_obra ON obra_fotos(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_documentos_obra ON obra_documentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_medicoes_obra ON obra_medicoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_etapas_obra ON obra_etapas(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_rdo_obra ON obra_rdo(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_rdo_data ON obra_rdo(data);

-- RLS (Row Level Security)
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_rdo ENABLE ROW LEVEL SECURITY;

-- Policies para obras
CREATE POLICY "Usuarios autenticados podem ver obras"
  ON obras FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem criar obras"
  ON obras FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem atualizar obras"
  ON obras FOR UPDATE
  TO authenticated
  USING (true);

-- Policies para fotos
CREATE POLICY "Usuarios autenticados podem ver fotos"
  ON obra_fotos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem adicionar fotos"
  ON obra_fotos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para documentos
CREATE POLICY "Usuarios autenticados podem ver documentos"
  ON obra_documentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem adicionar documentos"
  ON obra_documentos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para medições
CREATE POLICY "Usuarios autenticados podem ver medicoes"
  ON obra_medicoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem criar medicoes"
  ON obra_medicoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem atualizar medicoes"
  ON obra_medicoes FOR UPDATE
  TO authenticated
  USING (true);

-- Policies para etapas
CREATE POLICY "Usuarios autenticados podem ver etapas"
  ON obra_etapas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem criar etapas"
  ON obra_etapas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem atualizar etapas"
  ON obra_etapas FOR UPDATE
  TO authenticated
  USING (true);

-- Policies para RDO
CREATE POLICY "Usuarios autenticados podem ver rdo"
  ON obra_rdo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem criar rdo"
  ON obra_rdo FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem atualizar rdo"
  ON obra_rdo FOR UPDATE
  TO authenticated
  USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON obras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_obra_medicoes_updated_at BEFORE UPDATE ON obra_medicoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_obra_etapas_updated_at BEFORE UPDATE ON obra_etapas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_obra_rdo_updated_at BEFORE UPDATE ON obra_rdo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
