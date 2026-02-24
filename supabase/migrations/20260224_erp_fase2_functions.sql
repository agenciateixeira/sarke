-- =====================================================
-- FASE 2 - FUNCTIONS PARA CONTAS A PAGAR/RECEBER
-- Views e funções para análise de recebíveis e pagamentos
-- =====================================================

-- ==========================================
-- VIEW: Contas a Receber (resumo)
-- ==========================================
CREATE OR REPLACE VIEW vw_contas_receber AS
SELECT
  l.id,
  l.descricao,
  l.valor_total,
  l.valor_pago,
  (l.valor_total - l.valor_pago) AS valor_pendente,
  l.data_lancamento,
  l.data_competencia,
  l.data_vencimento,
  l.data_pagamento,
  l.status,
  l.cliente_id,
  l.projeto_id,
  l.obra_id,
  -- Informações de parcelas
  (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = l.id) AS total_parcelas,
  (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = l.id AND status = 'pago') AS parcelas_pagas,
  (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = l.id AND status = 'atrasado') AS parcelas_atrasadas,
  -- Próximo vencimento
  (
    SELECT MIN(data_vencimento)
    FROM lancamentos_parcelas
    WHERE lancamento_id = l.id AND status IN ('pendente', 'parcial')
  ) AS proxima_parcela_vencimento,
  -- Dias para vencimento (negativo = atrasado)
  CASE
    WHEN l.data_vencimento IS NOT NULL THEN
      l.data_vencimento - CURRENT_DATE
    ELSE NULL
  END AS dias_para_vencimento
FROM lancamentos l
WHERE l.tipo = 'receita'
  AND l.status IN ('pendente', 'parcial', 'atrasado')
ORDER BY l.data_vencimento ASC NULLS LAST;

-- ==========================================
-- VIEW: Contas a Pagar (resumo)
-- ==========================================
CREATE OR REPLACE VIEW vw_contas_pagar AS
SELECT
  l.id,
  l.descricao,
  l.valor_total,
  l.valor_pago,
  (l.valor_total - l.valor_pago) AS valor_pendente,
  l.data_lancamento,
  l.data_competencia,
  l.data_vencimento,
  l.data_pagamento,
  l.status,
  l.fornecedor_id,
  l.projeto_id,
  l.obra_id,
  -- Informações de parcelas
  (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = l.id) AS total_parcelas,
  (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = l.id AND status = 'pago') AS parcelas_pagas,
  (SELECT COUNT(*) FROM lancamentos_parcelas WHERE lancamento_id = l.id AND status = 'atrasado') AS parcelas_atrasadas,
  -- Próximo vencimento
  (
    SELECT MIN(data_vencimento)
    FROM lancamentos_parcelas
    WHERE lancamento_id = l.id AND status IN ('pendente', 'parcial')
  ) AS proxima_parcela_vencimento,
  -- Dias para vencimento (negativo = atrasado)
  CASE
    WHEN l.data_vencimento IS NOT NULL THEN
      l.data_vencimento - CURRENT_DATE
    ELSE NULL
  END AS dias_para_vencimento
FROM lancamentos l
WHERE l.tipo = 'despesa'
  AND l.status IN ('pendente', 'parcial', 'atrasado')
ORDER BY l.data_vencimento ASC NULLS LAST;

-- ==========================================
-- FUNCTION: Calcular Aging de Recebíveis
-- Análise de vencimentos por faixa de dias
-- ==========================================
CREATE OR REPLACE FUNCTION calcular_aging_receber()
RETURNS TABLE(
  a_vencer DECIMAL,           -- Ainda não vencido
  vencido_0_30 DECIMAL,      -- Vencido de 0 a 30 dias
  vencido_31_60 DECIMAL,     -- Vencido de 31 a 60 dias
  vencido_61_90 DECIMAL,     -- Vencido de 61 a 90 dias
  vencido_91_180 DECIMAL,    -- Vencido de 91 a 180 dias
  vencido_acima_180 DECIMAL, -- Vencido há mais de 180 dias
  total_receber DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN dias_para_vencimento >= 0 THEN valor_pendente ELSE 0 END), 0) AS a_vencer,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < 0 AND dias_para_vencimento >= -30 THEN valor_pendente ELSE 0 END), 0) AS vencido_0_30,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < -30 AND dias_para_vencimento >= -60 THEN valor_pendente ELSE 0 END), 0) AS vencido_31_60,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < -60 AND dias_para_vencimento >= -90 THEN valor_pendente ELSE 0 END), 0) AS vencido_61_90,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < -90 AND dias_para_vencimento >= -180 THEN valor_pendente ELSE 0 END), 0) AS vencido_91_180,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < -180 THEN valor_pendente ELSE 0 END), 0) AS vencido_acima_180,
    COALESCE(SUM(valor_pendente), 0) AS total_receber
  FROM vw_contas_receber;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Calcular Aging de Pagáveis
