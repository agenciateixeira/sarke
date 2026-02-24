-- =====================================================
-- FASE 2 - CONTAS A PAGAR/RECEBER
-- Migrations para sistema de parcelamento e recorrência
-- =====================================================

-- ==========================================
-- TABELA: formas_pagamento
-- ==========================================
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('dinheiro', 'pix', 'ted', 'doc', 'boleto', 'cartao_credito', 'cartao_debito', 'cheque', 'outros')),
  taxa_percentual DECIMAL(5,2) DEFAULT 0, -- Taxa da forma de pagamento
  dias_compensacao INTEGER DEFAULT 0, -- Dias para compensação
  ativa BOOLEAN DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TABELA: lancamentos_parcelas
-- ==========================================
CREATE TABLE IF NOT EXISTS lancamentos_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,

  -- Valores
  valor_original DECIMAL(15,2) NOT NULL CHECK (valor_original > 0),
  valor_juros DECIMAL(15,2) DEFAULT 0,
  valor_multa DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_total DECIMAL(15,2) NOT NULL CHECK (valor_total > 0),
  valor_pago DECIMAL(15,2) DEFAULT 0 CHECK (valor_pago >= 0),

  -- Datas
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'parcial', 'atrasado', 'cancelado')),

  -- Pagamento
  forma_pagamento_id UUID REFERENCES formas_pagamento(id),

  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: número de parcela válido
  CONSTRAINT parcela_valida CHECK (numero_parcela > 0 AND numero_parcela <= total_parcelas),

  -- Constraint: valor pago não pode ser maior que valor total
  CONSTRAINT valor_pago_valido CHECK (valor_pago <= valor_total)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_parcelas_lancamento ON lancamentos_parcelas(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON lancamentos_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON lancamentos_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_status_vencimento ON lancamentos_parcelas(status, data_vencimento);

-- ==========================================
-- TABELA: lancamentos_recorrencia
-- ==========================================
CREATE TABLE IF NOT EXISTS lancamentos_recorrencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_modelo_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,

  -- Configuração da recorrência
  frequencia VARCHAR(50) NOT NULL CHECK (frequencia IN ('diaria', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
  dia_vencimento INTEGER, -- Dia do mês (1-31) para recorrências mensais

  -- Período de vigência
  data_inicio DATE NOT NULL,
  data_fim DATE, -- NULL = sem data de término
  numero_repeticoes INTEGER, -- Alternativa à data_fim: repetir N vezes

  -- Controle
  ativa BOOLEAN DEFAULT TRUE,
  proxima_geracao DATE, -- Próxima data para gerar lançamento
  ultima_geracao DATE, -- Última vez que gerou lançamento

  -- Opções
  ajustar_valor_automatico BOOLEAN DEFAULT FALSE, -- Reajuste automático (ex: inflação)
  percentual_reajuste DECIMAL(5,2) DEFAULT 0,

  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: data fim deve ser maior que data início
  CONSTRAINT datas_validas CHECK (data_fim IS NULL OR data_fim > data_inicio),

  -- Constraint: dia do vencimento válido
  CONSTRAINT dia_vencimento_valido CHECK (dia_vencimento IS NULL OR (dia_vencimento >= 1 AND dia_vencimento <= 31))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recorrencia_ativa ON lancamentos_recorrencia(ativa);
CREATE INDEX IF NOT EXISTS idx_recorrencia_proxima_geracao ON lancamentos_recorrencia(proxima_geracao) WHERE ativa = true;

-- ==========================================
-- FUNCTION: Atualizar status de parcelas atrasadas
-- ==========================================
CREATE OR REPLACE FUNCTION atualizar_status_parcelas_atrasadas()
RETURNS INTEGER AS $$
DECLARE
  parcelas_atualizadas INTEGER;
BEGIN
  -- Atualizar parcelas pendentes que venceram
  UPDATE lancamentos_parcelas
  SET
    status = 'atrasado',
    updated_at = NOW()
  WHERE
    status = 'pendente'
    AND data_vencimento < CURRENT_DATE;

  GET DIAGNOSTICS parcelas_atualizadas = ROW_COUNT;

  RETURN parcelas_atualizadas;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Calcular juros e multa
-- ==========================================
CREATE OR REPLACE FUNCTION calcular_juros_multa(
  p_valor_original DECIMAL,
  p_data_vencimento DATE,
  p_data_pagamento DATE DEFAULT CURRENT_DATE,
  p_percentual_juros_dia DECIMAL DEFAULT 0.033, -- 1% ao mês = 0.033% ao dia
  p_percentual_multa DECIMAL DEFAULT 2.0 -- 2% de multa
)
RETURNS TABLE(
  valor_juros DECIMAL,
  valor_multa DECIMAL,
  dias_atraso INTEGER
) AS $$
DECLARE
  v_dias_atraso INTEGER;
  v_valor_juros DECIMAL;
  v_valor_multa DECIMAL;
BEGIN
  -- Calcular dias de atraso
  v_dias_atraso := GREATEST(0, p_data_pagamento - p_data_vencimento);

  IF v_dias_atraso > 0 THEN
    -- Calcular juros (juros simples por dia)
    v_valor_juros := p_valor_original * (p_percentual_juros_dia / 100) * v_dias_atraso;

    -- Calcular multa (aplicada uma vez)
    v_valor_multa := p_valor_original * (p_percentual_multa / 100);
  ELSE
    v_valor_juros := 0;
    v_valor_multa := 0;
  END IF;

  RETURN QUERY SELECT
    ROUND(v_valor_juros, 2),
    ROUND(v_valor_multa, 2),
    v_dias_atraso;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Gerar parcelas para um lançamento
-- ==========================================
CREATE OR REPLACE FUNCTION gerar_parcelas(
  p_lancamento_id UUID,
  p_numero_parcelas INTEGER,
  p_data_primeiro_vencimento DATE,
  p_intervalo_dias INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  v_lancamento RECORD;
  v_valor_parcela DECIMAL;
  v_valor_ultima_parcela DECIMAL;
  v_data_vencimento DATE;
  i INTEGER;
BEGIN
  -- Buscar lançamento
  SELECT * INTO v_lancamento
  FROM lancamentos
  WHERE id = p_lancamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado';
  END IF;

  -- Validar
  IF p_numero_parcelas <= 0 THEN
    RAISE EXCEPTION 'Número de parcelas deve ser maior que zero';
  END IF;

  -- Calcular valor de cada parcela (divisão simples)
  v_valor_parcela := FLOOR((v_lancamento.valor_total / p_numero_parcelas) * 100) / 100;

  -- A última parcela leva a diferença (ajuste de centavos)
  v_valor_ultima_parcela := v_lancamento.valor_total - (v_valor_parcela * (p_numero_parcelas - 1));

  -- Gerar parcelas
  FOR i IN 1..p_numero_parcelas LOOP
    v_data_vencimento := p_data_primeiro_vencimento + ((i - 1) * p_intervalo_dias);

    INSERT INTO lancamentos_parcelas (
      lancamento_id,
      numero_parcela,
      total_parcelas,
      valor_original,
      valor_total,
      data_vencimento,
      status
    ) VALUES (
      p_lancamento_id,
      i,
      p_numero_parcelas,
      CASE WHEN i = p_numero_parcelas THEN v_valor_ultima_parcela ELSE v_valor_parcela END,
      CASE WHEN i = p_numero_parcelas THEN v_valor_ultima_parcela ELSE v_valor_parcela END,
      v_data_vencimento,
      'pendente'
    );
  END LOOP;

  RETURN p_numero_parcelas;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Dar baixa em parcela
-- ==========================================
CREATE OR REPLACE FUNCTION dar_baixa_parcela(
  p_parcela_id UUID,
  p_data_pagamento DATE,
  p_forma_pagamento_id UUID DEFAULT NULL,
  p_valor_pago DECIMAL DEFAULT NULL,
  p_aplicar_juros_multa BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_parcela RECORD;
  v_valor_final DECIMAL;
  v_juros DECIMAL := 0;
  v_multa DECIMAL := 0;
BEGIN
  -- Buscar parcela
  SELECT * INTO v_parcela
  FROM lancamentos_parcelas
  WHERE id = p_parcela_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  -- Se já está paga, não fazer nada
  IF v_parcela.status = 'pago' THEN
    RAISE EXCEPTION 'Parcela já está paga';
  END IF;

  -- Calcular juros e multa se aplicável
  IF p_aplicar_juros_multa AND p_data_pagamento > v_parcela.data_vencimento THEN
    SELECT
      cjm.valor_juros,
      cjm.valor_multa
    INTO v_juros, v_multa
    FROM calcular_juros_multa(
      v_parcela.valor_original,
      v_parcela.data_vencimento,
      p_data_pagamento
    ) cjm;
  END IF;

  -- Determinar valor pago
  v_valor_final := COALESCE(p_valor_pago, v_parcela.valor_total + v_juros + v_multa);

  -- Atualizar parcela
  UPDATE lancamentos_parcelas
  SET
    valor_juros = v_juros,
    valor_multa = v_multa,
    valor_pago = v_valor_final,
    data_pagamento = p_data_pagamento,
    forma_pagamento_id = p_forma_pagamento_id,
    status = CASE
      WHEN v_valor_final >= (valor_total + v_juros + v_multa) THEN 'pago'
      ELSE 'parcial'
    END,
    updated_at = NOW()
  WHERE id = p_parcela_id;

  -- Atualizar lançamento pai (somar valores pagos)
  UPDATE lancamentos
  SET
    valor_pago = (
      SELECT COALESCE(SUM(valor_pago), 0)
      FROM lancamentos_parcelas
      WHERE lancamento_id = v_parcela.lancamento_id
    ),
    status = CASE
      WHEN (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = v_parcela.lancamento_id AND status = 'pago') =
           (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = v_parcela.lancamento_id)
      THEN 'pago'
      WHEN (SELECT SUM(valor_pago) FROM lancamentos_parcelas WHERE lancamento_id = v_parcela.lancamento_id) > 0
      THEN 'parcial'
      ELSE status
    END,
    data_pagamento = CASE
      WHEN (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = v_parcela.lancamento_id AND status = 'pago') =
           (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = v_parcela.lancamento_id)
      THEN p_data_pagamento
      ELSE data_pagamento
    END,
    updated_at = NOW()
  WHERE id = v_parcela.lancamento_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGER: Atualizar updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_formas_pagamento_updated_at BEFORE UPDATE ON formas_pagamento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcelas_updated_at BEFORE UPDATE ON lancamentos_parcelas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recorrencia_updated_at BEFORE UPDATE ON lancamentos_recorrencia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- POPULAR: Formas de pagamento padrão
-- ==========================================
INSERT INTO formas_pagamento (nome, tipo, dias_compensacao) VALUES
  ('Dinheiro', 'dinheiro', 0),
  ('PIX', 'pix', 0),
  ('TED', 'ted', 1),
  ('DOC', 'doc', 1),
  ('Boleto', 'boleto', 2),
  ('Cartão de Crédito', 'cartao_credito', 30),
  ('Cartão de Débito', 'cartao_debito', 1),
  ('Cheque', 'cheque', 2)
ON CONFLICT DO NOTHING;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Formas de Pagamento
ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar formas de pagamento"
  ON formas_pagamento FOR SELECT
  USING (true);

CREATE POLICY "Admins e financeiro podem gerenciar formas de pagamento"
  ON formas_pagamento FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (role = 'admin' OR setor = 'financeiro')
    )
  );

-- Parcelas
ALTER TABLE lancamentos_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar parcelas de lançamentos que têm acesso"
  ON lancamentos_parcelas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.id = lancamento_id
    )
  );

CREATE POLICY "Admins e financeiro podem gerenciar parcelas"
  ON lancamentos_parcelas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (role = 'admin' OR setor = 'financeiro')
    )
  );

-- Recorrências
ALTER TABLE lancamentos_recorrencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar recorrências"
  ON lancamentos_recorrencia FOR SELECT
  USING (true);

CREATE POLICY "Admins e financeiro podem gerenciar recorrências"
  ON lancamentos_recorrencia FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (role = 'admin' OR setor = 'financeiro')
    )
  );

-- ==========================================
-- COMENTÁRIOS
-- ==========================================
COMMENT ON TABLE formas_pagamento IS 'Formas de pagamento disponíveis no sistema';
COMMENT ON TABLE lancamentos_parcelas IS 'Parcelas de lançamentos financeiros para contas a pagar/receber';
COMMENT ON TABLE lancamentos_recorrencia IS 'Configuração de lançamentos recorrentes';

COMMENT ON FUNCTION gerar_parcelas IS 'Gera parcelas para um lançamento financeiro';
COMMENT ON FUNCTION dar_baixa_parcela IS 'Registra o pagamento de uma parcela com cálculo automático de juros/multa';
COMMENT ON FUNCTION calcular_juros_multa IS 'Calcula juros e multa baseado em dias de atraso';
COMMENT ON FUNCTION atualizar_status_parcelas_atrasadas IS 'Atualiza status de parcelas vencidas para atrasado';
