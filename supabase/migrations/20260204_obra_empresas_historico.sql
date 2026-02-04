-- =====================================================
-- HISTÓRICO OBRA-EMPRESA-CLIENTE
-- =====================================================
-- Sistema para rastrear empresas que participaram de obras
-- Com visualização para o cliente

-- =====================================================
-- Tabela de Vínculo Direto Obra-Empresa
-- =====================================================
CREATE TABLE IF NOT EXISTS obra_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas_parceiras(id) ON DELETE RESTRICT,

  -- Informações do serviço executado
  servico_executado TEXT NOT NULL, -- O que a empresa fez nesta obra
  descricao_servico TEXT, -- Detalhes do que foi feito

  -- Datas
  data_inicio DATE,
  data_termino DATE,

  -- Valores
  valor_contratado DECIMAL(15,2),
  valor_pago DECIMAL(15,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'em_andamento' CHECK (status IN (
    'aguardando',      -- Contratada mas ainda não iniciou
    'em_andamento',    -- Executando
    'concluido',       -- Serviço finalizado
    'cancelado'        -- Cancelado
  )),

  -- Avaliação específica para esta obra
  avaliacao DECIMAL(2,1) CHECK (avaliacao >= 0 AND avaliacao <= 5),
  avaliacao_comentario TEXT,

  -- Informações visíveis para o cliente
  visivel_para_cliente BOOLEAN DEFAULT true,
  observacoes_cliente TEXT, -- Observações que o cliente pode ver

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(obra_id, empresa_id, servico_executado)
);

-- =====================================================
-- VIEW: Empresas por Obra (para visualização do cliente)
-- =====================================================
CREATE OR REPLACE VIEW obra_empresas_cliente AS
SELECT
  oe.id,
  oe.obra_id,
  oe.empresa_id,

  -- Dados da obra
  o.id as obra_uuid,
  o.nome as obra_nome,
  o.endereco as obra_endereco,
  o.cidade as obra_cidade,
  o.estado as obra_estado,
  o.cliente_id,

  -- Dados da empresa
  e.nome as empresa_nome,
  e.telefone as empresa_telefone,
  e.celular as empresa_celular,
  e.email as empresa_email,
  e.logo_url as empresa_logo,
  e.responsavel as empresa_responsavel,

  -- Serviço executado
  oe.servico_executado,
  oe.descricao_servico,
  oe.data_inicio,
  oe.data_termino,
  oe.status,

  -- Avaliação
  oe.avaliacao,
  e.avaliacao_media as empresa_avaliacao_media,

  -- Observações
  oe.observacoes_cliente

FROM obra_empresas oe
JOIN obras o ON o.id = oe.obra_id
JOIN empresas_parceiras e ON e.id = oe.empresa_id
WHERE oe.visivel_para_cliente = true
  AND e.status = 'ativa';

-- =====================================================
-- VIEW: Histórico Completo Cliente
-- =====================================================
-- Mostra todas as obras do cliente com as empresas que participaram
CREATE OR REPLACE VIEW cliente_historico_completo AS
SELECT
  c.id as cliente_id,
  c.name as cliente_nome,
  c.email as cliente_email,
  c.phone as cliente_telefone,

  o.id as obra_id,
  o.nome as obra_nome,
  o.endereco as obra_endereco,
  o.cidade as obra_cidade,
  o.estado as obra_estado,
  o.status as obra_status,
  o.data_inicio as obra_data_inicio,
  o.data_termino_real as obra_data_termino,

  -- Contagem de empresas na obra
  COUNT(DISTINCT oe.empresa_id) as total_empresas,

  -- Array de empresas (JSON)
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'empresa_id', e.id,
      'empresa_nome', e.nome,
      'empresa_telefone', e.telefone,
      'empresa_email', e.email,
      'empresa_logo', e.logo_url,
      'servico', oe.servico_executado,
      'descricao', oe.descricao_servico,
      'data_inicio', oe.data_inicio,
      'data_termino', oe.data_termino,
      'status', oe.status,
      'avaliacao', oe.avaliacao
    ) ORDER BY oe.data_inicio
  ) FILTER (WHERE oe.id IS NOT NULL) as empresas

FROM clients c
JOIN obras o ON o.cliente_id = c.id
LEFT JOIN obra_empresas oe ON oe.obra_id = o.id AND oe.visivel_para_cliente = true
LEFT JOIN empresas_parceiras e ON e.id = oe.empresa_id

GROUP BY
  c.id, c.name, c.email, c.phone,
  o.id, o.nome, o.endereco, o.cidade, o.estado,
  o.status, o.data_inicio, o.data_termino_real;

-- =====================================================
-- FUNCTION: Sincronizar com Cronograma
-- =====================================================
-- Quando uma empresa é vinculada ao cronograma, criar vínculo com a obra
CREATE OR REPLACE FUNCTION sync_obra_empresa_from_cronograma()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_id UUID;
  v_servicos TEXT[];
