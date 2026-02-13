-- =====================================================
-- MEMORIAL DE OBRAS
-- Sistema de arquivamento de obras concluídas
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: MEMORIAL DE OBRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID da obra original (mantém referência)
  obra_original_id UUID NOT NULL,

  -- Todos os campos da tabela obras
  nome TEXT NOT NULL,
  descricao TEXT,
  cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,

  -- Informações do projeto
  area_construida DECIMAL(10,2),
  area_terreno DECIMAL(10,2),
  tipo_obra TEXT,
  valor_contrato DECIMAL(15,2),

  -- Datas e prazos
  data_inicio DATE,
  data_previsao_termino DATE,
  data_termino_real DATE,
  duracao_meses INTEGER,

  -- Status e progresso (sempre será 'concluida' ou 'cancelada')
  status TEXT NOT NULL,
  progresso_percentual INTEGER DEFAULT 100,

  -- Responsáveis
  engenheiro_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  arquiteto_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fiscal_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Documentação
  alvara_numero TEXT,
  alvara_data_emissao DATE,
  art_rrt_numero TEXT,

  -- Observações
  observacoes TEXT,
  riscos TEXT,

  -- Metadados de arquivamento
  arquivado_em TIMESTAMPTZ DEFAULT NOW(),
  arquivado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  motivo_arquivamento TEXT,

  -- Metadados originais
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,

  -- Índice único para evitar duplicação
  UNIQUE(obra_original_id)
);

