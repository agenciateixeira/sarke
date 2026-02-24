-- =====================================================
-- MÓDULO: GESTÃO DE CARTÕES DE CRÉDITO
-- Versão: 1.0
-- Data: 24/02/2026
-- =====================================================

-- =====================================================
-- TABELA: cartoes_credito
-- =====================================================
CREATE TABLE IF NOT EXISTS cartoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,                    -- Ex: "Nubank Corporativo"
  bandeira VARCHAR(50),                          -- Visa, Mastercard, Amex, Elo
  ultimos_digitos VARCHAR(4),                    -- Ex: "1234"
  limite_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  limite_disponivel DECIMAL(15,2) NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  portador VARCHAR(100),                         -- Colaborador/Responsável
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Validações
  CONSTRAINT limite_disponivel_valido CHECK (limite_disponivel <= limite_total)
);

-- Índices
CREATE INDEX idx_cartoes_ativo ON cartoes_credito(ativo);
CREATE INDEX idx_cartoes_portador ON cartoes_credito(portador);

-- RLS
ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuários autenticados" ON cartoes_credito
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir insert para usuários autenticados" ON cartoes_credito
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir update para usuários autenticados" ON cartoes_credito
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir delete para usuários autenticados" ON cartoes_credito
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: faturas_cartao
-- =====================================================
CREATE TABLE IF NOT EXISTS faturas_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2020),
  data_fechamento DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_pago DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'parcial', 'pago', 'vencido')),
  arquivo_nome VARCHAR(255),                     -- Nome do PDF/CSV importado
  conta_pagar_id UUID,                           -- Vinculação com conta a pagar (FK será adicionada depois)
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraint única por cartão/mês/ano
  CONSTRAINT fatura_unica UNIQUE (cartao_id, mes_referencia, ano_referencia)
);

-- Índices
CREATE INDEX idx_faturas_cartao ON faturas_cartao(cartao_id);
CREATE INDEX idx_faturas_status ON faturas_cartao(status);
CREATE INDEX idx_faturas_vencimento ON faturas_cartao(data_vencimento);
CREATE INDEX idx_faturas_periodo ON faturas_cartao(ano_referencia, mes_referencia);

-- RLS
ALTER TABLE faturas_cartao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuários autenticados" ON faturas_cartao
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir insert para usuários autenticados" ON faturas_cartao
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir update para usuários autenticados" ON faturas_cartao
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir delete para usuários autenticados" ON faturas_cartao
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- TABELA: compras_cartao
-- =====================================================
CREATE TABLE IF NOT EXISTS compras_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES faturas_cartao(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id),
  data_compra DATE NOT NULL,
  descricao TEXT NOT NULL,
  categoria_id UUID REFERENCES categorias_financeiras(id),
  valor DECIMAL(15,2) NOT NULL,

  -- Parcelamento
  parcelado BOOLEAN DEFAULT false,
  parcela_atual INTEGER,                         -- Ex: 3 (de 3/12)
  parcela_total INTEGER,                         -- Ex: 12 (de 3/12)

  -- Categorização IA
  categoria_sugerida_id UUID REFERENCES categorias_financeiras(id),
  categoria_score DECIMAL(5,2),                  -- Score 0-100
  categoria_confirmada BOOLEAN DEFAULT false,

  -- Metadados
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Validações
  CONSTRAINT parcelas_validas CHECK (
    (parcelado = false AND parcela_atual IS NULL AND parcela_total IS NULL) OR
    (parcelado = true AND parcela_atual > 0 AND parcela_total > 0 AND parcela_atual <= parcela_total)
  )
);

-- Índices
CREATE INDEX idx_compras_fatura ON compras_cartao(fatura_id);
CREATE INDEX idx_compras_cartao ON compras_cartao(cartao_id);
CREATE INDEX idx_compras_data ON compras_cartao(data_compra);
CREATE INDEX idx_compras_categoria ON compras_cartao(categoria_id);
CREATE INDEX idx_compras_parceladas ON compras_cartao(parcelado) WHERE parcelado = true;

-- RLS
ALTER TABLE compras_cartao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuários autenticados" ON compras_cartao
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir insert para usuários autenticados" ON compras_cartao
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir update para usuários autenticados" ON compras_cartao
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir delete para usuários autenticados" ON compras_cartao
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- FUNCTION: Atualizar limite disponível
-- =====================================================
CREATE OR REPLACE FUNCTION atualizar_limite_cartao()
RETURNS TRIGGER AS $$
DECLARE
  v_total_faturas_pendentes DECIMAL(15,2);
