-- =====================================================
-- EMPRESAS PARCEIRAS - Gestão de Fornecedores e Prestadores
-- =====================================================
-- Sistema para gerenciar empresas que executam serviços nas obras
-- Integrado com cronograma para automação e controle

-- =====================================================
-- Tabela de Empresas Parceiras
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_parceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  nome TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,

  -- Contatos
  responsavel TEXT,
  telefone TEXT,
  celular TEXT,
  email TEXT,
  site TEXT,

  -- Endereço
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,

  -- Serviços que executa (array)
  servicos TEXT[] DEFAULT '{}',
  especialidade_principal TEXT,

  -- Documentação
  logo_url TEXT,
  contrato_url TEXT,

  -- Seguros e certidões
  seguro_vigente BOOLEAN DEFAULT false,
  seguro_vencimento DATE,
  certidao_negativa_url TEXT,
  certidao_vencimento DATE,

  -- Dados bancários
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta TEXT, -- corrente, poupanca

  -- Avaliação e performance
  avaliacao_media DECIMAL(2,1) DEFAULT 0 CHECK (avaliacao_media >= 0 AND avaliacao_media <= 5),
  numero_avaliacoes INTEGER DEFAULT 0,
  total_obras_executadas INTEGER DEFAULT 0,

  -- Valores e financeiro
  valor_total_contratado DECIMAL(15,2) DEFAULT 0,
  valor_total_pago DECIMAL(15,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'bloqueada')),
  motivo_bloqueio TEXT,

  -- Observações
  observacoes TEXT,
  pontos_fortes TEXT,
  pontos_atencao TEXT,

  -- Metadados
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Equipe Técnica da Empresa
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_equipe_tecnica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas_parceiras(id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  funcao TEXT NOT NULL, -- encarregado, mestre, engenheiro, etc
  cpf TEXT,
  telefone TEXT,
  email TEXT,

  -- Qualificações
  formacao TEXT,
  crea_cau TEXT,
  certificados TEXT[],

  -- Status
  ativo BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Equipamentos da Empresa
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas_parceiras(id) ON DELETE CASCADE,

  tipo_equipamento TEXT NOT NULL,
  modelo TEXT,
  quantidade INTEGER DEFAULT 1,

  -- Status
  disponivel BOOLEAN DEFAULT true,

  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Vínculo Empresa-Cronograma
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_empresa_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas_parceiras(id) ON DELETE CASCADE,

  -- Status do vínculo
  status TEXT DEFAULT 'pendente' CHECK (status IN (
    'pendente',        -- Ainda não contratada
    'proposta_enviada',-- Proposta enviada
    'em_negociacao',   -- Negociando valores/prazos
    'contratada',      -- Contratada mas não iniciou
    'em_execucao',     -- Executando serviços
    'concluida',       -- Serviços concluídos
    'cancelada'        -- Contrato cancelado
  )),

  -- Valores financeiros
  valor_contratado DECIMAL(15,2),
  valor_executado DECIMAL(15,2) DEFAULT 0,
  valor_pago DECIMAL(15,2) DEFAULT 0,

  -- Datas previstas
  data_inicio_prevista DATE,
  data_fim_prevista DATE,

  -- Datas reais
  data_mobilizacao DATE, -- Quando empresa entrou na obra
  data_desmobilizacao DATE, -- Quando saiu da obra

  -- Performance
  percentual_conclusao DECIMAL(5,2) DEFAULT 0,
  avaliacao DECIMAL(2,1) CHECK (avaliacao >= 0 AND avaliacao <= 5),
  avaliacao_observacoes TEXT,

  -- Documentos específicos deste contrato
  contrato_url TEXT,
  medicoes TEXT[], -- URLs das medições

  -- Observações
  observacoes TEXT,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cronograma_id, empresa_id)
);

