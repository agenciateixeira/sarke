-- =====================================================
-- MIGRATION: Sistema ADM/Financeiro de Obras
-- Data: 2026-02-06
-- Descrição: Tabelas para controle de orçamento de materiais e caixa de obra
-- Baseado em: ADM - Prime N.S. Final.xlsx
-- =====================================================

-- =====================================================
-- TABELA: obra_orcamento_materiais
-- Descrição: Controle de materiais planejados e orçamento da obra
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_orcamento_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

  -- Identificação do item
  local VARCHAR(100),                    -- ex: "GERAL", "LAVABO", "COPA", "HALL"
  item VARCHAR(20) NOT NULL,             -- ex: "1.1", "1.2", "1.15"
  descricao TEXT NOT NULL,               -- descrição do material/serviço

  -- Quantidades
  quantidade DECIMAL(10,2),              -- quantidade do item
  medida VARCHAR(50),                    -- ex: "VERBA", "M²", "UNID", "METROS"

  -- Valores financeiros
  valor_total DECIMAL(12,2) DEFAULT 0,   -- valor total orçado
  valor_pago DECIMAL(12,2) DEFAULT 0,    -- valor já pago
  valor_restante DECIMAL(12,2) DEFAULT 0, -- valor ainda pendente

  -- Controle de pagamento
  forma_pagamento TEXT,                  -- ex: "ATO / 30 / 60 / 90 - TODO DIA 19"
  empresa_parceira_id UUID REFERENCES empresas_parceiras(id),
  responsavel_sarke VARCHAR(100),        -- nome do responsável

  -- Status
  status_obra VARCHAR(50),               -- ex: "FINALIZADO", "EM ANDAMENTO", "PENDENTE"
  status_pagamento VARCHAR(50),          -- ex: "PAGO", "A PAGAR", "PARCIAL", "DESCONTO"

  -- Observações
  observacoes TEXT,

  -- Ordem de exibição
  ordem INTEGER,                         -- ordem de exibição na lista

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para obra_orcamento_materiais
CREATE INDEX idx_orcamento_materiais_obra ON obra_orcamento_materiais(obra_id);
CREATE INDEX idx_orcamento_materiais_empresa ON obra_orcamento_materiais(empresa_parceira_id);
CREATE INDEX idx_orcamento_materiais_status ON obra_orcamento_materiais(status_pagamento);
CREATE INDEX idx_orcamento_materiais_local ON obra_orcamento_materiais(local);

-- Comentários
COMMENT ON TABLE obra_orcamento_materiais IS 'Orçamento de materiais e serviços da obra';
COMMENT ON COLUMN obra_orcamento_materiais.local IS 'Local/ambiente da obra onde será aplicado';
COMMENT ON COLUMN obra_orcamento_materiais.item IS 'Código do item no orçamento (ex: 1.1, 1.2)';
COMMENT ON COLUMN obra_orcamento_materiais.valor_restante IS 'Calculado automaticamente: valor_total - valor_pago';

-- =====================================================
-- TABELA: obra_caixa
-- Descrição: Controle de caixa diário/semanal da obra
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

  -- Identificação
  semana VARCHAR(50),                    -- ex: "SEMANA 01", "SEMANA 02"
  categoria VARCHAR(100),                -- ex: "CAIXA DE OBRA", "CAIXA DE ELÉTRICA"
  item_numero INTEGER,                   -- número sequencial do item na semana

  -- Dados da movimentação
  data DATE NOT NULL,                    -- data da movimentação
  descricao TEXT NOT NULL,               -- descrição da despesa/receita
  empresa VARCHAR(200),                  -- empresa/fornecedor

  -- Valor (negativo = despesa, positivo = receita/adiantamento)
  valor DECIMAL(12,2) NOT NULL,

  -- Comprovante
  tipo_recibo VARCHAR(50),               -- ex: "NF", "CUPOM", "RECIBO", "SEM NF"
  codigo_recibo VARCHAR(100),            -- número da nota/cupom
  anexo_url TEXT,                        -- URL do arquivo anexado (foto do recibo)

  -- Status
  status VARCHAR(50) DEFAULT 'PENDENTE', -- ex: "PAGO", "TRANSFERIDO", "PENDENTE"

  -- Observações
  observacoes TEXT,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para obra_caixa
CREATE INDEX idx_obra_caixa_obra ON obra_caixa(obra_id);
CREATE INDEX idx_obra_caixa_semana ON obra_caixa(semana);
CREATE INDEX idx_obra_caixa_data ON obra_caixa(data);
CREATE INDEX idx_obra_caixa_categoria ON obra_caixa(categoria);
CREATE INDEX idx_obra_caixa_status ON obra_caixa(status);

-- Comentários
COMMENT ON TABLE obra_caixa IS 'Controle de caixa diário/semanal da obra (despesas e receitas)';
COMMENT ON COLUMN obra_caixa.valor IS 'Valor da movimentação: negativo para despesas, positivo para receitas/adiantamentos';
COMMENT ON COLUMN obra_caixa.semana IS 'Identificação da semana de trabalho';

