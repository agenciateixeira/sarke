-- =====================================================
-- MIGRATION: Sistema de Comprovantes do Caixa de Obra
-- Data: 2026-02-06
-- Descrição: Upload de comprovantes, justificativas e notificações automáticas
-- =====================================================

-- =====================================================
-- ATUALIZAR TABELA: obra_caixa
-- Adicionar campos para controle de comprovantes
-- =====================================================

ALTER TABLE obra_caixa
ADD COLUMN IF NOT EXISTS is_marketplace BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prazo_comprovante DATE,
ADD COLUMN IF NOT EXISTS tem_comprovante BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS justificativa_sem_comprovante TEXT,
ADD COLUMN IF NOT EXISTS comprovante_aprovado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS comprovante_aprovado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS comprovante_aprovado_em TIMESTAMPTZ;

-- Comentários
COMMENT ON COLUMN obra_caixa.is_marketplace IS 'Se a compra foi feita em marketplace (Mercado Livre, etc)';
COMMENT ON COLUMN obra_caixa.prazo_comprovante IS 'Data limite para envio do comprovante (5 dias corridos para marketplace)';
COMMENT ON COLUMN obra_caixa.tem_comprovante IS 'Se o comprovante foi enviado';
COMMENT ON COLUMN obra_caixa.justificativa_sem_comprovante IS 'Justificativa caso não envie comprovante';
COMMENT ON COLUMN obra_caixa.comprovante_aprovado IS 'Se o comprovante foi aprovado pelo responsável';

-- =====================================================
-- TABELA: obra_caixa_comprovantes_pendentes
-- Controle de comprovantes pendentes e notificações
-- =====================================================

CREATE TABLE IF NOT EXISTS obra_caixa_comprovantes_pendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID NOT NULL REFERENCES obra_caixa(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) DEFAULT 'PENDENTE', -- PENDENTE, JUSTIFICADO, ENVIADO, APROVADO, VENCIDO
  dias_pendente INTEGER DEFAULT 0,
  esta_vencido BOOLEAN DEFAULT FALSE,

  -- Notificações
  ultima_notificacao_enviada TIMESTAMPTZ,
  total_notificacoes_enviadas INTEGER DEFAULT 0,

  -- Responsáveis notificados
  usuarios_notificados UUID[],
  admins_notificados UUID[],

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Garantir que não há duplicatas
  UNIQUE(caixa_id)
);

-- Índices
CREATE INDEX idx_comprovantes_pendentes_caixa ON obra_caixa_comprovantes_pendentes(caixa_id);
CREATE INDEX idx_comprovantes_pendentes_obra ON obra_caixa_comprovantes_pendentes(obra_id);
CREATE INDEX idx_comprovantes_pendentes_status ON obra_caixa_comprovantes_pendentes(status);
CREATE INDEX idx_comprovantes_pendentes_vencido ON obra_caixa_comprovantes_pendentes(esta_vencido);

-- Comentários
COMMENT ON TABLE obra_caixa_comprovantes_pendentes IS 'Controle de comprovantes pendentes para notificações';

-- =====================================================
-- TABELA: obra_caixa_notificacoes_log
-- Log de todas as notificações enviadas
-- =====================================================

CREATE TABLE IF NOT EXISTS obra_caixa_notificacoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID NOT NULL REFERENCES obra_caixa(id) ON DELETE CASCADE,
  pendencia_id UUID REFERENCES obra_caixa_comprovantes_pendentes(id) ON DELETE CASCADE,

  -- Dados da notificação
  tipo VARCHAR(50) NOT NULL, -- LEMBRETE_COMPROVANTE, PRAZO_VENCENDO, PRAZO_VENCIDO
  usuario_notificado UUID REFERENCES auth.users(id),
  mensagem TEXT,

  -- Status
  enviada BOOLEAN DEFAULT FALSE,
  erro TEXT,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notificacoes_log_caixa ON obra_caixa_notificacoes_log(caixa_id);
CREATE INDEX idx_notificacoes_log_usuario ON obra_caixa_notificacoes_log(usuario_notificado);
CREATE INDEX idx_notificacoes_log_tipo ON obra_caixa_notificacoes_log(tipo);

