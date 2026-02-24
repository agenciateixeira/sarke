-- =====================================================
-- FASE 4 - CONCILIAÇÃO BANCÁRIA
-- Schema para importação de extratos e conciliação
-- =====================================================

-- ==========================================
-- TABLE: Extratos Bancários Importados
-- ==========================================
CREATE TABLE IF NOT EXISTS extratos_bancarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conta_bancaria_id UUID NOT NULL REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  data_importacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  arquivo_nome VARCHAR(255),
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  quantidade_transacoes INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- TABLE: Transações Bancárias (do extrato)
-- ==========================================
CREATE TABLE IF NOT EXISTS transacoes_bancarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extrato_id UUID NOT NULL REFERENCES extratos_bancarios(id) ON DELETE CASCADE,
  conta_bancaria_id UUID NOT NULL REFERENCES contas_bancarias(id) ON DELETE CASCADE,
  data_transacao DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('credito', 'debito')),
  saldo_apos_transacao DECIMAL(15,2),
  documento VARCHAR(100),

  -- Conciliação
  status_conciliacao VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status_conciliacao IN ('pendente', 'conciliado', 'ignorado')),
  lancamento_id UUID REFERENCES lancamentos(id) ON DELETE SET NULL,
  conciliado_em TIMESTAMPTZ,
  conciliado_por UUID REFERENCES auth.users(id),
  conciliacao_automatica BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: não permitir duplicatas
  CONSTRAINT unique_transacao UNIQUE (conta_bancaria_id, data_transacao, descricao, valor)
);

-- ==========================================
-- TABLE: Regras de Categorização Automática
-- ==========================================
CREATE TABLE IF NOT EXISTS regras_categorizacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(200) NOT NULL,
  ativa BOOLEAN DEFAULT TRUE,
  prioridade INTEGER DEFAULT 0, -- Maior número = maior prioridade

  -- Condições (todas devem ser atendidas)
  descricao_contem TEXT[], -- Array de palavras-chave
  valor_minimo DECIMAL(15,2),
  valor_maximo DECIMAL(15,2),
  tipo_transacao VARCHAR(20) CHECK (tipo_transacao IN ('credito', 'debito', 'ambos')),
  conta_bancaria_id UUID REFERENCES contas_bancarias(id),

  -- Ação: o que fazer quando a regra bater
  conta_id UUID REFERENCES plano_contas(id), -- Conta contábil a usar
  categoria VARCHAR(100),
  cliente_id UUID REFERENCES clients(id),
  projeto_id UUID REFERENCES projetos(id),
  obra_id UUID REFERENCES obras(id),
  observacao_padrao TEXT,

  -- Controle
  total_aplicacoes INTEGER DEFAULT 0,
  ultima_aplicacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ==========================================
-- TABLE: Alertas Financeiros
-- ==========================================
CREATE TABLE IF NOT EXISTS alertas_financeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('saldo_baixo', 'titulo_vencendo', 'meta_atingida', 'conciliacao_pendente', 'fluxo_negativo', 'custom')),
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  severidade VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severidade IN ('info', 'warning', 'error', 'success')),

  -- Dados relacionados
  conta_bancaria_id UUID REFERENCES contas_bancarias(id),
  lancamento_id UUID REFERENCES lancamentos(id),
  data_referencia DATE,
  valor_referencia DECIMAL(15,2),

  -- Status
  lido BOOLEAN DEFAULT FALSE,
  lido_em TIMESTAMPTZ,
  lido_por UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_extratos_conta ON extratos_bancarios(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_extratos_periodo ON extratos_bancarios(periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_transacoes_extrato ON transacoes_bancarias(extrato_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_conta ON transacoes_bancarias(conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes_bancarias(data_transacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes_bancarias(status_conciliacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_lancamento ON transacoes_bancarias(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_regras_ativa ON regras_categorizacao(ativa, prioridade DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_lido ON alertas_financeiros(lido, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo ON alertas_financeiros(tipo);

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION update_extratos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_extratos_timestamp
BEFORE UPDATE ON extratos_bancarios
FOR EACH ROW EXECUTE FUNCTION update_extratos_timestamp();

CREATE TRIGGER trigger_transacoes_timestamp
BEFORE UPDATE ON transacoes_bancarias
FOR EACH ROW EXECUTE FUNCTION update_extratos_timestamp();

CREATE TRIGGER trigger_regras_timestamp
BEFORE UPDATE ON regras_categorizacao
FOR EACH ROW EXECUTE FUNCTION update_extratos_timestamp();

-- ==========================================
-- RLS POLICIES
-- ==========================================
ALTER TABLE extratos_bancarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE regras_categorizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_financeiros ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (autenticado pode tudo)
CREATE POLICY "Usuários autenticados podem gerenciar extratos"
  ON extratos_bancarios FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem gerenciar transações"
  ON transacoes_bancarias FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem gerenciar regras"
  ON regras_categorizacao FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem gerenciar alertas"
  ON alertas_financeiros FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- COMENTÁRIOS
-- ==========================================
COMMENT ON TABLE extratos_bancarios IS 'Arquivos de extrato bancário importados (OFX, CSV, etc)';
COMMENT ON TABLE transacoes_bancarias IS 'Transações individuais importadas dos extratos bancários';
COMMENT ON TABLE regras_categorizacao IS 'Regras para categorização automática de transações bancárias';
COMMENT ON TABLE alertas_financeiros IS 'Sistema de alertas e notificações financeiras';

COMMENT ON COLUMN transacoes_bancarias.status_conciliacao IS 'Status: pendente (não conciliado), conciliado (ligado a um lançamento), ignorado';
COMMENT ON COLUMN regras_categorizacao.prioridade IS 'Maior número = aplicada primeiro. Use para resolver conflitos entre regras';
COMMENT ON COLUMN regras_categorizacao.descricao_contem IS 'Array de palavras-chave. Ex: {''SALARIO'', ''PAGAMENTO''} - se qualquer uma aparecer na descrição, a regra bate';
