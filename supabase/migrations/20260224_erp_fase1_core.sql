-- =====================================================
-- ERP FINANCEIRO - FASE 1: CORE
-- =====================================================
-- Data: 24/02/2026
-- Descrição: Schema base do ERP - Plano de Contas, Bancos e Lançamentos
-- =====================================================

-- =====================================================
-- 1. PLANO DE CONTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Código e hierarquia
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nivel INTEGER NOT NULL,
  pai_id UUID REFERENCES plano_contas(id) ON DELETE RESTRICT,

  -- Informações
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'ativo', 'passivo', 'patrimonio')),
  natureza VARCHAR(20) NOT NULL CHECK (natureza IN ('debito', 'credito')),

  -- Controles
  aceita_lancamento BOOLEAN DEFAULT TRUE,
  ativa BOOLEAN DEFAULT TRUE,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_plano_contas_codigo ON plano_contas(codigo);
CREATE INDEX idx_plano_contas_tipo ON plano_contas(tipo);
CREATE INDEX idx_plano_contas_pai ON plano_contas(pai_id);
CREATE INDEX idx_plano_contas_ativa ON plano_contas(ativa);

-- Comentários
COMMENT ON TABLE plano_contas IS 'Plano de contas contábil hierárquico';
COMMENT ON COLUMN plano_contas.codigo IS 'Código contábil (ex: 1.1.1.1)';
COMMENT ON COLUMN plano_contas.nivel IS 'Nível na hierarquia (1, 2, 3, 4)';
COMMENT ON COLUMN plano_contas.aceita_lancamento IS 'FALSE para contas sintéticas (apenas agrupamento)';

-- =====================================================
-- 2. CONTAS BANCÁRIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações do banco
  banco_codigo VARCHAR(10),
  banco_nome VARCHAR(100),

  -- Conta
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('conta_corrente', 'poupanca', 'caixa', 'carteira_digital')),
  agencia VARCHAR(20),
  numero_conta VARCHAR(50),

  -- Identificação
  nome VARCHAR(200) NOT NULL,
  apelido VARCHAR(100),

  -- Saldo
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  saldo_atual DECIMAL(15,2) DEFAULT 0,

  -- Integração bancária (futuro)
  integrado BOOLEAN DEFAULT FALSE,
  api_config JSONB,
  ultima_sincronizacao TIMESTAMPTZ,

  -- Status
  ativa BOOLEAN DEFAULT TRUE,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_contas_bancarias_ativa ON contas_bancarias(ativa);
CREATE INDEX idx_contas_bancarias_tipo ON contas_bancarias(tipo);

-- Comentários
COMMENT ON TABLE contas_bancarias IS 'Contas bancárias, caixas e carteiras digitais';
COMMENT ON COLUMN contas_bancarias.saldo_atual IS 'Atualizado automaticamente pelos lançamentos';

