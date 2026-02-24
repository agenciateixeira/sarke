-- =====================================================
-- CATEGORIAS AUTOMÁTICAS E MAPEAMENTO INTELIGENTE
-- =====================================================

-- ==========================================
-- TABLE: Categorias de Despesas/Receitas
-- ==========================================
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  icone VARCHAR(50),
  cor VARCHAR(20),
  conta_id UUID REFERENCES plano_contas(id),
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TABLE: Palavras-chave para Categorização
-- ==========================================
CREATE TABLE IF NOT EXISTS categorias_palavras_chave (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID NOT NULL REFERENCES categorias_financeiras(id) ON DELETE CASCADE,
  palavra_chave VARCHAR(100) NOT NULL,
  peso INTEGER DEFAULT 1, -- Maior peso = mais relevante
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_categoria_palavra UNIQUE (categoria_id, palavra_chave)
);

-- ==========================================
-- TABLE: Histórico de Aprendizado (Machine Learning)
-- ==========================================
CREATE TABLE IF NOT EXISTS categorias_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao_original TEXT NOT NULL,
  categoria_id UUID REFERENCES categorias_financeiras(id),
  conta_id UUID REFERENCES plano_contas(id),
  confirmado BOOLEAN DEFAULT FALSE, -- Usuário confirmou a categorização
  score DECIMAL(5,2), -- Confiança da IA (0-100)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INSERIR CATEGORIAS PADRÃO
-- ==========================================

-- Categorias de DESPESAS
INSERT INTO categorias_financeiras (nome, tipo, icone, cor) VALUES
  ('Salários e Encargos', 'despesa', '👥', '#FF6B6B'),
  ('Aluguel e Condomínio', 'despesa', '🏢', '#4ECDC4'),
  ('Energia Elétrica', 'despesa', '⚡', '#FFE66D'),
  ('Água e Esgoto', 'despesa', '💧', '#95E1D3'),
  ('Internet e Telefone', 'despesa', '📱', '#A8E6CF'),
  ('Material de Escritório', 'despesa', '📎', '#DCEDC1'),
  ('Material de Limpeza', 'despesa', '🧹', '#FFD3B6'),
  ('Combustível', 'despesa', '⛽', '#FFAAA5'),
  ('Manutenção de Veículos', 'despesa', '🚗', '#FF8B94'),
  ('Marketing e Publicidade', 'despesa', '📢', '#A8DADC'),
  ('Software e Tecnologia', 'despesa', '💻', '#457B9D'),
  ('Honorários Profissionais', 'despesa', '⚖️', '#1D3557'),
  ('Impostos e Taxas', 'despesa', '🏛️', '#E63946'),
  ('Alimentação', 'despesa', '🍔', '#F4A261'),
  ('Treinamento e Capacitação', 'despesa', '📚', '#2A9D8F'),
  ('Manutenção Predial', 'despesa', '🔧', '#E76F51'),
  ('Seguros', 'despesa', '🛡️', '#264653'),
  ('Viagens e Deslocamentos', 'despesa', '✈️', '#F77F00'),
  ('Despesas Bancárias', 'despesa', '🏦', '#D62828'),
  ('Outras Despesas', 'despesa', '💰', '#9C89B8')
ON CONFLICT DO NOTHING;

-- Categorias de RECEITAS
INSERT INTO categorias_financeiras (nome, tipo, icone, cor) VALUES
  ('Vendas de Serviços', 'receita', '💼', '#06D6A0'),
  ('Vendas de Produtos', 'receita', '🛍️', '#118AB2'),
  ('Consultoria', 'receita', '🎯', '#073B4C'),
  ('Projetos Residenciais', 'receita', '🏠', '#52B788'),
  ('Projetos Comerciais', 'receita', '🏪', '#40916C'),
  ('Projetos Corporativos', 'receita', '🏢', '#2D6A4F'),
  ('Aluguel Recebido', 'receita', '🔑', '#1B4332'),
  ('Rendimentos Financeiros', 'receita', '📈', '#081C15'),
  ('Outras Receitas', 'receita', '💵', '#52B788')
ON CONFLICT DO NOTHING;

-- ==========================================
-- INSERIR PALAVRAS-CHAVE PARA CATEGORIZAÇÃO
-- ==========================================

-- Salários
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('salario', 3),
  ('salário', 3),
  ('folha', 3),
  ('pagamento', 2),
  ('funcionario', 2),
  ('colaborador', 2),
  ('inss', 3),
  ('fgts', 3),
  ('vale', 2),
  ('13º', 3),
  ('ferias', 2)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Salários e Encargos';

