-- =====================================================
-- SISTEMA DE PROJETOS - SARKE STUDIO
-- =====================================================
-- Sistema completo para gerenciamento de projetos de arquitetura
-- Áreas: Residencial, Comercial, Corporativo
-- Frentes: ARQ (Arquitetônico) e INT (Interiores)
-- Etapas: Planejamento, Planta Baixa, 3D, Executivo
-- Data: 20/02/2026
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: PROJETOS
-- =====================================================
CREATE TABLE IF NOT EXISTS projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações Básicas
  nome TEXT NOT NULL,
  descricao TEXT,
  cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Classificação
  area TEXT NOT NULL CHECK (area IN ('residencial', 'comercial', 'corporativo')),
  tipo_especifico TEXT, -- Ex: 'casa', 'apartamento', 'loja', 'restaurante', 'posto', 'gleba'
  frente TEXT[] NOT NULL, -- Array: pode ter ['arq'], ['int'] ou ['arq', 'int']

  -- Localização
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Dimensões
  area_construida DECIMAL(10,2),
  area_terreno DECIMAL(10,2),
  area_util DECIMAL(10,2),
  numero_pavimentos INTEGER,
  numero_ambientes INTEGER,

  -- Etapa e Progresso
  etapa_atual TEXT DEFAULT 'planejamento' CHECK (etapa_atual IN (
    'planejamento',
    'planta_baixa',
    '3d',
    'executivo',
    'concluido',
    'pausado',
    'cancelado'
  )),
  progresso_percentual INTEGER DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),

  -- Status de Cada Etapa
  planejamento_status TEXT DEFAULT 'pendente' CHECK (planejamento_status IN ('pendente', 'em_andamento', 'concluido')),
  planejamento_progresso INTEGER DEFAULT 0 CHECK (planejamento_progresso >= 0 AND planejamento_progresso <= 100),

  planta_baixa_status TEXT DEFAULT 'pendente' CHECK (planta_baixa_status IN ('pendente', 'em_andamento', 'concluido')),
  planta_baixa_progresso INTEGER DEFAULT 0 CHECK (planta_baixa_progresso >= 0 AND planta_baixa_progresso <= 100),

  modelo_3d_status TEXT DEFAULT 'pendente' CHECK (modelo_3d_status IN ('pendente', 'em_andamento', 'concluido')),
  modelo_3d_progresso INTEGER DEFAULT 0 CHECK (modelo_3d_progresso >= 0 AND modelo_3d_progresso <= 100),

  executivo_status TEXT DEFAULT 'pendente' CHECK (executivo_status IN ('pendente', 'em_andamento', 'concluido')),
  executivo_progresso INTEGER DEFAULT 0 CHECK (executivo_progresso >= 0 AND executivo_progresso <= 100),

  -- Datas
  data_inicio DATE,
  data_previsao_entrega DATE,
  data_entrega_real DATE,
  prazo_dias INTEGER,

  -- Datas por Etapa
  planejamento_data_inicio DATE,
  planejamento_data_fim DATE,

  planta_baixa_data_inicio DATE,
  planta_baixa_data_fim DATE,

  modelo_3d_data_inicio DATE,
  modelo_3d_data_fim DATE,

  executivo_data_inicio DATE,
  executivo_data_fim DATE,

  -- Financeiro
  valor_contrato DECIMAL(15,2),
  valor_recebido DECIMAL(15,2) DEFAULT 0,
  valor_pendente DECIMAL(15,2) GENERATED ALWAYS AS (valor_contrato - valor_recebido) STORED,

  -- Equipe Responsável
  arquiteto_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  designer_responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  coordenador_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Observações
  observacoes TEXT,
  briefing TEXT,
  conceito TEXT,
  estilo TEXT, -- 'moderno', 'contemporaneo', 'classico', 'minimalista', 'industrial', 'rustico'

  -- Metadados
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ETAPA: PLANEJAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_planejamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Formulário Inicial
  formulario_preenchido BOOLEAN DEFAULT FALSE,
  formulario_data DATE,

  -- Visita Técnica
  visita_realizada BOOLEAN DEFAULT FALSE,
  visita_data DATE,
  visita_responsavel_id UUID REFERENCES profiles(id),
  visita_observacoes TEXT,

  -- Entrevista de Alinhamento
  entrevista_realizada BOOLEAN DEFAULT FALSE,
  entrevista_data DATE,
  entrevista_participantes TEXT[],

  -- Análise de Briefing
  briefing_analisado BOOLEAN DEFAULT FALSE,
  briefing_necessidades TEXT,
  briefing_desejos TEXT,
  briefing_restricoes TEXT,
  briefing_orcamento DECIMAL(15,2),

  -- Referências
  referencias JSONB, -- Array de URLs e imagens

  -- Planejamento Interno
  planejamento_equipe TEXT,
  prazo_definido INTEGER, -- em dias

  -- Aprovação
  aprovado BOOLEAN DEFAULT FALSE,
  aprovado_por UUID REFERENCES profiles(id),
  aprovado_em TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ETAPA: PLANTA BAIXA
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_planta_baixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Conceito
  conceito TEXT,
  partido_arquitetonico TEXT,

  -- Setorização
  setorizacao JSONB, -- { "social": [...], "intimo": [...], "servico": [...] }

  -- Estudos
  estudo_fluxo TEXT,
  estudo_mobiliario TEXT,
  estudo_iluminacao TEXT,
  estudo_ventilacao TEXT,

  -- Análise Normativa
  analise_normativa_realizada BOOLEAN DEFAULT FALSE,
  codigo_obras TEXT,
  restricoes_legais TEXT,
  afastamentos TEXT,
  taxa_ocupacao DECIMAL(5,2),
  coeficiente_aproveitamento DECIMAL(5,2),

  -- Versões da Planta
  versao_atual INTEGER DEFAULT 1,

  -- Arquivos
  arquivo_dwg_url TEXT,
  arquivo_pdf_url TEXT,
  arquivo_revit_url TEXT,

  -- Aprovação Cliente
  aprovado_cliente BOOLEAN DEFAULT FALSE,
  aprovado_cliente_data DATE,
  aprovado_cliente_observacoes TEXT,

  -- Revisões
  numero_revisoes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. ETAPA: 3D (MODELAGEM E IMERSÃO)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_3d (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Modelagem
  modelo_revit_url TEXT,
  modelo_sketchup_url TEXT,

  -- Renderização
  total_renders INTEGER DEFAULT 0,
  renders_aprovados INTEGER DEFAULT 0,

  -- Imagens
  imagens_estaticas TEXT[], -- URLs
  imagens_360 TEXT[], -- URLs

  -- Pós-produção
  pos_producao_ia BOOLEAN DEFAULT FALSE,
  pos_producao_software TEXT, -- 'photoshop', 'lumion', 'twinmotion', 'enscape'

  -- Realidade Virtual
  vr_disponivel BOOLEAN DEFAULT FALSE,
  vr_link TEXT,
  passeio_virtual_url TEXT,

  -- Video
  video_disponivel BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  video_duracao INTEGER, -- em segundos

  -- Aprovação
  aprovado_cliente BOOLEAN DEFAULT FALSE,
  aprovado_cliente_data DATE,

  -- Revisões
  numero_revisoes INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. ETAPA: EXECUTIVO
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_executivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- ARQ - Arquitetônico
  planta_estrutural BOOLEAN DEFAULT FALSE,
  planta_estrutural_url TEXT,

  cortes_fachadas BOOLEAN DEFAULT FALSE,
  cortes_fachadas_url TEXT,

  paginacao_pisos BOOLEAN DEFAULT FALSE,
  paginacao_pisos_url TEXT,

  memorial_descritivo_arq BOOLEAN DEFAULT FALSE,
  memorial_descritivo_arq_url TEXT,

  detalhamentos_construtivos BOOLEAN DEFAULT FALSE,
  detalhamentos_construtivos_url TEXT,

  -- INT - Interiores
  planta_eletrica BOOLEAN DEFAULT FALSE,
  planta_eletrica_url TEXT,

  planta_hidraulica BOOLEAN DEFAULT FALSE,
  planta_hidraulica_url TEXT,

  projeto_luminotecnico BOOLEAN DEFAULT FALSE,
  projeto_luminotecnico_url TEXT,

  projeto_forro BOOLEAN DEFAULT FALSE,
  projeto_forro_url TEXT,

  detalhamento_marcenaria BOOLEAN DEFAULT FALSE,
  detalhamento_marcenaria_url TEXT,

  comunicacao_visual BOOLEAN DEFAULT FALSE,
  comunicacao_visual_url TEXT,

  memorial_tecnico_int BOOLEAN DEFAULT FALSE,
  memorial_tecnico_int_url TEXT,

  -- Caderno Técnico Completo
  caderno_completo BOOLEAN DEFAULT FALSE,
  caderno_completo_url TEXT,

  -- Aprovação
  aprovado_cliente BOOLEAN DEFAULT FALSE,
  aprovado_cliente_data DATE,

  -- Entrega
  entregue BOOLEAN DEFAULT FALSE,
  data_entrega DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. ARQUIVOS DO PROJETO
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Informações do Arquivo
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'dwg',
    'pdf',
    'revit',
    'sketchup',
    'render',
    'foto',
    'video',
    'documento',
    'memorial',
    'orcamento',
    'contrato',
    'outro'
  )),
  categoria TEXT, -- 'planejamento', 'planta_baixa', '3d', 'executivo', 'geral'

  -- Arquivo
  url TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,

  -- Versionamento
  versao INTEGER DEFAULT 1,
  versao_anterior_id UUID REFERENCES projeto_arquivos(id),

  -- Visibilidade
  visivel_cliente BOOLEAN DEFAULT TRUE,

  -- Metadata
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. TIMELINE DO PROJETO (HISTÓRICO)
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Evento
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'criacao',
    'mudanca_etapa',
    'aprovacao',
    'revisao',
    'upload_arquivo',
    'comentario',
    'reuniao',
    'entrega',
    'outro'
  )),
  titulo TEXT NOT NULL,
  descricao TEXT,

  -- Dados do Evento
  dados JSONB,

  -- Relacionamentos
  arquivo_id UUID REFERENCES projeto_arquivos(id),

  -- Usuário
  usuario_id UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. COMENTÁRIOS E FEEDBACK
