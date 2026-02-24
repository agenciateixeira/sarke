-- =====================================================
-- FASE 4 - FUNCTIONS DE CONCILIAÇÃO E AUTOMAÇÃO
-- =====================================================

-- ==========================================
-- FUNCTION: Conciliar Transação Bancária com Lançamento
-- ==========================================
CREATE OR REPLACE FUNCTION conciliar_transacao(
  p_transacao_id UUID,
  p_lancamento_id UUID,
  p_usuario_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_transacao transacoes_bancarias%ROWTYPE;
  v_lancamento lancamentos%ROWTYPE;
BEGIN
  -- Buscar transação
  SELECT * INTO v_transacao FROM transacoes_bancarias WHERE id = p_transacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada';
  END IF;

  -- Buscar lançamento
  SELECT * INTO v_lancamento FROM lancamentos WHERE id = p_lancamento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado';
  END IF;

  -- Validar se valores são compatíveis (com tolerância de R$ 0,10)
  IF ABS(v_transacao.valor - v_lancamento.valor_total) > 0.10 THEN
    RAISE EXCEPTION 'Valores incompatíveis: Transação R$ % vs Lançamento R$ %',
      v_transacao.valor, v_lancamento.valor_total;
  END IF;

  -- Atualizar transação
  UPDATE transacoes_bancarias
  SET
    status_conciliacao = 'conciliado',
    lancamento_id = p_lancamento_id,
    conciliado_em = NOW(),
    conciliado_por = p_usuario_id,
    conciliacao_automatica = FALSE
  WHERE id = p_transacao_id;

  -- Atualizar lançamento (marcar como pago se for igual)
  IF ABS(v_transacao.valor - v_lancamento.valor_total) <= 0.10 THEN
    UPDATE lancamentos
    SET
      status = 'pago',
      data_pagamento = v_transacao.data_transacao,
      valor_pago = v_transacao.valor
    WHERE id = p_lancamento_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Desconciliar Transação
-- ==========================================
CREATE OR REPLACE FUNCTION desconciliar_transacao(
  p_transacao_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_lancamento_id UUID;
BEGIN
  -- Buscar lancamento_id antes de limpar
  SELECT lancamento_id INTO v_lancamento_id
  FROM transacoes_bancarias
  WHERE id = p_transacao_id;

  -- Atualizar transação
  UPDATE transacoes_bancarias
  SET
    status_conciliacao = 'pendente',
    lancamento_id = NULL,
    conciliado_em = NULL,
    conciliado_por = NULL,
    conciliacao_automatica = FALSE
  WHERE id = p_transacao_id;

  -- Reverter status do lançamento se necessário
  IF v_lancamento_id IS NOT NULL THEN
    UPDATE lancamentos
    SET
      status = 'pendente',
      data_pagamento = NULL,
      valor_pago = 0
    WHERE id = v_lancamento_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Aplicar Regra de Categorização
-- ==========================================
CREATE OR REPLACE FUNCTION aplicar_regra_categorizacao(
  p_transacao_id UUID,
  p_regra_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_transacao transacoes_bancarias%ROWTYPE;
  v_regra regras_categorizacao%ROWTYPE;
  v_lancamento_id UUID;
  v_tipo_lancamento VARCHAR(20);
BEGIN
  -- Buscar transação
  SELECT * INTO v_transacao FROM transacoes_bancarias WHERE id = p_transacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada';
  END IF;

  -- Buscar regra
  SELECT * INTO v_regra FROM regras_categorizacao WHERE id = p_regra_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regra não encontrada';
  END IF;

  -- Determinar tipo do lançamento
  v_tipo_lancamento := CASE WHEN v_transacao.tipo = 'credito' THEN 'receita' ELSE 'despesa' END;

  -- Criar lançamento baseado na regra
  INSERT INTO lancamentos (
    tipo,
    descricao,
    valor_total,
    valor_pago,
    data_vencimento,
    data_pagamento,
    data_competencia,
    status,
    cliente_id,
    projeto_id,
    obra_id,
    observacoes
  ) VALUES (
    v_tipo_lancamento,
    v_transacao.descricao,
    v_transacao.valor,
    v_transacao.valor,
    v_transacao.data_transacao,
    v_transacao.data_transacao,
    v_transacao.data_transacao,
    'pago',
    v_regra.cliente_id,
    v_regra.projeto_id,
    v_regra.obra_id,
    COALESCE(v_regra.observacao_padrao, 'Importado automaticamente via regra: ' || v_regra.nome)
  ) RETURNING id INTO v_lancamento_id;

  -- Criar item contábil
  IF v_regra.conta_id IS NOT NULL THEN
    INSERT INTO lancamentos_itens (
      lancamento_id,
      conta_id,
      tipo,
      valor,
      descricao
    ) VALUES (
      v_lancamento_id,
      v_regra.conta_id,
      CASE WHEN v_transacao.tipo = 'credito' THEN 'credito' ELSE 'debito' END,
      v_transacao.valor,
      v_transacao.descricao
    );
  END IF;

  -- Conciliar automaticamente
  UPDATE transacoes_bancarias
  SET
    status_conciliacao = 'conciliado',
    lancamento_id = v_lancamento_id,
    conciliado_em = NOW(),
    conciliacao_automatica = TRUE
  WHERE id = p_transacao_id;

  -- Atualizar estatísticas da regra
  UPDATE regras_categorizacao
  SET
    total_aplicacoes = total_aplicacoes + 1,
    ultima_aplicacao = NOW()
  WHERE id = p_regra_id;

  RETURN v_lancamento_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Sugerir Conciliação Automática
-- ==========================================
CREATE OR REPLACE FUNCTION sugerir_conciliacao(
  p_transacao_id UUID,
  p_limite INTEGER DEFAULT 5
)
RETURNS TABLE(
  lancamento_id UUID,
  descricao VARCHAR,
  valor_total DECIMAL,
  data_vencimento DATE,
  score INTEGER,
  motivo TEXT
) AS $$
DECLARE
  v_transacao transacoes_bancarias%ROWTYPE;
  v_tipo_lancamento VARCHAR(20);
BEGIN
  -- Buscar transação
  SELECT * INTO v_transacao FROM transacoes_bancarias WHERE id = p_transacao_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_tipo_lancamento := CASE WHEN v_transacao.tipo = 'credito' THEN 'receita' ELSE 'despesa' END;

  RETURN QUERY
  SELECT
    l.id,
    l.descricao,
    l.valor_total,
    l.data_vencimento,
    (
      -- Pontuação por similaridade de valor (0-40 pontos)
      CASE
        WHEN ABS(l.valor_total - v_transacao.valor) = 0 THEN 40
        WHEN ABS(l.valor_total - v_transacao.valor) <= 0.10 THEN 35
        WHEN ABS(l.valor_total - v_transacao.valor) <= 1.00 THEN 25
        WHEN ABS(l.valor_total - v_transacao.valor) <= 10.00 THEN 15
        ELSE 0
      END +
      -- Pontuação por proximidade de data (0-30 pontos)
      CASE
        WHEN l.data_vencimento = v_transacao.data_transacao THEN 30
        WHEN ABS(l.data_vencimento - v_transacao.data_transacao) <= 3 THEN 25
        WHEN ABS(l.data_vencimento - v_transacao.data_transacao) <= 7 THEN 15
        WHEN ABS(l.data_vencimento - v_transacao.data_transacao) <= 15 THEN 10
        ELSE 0
      END +
      -- Pontuação por similaridade de descrição (0-30 pontos)
      CASE
        WHEN LOWER(l.descricao) = LOWER(v_transacao.descricao) THEN 30
        WHEN LOWER(l.descricao) LIKE '%' || LOWER(v_transacao.descricao) || '%' THEN 20
        WHEN LOWER(v_transacao.descricao) LIKE '%' || LOWER(l.descricao) || '%' THEN 20
        ELSE 0
      END
    )::INTEGER AS score,
    CASE
      WHEN ABS(l.valor_total - v_transacao.valor) = 0 THEN 'Valor exato'
      WHEN ABS(l.valor_total - v_transacao.valor) <= 0.10 THEN 'Valor muito próximo'
      ELSE 'Valor aproximado'
    END || ' | ' ||
    CASE
      WHEN l.data_vencimento = v_transacao.data_transacao THEN 'Data exata'
      WHEN ABS(l.data_vencimento - v_transacao.data_transacao) <= 3 THEN 'Data próxima (±3 dias)'
      ELSE 'Data diferente'
    END AS motivo
  FROM lancamentos l
  WHERE
    l.tipo = v_tipo_lancamento
    AND l.status IN ('pendente', 'parcial')
    AND ABS(l.valor_total - v_transacao.valor) <= 50.00 -- Diferença máxima de R$ 50
    AND ABS(l.data_vencimento - v_transacao.data_transacao) <= 30 -- Diferença máxima de 30 dias
  ORDER BY score DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Buscar Regras Aplicáveis
-- ==========================================
CREATE OR REPLACE FUNCTION buscar_regras_aplicaveis(
  p_transacao_id UUID
)
RETURNS TABLE(
  regra_id UUID,
  regra_nome VARCHAR,
  prioridade INTEGER,
  conta_nome VARCHAR,
  motivo TEXT
) AS $$
DECLARE
  v_transacao transacoes_bancarias%ROWTYPE;
  v_regra regras_categorizacao%ROWTYPE;
BEGIN
  -- Buscar transação
  SELECT * INTO v_transacao FROM transacoes_bancarias WHERE id = p_transacao_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Buscar regras ativas ordenadas por prioridade
  FOR v_regra IN
    SELECT * FROM regras_categorizacao
    WHERE ativa = TRUE
    ORDER BY prioridade DESC
  LOOP
    -- Verificar se a regra se aplica
    IF (
      -- Verificar tipo de transação
      (v_regra.tipo_transacao = 'ambos' OR
       (v_regra.tipo_transacao = 'credito' AND v_transacao.tipo = 'credito') OR
       (v_regra.tipo_transacao = 'debito' AND v_transacao.tipo = 'debito'))
      AND
      -- Verificar conta bancária
      (v_regra.conta_bancaria_id IS NULL OR v_regra.conta_bancaria_id = v_transacao.conta_bancaria_id)
      AND
      -- Verificar valor mínimo
      (v_regra.valor_minimo IS NULL OR v_transacao.valor >= v_regra.valor_minimo)
      AND
      -- Verificar valor máximo
      (v_regra.valor_maximo IS NULL OR v_transacao.valor <= v_regra.valor_maximo)
      AND
      -- Verificar palavras-chave na descrição
      (v_regra.descricao_contem IS NULL OR
       EXISTS (
         SELECT 1 FROM unnest(v_regra.descricao_contem) AS palavra
         WHERE LOWER(v_transacao.descricao) LIKE '%' || LOWER(palavra) || '%'
       ))
    ) THEN
      regra_id := v_regra.id;
      regra_nome := v_regra.nome;
      prioridade := v_regra.prioridade;

      SELECT pc.nome INTO conta_nome
      FROM plano_contas pc
      WHERE pc.id = v_regra.conta_id;

      motivo := CASE
        WHEN v_regra.descricao_contem IS NOT NULL THEN
          'Palavra-chave encontrada: ' || array_to_string(v_regra.descricao_contem, ', ')
        ELSE
          'Valor entre ' || COALESCE(v_regra.valor_minimo::TEXT, '0') ||
          ' e ' || COALESCE(v_regra.valor_maximo::TEXT, '∞')
      END;

      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Processar Conciliação Automática em Lote
-- ==========================================
CREATE OR REPLACE FUNCTION processar_conciliacao_automatica(
  p_extrato_id UUID DEFAULT NULL,
  p_score_minimo INTEGER DEFAULT 90
)
RETURNS TABLE(
  transacao_id UUID,
  lancamento_id UUID,
  score INTEGER,
  resultado VARCHAR
) AS $$
DECLARE
  v_transacao transacoes_bancarias%ROWTYPE;
  v_sugestao RECORD;
BEGIN
  -- Buscar transações pendentes
  FOR v_transacao IN
    SELECT * FROM transacoes_bancarias
    WHERE status_conciliacao = 'pendente'
      AND (p_extrato_id IS NULL OR extrato_id = p_extrato_id)
  LOOP
    -- Buscar melhor sugestão
    SELECT * INTO v_sugestao
    FROM sugerir_conciliacao(v_transacao.id, 1)
    ORDER BY score DESC
    LIMIT 1;

    IF v_sugestao.score >= p_score_minimo THEN
      -- Conciliar automaticamente
      BEGIN
        PERFORM conciliar_transacao(v_transacao.id, v_sugestao.lancamento_id);

        transacao_id := v_transacao.id;
        lancamento_id := v_sugestao.lancamento_id;
        score := v_sugestao.score;
        resultado := 'Conciliado automaticamente';
        RETURN NEXT;
      EXCEPTION WHEN OTHERS THEN
        transacao_id := v_transacao.id;
        lancamento_id := v_sugestao.lancamento_id;
        score := v_sugestao.score;
        resultado := 'Erro: ' || SQLERRM;
        RETURN NEXT;
      END;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Gerar Alertas Financeiros
-- ==========================================
CREATE OR REPLACE FUNCTION gerar_alertas_financeiros()
RETURNS INTEGER AS $$
DECLARE
  v_alertas_gerados INTEGER := 0;
  v_conta RECORD;
  v_lancamento RECORD;
BEGIN
  -- Alerta 1: Saldo baixo em contas bancárias
  FOR v_conta IN
    SELECT cb.id, cb.nome, cb.saldo_atual, cb.saldo_minimo_alerta
    FROM contas_bancarias cb
    WHERE cb.ativa = TRUE
      AND cb.saldo_minimo_alerta IS NOT NULL
      AND cb.saldo_atual <= cb.saldo_minimo_alerta
      AND NOT EXISTS (
        SELECT 1 FROM alertas_financeiros af
        WHERE af.conta_bancaria_id = cb.id
          AND af.tipo = 'saldo_baixo'
          AND af.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    INSERT INTO alertas_financeiros (tipo, titulo, mensagem, severidade, conta_bancaria_id, valor_referencia)
    VALUES (
      'saldo_baixo',
      'Saldo Baixo: ' || v_conta.nome,
      'O saldo da conta ' || v_conta.nome || ' está abaixo do mínimo. Saldo atual: R$ ' || v_conta.saldo_atual,
      'warning',
      v_conta.id,
      v_conta.saldo_atual
    );
    v_alertas_gerados := v_alertas_gerados + 1;
  END LOOP;

  -- Alerta 2: Títulos vencendo em 3 dias
  FOR v_lancamento IN
    SELECT l.id, l.descricao, l.valor_total, l.data_vencimento
    FROM lancamentos l
    WHERE l.status IN ('pendente', 'parcial')
      AND l.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM alertas_financeiros af
        WHERE af.lancamento_id = l.id
          AND af.tipo = 'titulo_vencendo'
          AND af.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    INSERT INTO alertas_financeiros (tipo, titulo, mensagem, severidade, lancamento_id, data_referencia, valor_referencia)
    VALUES (
      'titulo_vencendo',
      'Título Vencendo: ' || v_lancamento.descricao,
      'O título "' || v_lancamento.descricao || '" de R$ ' || v_lancamento.valor_total || ' vence em ' || (v_lancamento.data_vencimento - CURRENT_DATE) || ' dias',
      'info',
      v_lancamento.id,
      v_lancamento.data_vencimento,
      v_lancamento.valor_total
    );
    v_alertas_gerados := v_alertas_gerados + 1;
  END LOOP;

  RETURN v_alertas_gerados;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMENTÁRIOS
-- ==========================================
COMMENT ON FUNCTION conciliar_transacao IS 'Concilia uma transação bancária com um lançamento contábil';
COMMENT ON FUNCTION desconciliar_transacao IS 'Remove a conciliação de uma transação';
COMMENT ON FUNCTION aplicar_regra_categorizacao IS 'Aplica uma regra de categorização, criando um lançamento e conciliando automaticamente';
COMMENT ON FUNCTION sugerir_conciliacao IS 'Sugere lançamentos compatíveis para conciliação baseado em valor, data e descrição';
COMMENT ON FUNCTION buscar_regras_aplicaveis IS 'Busca regras de categorização aplicáveis a uma transação';
COMMENT ON FUNCTION processar_conciliacao_automatica IS 'Processa conciliação automática em lote com base em score mínimo';
COMMENT ON FUNCTION gerar_alertas_financeiros IS 'Gera alertas automáticos para saldo baixo, títulos vencendo, etc';