-- ==========================================
CREATE OR REPLACE FUNCTION calcular_aging_pagar()
RETURNS TABLE(
  a_vencer DECIMAL,
  vencido_0_30 DECIMAL,
  vencido_31_60 DECIMAL,
  vencido_61_90 DECIMAL,
  vencido_91_180 DECIMAL,
  vencido_acima_180 DECIMAL,
  total_pagar DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN dias_para_vencimento >= 0 THEN valor_pendente ELSE 0 END), 0) AS a_vencer,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < 0 AND dias_para_vencimento >= -30 THEN valor_pendente ELSE 0 END), 0) AS vencido_0_30,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < -30 AND dias_para_vencimento >= -60 THEN valor_pendente ELSE 0 END), 0) AS vencido_31_60,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < -60 AND dias_para_vencimento >= -90 THEN valor_pendente ELSE 0 END), 0) AS vencido_61_90,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < -90 AND dias_para_vencimento >= -180 THEN valor_pendente ELSE 0 END), 0) AS vencido_91_180,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < -180 THEN valor_pendente ELSE 0 END), 0) AS vencido_acima_180,
    COALESCE(SUM(valor_pendente), 0) AS total_pagar
  FROM vw_contas_pagar;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Projeção de Fluxo de Caixa
-- Próximos N dias com base em parcelas
-- ==========================================
CREATE OR REPLACE FUNCTION projecao_fluxo_caixa(
  p_dias_futuro INTEGER DEFAULT 90
)
RETURNS TABLE(
  data DATE,
  receitas_previstas DECIMAL,
  despesas_previstas DECIMAL,
  saldo_dia DECIMAL,
  saldo_acumulado DECIMAL
) AS $$
DECLARE
  v_data_atual DATE := CURRENT_DATE;
  v_data_final DATE := CURRENT_DATE + p_dias_futuro;
  v_saldo_acumulado DECIMAL := 0;
  v_dia DATE;
BEGIN
  -- Calcular saldo atual (todas as contas bancárias)
  SELECT COALESCE(SUM(saldo_atual), 0) INTO v_saldo_acumulado
  FROM contas_bancarias
  WHERE ativa = true;

  -- Loop por cada dia
  FOR v_dia IN
    SELECT generate_series(v_data_atual, v_data_final, '1 day'::interval)::DATE
  LOOP
    -- Receitas previstas do dia (parcelas a receber)
    WITH receitas AS (
      SELECT COALESCE(SUM(p.valor_total - p.valor_pago), 0) AS total
      FROM lancamentos_parcelas p
      JOIN lancamentos l ON l.id = p.lancamento_id
      WHERE p.data_vencimento = v_dia
        AND p.status IN ('pendente', 'parcial')
        AND l.tipo = 'receita'
    ),
    -- Despesas previstas do dia (parcelas a pagar)
    despesas AS (
      SELECT COALESCE(SUM(p.valor_total - p.valor_pago), 0) AS total
      FROM lancamentos_parcelas p
      JOIN lancamentos l ON l.id = p.lancamento_id
      WHERE p.data_vencimento = v_dia
        AND p.status IN ('pendente', 'parcial')
        AND l.tipo = 'despesa'
    )
    SELECT
      v_dia,
      r.total,
      d.total,
      (r.total - d.total),
      v_saldo_acumulado + (r.total - d.total)
    INTO data, receitas_previstas, despesas_previstas, saldo_dia, saldo_acumulado
    FROM receitas r, despesas d;

    -- Atualizar saldo acumulado
    v_saldo_acumulado := saldo_acumulado;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Vencimentos por Período