-- Aluguel
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('aluguel', 3),
  ('aluguer', 3),
  ('condominio', 3),
  ('condomínio', 3),
  ('locacao', 2),
  ('locação', 2),
  ('iptu', 2)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Aluguel e Condomínio';

-- Energia
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('energia', 3),
  ('luz', 3),
  ('eletricidade', 2),
  ('cemig', 3),
  ('cpfl', 3),
  ('elektro', 3),
  ('enel', 3),
  ('eletrobras', 2)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Energia Elétrica';

-- Água
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('agua', 3),
  ('água', 3),
  ('saneamento', 2),
  ('sabesp', 3),
  ('copasa', 3),
  ('caesb', 3),
  ('sanasa', 3)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Água e Esgoto';

-- Internet/Telefone
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('internet', 3),
  ('telefone', 3),
  ('celular', 2),
  ('vivo', 3),
  ('claro', 3),
  ('tim', 3),
  ('oi', 3),
  ('net', 2),
  ('sky', 2)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Internet e Telefone';

-- Material de Escritório
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('papelaria', 3),
  ('caneta', 2),
  ('papel', 2),
  ('impressao', 2),
  ('toner', 2),
  ('grampeador', 1),
  ('kalunga', 3)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Material de Escritório';

-- Material de Limpeza
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('limpeza', 3),
  ('detergente', 2),
  ('sabao', 2),
  ('desinfetante', 2),
  ('vassoura', 1),
  ('rodo', 1),
  ('banheiro', 2)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Material de Limpeza';

-- Combustível
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('gasolina', 3),
  ('combustivel', 3),
  ('diesel', 3),
  ('alcool', 2),
  ('etanol', 2),
  ('posto', 2),
  ('shell', 3),
  ('petrobras', 3),
  ('ipiranga', 3)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Combustível';

-- Marketing
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('marketing', 3),
  ('publicidade', 3),
  ('anuncio', 2),
  ('google ads', 3),
  ('facebook ads', 3),
  ('instagram', 2),
  ('meta', 2),
  ('propaganda', 2)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Marketing e Publicidade';

-- Software
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('software', 3),
  ('licenca', 2),
  ('assinatura', 2),
  ('saas', 2),
  ('microsoft', 2),
  ('google', 2),
  ('adobe', 2),
  ('hosting', 2),
  ('dominio', 2)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Software e Tecnologia';

-- Impostos
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('imposto', 3),
  ('tributo', 2),
  ('taxa', 2),
  ('darf', 3),
  ('das', 3),
  ('iss', 3),
  ('irpj', 3),
  ('csll', 3),
  ('pis', 3),
  ('cofins', 3)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Impostos e Taxas';

-- Alimentação
INSERT INTO categorias_palavras_chave (categoria_id, palavra_chave, peso)
SELECT id, palavra, peso FROM categorias_financeiras
CROSS JOIN (VALUES
  ('alimentacao', 3),
  ('restaurante', 2),
  ('lanchonete', 2),
  ('ifood', 3),
  ('uber eats', 3),
  ('cafe', 1),
  ('refeicao', 2)
) AS palavras(palavra, peso)
WHERE categorias_financeiras.nome = 'Alimentação';

-- ==========================================
-- FUNCTION: Categorização Automática com IA
-- ==========================================
CREATE OR REPLACE FUNCTION categorizar_automaticamente(
  p_descricao TEXT
)
RETURNS TABLE(
  categoria_id UUID,
  categoria_nome VARCHAR,
  score DECIMAL,
  palavras_encontradas TEXT[]
) AS $$
DECLARE
  v_descricao_lower TEXT := LOWER(UNACCENT(p_descricao));
BEGIN
  RETURN QUERY
  WITH matches AS (
    SELECT
      cf.id AS categoria_id,
      cf.nome AS categoria_nome,
      cpk.palavra_chave,
      cpk.peso,
      CASE
        -- Match exato
        WHEN v_descricao_lower LIKE '%' || LOWER(cpk.palavra_chave) || '%' THEN cpk.peso * 100
        -- Match parcial (similaridade)
        WHEN similarity(v_descricao_lower, LOWER(cpk.palavra_chave)) > 0.3 THEN cpk.peso * 50
        ELSE 0
      END AS match_score
    FROM categorias_financeiras cf
    JOIN categorias_palavras_chave cpk ON cpk.categoria_id = cf.id
    WHERE cf.ativa = TRUE
  ),
  scores AS (
    SELECT
      categoria_id,
      categoria_nome,
      SUM(match_score) AS total_score,
      ARRAY_AGG(palavra_chave) FILTER (WHERE match_score > 0) AS palavras
    FROM matches
    WHERE match_score > 0
    GROUP BY categoria_id, categoria_nome
  ),
  historico_match AS (
    -- Aprendizado: se já categorizou descrição similar antes
    SELECT
      ch.categoria_id,
      AVG(ch.score) * 1.5 AS historico_boost
    FROM categorias_historico ch
    WHERE similarity(LOWER(ch.descricao_original), v_descricao_lower) > 0.7
      AND ch.confirmado = TRUE
    GROUP BY ch.categoria_id
  )
  SELECT
    s.categoria_id,
    s.categoria_nome,
    LEAST(100, s.total_score + COALESCE(hm.historico_boost, 0))::DECIMAL AS score,
    s.palavras
  FROM scores s
  LEFT JOIN historico_match hm ON hm.categoria_id = s.categoria_id
  ORDER BY score DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCTION: Aplicar Categorização em Transação