-- Comentários
COMMENT ON TABLE obra_caixa_notificacoes_log IS 'Log de todas as notificações enviadas sobre comprovantes';

-- =====================================================
-- FUNÇÃO: Calcular prazo de comprovante
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_prazo_comprovante()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for marketplace, prazo de 5 dias corridos
  IF NEW.is_marketplace = TRUE THEN
    NEW.prazo_comprovante := NEW.data + INTERVAL '5 days';
  ELSE
    -- Para compras normais, prazo de 2 dias corridos
    NEW.prazo_comprovante := NEW.data + INTERVAL '2 days';
  END IF;

  -- Se tem anexo, marcar como tendo comprovante
  IF NEW.anexo_url IS NOT NULL AND NEW.anexo_url != '' THEN
    NEW.tem_comprovante := TRUE;
  ELSE
    NEW.tem_comprovante := FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular prazo automaticamente
DROP TRIGGER IF EXISTS trigger_calcular_prazo_comprovante ON obra_caixa;
CREATE TRIGGER trigger_calcular_prazo_comprovante
  BEFORE INSERT OR UPDATE OF is_marketplace, data, anexo_url ON obra_caixa
  FOR EACH ROW
  EXECUTE FUNCTION calcular_prazo_comprovante();

COMMENT ON FUNCTION calcular_prazo_comprovante IS 'Calcula automaticamente o prazo para envio de comprovante';

-- =====================================================
-- FUNÇÃO: Criar pendência de comprovante
-- =====================================================

CREATE OR REPLACE FUNCTION criar_pendencia_comprovante()
RETURNS TRIGGER AS $$
BEGIN
  -- Só criar pendência se:
  -- 1. Não tem comprovante
  -- 2. Não tem justificativa
  -- 3. É uma despesa (valor negativo)
  IF NEW.tem_comprovante = FALSE
     AND (NEW.justificativa_sem_comprovante IS NULL OR NEW.justificativa_sem_comprovante = '')
     AND NEW.valor < 0 THEN

    -- Inserir ou atualizar pendência
    INSERT INTO obra_caixa_comprovantes_pendentes (
      caixa_id,
      obra_id,
      status,
      dias_pendente
    ) VALUES (
      NEW.id,
      NEW.obra_id,
      'PENDENTE',
      0
    )
    ON CONFLICT (caixa_id)
    DO UPDATE SET
      status = 'PENDENTE',
      updated_at = NOW();

  -- Se agora tem comprovante ou justificativa, marcar como resolvido
  ELSIF (NEW.tem_comprovante = TRUE OR
         (NEW.justificativa_sem_comprovante IS NOT NULL AND NEW.justificativa_sem_comprovante != '')) THEN

    UPDATE obra_caixa_comprovantes_pendentes
    SET
      status = CASE
        WHEN NEW.tem_comprovante = TRUE THEN 'ENVIADO'
        ELSE 'JUSTIFICADO'
      END,
      updated_at = NOW()
    WHERE caixa_id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar pendência
DROP TRIGGER IF EXISTS trigger_criar_pendencia_comprovante ON obra_caixa;
CREATE TRIGGER trigger_criar_pendencia_comprovante
  AFTER INSERT OR UPDATE OF tem_comprovante, justificativa_sem_comprovante, anexo_url ON obra_caixa
  FOR EACH ROW
  EXECUTE FUNCTION criar_pendencia_comprovante();

COMMENT ON FUNCTION criar_pendencia_comprovante IS 'Cria automaticamente registro de pendência quando não há comprovante';

-- =====================================================
-- FUNÇÃO: Atualizar dias pendentes e status de vencimento
-- Deve ser executada diariamente via cronjob
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_comprovantes_pendentes()
RETURNS TABLE(pendencias_atualizadas INTEGER, notificacoes_criadas INTEGER) AS $$
DECLARE
  v_pendencias_count INTEGER := 0;
  v_notificacoes_count INTEGER := 0;
  v_pendencia RECORD;
  v_caixa RECORD;
  v_usuario_id UUID;
  v_admin_ids UUID[];