-- =====================================================
-- Tabela de Histórico de Avaliações
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  empresa_id UUID NOT NULL REFERENCES empresas_parceiras(id) ON DELETE CASCADE,
  cronograma_id UUID REFERENCES cronogramas(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,

  -- Avaliação
  avaliacao_geral DECIMAL(2,1) NOT NULL CHECK (avaliacao_geral >= 0 AND avaliacao_geral <= 5),

  -- Critérios específicos
  qualidade_servico DECIMAL(2,1) CHECK (qualidade_servico >= 0 AND qualidade_servico <= 5),
  cumprimento_prazo DECIMAL(2,1) CHECK (cumprimento_prazo >= 0 AND cumprimento_prazo <= 5),
  seguranca_trabalho DECIMAL(2,1) CHECK (seguranca_trabalho >= 0 AND seguranca_trabalho <= 5),
  organizacao_limpeza DECIMAL(2,1) CHECK (organizacao_limpeza >= 0 AND organizacao_limpeza <= 5),
  atendimento DECIMAL(2,1) CHECK (atendimento >= 0 AND atendimento <= 5),

  -- Feedback
  pontos_positivos TEXT,
  pontos_negativos TEXT,
  recomenda BOOLEAN DEFAULT true,

  -- Quem avaliou
  avaliado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_avaliacao TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Atualizar tabela cronograma_atividades
-- =====================================================
-- Adicionar campo para vincular empresa à atividade
ALTER TABLE cronograma_atividades
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas_parceiras(id) ON DELETE SET NULL;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Empresas
CREATE INDEX idx_empresas_nome ON empresas_parceiras(nome);
CREATE INDEX idx_empresas_cnpj ON empresas_parceiras(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_empresas_status ON empresas_parceiras(status);
CREATE INDEX idx_empresas_servicos ON empresas_parceiras USING GIN(servicos);
CREATE INDEX idx_empresas_avaliacao ON empresas_parceiras(avaliacao_media DESC);

-- Equipe técnica
CREATE INDEX idx_equipe_empresa ON empresas_equipe_tecnica(empresa_id);
CREATE INDEX idx_equipe_ativo ON empresas_equipe_tecnica(ativo) WHERE ativo = true;

-- Equipamentos
CREATE INDEX idx_equipamentos_empresa ON empresas_equipamentos(empresa_id);
CREATE INDEX idx_equipamentos_disponivel ON empresas_equipamentos(disponivel) WHERE disponivel = true;

-- Vínculos
CREATE INDEX idx_vinculos_cronograma ON cronograma_empresa_vinculos(cronograma_id);
CREATE INDEX idx_vinculos_empresa ON cronograma_empresa_vinculos(empresa_id);
CREATE INDEX idx_vinculos_status ON cronograma_empresa_vinculos(status);

-- Avaliações
CREATE INDEX idx_avaliacoes_empresa ON empresas_avaliacoes(empresa_id);
CREATE INDEX idx_avaliacoes_cronograma ON empresas_avaliacoes(cronograma_id) WHERE cronograma_id IS NOT NULL;
CREATE INDEX idx_avaliacoes_data ON empresas_avaliacoes(data_avaliacao DESC);

-- Atividades com empresa
CREATE INDEX idx_atividades_empresa ON cronograma_atividades(empresa_id) WHERE empresa_id IS NOT NULL;

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER trigger_empresas_updated_at
  BEFORE UPDATE ON empresas_parceiras
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

CREATE TRIGGER trigger_equipe_updated_at
  BEFORE UPDATE ON empresas_equipe_tecnica
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

CREATE TRIGGER trigger_vinculos_updated_at
  BEFORE UPDATE ON cronograma_empresa_vinculos
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

-- =====================================================
-- FUNCTION: Atualizar Avaliação Média da Empresa
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_avaliacao_empresa()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar média e contador de avaliações
  UPDATE empresas_parceiras
  SET
    avaliacao_media = (
      SELECT COALESCE(AVG(avaliacao_geral), 0)
      FROM empresas_avaliacoes
      WHERE empresa_id = NEW.empresa_id
    ),
    numero_avaliacoes = (
      SELECT COUNT(*)
      FROM empresas_avaliacoes
      WHERE empresa_id = NEW.empresa_id
    )
  WHERE id = NEW.empresa_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_avaliacao_empresa
  AFTER INSERT OR UPDATE OR DELETE ON empresas_avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_avaliacao_empresa();

-- =====================================================
-- FUNCTION: Alertar Documentos Vencidos
-- =====================================================

CREATE OR REPLACE FUNCTION verificar_documentos_vencidos()
RETURNS TABLE(
  empresa_id UUID,
  empresa_nome TEXT,
  tipo_documento TEXT,
  data_vencimento DATE,
  dias_vencido INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    'Seguro' as tipo,
    e.seguro_vencimento,
    (CURRENT_DATE - e.seguro_vencimento)::INTEGER
  FROM empresas_parceiras e
  WHERE e.status = 'ativa'
    AND e.seguro_vencimento IS NOT NULL
    AND e.seguro_vencimento < CURRENT_DATE

  UNION ALL

  SELECT
    e.id,
    e.nome,
    'Certidão Negativa' as tipo,
    e.certidao_vencimento,
    (CURRENT_DATE - e.certidao_vencimento)::INTEGER
  FROM empresas_parceiras e
  WHERE e.status = 'ativa'
    AND e.certidao_vencimento IS NOT NULL
    AND e.certidao_vencimento < CURRENT_DATE

  ORDER BY dias_vencido DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW: Empresas com Performance
-- =====================================================

CREATE OR REPLACE VIEW empresas_performance AS
SELECT
  e.id,
  e.nome,
  e.servicos,
  e.avaliacao_media,
  e.numero_avaliacoes,
  e.total_obras_executadas,

  -- Performance em obras ativas
  COUNT(DISTINCT v.cronograma_id) FILTER (WHERE v.status = 'em_execucao') as obras_em_execucao,
  COUNT(DISTINCT v.cronograma_id) FILTER (WHERE v.status = 'concluida') as obras_concluidas,

  -- Valores
  e.valor_total_contratado,
  e.valor_total_pago,
  COALESCE(SUM(v.valor_contratado), 0) as valor_contratos_ativos,
  COALESCE(SUM(v.valor_executado), 0) as valor_executado_ativos,

  -- Médias de prazo
  AVG(
    CASE
      WHEN v.data_desmobilizacao IS NOT NULL AND v.data_mobilizacao IS NOT NULL
      THEN (v.data_desmobilizacao - v.data_mobilizacao)
    END
  ) as media_dias_obra

FROM empresas_parceiras e
LEFT JOIN cronograma_empresa_vinculos v ON v.empresa_id = e.id
WHERE e.status = 'ativa'
GROUP BY e.id, e.nome, e.servicos, e.avaliacao_media, e.numero_avaliacoes,
         e.total_obras_executadas, e.valor_total_contratado, e.valor_total_pago;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE empresas_parceiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_equipe_tecnica ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_empresa_vinculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_avaliacoes ENABLE ROW LEVEL SECURITY;

-- Policies para empresas (todos podem ver, admins e gerentes podem gerenciar)
CREATE POLICY "Todos podem ver empresas ativas"
  ON empresas_parceiras FOR SELECT
  USING (status = 'ativa' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')
  ));

CREATE POLICY "Admins e gerentes podem gerenciar empresas"
  ON empresas_parceiras FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')
  ));