-- =====================================================
-- 2. FOTOS DO MEMORIAL
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_obra_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_obra_id UUID NOT NULL REFERENCES memorial_obras(id) ON DELETE CASCADE,
  foto_original_id UUID,
  titulo TEXT,
  descricao TEXT,
  url TEXT NOT NULL,
  tipo TEXT,
  data_foto DATE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- 3. DOCUMENTOS DO MEMORIAL
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_obra_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_obra_id UUID NOT NULL REFERENCES memorial_obras(id) ON DELETE CASCADE,
  documento_original_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  url TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- 4. CRONOGRAMA DO MEMORIAL
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_cronograma_obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_obra_id UUID NOT NULL REFERENCES memorial_obras(id) ON DELETE CASCADE,
  cronograma_original_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  status TEXT,
  progresso_percentual DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- 5. ATIVIDADES DO CRONOGRAMA DO MEMORIAL
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_cronograma_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_cronograma_id UUID NOT NULL REFERENCES memorial_cronograma_obras(id) ON DELETE CASCADE,
  atividade_original_id UUID,
  mes TEXT,
  dia_semana TEXT,
  data_prevista DATE NOT NULL,
  descricao_servico TEXT NOT NULL,
  observacao TEXT,
  empresa_parceira_id UUID REFERENCES empresas_parceiras(id) ON DELETE SET NULL,
  status TEXT,
  data_inicio_real DATE,
  data_conclusao_real DATE,
  rdo_id UUID,
  ordem INTEGER,
  prioridade TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- 6. RDOs DO MEMORIAL
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_rdos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_obra_id UUID NOT NULL REFERENCES memorial_obras(id) ON DELETE CASCADE,
  rdo_original_id UUID,
  data DATE NOT NULL,
  clima TEXT,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  atividades TEXT,
  materiais TEXT,
  equipamentos TEXT,
  mao_de_obra TEXT,
  observacoes TEXT,
  fotos JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- 7. CAIXA DE OBRA DO MEMORIAL (Movimentações Financeiras)
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_caixa_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_obra_id UUID NOT NULL REFERENCES memorial_obras(id) ON DELETE CASCADE,
  movimentacao_original_id UUID,
  tipo TEXT NOT NULL, -- 'entrada', 'saida'
  categoria TEXT,
  descricao TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data DATE NOT NULL,
  forma_pagamento TEXT,
  comprovante_url TEXT,
  empresa_parceira_id UUID REFERENCES empresas_parceiras(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- 8. ORÇAMENTO DE MATERIAIS DO MEMORIAL
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_orcamento_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_obra_id UUID NOT NULL REFERENCES memorial_obras(id) ON DELETE CASCADE,
  material_original_id UUID,
  categoria TEXT,
  item TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT,
  quantidade DECIMAL(10,2),
  valor_unitario DECIMAL(15,2),
  valor_total DECIMAL(15,2),
  fornecedor TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- 9. RELAÇÃO EMPRESAS PARCEIRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_obra_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_obra_id UUID NOT NULL REFERENCES memorial_obras(id) ON DELETE CASCADE,
  empresa_parceira_id UUID REFERENCES empresas_parceiras(id) ON DELETE SET NULL,
  empresa_nome TEXT NOT NULL, -- Snapshot do nome
  empresa_cnpj TEXT,
  tipo_servico TEXT,
  data_inicio DATE,
  data_fim DATE,
  valor_contrato DECIMAL(15,2),
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- 10. HISTÓRICO DE ARQUIVAMENTO/DESARQUIVAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS memorial_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_obra_id UUID NOT NULL REFERENCES memorial_obras(id) ON DELETE CASCADE,
  acao TEXT NOT NULL, -- 'arquivado', 'desarquivado'
  realizado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  realizado_em TIMESTAMPTZ DEFAULT NOW(),
  motivo TEXT,
  detalhes JSONB
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_memorial_obras_status ON memorial_obras(status);
CREATE INDEX IF NOT EXISTS idx_memorial_obras_arquivado_em ON memorial_obras(arquivado_em);
CREATE INDEX IF NOT EXISTS idx_memorial_obras_cliente ON memorial_obras(cliente_id);
CREATE INDEX IF NOT EXISTS idx_memorial_obra_fotos_memorial ON memorial_obra_fotos(memorial_obra_id);
CREATE INDEX IF NOT EXISTS idx_memorial_obra_documentos_memorial ON memorial_obra_documentos(memorial_obra_id);
CREATE INDEX IF NOT EXISTS idx_memorial_cronograma_memorial ON memorial_cronograma_obras(memorial_obra_id);
CREATE INDEX IF NOT EXISTS idx_memorial_atividades_cronograma ON memorial_cronograma_atividades(memorial_cronograma_id);
CREATE INDEX IF NOT EXISTS idx_memorial_rdos_memorial ON memorial_rdos(memorial_obra_id);
CREATE INDEX IF NOT EXISTS idx_memorial_rdos_data ON memorial_rdos(data);
CREATE INDEX IF NOT EXISTS idx_memorial_caixa_memorial ON memorial_caixa_obra(memorial_obra_id);
CREATE INDEX IF NOT EXISTS idx_memorial_orcamento_memorial ON memorial_orcamento_materiais(memorial_obra_id);
CREATE INDEX IF NOT EXISTS idx_memorial_empresas_memorial ON memorial_obra_empresas(memorial_obra_id);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE memorial_obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_obra_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_obra_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_cronograma_obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_cronograma_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_rdos ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_caixa_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_orcamento_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_obra_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE memorial_historico ENABLE ROW LEVEL SECURITY;

-- Policies para memorial_obras
CREATE POLICY "Usuarios autenticados podem ver memorial"
  ON memorial_obras FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir no memorial"
  ON memorial_obras FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para fotos do memorial
CREATE POLICY "Usuarios autenticados podem ver fotos do memorial"
  ON memorial_obra_fotos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir fotos no memorial"
  ON memorial_obra_fotos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para documentos do memorial
CREATE POLICY "Usuarios autenticados podem ver documentos do memorial"
  ON memorial_obra_documentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir documentos no memorial"
  ON memorial_obra_documentos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para cronograma do memorial
CREATE POLICY "Usuarios autenticados podem ver cronograma do memorial"
  ON memorial_cronograma_obras FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir cronograma no memorial"
  ON memorial_cronograma_obras FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para atividades do cronograma do memorial
CREATE POLICY "Usuarios autenticados podem ver atividades do memorial"
  ON memorial_cronograma_atividades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir atividades no memorial"
  ON memorial_cronograma_atividades FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para RDOs do memorial
CREATE POLICY "Usuarios autenticados podem ver rdos do memorial"
  ON memorial_rdos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir rdos no memorial"
  ON memorial_rdos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para caixa do memorial
CREATE POLICY "Usuarios autenticados podem ver caixa do memorial"
  ON memorial_caixa_obra FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir caixa no memorial"
  ON memorial_caixa_obra FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para orçamento do memorial
CREATE POLICY "Usuarios autenticados podem ver orcamento do memorial"
  ON memorial_orcamento_materiais FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir orcamento no memorial"
  ON memorial_orcamento_materiais FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para empresas do memorial
CREATE POLICY "Usuarios autenticados podem ver empresas do memorial"
  ON memorial_obra_empresas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir empresas no memorial"
  ON memorial_obra_empresas FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies para histórico
CREATE POLICY "Usuarios autenticados podem ver historico do memorial"
  ON memorial_historico FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem inserir historico no memorial"
  ON memorial_historico FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- FUNÇÃO: ARQUIVAR OBRA NO MEMORIAL
-- Move todos os dados relacionados para as tabelas de memorial
-- =====================================================
CREATE OR REPLACE FUNCTION arquivar_obra_no_memorial(
  p_obra_id UUID,
  p_user_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_memorial_id UUID;
  v_cronograma_id UUID;
  v_memorial_cronograma_id UUID;
BEGIN
  -- 1. Inserir obra no memorial
  INSERT INTO memorial_obras (
    obra_original_id, nome, descricao, cliente_id, endereco, cidade, estado, cep,
    area_construida, area_terreno, tipo_obra, valor_contrato,
    data_inicio, data_previsao_termino, data_termino_real, duracao_meses,
    status, progresso_percentual,
    engenheiro_responsavel_id, arquiteto_responsavel_id, fiscal_responsavel_id,
    alvara_numero, alvara_data_emissao, art_rrt_numero,
    observacoes, riscos,
    arquivado_por, motivo_arquivamento,
    created_by, created_at, updated_at
  )
  SELECT
    id, nome, descricao, cliente_id, endereco, cidade, estado, cep,
    area_construida, area_terreno, tipo_obra, valor_contrato,
    data_inicio, data_previsao_termino, data_termino_real, duracao_meses,
    status, progresso_percentual,
    engenheiro_responsavel_id, arquiteto_responsavel_id, fiscal_responsavel_id,
    alvara_numero, alvara_data_emissao, art_rrt_numero,
    observacoes, riscos,
    p_user_id, p_motivo,
    created_by, created_at, updated_at
  FROM obras
  WHERE id = p_obra_id
  RETURNING id INTO v_memorial_id;

  -- 2. Mover fotos
  INSERT INTO memorial_obra_fotos (
    memorial_obra_id, foto_original_id, titulo, descricao, url, tipo,
    data_foto, latitude, longitude, uploaded_by, created_at
  )
  SELECT
    v_memorial_id, id, titulo, descricao, url, tipo,
    data_foto, latitude, longitude, uploaded_by, created_at
  FROM obra_fotos
  WHERE obra_id = p_obra_id;

  DELETE FROM obra_fotos WHERE obra_id = p_obra_id;

  -- 3. Mover documentos
  INSERT INTO memorial_obra_documentos (
    memorial_obra_id, documento_original_id, titulo, descricao, tipo, url,
    tamanho_bytes, mime_type, uploaded_by, created_at
  )
  SELECT
    v_memorial_id, id, titulo, descricao, tipo, url,
    tamanho_bytes, mime_type, uploaded_by, created_at
  FROM obra_documentos
  WHERE obra_id = p_obra_id;

  DELETE FROM obra_documentos WHERE obra_id = p_obra_id;

  -- 4. Mover cronograma
  SELECT id INTO v_cronograma_id FROM cronograma_obras WHERE obra_id = p_obra_id;

  IF v_cronograma_id IS NOT NULL THEN
    INSERT INTO memorial_cronograma_obras (
      memorial_obra_id, cronograma_original_id, nome, descricao,
      data_inicio, data_fim_prevista, data_fim_real, status, progresso_percentual,
      created_at, updated_at, created_by
    )
    SELECT
      v_memorial_id, id, nome, descricao,
      data_inicio, data_fim_prevista, data_fim_real, status, progresso_percentual,
      created_at, updated_at, created_by
    FROM cronograma_obras
    WHERE id = v_cronograma_id
    RETURNING id INTO v_memorial_cronograma_id;

    -- 4.1. Mover atividades do cronograma
    INSERT INTO memorial_cronograma_atividades (
      memorial_cronograma_id, atividade_original_id, mes, dia_semana, data_prevista,
      descricao_servico, observacao, empresa_parceira_id, status,
      data_inicio_real, data_conclusao_real, rdo_id, ordem, prioridade,
      created_at, updated_at, created_by
    )
    SELECT
      v_memorial_cronograma_id, id, mes, dia_semana, data_prevista,
      descricao_servico, observacao, empresa_parceira_id, status,
      data_inicio_real, data_conclusao_real, rdo_id, ordem, prioridade,
      created_at, updated_at, created_by
    FROM cronograma_obra_atividades
    WHERE cronograma_id = v_cronograma_id;

    DELETE FROM cronograma_obra_atividades WHERE cronograma_id = v_cronograma_id;
    DELETE FROM cronograma_obras WHERE id = v_cronograma_id;
  END IF;

  -- 5. Mover RDOs
  INSERT INTO memorial_rdos (
    memorial_obra_id, rdo_original_id, data, clima, responsavel_id,
    atividades, materiais, equipamentos, mao_de_obra, observacoes, fotos,
    created_at, updated_at
  )
  SELECT
    v_memorial_id, id, data, clima, responsavel_id,
    atividades_executadas, materiais_recebidos, equipamentos_utilizados,
    jsonb_build_object(
      'operarios', num_operarios,
      'serventes', num_serventes,
      'mestres', num_mestres,
      'encarregados', num_encarregados
    )::TEXT,
    observacoes,
    to_jsonb(fotos),
    created_at, updated_at
  FROM rdos
  WHERE obra_id = p_obra_id;

  DELETE FROM rdos WHERE obra_id = p_obra_id;

  -- 6. Mover caixa de obra
  INSERT INTO memorial_caixa_obra (
    memorial_obra_id, movimentacao_original_id, tipo, categoria, descricao,
    valor, data, forma_pagamento, comprovante_url, empresa_parceira_id,
    created_by, created_at
  )
  SELECT
    v_memorial_id, id, tipo, categoria, descricao,
    valor, data, forma_pagamento, comprovante_url, empresa_parceira_id,
    created_by, created_at
  FROM caixa_obra
  WHERE obra_id = p_obra_id;

  DELETE FROM caixa_obra WHERE obra_id = p_obra_id;

  -- 7. Mover orçamento de materiais
  INSERT INTO memorial_orcamento_materiais (
    memorial_obra_id, material_original_id, categoria, item, descricao,
    unidade, quantidade, valor_unitario, valor_total, fornecedor, observacoes,
    created_at, updated_at
  )
  SELECT
    v_memorial_id, id, categoria, item, descricao,
    unidade, quantidade, valor_unitario, valor_total, fornecedor, observacoes,
    created_at, updated_at
  FROM orcamento_materiais
  WHERE obra_id = p_obra_id;

  DELETE FROM orcamento_materiais WHERE obra_id = p_obra_id;

  -- 8. Registrar empresas parceiras (snapshot)
  INSERT INTO memorial_obra_empresas (
    memorial_obra_id, empresa_parceira_id, empresa_nome, empresa_cnpj,
    tipo_servico, data_inicio, data_fim, valor_contrato, status, created_at
  )
  SELECT
    v_memorial_id, ep.id, ep.nome, ep.cnpj,
    oeh.tipo_servico, oeh.data_inicio, oeh.data_fim, oeh.valor_contrato,
    oeh.status, oeh.created_at
  FROM obra_empresas_historico oeh
  JOIN empresas_parceiras ep ON ep.id = oeh.empresa_id
  WHERE oeh.obra_id = p_obra_id;

  DELETE FROM obra_empresas_historico WHERE obra_id = p_obra_id;

  -- 9. Registrar no histórico
  INSERT INTO memorial_historico (memorial_obra_id, acao, realizado_por, motivo)
  VALUES (v_memorial_id, 'arquivado', p_user_id, p_motivo);

  -- 10. Deletar obra original
  DELETE FROM obras WHERE id = p_obra_id;

  RETURN v_memorial_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: DESARQUIVAR OBRA (SOMENTE ADMIN)
-- Restaura obra do memorial para tabelas ativas
-- =====================================================
CREATE OR REPLACE FUNCTION desarquivar_obra_do_memorial(
  p_memorial_id UUID,
  p_user_id UUID,
  p_motivo TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_obra_id UUID;
  v_cronograma_id UUID;
  v_memorial_cronograma_id UUID;
BEGIN
  -- 1. Restaurar obra
  INSERT INTO obras (
    id, nome, descricao, cliente_id, endereco, cidade, estado, cep,
    area_construida, area_terreno, tipo_obra, valor_contrato,
    data_inicio, data_previsao_termino, data_termino_real, duracao_meses,
    status, progresso_percentual,
    engenheiro_responsavel_id, arquiteto_responsavel_id, fiscal_responsavel_id,
    alvara_numero, alvara_data_emissao, art_rrt_numero,
    observacoes, riscos,
    created_by, created_at, updated_at
  )
  SELECT
    obra_original_id, nome, descricao, cliente_id, endereco, cidade, estado, cep,
    area_construida, area_terreno, tipo_obra, valor_contrato,
    data_inicio, data_previsao_termino, data_termino_real, duracao_meses,
    'em_andamento', progresso_percentual, -- Muda status para em_andamento
    engenheiro_responsavel_id, arquiteto_responsavel_id, fiscal_responsavel_id,
    alvara_numero, alvara_data_emissao, art_rrt_numero,
    observacoes, riscos,
    created_by, created_at, updated_at
  FROM memorial_obras
  WHERE id = p_memorial_id
  RETURNING id INTO v_obra_id;

  -- 2. Restaurar fotos
  INSERT INTO obra_fotos (
    id, obra_id, titulo, descricao, url, tipo,
    data_foto, latitude, longitude, uploaded_by, created_at
  )
  SELECT
    foto_original_id, v_obra_id, titulo, descricao, url, tipo,
    data_foto, latitude, longitude, uploaded_by, created_at
  FROM memorial_obra_fotos
  WHERE memorial_obra_id = p_memorial_id AND foto_original_id IS NOT NULL;

  -- 3. Restaurar documentos
  INSERT INTO obra_documentos (
    id, obra_id, titulo, descricao, tipo, url,
    tamanho_bytes, mime_type, uploaded_by, created_at
  )
  SELECT
    documento_original_id, v_obra_id, titulo, descricao, tipo, url,
    tamanho_bytes, mime_type, uploaded_by, created_at
  FROM memorial_obra_documentos
  WHERE memorial_obra_id = p_memorial_id AND documento_original_id IS NOT NULL;

  -- 4. Restaurar cronograma
  SELECT id, cronograma_original_id INTO v_memorial_cronograma_id, v_cronograma_id
  FROM memorial_cronograma_obras
  WHERE memorial_obra_id = p_memorial_id
  LIMIT 1;

  IF v_memorial_cronograma_id IS NOT NULL THEN
    INSERT INTO cronograma_obras (
      id, obra_id, nome, descricao,
      data_inicio, data_fim_prevista, data_fim_real, status, progresso_percentual,
      created_at, updated_at, created_by
    )
    SELECT
      cronograma_original_id, v_obra_id, nome, descricao,
      data_inicio, data_fim_prevista, data_fim_real, status, progresso_percentual,
      created_at, updated_at, created_by
    FROM memorial_cronograma_obras
    WHERE id = v_memorial_cronograma_id;

    -- 4.1. Restaurar atividades
    INSERT INTO cronograma_obra_atividades (
      id, cronograma_id, mes, dia_semana, data_prevista,
      descricao_servico, observacao, empresa_parceira_id, status,
      data_inicio_real, data_conclusao_real, rdo_id, ordem, prioridade,
      created_at, updated_at, created_by
    )
    SELECT
      atividade_original_id, v_cronograma_id, mes, dia_semana, data_prevista,
      descricao_servico, observacao, empresa_parceira_id, status,
      data_inicio_real, data_conclusao_real, rdo_id, ordem, prioridade,
      created_at, updated_at, created_by
    FROM memorial_cronograma_atividades
    WHERE memorial_cronograma_id = v_memorial_cronograma_id AND atividade_original_id IS NOT NULL;
  END IF;

  -- 5. Restaurar RDOs (apenas metadados, sem IDs originais)
  INSERT INTO rdos (
    obra_id, data, clima, responsavel_id,
    atividades_executadas, materiais_recebidos, equipamentos_utilizados,
    observacoes, created_at, updated_at
  )
  SELECT
    v_obra_id, data, clima, responsavel_id,
    atividades, materiais, equipamentos,
    observacoes, created_at, updated_at
  FROM memorial_rdos
  WHERE memorial_obra_id = p_memorial_id;

  -- 6. Restaurar caixa
  INSERT INTO caixa_obra (
    obra_id, tipo, categoria, descricao, valor, data,
    forma_pagamento, comprovante_url, empresa_parceira_id,
    created_by, created_at
  )
  SELECT
    v_obra_id, tipo, categoria, descricao, valor, data,
    forma_pagamento, comprovante_url, empresa_parceira_id,
    created_by, created_at
  FROM memorial_caixa_obra
  WHERE memorial_obra_id = p_memorial_id;

  -- 7. Restaurar orçamento
  INSERT INTO orcamento_materiais (
    obra_id, categoria, item, descricao, unidade, quantidade,
    valor_unitario, valor_total, fornecedor, observacoes,
    created_at, updated_at
  )
  SELECT
    v_obra_id, categoria, item, descricao, unidade, quantidade,
    valor_unitario, valor_total, fornecedor, observacoes,
    created_at, updated_at
  FROM memorial_orcamento_materiais
  WHERE memorial_obra_id = p_memorial_id;

  -- 8. Registrar no histórico
  INSERT INTO memorial_historico (memorial_obra_id, acao, realizado_por, motivo)
  VALUES (p_memorial_id, 'desarquivado', p_user_id, p_motivo);

  -- 9. Deletar do memorial
  DELETE FROM memorial_obras WHERE id = p_memorial_id;

  RETURN v_obra_id;
END;
$$ LANGUAGE plpgsql;
