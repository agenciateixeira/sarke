-- =====================================================
-- SISTEMA DE RDO (RELATÓRIO DIÁRIO DE OBRA)
-- =====================================================
-- Sistema completo para gerenciamento de relatórios diários

-- =====================================================
-- Tabela Principal de RDO
-- =====================================================
CREATE TABLE IF NOT EXISTS rdos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referências
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  numero_relatorio INTEGER NOT NULL,

  -- Data e informações básicas
  data_relatorio DATE NOT NULL DEFAULT CURRENT_DATE,
  dia_semana TEXT NOT NULL, -- Segunda-Feira, Terça-Feira, etc.

  -- Condições climáticas
  clima_manha_tempo TEXT CHECK (clima_manha_tempo IN ('claro', 'nublado', 'chuvoso', 'tempestade')),
  clima_manha_condicao TEXT CHECK (clima_manha_condicao IN ('praticavel', 'impraticavel')),
  clima_noite_tempo TEXT CHECK (clima_noite_tempo IN ('claro', 'nublado', 'chuvoso', 'tempestade')),
  clima_noite_condicao TEXT CHECK (clima_noite_condicao IN ('praticavel', 'impraticavel')),
  indice_pluviometrico DECIMAL(10,2), -- em mm

  -- Observações gerais
  observacoes_gerais TEXT,

  -- Status
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado', 'aprovado')),

  -- Assinaturas (base64 ou URLs)
  assinatura_responsavel_obra TEXT,
  assinatura_fiscal TEXT,

  -- Metadados
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(obra_id, numero_relatorio)
);

-- =====================================================
-- Tabela de Mão de Obra do RDO
-- =====================================================
CREATE TABLE IF NOT EXISTS rdo_mao_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id UUID NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,

  -- Tipo de profissional
  tipo TEXT NOT NULL, -- ajudante, eletricista, encanador, pedreiro, etc.
  quantidade INTEGER NOT NULL DEFAULT 0,

  -- Se for mão de obra própria ou terceirizada
  tipo_contratacao TEXT DEFAULT 'propria' CHECK (tipo_contratacao IN ('propria', 'terceirizada')),

  -- Empresa (se terceirizada)
  empresa_id UUID REFERENCES empresas_parceiras(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Atividades do RDO
-- =====================================================
CREATE TABLE IF NOT EXISTS rdo_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id UUID NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,

  -- Descrição da atividade
  descricao TEXT NOT NULL,

  -- Status da atividade
  status TEXT DEFAULT 'em_andamento' CHECK (status IN (
    'iniciada',
    'em_andamento',
    'concluida',
    'pausada',
    'cancelada'
  )),

  -- Localização na obra (opcional)
  local TEXT,

  -- Progresso (0-100)
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),

  -- Ordem de exibição
  ordem INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Fotos do RDO
-- =====================================================
CREATE TABLE IF NOT EXISTS rdo_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id UUID NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,

  -- URL da foto (Supabase Storage)
  foto_url TEXT NOT NULL,

  -- Descrição/legenda
  descricao TEXT,

  -- Localização na obra
  local TEXT,

  -- Ordem de exibição
  ordem INTEGER DEFAULT 0,

  -- Metadados
  tamanho_bytes BIGINT,
  mime_type TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Equipamentos Utilizados
-- =====================================================
CREATE TABLE IF NOT EXISTS rdo_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id UUID NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,

  -- Nome/tipo do equipamento
  nome TEXT NOT NULL,
  quantidade INTEGER DEFAULT 1,

  -- Horas trabalhadas
  horas_utilizadas DECIMAL(10,2),

  -- Observações
  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Materiais Recebidos/Utilizados
-- =====================================================
CREATE TABLE IF NOT EXISTS rdo_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id UUID NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,

  -- Tipo (recebido ou utilizado)
  tipo TEXT NOT NULL CHECK (tipo IN ('recebido', 'utilizado')),

  -- Descrição do material
  descricao TEXT NOT NULL,
  quantidade DECIMAL(10,2),
  unidade TEXT, -- m³, m², kg, unidade, etc.

  -- Fornecedor (se recebido)
  fornecedor TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Tabela de Ocorrências/Problemas
-- =====================================================
CREATE TABLE IF NOT EXISTS rdo_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id UUID NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,

  -- Tipo de ocorrência
  tipo TEXT CHECK (tipo IN ('acidente', 'problema', 'atraso', 'falta_material', 'outro')),

  -- Descrição
  descricao TEXT NOT NULL,

  -- Gravidade
  gravidade TEXT DEFAULT 'baixa' CHECK (gravidade IN ('baixa', 'media', 'alta', 'critica')),

  -- Ações tomadas
  acoes_tomadas TEXT,

  -- Status
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_resolucao', 'resolvido')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VIEW: RDO Completo
-- =====================================================
CREATE OR REPLACE VIEW rdos_completo AS
SELECT
  r.id,
  r.obra_id,
  r.numero_relatorio,
  r.data_relatorio,
  r.dia_semana,

  -- Obra
  o.nome as obra_nome,
  o.endereco as obra_endereco,
  o.cidade as obra_cidade,
  o.estado as obra_estado,

  -- Clima
  r.clima_manha_tempo,
  r.clima_manha_condicao,
  r.clima_noite_tempo,
  r.clima_noite_condicao,
  r.indice_pluviometrico,

  -- Status
  r.status,
  r.observacoes_gerais,

  -- Contagens
  (SELECT COUNT(*) FROM rdo_atividades WHERE rdo_id = r.id) as total_atividades,
  (SELECT COUNT(*) FROM rdo_atividades WHERE rdo_id = r.id AND status = 'concluida') as atividades_concluidas,
  (SELECT COUNT(*) FROM rdo_fotos WHERE rdo_id = r.id) as total_fotos,
  (SELECT SUM(quantidade) FROM rdo_mao_obra WHERE rdo_id = r.id) as total_trabalhadores,

  -- Criador
  p.name as criado_por_nome,
  p.email as criado_por_email,

  r.created_at,
  r.updated_at

