-- =====================================================
-- FASE 3 - RELATÓRIOS GERENCIAIS
-- Functions para DRE, Fluxo de Caixa e Análises
-- =====================================================

-- ==========================================
-- FUNCTION: DRE Detalhado por Período
-- ==========================================
CREATE OR REPLACE FUNCTION gerar_dre(
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE(
  -- Receitas
  receitas_operacionais DECIMAL,
  receitas_servicos DECIMAL,
  receitas_outros DECIMAL,
  receitas_total DECIMAL,

  -- Custos e Despesas
  custos_diretos DECIMAL,
  despesas_administrativas DECIMAL,
  despesas_comerciais DECIMAL,
  despesas_pessoal DECIMAL,
  despesas_operacionais DECIMAL,
  despesas_total DECIMAL,

  -- Resultados
  resultado_bruto DECIMAL,
  resultado_operacional DECIMAL,
  resultado_liquido DECIMAL,

  -- Margens
  margem_bruta_percentual DECIMAL,
  margem_operacional_percentual DECIMAL,
  margem_liquida_percentual DECIMAL
) AS $$
DECLARE
  v_receitas_total DECIMAL := 0;
  v_receitas_servicos DECIMAL := 0;
  v_receitas_outros DECIMAL := 0;
  v_custos_diretos DECIMAL := 0;
  v_despesas_admin DECIMAL := 0;
  v_despesas_comerciais DECIMAL := 0;
  v_despesas_pessoal DECIMAL := 0;
  v_despesas_total DECIMAL := 0;
BEGIN
  -- Calcular Receitas
  SELECT
    COALESCE(SUM(CASE WHEN pc.codigo LIKE '3.1.%' THEN li.valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pc.codigo LIKE '3.2.%' THEN li.valor ELSE 0 END), 0)
  INTO v_receitas_servicos, v_receitas_outros
  FROM lancamentos_itens li
  JOIN lancamentos l ON l.id = li.lancamento_id
  JOIN plano_contas pc ON pc.id = li.conta_id
  WHERE
    li.tipo = 'credito'
    AND pc.tipo = 'receita'
    AND l.data_competencia BETWEEN p_data_inicio AND p_data_fim
    AND l.status != 'cancelado';

  v_receitas_total := v_receitas_servicos + v_receitas_outros;

  -- Calcular Despesas
  SELECT
    COALESCE(SUM(CASE WHEN pc.codigo LIKE '4.1.%' THEN li.valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pc.codigo LIKE '4.2.%' THEN li.valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pc.codigo LIKE '4.3.%' THEN li.valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pc.codigo LIKE '4.4.%' THEN li.valor ELSE 0 END), 0)
  INTO v_custos_diretos, v_despesas_admin, v_despesas_comerciais, v_despesas_pessoal
  FROM lancamentos_itens li
  JOIN lancamentos l ON l.id = li.lancamento_id
  JOIN plano_contas pc ON pc.id = li.conta_id
  WHERE
    li.tipo = 'debito'
    AND pc.tipo = 'despesa'
    AND l.data_competencia BETWEEN p_data_inicio AND p_data_fim
    AND l.status != 'cancelado';

  v_despesas_total := v_custos_diretos + v_despesas_admin + v_despesas_comerciais + v_despesas_pessoal;

  RETURN QUERY SELECT
    v_receitas_servicos + v_receitas_outros AS receitas_operacionais,
    v_receitas_servicos,
    v_receitas_outros,
    v_receitas_total,
    v_custos_diretos,
    v_despesas_admin,
    v_despesas_comerciais,
    v_despesas_pessoal,
    v_despesas_admin + v_despesas_comerciais + v_despesas_pessoal AS despesas_operacionais,
    v_despesas_total,
    v_receitas_total - v_custos_diretos AS resultado_bruto,
    v_receitas_total - v_despesas_total AS resultado_operacional,
    v_receitas_total - v_despesas_total AS resultado_liquido,
    CASE WHEN v_receitas_total > 0 THEN ((v_receitas_total - v_custos_diretos) / v_receitas_total) * 100 ELSE 0 END AS margem_bruta_percentual,
    CASE WHEN v_receitas_total > 0 THEN ((v_receitas_total - v_despesas_total) / v_receitas_total) * 100 ELSE 0 END AS margem_operacional_percentual,
    CASE WHEN v_receitas_total > 0 THEN ((v_receitas_total - v_despesas_total) / v_receitas_total) * 100 ELSE 0 END AS margem_liquida_percentual;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Fluxo de Caixa Realizado
-- ==========================================
CREATE OR REPLACE FUNCTION fluxo_caixa_realizado(
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE(
  data DATE,
  receitas DECIMAL,
  despesas DECIMAL,
  saldo_dia DECIMAL,
  saldo_acumulado DECIMAL
) AS $$
DECLARE
  v_data DATE;
  v_saldo_acumulado DECIMAL := 0;
  v_receitas DECIMAL;
  v_despesas DECIMAL;
BEGIN
  -- Saldo inicial (todas as contas bancárias)
  SELECT COALESCE(SUM(saldo_inicial), 0) INTO v_saldo_acumulado
  FROM contas_bancarias
  WHERE ativa = true;

  -- Loop por cada dia
  FOR v_data IN
    SELECT generate_series(p_data_inicio, p_data_fim, '1 day'::interval)::DATE
  LOOP
    -- Receitas do dia (já pagas)
    SELECT COALESCE(SUM(l.valor_pago), 0) INTO v_receitas
    FROM lancamentos l
    WHERE l.tipo = 'receita'
      AND l.data_pagamento = v_data
      AND l.status IN ('pago', 'parcial');

    -- Despesas do dia (já pagas)
    SELECT COALESCE(SUM(l.valor_pago), 0) INTO v_despesas
    FROM lancamentos l
    WHERE l.tipo = 'despesa'
      AND l.data_pagamento = v_data
      AND l.status IN ('pago', 'parcial');

    v_saldo_acumulado := v_saldo_acumulado + v_receitas - v_despesas;

    RETURN QUERY SELECT
      v_data,
      v_receitas,
      v_despesas,
      v_receitas - v_despesas,
      v_saldo_acumulado;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Análise de Rentabilidade por Cliente
-- ==========================================
CREATE OR REPLACE FUNCTION rentabilidade_por_cliente(
  p_data_inicio DATE,
  p_data_fim DATE,
  p_limite INTEGER DEFAULT 10
)
RETURNS TABLE(
  cliente_id UUID,
  cliente_nome VARCHAR,
  receita_total DECIMAL,
  custo_total DECIMAL,
  lucro_bruto DECIMAL,
  margem_percentual DECIMAL,
  quantidade_projetos INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.cliente_id,
    c.name AS cliente_nome,
    COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) AS receita_total,
    COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END), 0) AS custo_total,
    COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END), 0) AS lucro_bruto,
    CASE
      WHEN SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END) > 0
      THEN ((SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END) -
             SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END)) /
             SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END)) * 100
      ELSE 0
    END AS margem_percentual,
    COUNT(DISTINCT l.projeto_id)::INTEGER AS quantidade_projetos
  FROM lancamentos l
  JOIN clients c ON c.id = l.cliente_id
  WHERE
    l.cliente_id IS NOT NULL
    AND l.data_competencia BETWEEN p_data_inicio AND p_data_fim
    AND l.status != 'cancelado'
  GROUP BY l.cliente_id, c.name
  HAVING SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END) > 0
  ORDER BY lucro_bruto DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Análise de Rentabilidade por Projeto