-- =====================================================
-- 3. LANÇAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo e descrição
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
  descricao TEXT NOT NULL,
  numero_documento VARCHAR(100),

  -- Datas
  data_lancamento DATE NOT NULL,
  data_competencia DATE NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,

  -- Valores
  valor_total DECIMAL(15,2) NOT NULL,
  valor_pago DECIMAL(15,2) DEFAULT 0,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'parcial', 'pago', 'cancelado', 'atrasado')),

  -- Relacionamentos
  cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES empresas_parceiras(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,

  -- Banco/Caixa
  conta_bancaria_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  forma_pagamento VARCHAR(50),

  -- Impostos
  valor_impostos DECIMAL(15,2) DEFAULT 0,

  -- Anexos
  comprovante_url TEXT,
  nota_fiscal_url TEXT,

  -- Recorrência
  recorrente BOOLEAN DEFAULT FALSE,

  -- Observações
  observacoes TEXT,
  tags TEXT[],

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_lancamentos_data_lancamento ON lancamentos(data_lancamento DESC);
CREATE INDEX idx_lancamentos_data_competencia ON lancamentos(data_competencia);
CREATE INDEX idx_lancamentos_status ON lancamentos(status);
CREATE INDEX idx_lancamentos_tipo ON lancamentos(tipo);
CREATE INDEX idx_lancamentos_cliente ON lancamentos(cliente_id);
CREATE INDEX idx_lancamentos_projeto ON lancamentos(projeto_id);
CREATE INDEX idx_lancamentos_obra ON lancamentos(obra_id);
CREATE INDEX idx_lancamentos_conta_bancaria ON lancamentos(conta_bancaria_id);
CREATE INDEX idx_lancamentos_created_at ON lancamentos(created_at DESC);

-- Comentários
COMMENT ON TABLE lancamentos IS 'Lançamentos financeiros (receitas e despesas)';
COMMENT ON COLUMN lancamentos.data_competencia IS 'Regime de competência (quando ocorreu)';
COMMENT ON COLUMN lancamentos.data_lancamento IS 'Quando foi registrado';
COMMENT ON COLUMN lancamentos.data_vencimento IS 'Quando vence (se aplicável)';
COMMENT ON COLUMN lancamentos.data_pagamento IS 'Quando foi pago/recebido';

-- =====================================================
-- 4. ITENS DE LANÇAMENTO (PARTIDAS DOBRADAS)
-- =====================================================
CREATE TABLE IF NOT EXISTS lancamentos_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,

  -- Plano de contas
  conta_id UUID NOT NULL REFERENCES plano_contas(id) ON DELETE RESTRICT,

  -- Débito ou Crédito
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('debito', 'credito')),
  valor DECIMAL(15,2) NOT NULL CHECK (valor > 0),

  -- Histórico específico
  historico TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_lancamentos_itens_lancamento ON lancamentos_itens(lancamento_id);
CREATE INDEX idx_lancamentos_itens_conta ON lancamentos_itens(conta_id);
CREATE INDEX idx_lancamentos_itens_tipo ON lancamentos_itens(tipo);

-- Comentários
COMMENT ON TABLE lancamentos_itens IS 'Itens de lançamento contábil (partidas dobradas)';
COMMENT ON COLUMN lancamentos_itens.tipo IS 'debito ou credito (sistema de partidas dobradas)';

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger: atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plano_contas_updated_at
  BEFORE UPDATE ON plano_contas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_contas_bancarias_updated_at
  BEFORE UPDATE ON contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_lancamentos_updated_at
  BEFORE UPDATE ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: validar partidas dobradas
CREATE OR REPLACE FUNCTION validar_partidas_dobradas()
RETURNS TRIGGER AS $$
DECLARE
  total_debitos DECIMAL(15,2);
  total_creditos DECIMAL(15,2);
  lancamento_valor DECIMAL(15,2);
BEGIN
  -- Buscar valor total do lançamento
  SELECT valor_total INTO lancamento_valor
  FROM lancamentos
  WHERE id = NEW.lancamento_id;

  -- Calcular totais
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'debito' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE 0 END), 0)
  INTO total_debitos, total_creditos
  FROM lancamentos_itens
  WHERE lancamento_id = NEW.lancamento_id;

  -- Validar
  IF total_debitos != total_creditos THEN
    RAISE EXCEPTION 'Partidas dobradas inválidas: débitos (%) != créditos (%)',
      total_debitos, total_creditos;
  END IF;

  IF total_debitos != lancamento_valor THEN
    RAISE EXCEPTION 'Soma dos itens (%) diferente do valor do lançamento (%)',
      total_debitos, lancamento_valor;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validar_partidas
  AFTER INSERT OR UPDATE ON lancamentos_itens
  FOR EACH ROW
  EXECUTE FUNCTION validar_partidas_dobradas();

-- Trigger: atualizar saldo bancário
CREATE OR REPLACE FUNCTION atualizar_saldo_bancario()
RETURNS TRIGGER AS $$
DECLARE
  valor_movimento DECIMAL(15,2);
