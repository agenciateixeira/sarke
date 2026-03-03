-- Tabela para Memorial de Projetos Arquivados
CREATE TABLE IF NOT EXISTS memorial_projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID do projeto original (mantém referência)
  projeto_original_id UUID NOT NULL,

  -- Informações Básicas
  nome TEXT NOT NULL,
  descricao TEXT,
  cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Classificação
  area TEXT CHECK (area IN ('residencial', 'comercial', 'corporativo')),
  tipo_especifico TEXT,
  frente TEXT[],

  -- Localização
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Dimensões
  area_total DECIMAL(10,2),
  area_construida DECIMAL(10,2),
  numero_pavimentos INTEGER,

  -- Conceito e Design
  briefing TEXT,
  conceito TEXT,
  estilo TEXT,

  -- Datas e Prazos
  data_inicio DATE,
  data_previsao_entrega DATE,
  data_entrega_real DATE,
  duracao_meses INTEGER,

  -- Financeiro
  valor_contrato DECIMAL(15,2),
  valor_final DECIMAL(15,2),

  -- Status (sempre será 'concluido' ou 'cancelado')
  status TEXT NOT NULL CHECK (status IN ('concluido', 'cancelado')),
  etapa_final TEXT,
  progresso_percentual INTEGER DEFAULT 100,

  -- Metadados do arquivamento
  arquivado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  arquivado_por UUID REFERENCES auth.users(id),
  motivo_arquivamento TEXT,

  -- Metadados de criação
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_memorial_projetos_cliente ON memorial_projetos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_memorial_projetos_status ON memorial_projetos(status);
CREATE INDEX IF NOT EXISTS idx_memorial_projetos_area ON memorial_projetos(area);
CREATE INDEX IF NOT EXISTS idx_memorial_projetos_arquivado_em ON memorial_projetos(arquivado_em);
CREATE INDEX IF NOT EXISTS idx_memorial_projetos_projeto_original ON memorial_projetos(projeto_original_id);

-- RLS Policies
ALTER TABLE memorial_projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver projetos arquivados"
  ON memorial_projetos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem arquivar projetos"
  ON memorial_projetos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar projetos arquivados"
  ON memorial_projetos FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar projetos arquivados"
  ON memorial_projetos FOR DELETE
  USING (auth.uid() IS NOT NULL);