-- =====================================================
-- TABELA: obra_caixa_semanas
-- Descrição: Controle de semanas do caixa de obra
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_caixa_semanas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

  -- Identificação da semana
  numero_semana INTEGER NOT NULL,        -- 1, 2, 3, 4...
  nome VARCHAR(50) NOT NULL,             -- "SEMANA 01", "SEMANA 02"

  -- Período
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,

  -- Totalizadores (calculados automaticamente)
  total_despesas DECIMAL(12,2) DEFAULT 0,
  total_receitas DECIMAL(12,2) DEFAULT 0,
  saldo DECIMAL(12,2) DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'ABERTA',   -- "ABERTA", "FECHADA", "ENVIADA_CLIENTE"
  data_envio_cliente TIMESTAMPTZ,        -- quando foi enviado para o cliente

  -- Observações
  observacoes TEXT,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Garantir que não há semanas duplicadas
  UNIQUE(obra_id, numero_semana)
);

-- Índices para obra_caixa_semanas
CREATE INDEX idx_caixa_semanas_obra ON obra_caixa_semanas(obra_id);
CREATE INDEX idx_caixa_semanas_status ON obra_caixa_semanas(status);
CREATE INDEX idx_caixa_semanas_data ON obra_caixa_semanas(data_inicio, data_fim);

-- Comentários
COMMENT ON TABLE obra_caixa_semanas IS 'Controle de semanas do caixa de obra';
COMMENT ON COLUMN obra_caixa_semanas.saldo IS 'Saldo da semana: total_receitas - total_despesas';

-- =====================================================
-- VIEWS: Relatórios e Estatísticas
-- =====================================================

-- View: Resumo financeiro do orçamento por obra
CREATE OR REPLACE VIEW obra_orcamento_resumo AS
SELECT
  obra_id,
  COUNT(*) as total_itens,
  COUNT(*) FILTER (WHERE status_pagamento = 'PAGO') as itens_pagos,
  COUNT(*) FILTER (WHERE status_pagamento = 'A PAGAR') as itens_a_pagar,
  COUNT(*) FILTER (WHERE status_pagamento = 'PARCIAL') as itens_parciais,

  COALESCE(SUM(valor_total), 0) as valor_total_orcado,
  COALESCE(SUM(valor_pago), 0) as valor_total_pago,
  COALESCE(SUM(valor_restante), 0) as valor_total_restante,

  ROUND(
    CASE
      WHEN SUM(valor_total) > 0
      THEN (SUM(valor_pago) / SUM(valor_total) * 100)
      ELSE 0
    END, 2
  ) as percentual_pago
FROM obra_orcamento_materiais
GROUP BY obra_id;

COMMENT ON VIEW obra_orcamento_resumo IS 'Resumo financeiro do orçamento de cada obra';

-- View: Resumo do caixa por semana
CREATE OR REPLACE VIEW obra_caixa_resumo_semana AS
SELECT
  obra_id,
  semana,
  COUNT(*) as total_movimentacoes,
  COUNT(*) FILTER (WHERE valor < 0) as total_despesas_count,
  COUNT(*) FILTER (WHERE valor > 0) as total_receitas_count,

  COALESCE(SUM(valor) FILTER (WHERE valor < 0), 0) as total_despesas,
  COALESCE(SUM(valor) FILTER (WHERE valor > 0), 0) as total_receitas,
  COALESCE(SUM(valor), 0) as saldo_semana,

  MIN(data) as data_inicio,
  MAX(data) as data_fim
FROM obra_caixa
GROUP BY obra_id, semana;

COMMENT ON VIEW obra_caixa_resumo_semana IS 'Resumo financeiro do caixa por semana';

-- View: Consolidado geral de uma obra (orçamento + caixa)
CREATE OR REPLACE VIEW obra_financeiro_consolidado AS
SELECT
  o.id as obra_id,
  o.nome as obra_nome,
  o.cliente_id,

  -- Dados do orçamento
  COALESCE(om.valor_total_orcado, 0) as orcamento_total,
  COALESCE(om.valor_total_pago, 0) as orcamento_pago,
  COALESCE(om.valor_total_restante, 0) as orcamento_restante,
  COALESCE(om.percentual_pago, 0) as orcamento_percentual_pago,

  -- Dados do caixa (soma de todas as semanas)
  COALESCE(SUM(oc.valor) FILTER (WHERE oc.valor < 0), 0) as caixa_total_despesas,
  COALESCE(SUM(oc.valor) FILTER (WHERE oc.valor > 0), 0) as caixa_total_receitas,
  COALESCE(SUM(oc.valor), 0) as caixa_saldo_total

