-- =====================================================
-- ERP FINANCEIRO - FASE 1: FUNCTIONS
-- =====================================================
-- Data: 24/02/2026
-- Descrição: Funções SQL para relatórios e cálculos
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO: Criar lançamento completo (com partidas)
-- =====================================================
CREATE OR REPLACE FUNCTION criar_lancamento_completo(
  p_tipo VARCHAR,
  p_descricao TEXT,
  p_valor DECIMAL,
  p_data_lancamento DATE,
  p_data_competencia DATE,
  p_conta_debito_id UUID,
  p_conta_credito_id UUID,
  p_conta_bancaria_id UUID DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_fornecedor_id UUID DEFAULT NULL,
  p_projeto_id UUID DEFAULT NULL,
  p_obra_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_lancamento_id UUID;
BEGIN
  -- Criar lançamento
  INSERT INTO lancamentos (
    tipo, descricao, valor_total, data_lancamento, data_competencia,
    conta_bancaria_id, cliente_id, fornecedor_id, projeto_id, obra_id,
    status, created_by
  ) VALUES (
    p_tipo, p_descricao, p_valor, p_data_lancamento, p_data_competencia,
    p_conta_bancaria_id, p_cliente_id, p_fornecedor_id, p_projeto_id, p_obra_id,
    'pendente', auth.uid()
  )
  RETURNING id INTO v_lancamento_id;

  -- Criar partidas dobradas
  INSERT INTO lancamentos_itens (lancamento_id, conta_id, tipo, valor)
  VALUES
    (v_lancamento_id, p_conta_debito_id, 'debito', p_valor),
    (v_lancamento_id, p_conta_credito_id, 'credito', p_valor);

  RETURN v_lancamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. VIEW: Saldo de Contas Bancárias
-- =====================================================
CREATE OR REPLACE VIEW v_saldos_bancarios AS
SELECT
  cb.id,
  cb.nome,
  cb.apelido,
  cb.tipo,
  cb.banco_nome,
  cb.saldo_inicial,
  cb.saldo_atual,
  cb.ativa,

  -- Totais
  COALESCE(SUM(CASE WHEN l.tipo = 'receita' AND l.status = 'pago' THEN l.valor_pago ELSE 0 END), 0) as total_receitas,
  COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.status = 'pago' THEN l.valor_pago ELSE 0 END), 0) as total_despesas,

  -- Pendentes
  COALESCE(SUM(CASE WHEN l.tipo = 'receita' AND l.status IN ('pendente', 'atrasado') THEN l.valor_total ELSE 0 END), 0) as receitas_pendentes,
  COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.status IN ('pendente', 'atrasado') THEN l.valor_total ELSE 0 END), 0) as despesas_pendentes

FROM contas_bancarias cb
LEFT JOIN lancamentos l ON l.conta_bancaria_id = cb.id
GROUP BY cb.id, cb.nome, cb.apelido, cb.tipo, cb.banco_nome, cb.saldo_inicial, cb.saldo_atual, cb.ativa;

-- =====================================================
-- 3. FUNÇÃO: DRE Simplificado
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_dre(
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE(
  receitas_total DECIMAL,
  despesas_total DECIMAL,
  lucro_bruto DECIMAL,
  despesas_operacionais DECIMAL,
  lucro_liquido DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH valores AS (
    SELECT
      COALESCE(SUM(CASE WHEN l.tipo = 'receita' AND pc.codigo LIKE '1.1%' THEN l.valor_total ELSE 0 END), 0) as rec_total,
      COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND pc.codigo LIKE '2.1%' THEN l.valor_total ELSE 0 END), 0) as desp_diretas,
      COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND pc.codigo LIKE '2.2%' THEN l.valor_total ELSE 0 END), 0) as desp_operacionais
    FROM lancamentos l
    LEFT JOIN lancamentos_itens li ON li.lancamento_id = l.id
    LEFT JOIN plano_contas pc ON pc.id = li.conta_id
    WHERE l.data_competencia BETWEEN p_data_inicio AND p_data_fim
  )
  SELECT
    rec_total,
    desp_diretas + desp_operacionais as despesas_total,
    rec_total - desp_diretas as lucro_bruto,
    desp_operacionais,
    rec_total - (desp_diretas + desp_operacionais) as lucro_liquido
  FROM valores;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNÇÃO: Fluxo de Caixa
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_fluxo_caixa(
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE(
  data DATE,
  entradas DECIMAL,
  saidas DECIMAL,
  saldo_dia DECIMAL,
  saldo_acumulado DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH movimentacoes AS (
    SELECT
      l.data_pagamento::DATE as data,
      COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_pago ELSE 0 END), 0) as entradas,
      COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_pago ELSE 0 END), 0) as saidas
    FROM lancamentos l
    WHERE l.status = 'pago'
      AND l.data_pagamento BETWEEN p_data_inicio AND p_data_fim
    GROUP BY l.data_pagamento::DATE
  ),
  com_saldos AS (
    SELECT
      data,
      entradas,
      saidas,
      (entradas - saidas) as saldo_dia,
      SUM(entradas - saidas) OVER (ORDER BY data) as saldo_acumulado
    FROM movimentacoes
  )
  SELECT * FROM com_saldos
  ORDER BY data;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNÇÃO: Resumo Financeiro do Mês
-- =====================================================
CREATE OR REPLACE FUNCTION resumo_mes(
  p_mes INTEGER,
  p_ano INTEGER
)
RETURNS TABLE(
  receita_total DECIMAL,
  receita_recebida DECIMAL,
  receita_pendente DECIMAL,
  despesa_total DECIMAL,
  despesa_paga DECIMAL,
  despesa_pendente DECIMAL,
  saldo_liquido DECIMAL,
  total_lancamentos INTEGER
) AS $$
DECLARE
  v_data_inicio DATE;
  v_data_fim DATE;
