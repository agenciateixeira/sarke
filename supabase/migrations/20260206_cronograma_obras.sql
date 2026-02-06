-- =====================================================
-- SISTEMA DE CRONOGRAMA PARA OBRAS
-- Baseado no modelo "Cronograma Prime R01.xlsx"
-- Data: 06/02/2026
-- =====================================================

-- =====================================================
-- 1. TABELA PRINCIPAL: CRONOGRAMAS
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'concluido', 'cancelado')),
  progresso_percentual DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(obra_id)
);

CREATE INDEX IF NOT EXISTS idx_cronograma_obras_obra ON cronograma_obras(obra_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_obras_status ON cronograma_obras(status);

-- =====================================================
-- 2. TABELA: ATIVIDADES DO CRONOGRAMA
-- (Baseado na planilha CRONOGRAMA)
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_obra_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronograma_obras(id) ON DELETE CASCADE,

  mes TEXT,
  dia_semana TEXT,
  data_prevista DATE NOT NULL,
  descricao_servico TEXT NOT NULL,
  observacao TEXT,

  empresa_parceira_id UUID REFERENCES empresas_parceiras(id),

  status TEXT DEFAULT 'pendente' CHECK (status IN (
    'pendente',
    'realizado',
    'em_andamento',
    'atrasado',
    'cancelado'
  )),

  data_inicio_real DATE,
  data_conclusao_real DATE,
  rdo_id UUID REFERENCES rdos(id),

  ordem INTEGER DEFAULT 0,
  prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'critica')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_cronograma_obra_atividades_cronograma ON cronograma_obra_atividades(cronograma_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_atividades_data ON cronograma_obra_atividades(data_prevista);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_atividades_empresa ON cronograma_obra_atividades(empresa_parceira_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_atividades_status ON cronograma_obra_atividades(status);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_atividades_rdo ON cronograma_obra_atividades(rdo_id);

-- =====================================================
-- 3. TABELA: MATERIAIS DO CRONOGRAMA
-- (Baseado na planilha SERVIÇOS)
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_obra_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronograma_obras(id) ON DELETE CASCADE,
  atividade_id UUID REFERENCES cronograma_obra_atividades(id) ON DELETE SET NULL,

  data_necessaria DATE,
  servico TEXT,
  descricao_material TEXT NOT NULL,
  quantidade DECIMAL(10,2) NOT NULL,
  unidade_medida TEXT NOT NULL,

  valor_unitario DECIMAL(10,2),
  valor_total DECIMAL(10,2),
  valor_pago DECIMAL(10,2) DEFAULT 0,
  saldo DECIMAL(10,2),

  status_compra TEXT DEFAULT 'pendente' CHECK (status_compra IN (
    'pendente',
    'cotacao',
    'pedido_realizado',
    'em_transito',
    'recebido',
    'cancelado'
  )),

  fornecedor TEXT,
  data_compra DATE,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cronograma_obra_materiais_cronograma ON cronograma_obra_materiais(cronograma_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_materiais_atividade ON cronograma_obra_materiais(atividade_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_materiais_status ON cronograma_obra_materiais(status_compra);

-- =====================================================
-- 4. TABELA: TEMPLATES DE CRONOGRAMA
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_obra_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  tipo_obra TEXT,
  duracao_estimada_dias INTEGER,
  estrutura JSONB NOT NULL,
  vezes_usado INTEGER DEFAULT 0,
  ultima_utilizacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- 5. TABELA: NOTIFICAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_obra_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronograma_obras(id) ON DELETE CASCADE,
  atividade_id UUID REFERENCES cronograma_obra_atividades(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL CHECK (tipo IN (
    'atividade_proxima',
    'atividade_atrasada',
    'material_faltando',
    'obra_atrasada'
  )),

  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  destinatarios UUID[] NOT NULL,
  empresa_parceira_id UUID REFERENCES empresas_parceiras(id),

  enviado BOOLEAN DEFAULT FALSE,
  lido BOOLEAN DEFAULT FALSE,
  data_envio TIMESTAMPTZ,
  data_leitura TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cronograma_obra_notificacoes_cronograma ON cronograma_obra_notificacoes(cronograma_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_notificacoes_enviado ON cronograma_obra_notificacoes(enviado);

-- =====================================================
-- 6. TABELA: HISTÓRICO
-- =====================================================
CREATE TABLE IF NOT EXISTS cronograma_obra_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronograma_obras(id) ON DELETE CASCADE,
  atividade_id UUID REFERENCES cronograma_obra_atividades(id) ON DELETE SET NULL,

  tipo_alteracao TEXT NOT NULL CHECK (tipo_alteracao IN (
    'criacao',
    'edicao',
    'exclusao',
    'status_mudado',
    'reagendamento',
    'conclusao'
  )),

  dados_anteriores JSONB,
  dados_novos JSONB,
  motivo TEXT,
  alterado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cronograma_obra_historico_cronograma ON cronograma_obra_historico(cronograma_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_historico_atividade ON cronograma_obra_historico(atividade_id);

-- =====================================================
-- 7. VIEWS
-- =====================================================

-- View: Cronograma completo com estatísticas
CREATE OR REPLACE VIEW cronograma_obras_completo AS
SELECT
  c.*,
  o.nome as obra_nome,
  o.endereco as obra_endereco,
  COUNT(DISTINCT ca.id) as total_atividades,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'realizado') as atividades_concluidas,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'pendente') as atividades_pendentes,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'atrasado') as atividades_atrasadas,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'em_andamento') as atividades_em_andamento,
  COUNT(DISTINCT cm.id) as total_materiais,
  SUM(cm.valor_total) as custo_total_materiais,
  SUM(cm.valor_pago) as valor_pago_materiais,
  SUM(cm.saldo) as saldo_materiais,
  CASE
    WHEN COUNT(DISTINCT ca.id) > 0 THEN
      ROUND((COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'realizado')::DECIMAL / COUNT(DISTINCT ca.id) * 100), 2)
    ELSE 0
  END as progresso_real
FROM cronograma_obras c
LEFT JOIN obras o ON o.id = c.obra_id
LEFT JOIN cronograma_obra_atividades ca ON ca.cronograma_id = c.id
LEFT JOIN cronograma_obra_materiais cm ON cm.cronograma_id = c.id
GROUP BY c.id, o.nome, o.endereco;

-- View: Atividades do dia
CREATE OR REPLACE VIEW cronograma_obra_atividades_hoje AS
SELECT
  ca.*,
  c.obra_id,
  o.nome as obra_nome,
  ep.nome as empresa_nome
FROM cronograma_obra_atividades ca
JOIN cronograma_obras c ON c.id = ca.cronograma_id
JOIN obras o ON o.id = c.obra_id
LEFT JOIN empresas_parceiras ep ON ep.id = ca.empresa_parceira_id
WHERE ca.data_prevista = CURRENT_DATE
  AND ca.status IN ('pendente', 'em_andamento')
ORDER BY ca.prioridade DESC, ca.ordem;

-- View: Atividades atrasadas
CREATE OR REPLACE VIEW cronograma_obra_atividades_atrasadas AS
SELECT
  ca.*,
  c.obra_id,
  o.nome as obra_nome,
  ep.nome as empresa_nome,
  CURRENT_DATE - ca.data_prevista as dias_atraso
FROM cronograma_obra_atividades ca
JOIN cronograma_obras c ON c.id = ca.cronograma_id
JOIN obras o ON o.id = c.obra_id
LEFT JOIN empresas_parceiras ep ON ep.id = ca.empresa_parceira_id
WHERE ca.data_prevista < CURRENT_DATE
  AND ca.status IN ('pendente', 'em_andamento')
ORDER BY dias_atraso DESC;

-- View: Materiais pendentes
CREATE OR REPLACE VIEW cronograma_obra_materiais_pendentes AS
SELECT
  cm.*,
  c.obra_id,
  o.nome as obra_nome,
  ca.descricao_servico as atividade_descricao
FROM cronograma_obra_materiais cm
JOIN cronograma_obras c ON c.id = cm.cronograma_id
JOIN obras o ON o.id = c.obra_id
LEFT JOIN cronograma_obra_atividades ca ON ca.id = cm.atividade_id
WHERE cm.status_compra IN ('pendente', 'cotacao')
ORDER BY cm.data_necessaria NULLS LAST;

-- =====================================================
-- 8. FUNÇÕES
-- =====================================================

-- Atualizar progresso do cronograma
CREATE OR REPLACE FUNCTION atualizar_progresso_cronograma_obra()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cronograma_obras
  SET
    progresso_percentual = (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status = 'realizado')::DECIMAL /
         NULLIF(COUNT(*), 0) * 100), 2
      )
      FROM cronograma_obra_atividades
      WHERE cronograma_id = COALESCE(NEW.cronograma_id, OLD.cronograma_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.cronograma_id, OLD.cronograma_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_atualizar_progresso_cronograma_obra ON cronograma_obra_atividades;
CREATE TRIGGER trigger_atualizar_progresso_cronograma_obra
AFTER INSERT OR UPDATE OR DELETE ON cronograma_obra_atividades
FOR EACH ROW
EXECUTE FUNCTION atualizar_progresso_cronograma_obra();

-- Marcar atividades atrasadas
CREATE OR REPLACE FUNCTION marcar_atividades_atrasadas_obra()
RETURNS INTEGER AS $$
DECLARE
  total_atualizadas INTEGER;
BEGIN
  UPDATE cronograma_obra_atividades
  SET status = 'atrasado', updated_at = NOW()
  WHERE data_prevista < CURRENT_DATE
    AND status = 'pendente';

  GET DIAGNOSTICS total_atualizadas = ROW_COUNT;
  RETURN total_atualizadas;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE cronograma_obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_obra_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_obra_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_obra_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_obra_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_obra_historico ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Usuários podem ver cronogramas" ON cronograma_obras;
CREATE POLICY "Usuários podem ver cronogramas"
  ON cronograma_obras FOR SELECT
  USING (EXISTS (SELECT 1 FROM obras WHERE obras.id = cronograma_obras.obra_id));

DROP POLICY IF EXISTS "Admins e gerentes podem criar cronogramas" ON cronograma_obras;
CREATE POLICY "Admins e gerentes podem criar cronogramas"
  ON cronograma_obras FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')));

DROP POLICY IF EXISTS "Admins e gerentes podem editar cronogramas" ON cronograma_obras;
CREATE POLICY "Admins e gerentes podem editar cronogramas"
  ON cronograma_obras FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')));

DROP POLICY IF EXISTS "Usuários podem ver atividades" ON cronograma_obra_atividades;
CREATE POLICY "Usuários podem ver atividades"
  ON cronograma_obra_atividades FOR SELECT
  USING (EXISTS (SELECT 1 FROM cronograma_obras c JOIN obras o ON o.id = c.obra_id WHERE c.id = cronograma_obra_atividades.cronograma_id));

DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar atividades" ON cronograma_obra_atividades;
CREATE POLICY "Admins e gerentes podem gerenciar atividades"
  ON cronograma_obra_atividades FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')));

DROP POLICY IF EXISTS "Usuários podem ver materiais" ON cronograma_obra_materiais;
CREATE POLICY "Usuários podem ver materiais"
  ON cronograma_obra_materiais FOR SELECT
  USING (EXISTS (SELECT 1 FROM cronograma_obras c JOIN obras o ON o.id = c.obra_id WHERE c.id = cronograma_obra_materiais.cronograma_id));

DROP POLICY IF EXISTS "Admins e gerentes podem gerenciar materiais" ON cronograma_obra_materiais;
CREATE POLICY "Admins e gerentes podem gerenciar materiais"
  ON cronograma_obra_materiais FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gerente')));

DROP POLICY IF EXISTS "Todos podem ver templates" ON cronograma_obra_templates;
CREATE POLICY "Todos podem ver templates"
  ON cronograma_obra_templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Apenas admins podem criar templates" ON cronograma_obra_templates;
CREATE POLICY "Apenas admins podem criar templates"
  ON cronograma_obra_templates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Usuários veem suas notificações" ON cronograma_obra_notificacoes;
CREATE POLICY "Usuários veem suas notificações"
  ON cronograma_obra_notificacoes FOR SELECT
  USING (auth.uid() = ANY(destinatarios));

DROP POLICY IF EXISTS "Usuários podem ver histórico" ON cronograma_obra_historico;
CREATE POLICY "Usuários podem ver histórico"
  ON cronograma_obra_historico FOR SELECT
  USING (EXISTS (SELECT 1 FROM cronograma_obras c JOIN obras o ON o.id = c.obra_id WHERE c.id = cronograma_obra_historico.cronograma_id));

-- =====================================================
-- 10. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE cronograma_obras IS 'Cronogramas de obras (baseado em Cronograma Prime R01)';
COMMENT ON TABLE cronograma_obra_atividades IS 'Atividades diárias do cronograma';
COMMENT ON TABLE cronograma_obra_materiais IS 'Controle de materiais e custos';
COMMENT ON TABLE cronograma_obra_templates IS 'Templates reutilizáveis';
COMMENT ON TABLE cronograma_obra_notificacoes IS 'Sistema de notificações';
COMMENT ON TABLE cronograma_obra_historico IS 'Auditoria completa';

-- =====================================================
-- FIM
-- =====================================================