-- ==========================================
CREATE OR REPLACE FUNCTION aplicar_categorizacao_transacao(
  p_transacao_id UUID,
  p_categoria_id UUID,
  p_confirmar BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_transacao transacoes_bancarias%ROWTYPE;
  v_categoria categorias_financeiras%ROWTYPE;
  v_lancamento_id UUID;
  v_tipo_lancamento VARCHAR(20);
BEGIN
  -- Buscar transação
  SELECT * INTO v_transacao FROM transacoes_bancarias WHERE id = p_transacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada';
  END IF;

  -- Buscar categoria
  SELECT * INTO v_categoria FROM categorias_financeiras WHERE id = p_categoria_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Categoria não encontrada';
  END IF;

  -- Determinar tipo
  v_tipo_lancamento := CASE WHEN v_transacao.tipo = 'credito' THEN 'receita' ELSE 'despesa' END;

  -- Criar lançamento
  INSERT INTO lancamentos (
    tipo,
    descricao,
    valor_total,
    valor_pago,
    data_vencimento,
    data_pagamento,
    data_competencia,
    status,
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
    'Importado automaticamente - Categoria: ' || v_categoria.nome
  ) RETURNING id INTO v_lancamento_id;

  -- Criar item contábil (se categoria tem conta vinculada)
  IF v_categoria.conta_id IS NOT NULL THEN
    INSERT INTO lancamentos_itens (
      lancamento_id,
      conta_id,
      tipo,
      valor,
      descricao
    ) VALUES (
      v_lancamento_id,
      v_categoria.conta_id,
      CASE WHEN v_transacao.tipo = 'credito' THEN 'credito' ELSE 'debito' END,
      v_transacao.valor,
      v_transacao.descricao
    );
  END IF;

  -- Conciliar
  UPDATE transacoes_bancarias
  SET
    status_conciliacao = 'conciliado',
    lancamento_id = v_lancamento_id,
    conciliado_em = NOW(),
    conciliacao_automatica = TRUE
  WHERE id = p_transacao_id;

  -- Salvar no histórico de aprendizado
  INSERT INTO categorias_historico (
    descricao_original,
    categoria_id,
    conta_id,
    confirmado,
    score
  )
  SELECT
    v_transacao.descricao,
    p_categoria_id,
    v_categoria.conta_id,
    p_confirmar,
    (SELECT score FROM categorizar_automaticamente(v_transacao.descricao) WHERE categoria_id = p_categoria_id LIMIT 1)
  ON CONFLICT DO NOTHING;

  RETURN v_lancamento_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias_financeiras(tipo, ativa);
CREATE INDEX IF NOT EXISTS idx_palavras_chave_categoria ON categorias_palavras_chave(categoria_id);
CREATE INDEX IF NOT EXISTS idx_historico_descricao ON categorias_historico USING gin(to_tsvector('portuguese', descricao_original));

-- ==========================================
-- EXTENSÕES NECESSÁRIAS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Para similarity()
CREATE EXTENSION IF NOT EXISTS unaccent; -- Para remover acentos

-- ==========================================
-- COMENTÁRIOS
-- ==========================================
COMMENT ON TABLE categorias_financeiras IS 'Categorias para classificação automática de despesas/receitas';
COMMENT ON TABLE categorias_palavras_chave IS 'Palavras-chave para matching automático com peso de relevância';
COMMENT ON TABLE categorias_historico IS 'Histórico de categorizações para aprendizado de máquina';
COMMENT ON FUNCTION categorizar_automaticamente IS 'Algoritmo de IA que sugere categorias baseado em palavras-chave e histórico';
COMMENT ON FUNCTION aplicar_categorizacao_transacao IS 'Aplica categoria, cria lançamento e concilia transação automaticamente';