-- =====================================================
CREATE TABLE IF NOT EXISTS projeto_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Comentário
  texto TEXT NOT NULL,
  categoria TEXT, -- 'planejamento', 'planta_baixa', '3d', 'executivo', 'geral'

  -- Anexos
  anexos TEXT[], -- URLs de imagens/arquivos

  -- Status
  resolvido BOOLEAN DEFAULT FALSE,
  resolvido_por UUID REFERENCES profiles(id),
  resolvido_em TIMESTAMPTZ,

  -- Autor
  autor_id UUID REFERENCES profiles(id),

  -- Thread (respostas)
  comentario_pai_id UUID REFERENCES projeto_comentarios(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_projetos_area ON projetos(area);
CREATE INDEX IF NOT EXISTS idx_projetos_etapa_atual ON projetos(etapa_atual);
CREATE INDEX IF NOT EXISTS idx_projetos_cliente ON projetos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_projetos_arquiteto ON projetos(arquiteto_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_projetos_created_at ON projetos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projeto_arquivos_projeto ON projeto_arquivos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_arquivos_tipo ON projeto_arquivos(tipo);
CREATE INDEX IF NOT EXISTS idx_projeto_arquivos_categoria ON projeto_arquivos(categoria);

CREATE INDEX IF NOT EXISTS idx_projeto_timeline_projeto ON projeto_timeline(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_timeline_tipo ON projeto_timeline(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_projeto_timeline_created ON projeto_timeline(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projeto_comentarios_projeto ON projeto_comentarios(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projeto_comentarios_autor ON projeto_comentarios(autor_id);
CREATE INDEX IF NOT EXISTS idx_projeto_comentarios_resolvido ON projeto_comentarios(resolvido);

-- =====================================================
-- 10. TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projetos_updated_at
  BEFORE UPDATE ON projetos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_projeto_planejamento_updated_at
  BEFORE UPDATE ON projeto_planejamento
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_projeto_planta_baixa_updated_at
  BEFORE UPDATE ON projeto_planta_baixa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_projeto_3d_updated_at
  BEFORE UPDATE ON projeto_3d
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_projeto_executivo_updated_at
  BEFORE UPDATE ON projeto_executivo
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_projeto_comentarios_updated_at
  BEFORE UPDATE ON projeto_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. VIEWS ÚTEIS
-- =====================================================

-- View: Projetos com Resumo Completo
CREATE OR REPLACE VIEW projetos_completo AS
SELECT
  p.*,
  c.name as cliente_nome,
  c.email as cliente_email,
  c.phone as cliente_telefone,

  arq.name as arquiteto_nome,
  des.name as designer_nome,
  coord.name as coordenador_nome,

  -- Contadores
  (SELECT COUNT(*) FROM projeto_arquivos WHERE projeto_id = p.id) as total_arquivos,
  (SELECT COUNT(*) FROM projeto_comentarios WHERE projeto_id = p.id AND NOT resolvido) as comentarios_pendentes,

  -- Status das Etapas (resumo)
  CASE
    WHEN p.planejamento_status = 'concluido'
     AND p.planta_baixa_status = 'concluido'
     AND p.modelo_3d_status = 'concluido'
     AND p.executivo_status = 'concluido'
    THEN 'completo'
    WHEN p.etapa_atual = 'cancelado' THEN 'cancelado'
    WHEN p.etapa_atual = 'pausado' THEN 'pausado'
    ELSE 'em_andamento'
  END as status_geral

FROM projetos p
LEFT JOIN clients c ON c.id = p.cliente_id
LEFT JOIN profiles arq ON arq.id = p.arquiteto_responsavel_id
LEFT JOIN profiles des ON des.id = p.designer_responsavel_id
LEFT JOIN profiles coord ON coord.id = p.coordenador_id;

-- =====================================================
-- 12. FUNCTIONS ÚTEIS
-- =====================================================

-- Function: Calcular progresso geral do projeto
CREATE OR REPLACE FUNCTION calcular_progresso_projeto(p_projeto_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_progresso INTEGER;
BEGIN
  SELECT
    ROUND(
      (planejamento_progresso + planta_baixa_progresso + modelo_3d_progresso + executivo_progresso) / 4.0
    )::INTEGER
  INTO v_progresso
  FROM projetos
  WHERE id = p_projeto_id;

  RETURN COALESCE(v_progresso, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Atualizar etapa atual baseado nos status
CREATE OR REPLACE FUNCTION atualizar_etapa_atual()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.executivo_status = 'em_andamento' THEN
    NEW.etapa_atual := 'executivo';
  ELSIF NEW.modelo_3d_status = 'em_andamento' THEN
    NEW.etapa_atual := '3d';
  ELSIF NEW.planta_baixa_status = 'em_andamento' THEN
    NEW.etapa_atual := 'planta_baixa';
  ELSIF NEW.planejamento_status = 'em_andamento' THEN
    NEW.etapa_atual := 'planejamento';
  ELSIF NEW.executivo_status = 'concluido' THEN
    NEW.etapa_atual := 'concluido';
  END IF;

  -- Atualizar progresso geral
  NEW.progresso_percentual := calcular_progresso_projeto(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_etapa_atual
  BEFORE UPDATE ON projetos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_etapa_atual();

-- =====================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_planejamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_planta_baixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_executivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_comentarios ENABLE ROW LEVEL SECURITY;

-- Policies: Todos usuários autenticados podem VER projetos
CREATE POLICY "Usuários podem ver projetos"
  ON projetos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem ver planejamento"
  ON projeto_planejamento FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem ver planta baixa"
  ON projeto_planta_baixa FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem ver 3D"
  ON projeto_3d FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem ver executivo"
  ON projeto_executivo FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem ver arquivos"
  ON projeto_arquivos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem ver timeline"
  ON projeto_timeline FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem ver comentários"
  ON projeto_comentarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policies: Apenas admins e gerentes podem CRIAR/EDITAR/DELETAR
CREATE POLICY "Admins e gerentes podem gerenciar projetos"
  ON projetos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar planejamento"
  ON projeto_planejamento FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar planta baixa"
  ON projeto_planta_baixa FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar 3D"
  ON projeto_3d FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar executivo"
  ON projeto_executivo FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Admins e gerentes podem gerenciar arquivos"
  ON projeto_arquivos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );

-- Policies: Todos podem INSERIR comentários
CREATE POLICY "Usuários podem criar comentários"
  ON projeto_comentarios FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem editar próprios comentários"
  ON projeto_comentarios FOR UPDATE
  USING (autor_id = auth.uid());

-- =====================================================
-- 14. COMENTÁRIOS NAS TABELAS
-- =====================================================
COMMENT ON TABLE projetos IS 'Tabela principal de projetos de arquitetura e interiores';
COMMENT ON TABLE projeto_planejamento IS 'Etapa 1: Planejamento - Briefing, visita técnica, conceito';
COMMENT ON TABLE projeto_planta_baixa IS 'Etapa 2: Planta Baixa - Layout, setorização, estudos';
COMMENT ON TABLE projeto_3d IS 'Etapa 3: 3D - Modelagem, renderização, realidade virtual';
COMMENT ON TABLE projeto_executivo IS 'Etapa 4: Executivo - Plantas técnicas, memorial descritivo';
COMMENT ON TABLE projeto_arquivos IS 'Arquivos do projeto (DWG, PDF, renders, etc)';
COMMENT ON TABLE projeto_timeline IS 'Histórico completo de eventos do projeto';
COMMENT ON TABLE projeto_comentarios IS 'Comentários e feedback sobre o projeto';

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