BEGIN
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor_total ELSE 0 END), 0) as receita_total,
    COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor_pago ELSE 0 END), 0) as receita_recebida,
    COALESCE(SUM(CASE WHEN tipo = 'receita' AND status != 'pago' THEN valor_total - valor_pago ELSE 0 END), 0) as receita_pendente,

    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor_total ELSE 0 END), 0) as despesa_total,
    COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor_pago ELSE 0 END), 0) as despesa_paga,
    COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status != 'pago' THEN valor_total - valor_pago ELSE 0 END), 0) as despesa_pendente,

    COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor_pago ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor_pago ELSE 0 END), 0) as saldo_liquido,

    COUNT(*)::INTEGER as total_lancamentos
  FROM lancamentos
  WHERE data_competencia BETWEEN v_data_inicio AND v_data_fim;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNÇÃO: Contas a Receber
-- =====================================================
CREATE OR REPLACE VIEW v_contas_receber AS
SELECT
  l.id,
  l.descricao,
  l.valor_total,
  l.valor_pago,
  (l.valor_total - l.valor_pago) as valor_pendente,
  l.data_vencimento,
  l.status,

  -- Dias de atraso
  CASE
    WHEN l.status = 'atrasado' THEN CURRENT_DATE - l.data_vencimento
    ELSE 0
  END as dias_atraso,

  -- Cliente
  c.id as cliente_id,
  c.name as cliente_nome,

  -- Projeto/Obra
  p.id as projeto_id,
  p.nome as projeto_nome,
  o.id as obra_id,
  o.nome as obra_nome,

  l.created_at
FROM lancamentos l
LEFT JOIN clients c ON c.id = l.cliente_id
LEFT JOIN projetos p ON p.id = l.projeto_id
LEFT JOIN obras o ON o.id = l.obra_id
WHERE l.tipo = 'receita'
  AND l.status IN ('pendente', 'atrasado', 'parcial')
ORDER BY l.data_vencimento;

-- =====================================================
-- 7. FUNÇÃO: Contas a Pagar
-- =====================================================
CREATE OR REPLACE VIEW v_contas_pagar AS
SELECT
  l.id,
  l.descricao,
  l.valor_total,
  l.valor_pago,
  (l.valor_total - l.valor_pago) as valor_pendente,
  l.data_vencimento,
  l.status,

  -- Dias de atraso
  CASE
    WHEN l.status = 'atrasado' THEN CURRENT_DATE - l.data_vencimento
    ELSE 0
  END as dias_atraso,

  -- Fornecedor
  f.id as fornecedor_id,
  f.nome as fornecedor_nome,

  -- Projeto/Obra
  p.id as projeto_id,
  p.nome as projeto_nome,
  o.id as obra_id,
  o.nome as obra_nome,

  l.created_at
FROM lancamentos l
LEFT JOIN empresas_parceiras f ON f.id = l.fornecedor_id
LEFT JOIN projetos p ON p.id = l.projeto_id
LEFT JOIN obras o ON o.id = l.obra_id
WHERE l.tipo = 'despesa'
  AND l.status IN ('pendente', 'atrasado', 'parcial')
ORDER BY l.data_vencimento;

-- =====================================================
-- 8. FUNÇÃO: Dar baixa em lançamento
-- =====================================================
CREATE OR REPLACE FUNCTION dar_baixa_lancamento(
  p_lancamento_id UUID,
  p_valor_pago DECIMAL,
  p_data_pagamento DATE,
  p_conta_bancaria_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_valor_total DECIMAL;
  v_valor_ja_pago DECIMAL;
  v_novo_status VARCHAR;
BEGIN
  -- Buscar valores
  SELECT valor_total, valor_pago
  INTO v_valor_total, v_valor_ja_pago
  FROM lancamentos
  WHERE id = p_lancamento_id;

  -- Calcular novo status
  IF (v_valor_ja_pago + p_valor_pago) >= v_valor_total THEN
    v_novo_status := 'pago';
  ELSE
    v_novo_status := 'parcial';
  END IF;

  -- Atualizar lançamento
  UPDATE lancamentos
  SET
    valor_pago = valor_pago + p_valor_pago,
    data_pagamento = p_data_pagamento,
    status = v_novo_status,
    conta_bancaria_id = p_conta_bancaria_id,
    updated_at = NOW()
  WHERE id = p_lancamento_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. FUNÇÃO: Cancelar lançamento
-- =====================================================
CREATE OR REPLACE FUNCTION cancelar_lancamento(
  p_lancamento_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE lancamentos
  SET
    status = 'cancelado',
    observacoes = COALESCE(observacoes || E'\n\n', '') || 'CANCELADO: ' || COALESCE(p_motivo, 'Sem motivo informado'),
    updated_at = NOW()
  WHERE id = p_lancamento_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION criar_lancamento_completo IS 'Cria um lançamento com partidas dobradas automáticas';
COMMENT ON FUNCTION calcular_dre IS 'Calcula DRE (Demonstração do Resultado) para um período';
COMMENT ON FUNCTION calcular_fluxo_caixa IS 'Calcula fluxo de caixa diário para um período';
COMMENT ON FUNCTION resumo_mes IS 'Retorna resumo financeiro de um mês específico';
COMMENT ON FUNCTION dar_baixa_lancamento IS 'Dá baixa (total ou parcial) em um lançamento';
COMMENT ON FUNCTION cancelar_lancamento IS 'Cancela um lançamento';

-- =====================================================
-- FIM
-- =====================================================