BEGIN
  -- Percorrer todas as pendências ativas
  FOR v_pendencia IN
    SELECT p.*, c.prazo_comprovante, c.descricao, c.valor, c.created_by, c.obra_id
    FROM obra_caixa_comprovantes_pendentes p
    INNER JOIN obra_caixa c ON p.caixa_id = c.id
    WHERE p.status IN ('PENDENTE', 'VENCIDO')
  LOOP
    -- Calcular dias pendentes
    UPDATE obra_caixa_comprovantes_pendentes
    SET
      dias_pendente = EXTRACT(DAY FROM (NOW() - (SELECT data FROM obra_caixa WHERE id = v_pendencia.caixa_id))),
      esta_vencido = NOW()::DATE > v_pendencia.prazo_comprovante,
      status = CASE
        WHEN NOW()::DATE > v_pendencia.prazo_comprovante THEN 'VENCIDO'
        ELSE 'PENDENTE'
      END,
      updated_at = NOW()
    WHERE id = v_pendencia.id;

    v_pendencias_count := v_pendencias_count + 1;

    -- Verificar se deve enviar notificação
    -- Enviar se: nunca enviou OU última notificação foi há mais de 24h
    IF v_pendencia.ultima_notificacao_enviada IS NULL
       OR v_pendencia.ultima_notificacao_enviada < NOW() - INTERVAL '24 hours' THEN

      -- Buscar usuário responsável
      v_usuario_id := v_pendencia.created_by;

      -- Buscar administradores da obra
      -- TODO: Ajustar conforme estrutura de permissões
      SELECT ARRAY_AGG(DISTINCT id) INTO v_admin_ids
      FROM profiles
      WHERE role = 'admin' OR role = 'gestor';

      -- Criar notificação para o usuário responsável
      IF v_usuario_id IS NOT NULL THEN
        INSERT INTO obra_caixa_notificacoes_log (
          caixa_id,
          pendencia_id,
          tipo,
          usuario_notificado,
          mensagem
        ) VALUES (
          v_pendencia.caixa_id,
          v_pendencia.id,
          CASE
            WHEN v_pendencia.esta_vencido THEN 'PRAZO_VENCIDO'
            WHEN v_pendencia.prazo_comprovante - NOW()::DATE <= 1 THEN 'PRAZO_VENCENDO'
            ELSE 'LEMBRETE_COMPROVANTE'
          END,
          v_usuario_id,
          format('Pendente: comprovante da despesa "%s" no valor de %s. Prazo: %s',
                 v_pendencia.descricao,
                 v_pendencia.valor,
                 v_pendencia.prazo_comprovante)
        );

        v_notificacoes_count := v_notificacoes_count + 1;
      END IF;

      -- Criar notificações para administradores
      IF v_admin_ids IS NOT NULL THEN
        FOREACH v_usuario_id IN ARRAY v_admin_ids
        LOOP
          INSERT INTO obra_caixa_notificacoes_log (
            caixa_id,
            pendencia_id,
            tipo,
            usuario_notificado,
            mensagem
          ) VALUES (
            v_pendencia.caixa_id,
            v_pendencia.id,
            'LEMBRETE_COMPROVANTE',
            v_usuario_id,
            format('ADM: Comprovante pendente - "%s" (%s)',
                   v_pendencia.descricao,
                   v_pendencia.valor)
          );

          v_notificacoes_count := v_notificacoes_count + 1;
        END LOOP;
      END IF;

      -- Atualizar última notificação enviada
      UPDATE obra_caixa_comprovantes_pendentes
      SET
        ultima_notificacao_enviada = NOW(),
        total_notificacoes_enviadas = total_notificacoes_enviadas + 1,
        usuarios_notificados = ARRAY_APPEND(
          COALESCE(usuarios_notificados, ARRAY[]::UUID[]),
          v_usuario_id
        ),
        admins_notificados = COALESCE(v_admin_ids, ARRAY[]::UUID[])
      WHERE id = v_pendencia.id;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_pendencias_count, v_notificacoes_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION atualizar_comprovantes_pendentes IS 'Atualiza status de pendências e cria notificações diárias';

-- =====================================================
-- VIEW: Resumo de comprovantes pendentes por obra
-- =====================================================