BEGIN
  -- Calcular total de faturas pendentes/parciais
  SELECT COALESCE(SUM(valor_total - COALESCE(valor_pago, 0)), 0)
  INTO v_total_faturas_pendentes
  FROM faturas_cartao
  WHERE cartao_id = NEW.cartao_id
    AND status IN ('pendente', 'parcial', 'vencido');

  -- Atualizar limite disponível
  UPDATE cartoes_credito
  SET limite_disponivel = limite_total - v_total_faturas_pendentes,
      updated_at = NOW()
  WHERE id = NEW.cartao_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar limite ao inserir/atualizar fatura
CREATE TRIGGER trigger_atualizar_limite_insert
AFTER INSERT ON faturas_cartao
FOR EACH ROW
EXECUTE FUNCTION atualizar_limite_cartao();

CREATE TRIGGER trigger_atualizar_limite_update
AFTER UPDATE ON faturas_cartao
FOR EACH ROW
EXECUTE FUNCTION atualizar_limite_cartao();

-- =====================================================
-- FUNCTION: Atualizar valor total da fatura
-- =====================================================
CREATE OR REPLACE FUNCTION atualizar_valor_fatura()
RETURNS TRIGGER AS $$
DECLARE
  v_total DECIMAL(15,2);
BEGIN
  -- Calcular total de compras da fatura
  SELECT COALESCE(SUM(valor), 0)
  INTO v_total
  FROM compras_cartao
  WHERE fatura_id = COALESCE(NEW.fatura_id, OLD.fatura_id);

  -- Atualizar valor total da fatura
  UPDATE faturas_cartao
  SET valor_total = v_total,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.fatura_id, OLD.fatura_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar valor da fatura ao inserir/atualizar/deletar compra
CREATE TRIGGER trigger_atualizar_fatura_insert
AFTER INSERT ON compras_cartao
FOR EACH ROW
EXECUTE FUNCTION atualizar_valor_fatura();

CREATE TRIGGER trigger_atualizar_fatura_update
AFTER UPDATE ON compras_cartao
FOR EACH ROW
EXECUTE FUNCTION atualizar_valor_fatura();

CREATE TRIGGER trigger_atualizar_fatura_delete
AFTER DELETE ON compras_cartao
FOR EACH ROW
EXECUTE FUNCTION atualizar_valor_fatura();