BEGIN
  -- Apenas atualizar saldo quando status = 'pago'
  IF NEW.status = 'pago' AND NEW.conta_bancaria_id IS NOT NULL THEN
    -- Calcular movimento
    IF NEW.tipo = 'receita' THEN
      valor_movimento := NEW.valor_pago;
    ELSIF NEW.tipo = 'despesa' THEN
      valor_movimento := -NEW.valor_pago;
    ELSE
      valor_movimento := 0;
    END IF;

    -- Atualizar saldo da conta
    UPDATE contas_bancarias
    SET
      saldo_atual = saldo_atual + valor_movimento,
      updated_at = NOW()
    WHERE id = NEW.conta_bancaria_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_saldo
  AFTER INSERT OR UPDATE OF status, valor_pago ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_saldo_bancario();

-- Trigger: atualizar status para 'atrasado'
CREATE OR REPLACE FUNCTION atualizar_status_atrasado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pendente' AND NEW.data_vencimento < CURRENT_DATE THEN
    NEW.status := 'atrasado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_status_atrasado
  BEFORE INSERT OR UPDATE ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_status_atrasado();

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_itens ENABLE ROW LEVEL SECURITY;

-- Policies: Todos usuários autenticados podem ver
CREATE POLICY "plano_contas_select_all"
  ON plano_contas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contas_bancarias_select_all"
  ON contas_bancarias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "lancamentos_select_all"
  ON lancamentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "lancamentos_itens_select_all"
  ON lancamentos_itens FOR SELECT
  TO authenticated
  USING (true);

-- Policies: Admins, gerentes e colaboradores podem gerenciar
CREATE POLICY "plano_contas_all_staff"
  ON plano_contas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

CREATE POLICY "contas_bancarias_all_staff"
  ON contas_bancarias FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

CREATE POLICY "lancamentos_all_staff"
  ON lancamentos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

CREATE POLICY "lancamentos_itens_all_staff"
  ON lancamentos_itens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente', 'colaborador')
    )
  );

-- =====================================================
-- 7. DADOS INICIAIS - PLANO DE CONTAS
-- =====================================================

-- Inserir plano de contas padrão
INSERT INTO plano_contas (codigo, nivel, pai_id, nome, tipo, natureza, aceita_lancamento) VALUES

-- 1. RECEITAS
('1', 1, NULL, 'RECEITAS', 'receita', 'credito', FALSE),
('1.1', 2, (SELECT id FROM plano_contas WHERE codigo = '1'), 'Receitas Operacionais', 'receita', 'credito', FALSE),
('1.1.1', 3, (SELECT id FROM plano_contas WHERE codigo = '1.1'), 'Projetos Arquitetônicos', 'receita', 'credito', FALSE),
('1.1.1.1', 4, (SELECT id FROM plano_contas WHERE codigo = '1.1.1'), 'Residencial', 'receita', 'credito', TRUE),
('1.1.1.2', 4, (SELECT id FROM plano_contas WHERE codigo = '1.1.1'), 'Comercial', 'receita', 'credito', TRUE),
('1.1.1.3', 4, (SELECT id FROM plano_contas WHERE codigo = '1.1.1'), 'Corporativo', 'receita', 'credito', TRUE),
('1.1.2', 3, (SELECT id FROM plano_contas WHERE codigo = '1.1'), 'Projetos de Interiores', 'receita', 'credito', TRUE),
('1.1.3', 3, (SELECT id FROM plano_contas WHERE codigo = '1.1'), 'Obras e Reformas', 'receita', 'credito', TRUE),
('1.1.4', 3, (SELECT id FROM plano_contas WHERE codigo = '1.1'), 'Consultoria e Assessoria', 'receita', 'credito', TRUE),
('1.2', 2, (SELECT id FROM plano_contas WHERE codigo = '1'), 'Receitas Não Operacionais', 'receita', 'credito', FALSE),
('1.2.1', 3, (SELECT id FROM plano_contas WHERE codigo = '1.2'), 'Juros Recebidos', 'receita', 'credito', TRUE),