-- ==========================================
CREATE OR REPLACE FUNCTION rentabilidade_por_projeto(
  p_data_inicio DATE,
  p_data_fim DATE,
  p_limite INTEGER DEFAULT 10
)
RETURNS TABLE(
  projeto_id UUID,
  projeto_nome VARCHAR,
  receita_total DECIMAL,
  custo_total DECIMAL,
  lucro_bruto DECIMAL,
  margem_percentual DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.projeto_id,
    p.nome AS projeto_nome,
    COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) AS receita_total,
    COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END), 0) AS custo_total,
    COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END), 0) AS lucro_bruto,
    CASE
      WHEN SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END) > 0
      THEN ((SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END) -
             SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END)) /
             SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END)) * 100
      ELSE 0
    END AS margem_percentual
  FROM lancamentos l
  JOIN projetos p ON p.id = l.projeto_id
  WHERE
    l.projeto_id IS NOT NULL
    AND l.data_competencia BETWEEN p_data_inicio AND p_data_fim
    AND l.status != 'cancelado'
  GROUP BY l.projeto_id, p.nome
  HAVING SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END) > 0
  ORDER BY lucro_bruto DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Evolução Mensal (comparativo)
-- ==========================================
CREATE OR REPLACE FUNCTION evolucao_mensal(
  p_meses INTEGER DEFAULT 12
)
RETURNS TABLE(
  mes DATE,
  receitas DECIMAL,
  despesas DECIMAL,
  saldo DECIMAL,
  variacao_receita_percentual DECIMAL,
  variacao_despesa_percentual DECIMAL
) AS $$
DECLARE
  v_data_inicio DATE := DATE_TRUNC('month', CURRENT_DATE - (p_meses || ' months')::INTERVAL);
  v_data_fim DATE := DATE_TRUNC('month', CURRENT_DATE);