FROM obras o
LEFT JOIN obra_orcamento_resumo om ON o.id = om.obra_id
LEFT JOIN obra_caixa oc ON o.id = oc.obra_id
GROUP BY o.id, o.nome, o.cliente_id, om.valor_total_orcado, om.valor_total_pago,
         om.valor_total_restante, om.percentual_pago;

COMMENT ON VIEW obra_financeiro_consolidado IS 'Visão consolidada do financeiro da obra (orçamento + caixa)';

-- =====================================================
-- TRIGGERS: Cálculos Automáticos
-- =====================================================

-- Trigger: Calcular valor_restante automaticamente
CREATE OR REPLACE FUNCTION calc_valor_restante_orcamento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.valor_restante := COALESCE(NEW.valor_total, 0) - COALESCE(NEW.valor_pago, 0);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calc_valor_restante
  BEFORE INSERT OR UPDATE OF valor_total, valor_pago ON obra_orcamento_materiais
  FOR EACH ROW
  EXECUTE FUNCTION calc_valor_restante_orcamento();

COMMENT ON FUNCTION calc_valor_restante_orcamento IS 'Calcula automaticamente o valor restante do orçamento';

-- Trigger: Atualizar totalizadores da semana
CREATE OR REPLACE FUNCTION atualizar_totais_semana()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_id UUID;
  v_semana VARCHAR(50);
BEGIN
  -- Pegar obra_id e semana do registro novo ou antigo
  IF TG_OP = 'DELETE' THEN
    v_obra_id := OLD.obra_id;
    v_semana := OLD.semana;
  ELSE
    v_obra_id := NEW.obra_id;
    v_semana := NEW.semana;
  END IF;

  -- Atualizar totalizadores da semana
  UPDATE obra_caixa_semanas
  SET
    total_despesas = COALESCE((
      SELECT SUM(ABS(valor))
      FROM obra_caixa
      WHERE obra_id = v_obra_id
        AND semana = v_semana
        AND valor < 0
    ), 0),
    total_receitas = COALESCE((
      SELECT SUM(valor)
      FROM obra_caixa
      WHERE obra_id = v_obra_id
        AND semana = v_semana
        AND valor > 0
    ), 0),
    updated_at = NOW()
  WHERE obra_id = v_obra_id AND nome = v_semana;

  -- Calcular saldo
  UPDATE obra_caixa_semanas
  SET saldo = total_receitas - total_despesas
  WHERE obra_id = v_obra_id AND nome = v_semana;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_totais_semana_insert
  AFTER INSERT ON obra_caixa
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_totais_semana();

CREATE TRIGGER trigger_atualizar_totais_semana_update
  AFTER UPDATE OF valor ON obra_caixa
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_totais_semana();

CREATE TRIGGER trigger_atualizar_totais_semana_delete
  AFTER DELETE ON obra_caixa
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_totais_semana();

COMMENT ON FUNCTION atualizar_totais_semana IS 'Atualiza automaticamente os totalizadores da semana do caixa';

-- Trigger: Atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_obra_caixa_updated_at
  BEFORE UPDATE ON obra_caixa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_caixa_semanas_updated_at
  BEFORE UPDATE ON obra_caixa_semanas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE obra_orcamento_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_caixa_semanas ENABLE ROW LEVEL SECURITY;

-- Políticas para obra_orcamento_materiais
CREATE POLICY "Permitir leitura para usuários autenticados"
  ON obra_orcamento_materiais FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados"
  ON obra_orcamento_materiais FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados"
  ON obra_orcamento_materiais FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir exclusão para usuários autenticados"
  ON obra_orcamento_materiais FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para obra_caixa
CREATE POLICY "Permitir leitura para usuários autenticados"
  ON obra_caixa FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados"
  ON obra_caixa FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados"
  ON obra_caixa FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir exclusão para usuários autenticados"
  ON obra_caixa FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para obra_caixa_semanas
CREATE POLICY "Permitir leitura para usuários autenticados"
  ON obra_caixa_semanas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados"
  ON obra_caixa_semanas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados"
  ON obra_caixa_semanas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir exclusão para usuários autenticados"
  ON obra_caixa_semanas FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- GRANTS: Permissões
-- =====================================================

-- Garantir que o service_role tenha acesso total
GRANT ALL ON obra_orcamento_materiais TO service_role;
GRANT ALL ON obra_caixa TO service_role;
GRANT ALL ON obra_caixa_semanas TO service_role;

-- Garantir que usuários autenticados tenham acesso
GRANT SELECT, INSERT, UPDATE, DELETE ON obra_orcamento_materiais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON obra_caixa TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON obra_caixa_semanas TO authenticated;

-- Grants para as views
GRANT SELECT ON obra_orcamento_resumo TO authenticated, service_role;
GRANT SELECT ON obra_caixa_resumo_semana TO authenticated, service_role;
GRANT SELECT ON obra_financeiro_consolidado TO authenticated, service_role;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