CREATE OR REPLACE VIEW obra_comprovantes_pendentes_resumo AS
SELECT
  obra_id,
  COUNT(*) as total_pendentes,
  COUNT(*) FILTER (WHERE esta_vencido = TRUE) as total_vencidos,
  COUNT(*) FILTER (WHERE status = 'PENDENTE') as total_aguardando,
  COUNT(*) FILTER (WHERE status = 'JUSTIFICADO') as total_justificados,
  SUM(CASE WHEN esta_vencido THEN 1 ELSE 0 END) as alertas_criticos
FROM obra_caixa_comprovantes_pendentes
WHERE status IN ('PENDENTE', 'VENCIDO')
GROUP BY obra_id;

COMMENT ON VIEW obra_comprovantes_pendentes_resumo IS 'Resumo de comprovantes pendentes por obra';

-- =====================================================
-- VIEW: Listagem de comprovantes pendentes com detalhes
-- =====================================================

CREATE OR REPLACE VIEW obra_comprovantes_pendentes_detalhes AS
SELECT
  p.id as pendencia_id,
  p.caixa_id,
  p.obra_id,
  p.status,
  p.dias_pendente,
  p.esta_vencido,
  p.total_notificacoes_enviadas,
  p.ultima_notificacao_enviada,

  -- Dados do caixa
  c.data,
  c.descricao,
  c.empresa,
  c.valor,
  c.tipo_recibo,
  c.codigo_recibo,
  c.prazo_comprovante,
  c.is_marketplace,
  c.justificativa_sem_comprovante,
  c.created_by as usuario_responsavel_id,

  -- Dados da obra
  o.nome as obra_nome,

  -- Dados do usuário
  u.name as usuario_responsavel_nome,
  u.email as usuario_responsavel_email,

  -- Urgência (dias até vencer ou dias vencido)
  CASE
    WHEN p.esta_vencido THEN (NOW()::DATE - c.prazo_comprovante)
    ELSE (c.prazo_comprovante - NOW()::DATE)
  END as dias_urgencia

FROM obra_caixa_comprovantes_pendentes p
INNER JOIN obra_caixa c ON p.caixa_id = c.id
INNER JOIN obras o ON p.obra_id = o.id
LEFT JOIN profiles u ON c.created_by = u.id
WHERE p.status IN ('PENDENTE', 'VENCIDO')
ORDER BY p.esta_vencido DESC, c.prazo_comprovante ASC;

COMMENT ON VIEW obra_comprovantes_pendentes_detalhes IS 'Listagem detalhada de comprovantes pendentes';

-- =====================================================
-- STORAGE BUCKET: comprovantes-caixa
-- Para armazenar os arquivos de comprovantes
-- =====================================================

-- Criar bucket se não existir (executar via Supabase Dashboard ou API)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('comprovantes-caixa', 'comprovantes-caixa', false)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE obra_caixa_comprovantes_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_caixa_notificacoes_log ENABLE ROW LEVEL SECURITY;

-- Políticas para obra_caixa_comprovantes_pendentes
CREATE POLICY "Permitir leitura para usuários autenticados"
  ON obra_caixa_comprovantes_pendentes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados"
  ON obra_caixa_comprovantes_pendentes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados"
  ON obra_caixa_comprovantes_pendentes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para obra_caixa_notificacoes_log
CREATE POLICY "Permitir leitura de próprias notificações"
  ON obra_caixa_notificacoes_log FOR SELECT
  TO authenticated
  USING (usuario_notificado = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestor')
  ));

CREATE POLICY "Permitir inserção para sistema"
  ON obra_caixa_notificacoes_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON obra_caixa_comprovantes_pendentes TO service_role;
GRANT ALL ON obra_caixa_notificacoes_log TO service_role;
GRANT SELECT, INSERT, UPDATE ON obra_caixa_comprovantes_pendentes TO authenticated;
GRANT SELECT, INSERT ON obra_caixa_notificacoes_log TO authenticated;
GRANT SELECT ON obra_comprovantes_pendentes_resumo TO authenticated, service_role;
GRANT SELECT ON obra_comprovantes_pendentes_detalhes TO authenticated, service_role;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