FROM rdos r
JOIN obras o ON o.id = r.obra_id
LEFT JOIN profiles p ON p.id = r.created_by;

-- =====================================================
-- FUNCTION: Gerar Próximo Número de RDO
-- =====================================================
CREATE OR REPLACE FUNCTION get_proximo_numero_rdo(p_obra_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_ultimo_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_relatorio), 0) INTO v_ultimo_numero
  FROM rdos
  WHERE obra_id = p_obra_id;

  RETURN v_ultimo_numero + 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Obter Dia da Semana em Português
-- =====================================================
CREATE OR REPLACE FUNCTION get_dia_semana_ptbr(p_data DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE EXTRACT(DOW FROM p_data)
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Segunda-Feira'
    WHEN 2 THEN 'Terça-Feira'
    WHEN 3 THEN 'Quarta-Feira'
    WHEN 4 THEN 'Quinta-Feira'
    WHEN 5 THEN 'Sexta-Feira'
    WHEN 6 THEN 'Sábado'
  END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_rdos_obra ON rdos(obra_id);
CREATE INDEX idx_rdos_data ON rdos(data_relatorio);
CREATE INDEX idx_rdos_status ON rdos(status);
CREATE INDEX idx_rdos_numero ON rdos(obra_id, numero_relatorio);

CREATE INDEX idx_rdo_atividades_rdo ON rdo_atividades(rdo_id);
CREATE INDEX idx_rdo_fotos_rdo ON rdo_fotos(rdo_id);
CREATE INDEX idx_rdo_mao_obra_rdo ON rdo_mao_obra(rdo_id);

-- =====================================================
-- TRIGGER UPDATED_AT
-- =====================================================
CREATE TRIGGER trigger_rdos_updated_at
  BEFORE UPDATE ON rdos
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE rdos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_mao_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE rdo_ocorrencias ENABLE ROW LEVEL SECURITY;

-- Políticas para RDOs
CREATE POLICY "Usuários podem ver RDOs de suas obras"
  ON rdos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM obras o
      LEFT JOIN clients c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.email = c.email
      WHERE o.id = rdos.obra_id
        AND (
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gerente'))
          OR p.id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins e gerentes podem criar RDOs"
  ON rdos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem atualizar RDOs"
  ON rdos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- Políticas para tabelas relacionadas (mesmas regras do RDO principal)
CREATE POLICY "Usuários podem ver dados de RDOs"
  ON rdo_mao_obra FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rdos r
      JOIN obras o ON o.id = r.obra_id
      LEFT JOIN clients c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.email = c.email
      WHERE r.id = rdo_mao_obra.rdo_id
        AND (
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gerente'))
          OR p.id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar dados de RDOs"
  ON rdo_mao_obra FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- Replicar políticas para outras tabelas
CREATE POLICY "Usuários podem ver atividades de RDOs"
  ON rdo_atividades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rdos r
      JOIN obras o ON o.id = r.obra_id
      LEFT JOIN clients c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.email = c.email
      WHERE r.id = rdo_atividades.rdo_id
        AND (
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gerente'))
          OR p.id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar atividades de RDOs"
  ON rdo_atividades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Usuários podem ver fotos de RDOs"
  ON rdo_fotos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rdos r
      JOIN obras o ON o.id = r.obra_id
      LEFT JOIN clients c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.email = c.email
      WHERE r.id = rdo_fotos.rdo_id
        AND (
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gerente'))
          OR p.id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar fotos de RDOs"
  ON rdo_fotos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Usuários podem ver equipamentos de RDOs"
  ON rdo_equipamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rdos r
      JOIN obras o ON o.id = r.obra_id
      LEFT JOIN clients c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.email = c.email
      WHERE r.id = rdo_equipamentos.rdo_id
        AND (
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gerente'))
          OR p.id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar equipamentos de RDOs"
  ON rdo_equipamentos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Usuários podem ver materiais de RDOs"
  ON rdo_materiais FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rdos r
      JOIN obras o ON o.id = r.obra_id
      LEFT JOIN clients c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.email = c.email
      WHERE r.id = rdo_materiais.rdo_id
        AND (
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gerente'))
          OR p.id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar materiais de RDOs"
  ON rdo_materiais FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Usuários podem ver ocorrências de RDOs"
  ON rdo_ocorrencias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rdos r
      JOIN obras o ON o.id = r.obra_id
      LEFT JOIN clients c ON c.id = o.cliente_id
      LEFT JOIN profiles p ON p.email = c.email
      WHERE r.id = rdo_ocorrencias.rdo_id
        AND (
          auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'gerente'))
          OR p.id = auth.uid()
        )
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar ocorrências de RDOs"
  ON rdo_ocorrencias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE rdos IS 'Relatórios Diários de Obra (RDO) - Registro completo das atividades diárias';
COMMENT ON TABLE rdo_atividades IS 'Atividades executadas no dia registradas no RDO';
COMMENT ON TABLE rdo_fotos IS 'Fotos documentando o andamento da obra no dia';
COMMENT ON TABLE rdo_mao_obra IS 'Registro de mão de obra presente no dia';
COMMENT ON TABLE rdo_equipamentos IS 'Equipamentos utilizados no dia';
COMMENT ON TABLE rdo_materiais IS 'Materiais recebidos ou utilizados no dia';
COMMENT ON TABLE rdo_ocorrencias IS 'Ocorrências, problemas e incidentes registrados no dia';