-- Policies para equipe técnica (herda da empresa)
CREATE POLICY "Acesso a equipe baseado na empresa"
  ON empresas_equipe_tecnica FOR ALL
  USING (EXISTS (
    SELECT 1 FROM empresas_parceiras e
    WHERE e.id = empresa_id AND (
      e.status = 'ativa' OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')
      )
    )
  ));

-- Policies para equipamentos (herda da empresa)
CREATE POLICY "Acesso a equipamentos baseado na empresa"
  ON empresas_equipamentos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM empresas_parceiras e
    WHERE e.id = empresa_id AND (
      e.status = 'ativa' OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')
      )
    )
  ));

-- Policies para vínculos (baseado no acesso ao cronograma)
CREATE POLICY "Acesso a vínculos baseado no cronograma"
  ON cronograma_empresa_vinculos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM cronogramas c
    WHERE c.id = cronograma_id AND (
      c.created_by = auth.uid()
      OR c.responsavel_id = auth.uid()
      OR auth.uid() = ANY(c.equipe_acesso)
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente'))
    )
  ));

-- Policies para avaliações
CREATE POLICY "Todos podem ver avaliações de empresas ativas"
  ON empresas_avaliacoes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM empresas_parceiras e
    WHERE e.id = empresa_id AND e.status = 'ativa'
  ));

CREATE POLICY "Apenas quem tem acesso ao cronograma pode avaliar"
  ON empresas_avaliacoes FOR INSERT
  WITH CHECK (
    cronograma_id IS NULL OR EXISTS (
      SELECT 1 FROM cronogramas c
      WHERE c.id = cronograma_id AND (
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

COMMENT ON TABLE empresas_parceiras IS 'Empresas prestadoras de serviço e fornecedores';
COMMENT ON TABLE empresas_equipe_tecnica IS 'Profissionais que trabalham para as empresas';
COMMENT ON TABLE empresas_equipamentos IS 'Equipamentos disponíveis das empresas';
COMMENT ON TABLE cronograma_empresa_vinculos IS 'Vinculação de empresas aos cronogramas de obras';
COMMENT ON TABLE empresas_avaliacoes IS 'Histórico de avaliações das empresas';

COMMENT ON COLUMN empresas_parceiras.servicos IS 'Array de serviços que a empresa executa (fundacao, estrutura, eletrica, etc)';
COMMENT ON COLUMN cronograma_empresa_vinculos.status IS 'Status do contrato: pendente, proposta_enviada, em_negociacao, contratada, em_execucao, concluida, cancelada';