-- 2. DESPESAS
('2', 1, NULL, 'DESPESAS', 'despesa', 'debito', FALSE),
('2.1', 2, (SELECT id FROM plano_contas WHERE codigo = '2'), 'Custos Diretos', 'despesa', 'debito', FALSE),
('2.1.1', 3, (SELECT id FROM plano_contas WHERE codigo = '2.1'), 'Materiais e Insumos', 'despesa', 'debito', TRUE),
('2.1.2', 3, (SELECT id FROM plano_contas WHERE codigo = '2.1'), 'Mão de Obra Terceiros', 'despesa', 'debito', TRUE),
('2.2', 2, (SELECT id FROM plano_contas WHERE codigo = '2'), 'Despesas Operacionais', 'despesa', 'debito', FALSE),
('2.2.1', 3, (SELECT id FROM plano_contas WHERE codigo = '2.2'), 'Pessoal', 'despesa', 'debito', FALSE),
('2.2.1.1', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.1'), 'Salários e Pró-labore', 'despesa', 'debito', TRUE),
('2.2.1.2', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.1'), 'Encargos Sociais', 'despesa', 'debito', TRUE),
('2.2.2', 3, (SELECT id FROM plano_contas WHERE codigo = '2.2'), 'Infraestrutura', 'despesa', 'debito', FALSE),
('2.2.2.1', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.2'), 'Aluguel', 'despesa', 'debito', TRUE),
('2.2.2.2', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.2'), 'Energia Elétrica', 'despesa', 'debito', TRUE),
('2.2.2.3', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.2'), 'Internet e Telefonia', 'despesa', 'debito', TRUE),
('2.2.3', 3, (SELECT id FROM plano_contas WHERE codigo = '2.2'), 'Administrativo', 'despesa', 'debito', FALSE),
('2.2.3.1', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.3'), 'Material de Escritório', 'despesa', 'debito', TRUE),
('2.2.3.2', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.3'), 'Software e Licenças', 'despesa', 'debito', TRUE),
('2.2.4', 3, (SELECT id FROM plano_contas WHERE codigo = '2.2'), 'Marketing', 'despesa', 'debito', FALSE),
('2.2.4.1', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.4'), 'Publicidade', 'despesa', 'debito', TRUE),
('2.2.5', 3, (SELECT id FROM plano_contas WHERE codigo = '2.2'), 'Impostos e Taxas', 'despesa', 'debito', FALSE),
('2.2.5.1', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.5'), 'ISS', 'despesa', 'debito', TRUE),
('2.2.5.2', 4, (SELECT id FROM plano_contas WHERE codigo = '2.2.5'), 'IRPJ', 'despesa', 'debito', TRUE),

-- 3. ATIVO
('3', 1, NULL, 'ATIVO', 'ativo', 'debito', FALSE),
('3.1', 2, (SELECT id FROM plano_contas WHERE codigo = '3'), 'Ativo Circulante', 'ativo', 'debito', FALSE),
('3.1.1', 3, (SELECT id FROM plano_contas WHERE codigo = '3.1'), 'Caixa e Bancos', 'ativo', 'debito', TRUE),
('3.1.2', 3, (SELECT id FROM plano_contas WHERE codigo = '3.1'), 'Contas a Receber', 'ativo', 'debito', TRUE),

-- 4. PASSIVO
('4', 1, NULL, 'PASSIVO', 'passivo', 'credito', FALSE),
('4.1', 2, (SELECT id FROM plano_contas WHERE codigo = '4'), 'Passivo Circulante', 'passivo', 'credito', FALSE),
('4.1.1', 3, (SELECT id FROM plano_contas WHERE codigo = '4.1'), 'Fornecedores', 'passivo', 'credito', TRUE),
('4.1.2', 3, (SELECT id FROM plano_contas WHERE codigo = '4.1'), 'Impostos a Recolher', 'passivo', 'credito', TRUE);

-- =====================================================
-- 8. DADOS INICIAIS - CONTAS BANCÁRIAS
-- =====================================================

-- Inserir conta de caixa padrão
INSERT INTO contas_bancarias (tipo, nome, apelido, saldo_inicial, saldo_atual, ativa)
VALUES ('caixa', 'Caixa Geral', 'Caixa', 0, 0, TRUE);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