-- =====================================================
-- FUNCTION: Criar conta a pagar da fatura
-- NOTA: Comentado até que a tabela contas_pagar seja criada
-- =====================================================
-- CREATE OR REPLACE FUNCTION criar_conta_pagar_fatura(
--   p_fatura_id UUID
-- )
-- RETURNS UUID AS $$
-- DECLARE
--   v_fatura RECORD;
--   v_cartao RECORD;
--   v_conta_pagar_id UUID;
-- BEGIN
--   -- Buscar dados da fatura
--   SELECT * INTO v_fatura
--   FROM faturas_cartao
--   WHERE id = p_fatura_id;
--
--   IF NOT FOUND THEN
--     RAISE EXCEPTION 'Fatura não encontrada';
--   END IF;
--
--   -- Buscar dados do cartão
--   SELECT * INTO v_cartao
--   FROM cartoes_credito
--   WHERE id = v_fatura.cartao_id;
--
--   -- Criar conta a pagar
--   INSERT INTO contas_pagar (
--     descricao,
--     fornecedor,
--     valor_total,
--     num_parcelas,
--     data_vencimento,
--     status,
--     categoria,
--     observacoes
--   ) VALUES (
--     'Fatura ' || v_cartao.nome || ' - ' ||
--       LPAD(v_fatura.mes_referencia::TEXT, 2, '0') || '/' || v_fatura.ano_referencia,
--     v_cartao.nome || ' (Cartão)',
--     v_fatura.valor_total,
--     1,
--     v_fatura.data_vencimento,
--     'pendente',
--     'Cartão de Crédito',
--     'Fatura gerada automaticamente pelo sistema. Cartão: ' || v_cartao.nome
--   )
--   RETURNING id INTO v_conta_pagar_id;
--
--   -- Vincular fatura com conta a pagar
--   UPDATE faturas_cartao
--   SET conta_pagar_id = v_conta_pagar_id,
--       updated_at = NOW()
--   WHERE id = p_fatura_id;
--
--   RETURN v_conta_pagar_id;
-- END;
-- $$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Análise de gastos por portador
-- =====================================================
CREATE OR REPLACE FUNCTION gastos_por_portador(
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE(
  portador VARCHAR,
  total_compras BIGINT,
  valor_total DECIMAL,
  valor_medio DECIMAL,
  categoria_mais_gasta VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH gastos AS (
    SELECT
      c.portador,
      co.categoria_id,
      SUM(co.valor) as total_categoria
    FROM cartoes_credito c
    JOIN faturas_cartao f ON f.cartao_id = c.id
    JOIN compras_cartao co ON co.fatura_id = f.id
    WHERE co.data_compra BETWEEN p_data_inicio AND p_data_fim
    GROUP BY c.portador, co.categoria_id
  ),
  categoria_principal AS (
    SELECT DISTINCT ON (portador)
      portador,
      (SELECT nome FROM categorias_financeiras WHERE id = categoria_id) as categoria_nome
    FROM gastos
    ORDER BY portador, total_categoria DESC
  )
  SELECT
    c.portador,
    COUNT(co.id)::BIGINT as total_compras,
    COALESCE(SUM(co.valor), 0) as valor_total,
    COALESCE(AVG(co.valor), 0) as valor_medio,
    cp.categoria_nome
  FROM cartoes_credito c
  LEFT JOIN faturas_cartao f ON f.cartao_id = c.id
  LEFT JOIN compras_cartao co ON co.fatura_id = f.id
    AND co.data_compra BETWEEN p_data_inicio AND p_data_fim
  LEFT JOIN categoria_principal cp ON cp.portador = c.portador
  WHERE c.portador IS NOT NULL
  GROUP BY c.portador, cp.categoria_nome
  ORDER BY valor_total DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Análise de faturas vencendo
-- =====================================================
CREATE OR REPLACE FUNCTION faturas_proximas_vencimento(
  p_dias INTEGER DEFAULT 7
)
RETURNS TABLE(
  fatura_id UUID,
  cartao_nome VARCHAR,
  portador VARCHAR,
  valor_total DECIMAL,
  data_vencimento DATE,
  dias_ate_vencimento INTEGER,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    c.nome,
    c.portador,
    f.valor_total,
    f.data_vencimento,
    (f.data_vencimento - CURRENT_DATE)::INTEGER as dias,
    f.status
  FROM faturas_cartao f
  JOIN cartoes_credito c ON c.id = f.cartao_id
  WHERE f.status IN ('pendente', 'parcial')
    AND f.data_vencimento <= CURRENT_DATE + p_dias
  ORDER BY f.data_vencimento;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Detectar parcelamento em descrição
-- =====================================================
CREATE OR REPLACE FUNCTION detectar_parcelamento(
  p_descricao TEXT
)
RETURNS TABLE(
  parcelado BOOLEAN,
  parcela_atual INTEGER,
  parcela_total INTEGER
) AS $$
DECLARE
  v_match TEXT[];
BEGIN
  -- Regex para detectar padrões: 3/12, 03/12, PARC 3/12, etc.
  v_match := regexp_match(
    p_descricao,
    '(?:parc[a-z]*\s*)?(\d{1,2})\s*/\s*(\d{1,2})',
    'i'
  );

  IF v_match IS NOT NULL THEN
    RETURN QUERY SELECT
      true,
      v_match[1]::INTEGER,
      v_match[2]::INTEGER;
  ELSE
    RETURN QUERY SELECT false, NULL::INTEGER, NULL::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DADOS INICIAIS: Categorias específicas de cartão
-- =====================================================

-- Adicionar categoria "Cartão de Crédito" se não existir
INSERT INTO categorias_financeiras (nome, tipo, icone, cor)
VALUES ('Cartão de Crédito', 'despesa', '💳', '#8b5cf6')
ON CONFLICT DO NOTHING;

-- Palavras-chave para identificar despesas de cartão
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT
  cf.id,
  keyword,
  2
FROM categorias_financeiras cf,
LATERAL (VALUES
  ('cartao'),
  ('cartão'),
  ('credito'),
  ('crédito'),
  ('fatura'),
  ('mastercard'),
  ('visa'),
  ('amex'),
  ('elo'),
  ('nubank'),
  ('inter'),
  ('c6 bank')
) AS keywords(keyword)
WHERE cf.nome = 'Cartão de Crédito'
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE cartoes_credito IS 'Cadastro de cartões de crédito da empresa';
COMMENT ON TABLE faturas_cartao IS 'Faturas mensais dos cartões de crédito';
COMMENT ON TABLE compras_cartao IS 'Compras individuais realizadas com cartão';

COMMENT ON FUNCTION atualizar_limite_cartao() IS 'Atualiza limite disponível baseado em faturas pendentes';
-- COMMENT ON FUNCTION criar_conta_pagar_fatura(UUID) IS 'Cria automaticamente conta a pagar para fatura de cartão';
COMMENT ON FUNCTION gastos_por_portador(DATE, DATE) IS 'Análise de gastos por colaborador/portador';
COMMENT ON FUNCTION faturas_proximas_vencimento(INTEGER) IS 'Lista faturas vencendo nos próximos N dias';
COMMENT ON FUNCTION detectar_parcelamento(TEXT) IS 'Detecta parcelamento em descrição de compra (ex: 3/12)';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