BEGIN
  RETURN QUERY
  WITH meses AS (
    SELECT generate_series(v_data_inicio, v_data_fim, '1 month'::interval)::DATE AS mes
  ),
  dados AS (
    SELECT
      DATE_TRUNC('month', l.data_competencia)::DATE AS mes,
      SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END) AS receitas,
      SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END) AS despesas
    FROM lancamentos l
    WHERE
      l.data_competencia >= v_data_inicio
      AND l.status != 'cancelado'
    GROUP BY DATE_TRUNC('month', l.data_competencia)
  )
  SELECT
    m.mes,
    COALESCE(d.receitas, 0) AS receitas,
    COALESCE(d.despesas, 0) AS despesas,
    COALESCE(d.receitas, 0) - COALESCE(d.despesas, 0) AS saldo,
    CASE
      WHEN LAG(d.receitas) OVER (ORDER BY m.mes) > 0
      THEN ((d.receitas - LAG(d.receitas) OVER (ORDER BY m.mes)) / LAG(d.receitas) OVER (ORDER BY m.mes)) * 100
      ELSE 0
    END AS variacao_receita_percentual,
    CASE
      WHEN LAG(d.despesas) OVER (ORDER BY m.mes) > 0
      THEN ((d.despesas - LAG(d.despesas) OVER (ORDER BY m.mes)) / LAG(d.despesas) OVER (ORDER BY m.mes)) * 100
      ELSE 0
    END AS variacao_despesa_percentual
  FROM meses m
  LEFT JOIN dados d ON d.mes = m.mes
  ORDER BY m.mes;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMENTÁRIOS
-- ==========================================
COMMENT ON FUNCTION gerar_dre IS 'Gera DRE (Demonstração do Resultado do Exercício) detalhado por período';
COMMENT ON FUNCTION fluxo_caixa_realizado IS 'Gera fluxo de caixa realizado (apenas pagamentos efetivados) dia a dia';
COMMENT ON FUNCTION rentabilidade_por_cliente IS 'Análise de rentabilidade por cliente';
COMMENT ON FUNCTION rentabilidade_por_projeto IS 'Análise de rentabilidade por projeto';
COMMENT ON FUNCTION evolucao_mensal IS 'Evolução mensal de receitas e despesas com variação percentual';