BEGIN
  -- Buscar obra_id do cronograma
  SELECT c.obra_id INTO v_obra_id
  FROM cronogramas c
  WHERE c.id = NEW.cronograma_id
    AND c.obra_id IS NOT NULL;

  -- Se o cronograma está vinculado a uma obra
  IF v_obra_id IS NOT NULL THEN
    -- Buscar serviços da empresa
    SELECT e.servicos INTO v_servicos
    FROM empresas_parceiras e
    WHERE e.id = NEW.empresa_id;

    -- Inserir ou atualizar vínculo obra-empresa
    INSERT INTO obra_empresas (
      obra_id,
      empresa_id,
      servico_executado,
      data_inicio,
      data_termino,
      valor_contratado,
      status
    )
    VALUES (
      v_obra_id,
      NEW.empresa_id,
      COALESCE(v_servicos[1], 'Serviços diversos'), -- Pega primeiro serviço
      NEW.data_inicio_prevista,
      NEW.data_fim_prevista,
      NEW.valor_contratado,
      CASE
        WHEN NEW.status = 'em_execucao' THEN 'em_andamento'
        WHEN NEW.status = 'concluida' THEN 'concluido'
        WHEN NEW.status = 'cancelada' THEN 'cancelado'
        ELSE 'aguardando'
      END
    )
    ON CONFLICT (obra_id, empresa_id, servico_executado)
    DO UPDATE SET
      data_inicio = EXCLUDED.data_inicio,
      data_termino = EXCLUDED.data_termino,
      valor_contratado = EXCLUDED.valor_contratado,
      status = EXCLUDED.status,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar
CREATE TRIGGER trigger_sync_obra_empresa
  AFTER INSERT OR UPDATE ON cronograma_empresa_vinculos
  FOR EACH ROW
  EXECUTE FUNCTION sync_obra_empresa_from_cronograma();

-- =====================================================
-- FUNCTION: Buscar Empresas da Obra (para Cliente)
-- =====================================================
CREATE OR REPLACE FUNCTION get_empresas_por_obra(p_obra_id UUID)
RETURNS TABLE(
  empresa_id UUID,
  empresa_nome TEXT,
  empresa_telefone TEXT,
  empresa_celular TEXT,
  empresa_email TEXT,
  empresa_logo TEXT,
  empresa_responsavel TEXT,
  servico TEXT,
  descricao TEXT,
  data_inicio DATE,
  data_termino DATE,
  status TEXT,
  avaliacao DECIMAL,
  observacoes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.telefone,
    e.celular,
    e.email,
    e.logo_url,
    e.responsavel,
    oe.servico_executado,
    oe.descricao_servico,
    oe.data_inicio,
    oe.data_termino,
    oe.status,
    oe.avaliacao,
    oe.observacoes_cliente
  FROM obra_empresas oe
  JOIN empresas_parceiras e ON e.id = oe.empresa_id
  WHERE oe.obra_id = p_obra_id
    AND oe.visivel_para_cliente = true
    AND e.status = 'ativa'
  ORDER BY oe.data_inicio NULLS LAST, e.nome;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_obra_empresas_obra ON obra_empresas(obra_id);
CREATE INDEX idx_obra_empresas_empresa ON obra_empresas(empresa_id);
CREATE INDEX idx_obra_empresas_status ON obra_empresas(status);
CREATE INDEX idx_obra_empresas_cliente_visivel ON obra_empresas(visivel_para_cliente) WHERE visivel_para_cliente = true;

-- =====================================================
-- TRIGGER UPDATED_AT
-- =====================================================
CREATE TRIGGER trigger_obra_empresas_updated_at
  BEFORE UPDATE ON obra_empresas
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE obra_empresas ENABLE ROW LEVEL SECURITY;

-- Admins e gerentes podem ver tudo
CREATE POLICY "Admins e gerentes podem ver todas obra_empresas"
  ON obra_empresas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'gerente')
  ));

-- Clientes podem ver apenas suas obras
CREATE POLICY "Clientes podem ver empresas de suas obras"
  ON obra_empresas FOR SELECT
  USING (
    visivel_para_cliente = true
    AND EXISTS (
      SELECT 1 FROM obras o
      JOIN clients c ON c.id = o.cliente_id
      JOIN profiles p ON p.email = c.email
      WHERE o.id = obra_empresas.obra_id
        AND p.id = auth.uid()
    )
  );

-- Apenas admins e gerentes podem inserir/atualizar
CREATE POLICY "Admins e gerentes podem gerenciar obra_empresas"
  ON obra_empresas FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'gerente')
  ));

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE obra_empresas IS 'Vínculo direto entre obras e empresas parceiras, com informações visíveis para o cliente';
COMMENT ON VIEW obra_empresas_cliente IS 'View simplificada para visualização do cliente das empresas que trabalharam em sua obra';
COMMENT ON VIEW cliente_historico_completo IS 'Histórico completo de obras do cliente com todas as empresas participantes';
COMMENT ON FUNCTION get_empresas_por_obra IS 'Retorna lista de empresas que trabalharam em uma obra específica (visível para cliente)';