-- ==========================================
CREATE OR REPLACE FUNCTION vencimentos_periodo(
  p_data_inicio DATE,
  p_data_fim DATE,
  p_tipo VARCHAR DEFAULT NULL -- 'receita' ou 'despesa' ou NULL para ambos
)
RETURNS TABLE(
  data_vencimento DATE,
  tipo VARCHAR,
  quantidade INTEGER,
  valor_total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.data_vencimento,
    l.tipo,
    COUNT(*)::INTEGER AS quantidade,
    SUM(p.valor_total - p.valor_pago) AS valor_total
  FROM lancamentos_parcelas p
  JOIN lancamentos l ON l.id = p.lancamento_id
  WHERE
    p.data_vencimento BETWEEN p_data_inicio AND p_data_fim
    AND p.status IN ('pendente', 'parcial')
    AND (p_tipo IS NULL OR l.tipo = p_tipo)
  GROUP BY p.data_vencimento, l.tipo
  ORDER BY p.data_vencimento, l.tipo;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Top Devedores
-- ==========================================
CREATE OR REPLACE FUNCTION top_devedores(
  p_limite INTEGER DEFAULT 10
)
RETURNS TABLE(
  cliente_id UUID,
  cliente_nome VARCHAR,
  quantidade_titulos INTEGER,
  valor_total_em_aberto DECIMAL,
  valor_em_atraso DECIMAL,
  dias_medio_atraso DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.cliente_id,
    c.name AS cliente_nome,
    COUNT(DISTINCT l.id)::INTEGER AS quantidade_titulos,
    SUM(l.valor_total - l.valor_pago) AS valor_total_em_aberto,
    SUM(CASE WHEN l.status = 'atrasado' THEN (l.valor_total - l.valor_pago) ELSE 0 END) AS valor_em_atraso,
    AVG(
      CASE
        WHEN l.status = 'atrasado' AND l.data_vencimento IS NOT NULL
        THEN CURRENT_DATE - l.data_vencimento
        ELSE 0
      END
    )::DECIMAL AS dias_medio_atraso
  FROM lancamentos l
  JOIN clients c ON c.id = l.cliente_id
  WHERE
    l.tipo = 'receita'
    AND l.status IN ('pendente', 'parcial', 'atrasado')
    AND l.cliente_id IS NOT NULL
  GROUP BY l.cliente_id, c.name
  HAVING SUM(l.valor_total - l.valor_pago) > 0
  ORDER BY valor_total_em_aberto DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Resumo Contas a Receber
-- ==========================================
CREATE OR REPLACE FUNCTION resumo_contas_receber()
RETURNS TABLE(
  total_receber DECIMAL,
  total_vencido DECIMAL,
  total_a_vencer DECIMAL,
  quantidade_total INTEGER,
  quantidade_vencidas INTEGER,
  ticket_medio DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(valor_pendente), 0) AS total_receber,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < 0 THEN valor_pendente ELSE 0 END), 0) AS total_vencido,
    COALESCE(SUM(CASE WHEN dias_para_vencimento >= 0 THEN valor_pendente ELSE 0 END), 0) AS total_a_vencer,
    COUNT(*)::INTEGER AS quantidade_total,
    COUNT(CASE WHEN dias_para_vencimento < 0 THEN 1 END)::INTEGER AS quantidade_vencidas,
    CASE
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor_pendente), 0) / COUNT(*)
      ELSE 0
    END AS ticket_medio
  FROM vw_contas_receber;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Resumo Contas a Pagar
-- ==========================================
CREATE OR REPLACE FUNCTION resumo_contas_pagar()
RETURNS TABLE(
  total_pagar DECIMAL,
  total_vencido DECIMAL,
  total_a_vencer DECIMAL,
  quantidade_total INTEGER,
  quantidade_vencidas INTEGER,
  ticket_medio DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(valor_pendente), 0) AS total_pagar,
    COALESCE(SUM(CASE WHEN dias_para_vencimento < 0 THEN valor_pendente ELSE 0 END), 0) AS total_vencido,
    COALESCE(SUM(CASE WHEN dias_para_vencimento >= 0 THEN valor_pendente ELSE 0 END), 0) AS total_a_vencer,
    COUNT(*)::INTEGER AS quantidade_total,
    COUNT(CASE WHEN dias_para_vencimento < 0 THEN 1 END)::INTEGER AS quantidade_vencidas,
    CASE
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor_pendente), 0) / COUNT(*)
      ELSE 0
    END AS ticket_medio
  FROM vw_contas_pagar;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMENTÁRIOS
-- ==========================================
COMMENT ON VIEW vw_contas_receber IS 'View com resumo de contas a receber pendentes';
COMMENT ON VIEW vw_contas_pagar IS 'View com resumo de contas a pagar pendentes';

COMMENT ON FUNCTION calcular_aging_receber IS 'Calcula aging de recebíveis por faixa de vencimento';
COMMENT ON FUNCTION calcular_aging_pagar IS 'Calcula aging de pagáveis por faixa de vencimento';
COMMENT ON FUNCTION projecao_fluxo_caixa IS 'Projeta fluxo de caixa futuro baseado em parcelas';
COMMENT ON FUNCTION vencimentos_periodo IS 'Lista vencimentos agrupados por data em um período';
COMMENT ON FUNCTION top_devedores IS 'Retorna top N clientes com maior valor em aberto';
COMMENT ON FUNCTION resumo_contas_receber IS 'Resumo geral de contas a receber';
COMMENT ON FUNCTION resumo_contas_pagar IS 'Resumo geral de contas a pagar';
