-- =====================================================
-- MIGRATION: Sistema de Notificações e Documentos
-- Data: 2026-02-22
-- Descrição: Sistema completo de notificações in-app,
--            documentos com versionamento e aprovações
-- =====================================================

-- =====================================================
-- VERIFICAÇÕES INICIAIS
-- =====================================================

-- Verificar se as tabelas necessárias existem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
    RAISE EXCEPTION 'Tabela "deals" não existe. Execute a migration de deals primeiro.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipeline_automation_logs') THEN
    RAISE EXCEPTION 'Tabela "pipeline_automation_logs" não existe. Execute a migration de automações primeiro.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'Tabela "profiles" não existe.';
  END IF;
END $$;

-- =====================================================
-- PARTE 1: SISTEMA DE NOTIFICAÇÕES
-- =====================================================

-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Tipo e conteúdo
  type TEXT NOT NULL, -- document_approval, deal_moved, automation_executed, etc
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Ação
  link TEXT, -- URL para ação (ex: /dashboard/comercial/pipeline)
  action_label TEXT, -- "Ver Deal", "Aprovar", etc

  -- Dados adicionais (JSON)
  data JSONB DEFAULT '{}'::jsonb,

  -- Relacionamentos (opcional)
  deal_id UUID, -- Removido FK temporariamente
  document_id UUID, -- Referência futura
  automation_log_id UUID, -- Removido FK temporariamente

  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Prioridade
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Notificações podem expirar
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
-- Índice deal_id será criado depois

-- Preferências de Notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Tipo de notificação
  notification_type TEXT NOT NULL,

  -- Configurações
  enabled BOOLEAN DEFAULT true,
  channel TEXT DEFAULT 'both', -- in_app, email, both, none

  -- Email digest
  email_digest BOOLEAN DEFAULT false,
  digest_frequency TEXT, -- daily, weekly
  digest_time TIME, -- Horário do digest

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, notification_type)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- =====================================================
-- PARTE 2: SISTEMA DE DOCUMENTOS
-- =====================================================

-- Categorias de Documentos (enum-like)
DO $$ BEGIN
  CREATE TYPE document_category AS ENUM (
    'proposta',
    'contrato',
    'planta',
    'orcamento',
    'planilha',
    'rrt_art',
    'imagem',
    'email',
    'outro'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status de Documentos
DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS deal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL, -- FK será adicionada depois

  -- Informações do arquivo
  category document_category DEFAULT 'outro',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Caminho no Supabase Storage
  file_size BIGINT NOT NULL, -- Tamanho em bytes
  file_type TEXT NOT NULL, -- pdf, docx, xlsx, jpg, etc

  -- Versionamento
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES deal_documents(id) ON DELETE SET NULL, -- Versão anterior

  -- Metadados
  description TEXT,
  tags TEXT[], -- Tags para busca

  -- Aprovação
  status document_status DEFAULT 'draft',
  requires_approval BOOLEAN DEFAULT false,

  -- Compartilhamento
  is_shared BOOLEAN DEFAULT false,
  shared_with_client BOOLEAN DEFAULT false,

  -- Auditoria
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
-- Índice deal_id será criado depois
CREATE INDEX IF NOT EXISTS idx_deal_documents_category ON deal_documents(category);
CREATE INDEX IF NOT EXISTS idx_deal_documents_status ON deal_documents(status);
CREATE INDEX IF NOT EXISTS idx_deal_documents_current ON deal_documents(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_deal_documents_uploaded_by ON deal_documents(uploaded_by);

-- Histórico de Versões
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES deal_documents(id) ON DELETE CASCADE,

  -- Informações da versão
  version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,

  -- Mudanças
  changes_description TEXT,

  -- Auditoria
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(document_id, version)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);

-- Status de Aprovação
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Aprovações de Documentos
CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES deal_documents(id) ON DELETE CASCADE,

  -- Aprovador
  approver_id UUID NOT NULL REFERENCES profiles(id),

  -- Status
  status approval_status DEFAULT 'pending',
  comment TEXT,

  -- Configurações
  required BOOLEAN DEFAULT true, -- Se for obrigatório para aprovação final
  order_index INTEGER DEFAULT 0, -- Para aprovações sequenciais

  -- Timestamps
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(document_id, approver_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver ON document_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_pending ON document_approvals(approver_id, status) WHERE status = 'pending';

-- Links Compartilhados
CREATE TABLE IF NOT EXISTS document_shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES deal_documents(id) ON DELETE CASCADE,

  -- Token único
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),

  -- Segurança
  password_hash TEXT, -- Senha opcional (bcrypt)

  -- Controles
  expires_at TIMESTAMP WITH TIME ZONE,
  max_downloads INTEGER, -- NULL = ilimitado
  download_count INTEGER DEFAULT 0,

  -- Auditoria
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_document_shared_links_document ON document_shared_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shared_links_token ON document_shared_links(token);

-- Histórico de Acessos aos Links
CREATE TABLE IF NOT EXISTS document_link_accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES document_shared_links(id) ON DELETE CASCADE,

  -- Informações do acesso
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Ação
  action TEXT, -- view, download
  success BOOLEAN DEFAULT true
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_document_link_accesses_link ON document_link_accesses(link_id);

-- =====================================================
-- PARTE 3: TRIGGERS E FUNCTIONS
-- =====================================================

-- Function: Criar notificação quando deal muda de etapa
CREATE OR REPLACE FUNCTION notify_deal_stage_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_from_name TEXT;
  v_stage_to_name TEXT;
BEGIN
  -- Buscar nomes das etapas
  SELECT name INTO v_stage_from_name FROM pipeline_stages WHERE id = OLD.stage_id;
  SELECT name INTO v_stage_to_name FROM pipeline_stages WHERE id = NEW.stage_id;

  -- Se mudou de etapa, criar notificação para o owner
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      action_label,
      deal_id,
      data,
      priority
    ) VALUES (
      NEW.owner_id,
      'deal_stage_changed',
      'Deal Movido',
      format('"%s" foi movido de "%s" para "%s"',
        NEW.title,
        COALESCE(v_stage_from_name, 'Sem etapa'),
        COALESCE(v_stage_to_name, 'Sem etapa')
      ),
      '/dashboard/comercial/pipeline',
      'Ver Pipeline',
      NEW.id,
      jsonb_build_object(
        'deal_id', NEW.id,
        'deal_title', NEW.title,
        'stage_from', COALESCE(v_stage_from_name, 'Sem etapa'),
        'stage_to', COALESCE(v_stage_to_name, 'Sem etapa')
      ),
      'normal'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Deal mudou de etapa
DROP TRIGGER IF EXISTS trigger_notify_deal_stage_changed ON deals;
CREATE TRIGGER trigger_notify_deal_stage_changed
  AFTER UPDATE ON deals
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  EXECUTE FUNCTION notify_deal_stage_changed();

-- Function: Criar notificação quando deal é atribuído
CREATE OR REPLACE FUNCTION notify_deal_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou de owner, notificar novo owner
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      action_label,
      deal_id,
      data,
      priority
    ) VALUES (
      NEW.owner_id,
      'deal_assigned',
      'Deal Atribuído',
      format('O deal "%s" foi atribuído a você', NEW.title),
      format('/dashboard/comercial/pipeline?deal=%s', NEW.id),
      'Ver Deal',
      NEW.id,
      jsonb_build_object(
        'deal_id', NEW.id,
        'deal_title', NEW.title,
        'deal_value', NEW.value
      ),
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Deal atribuído
DROP TRIGGER IF EXISTS trigger_notify_deal_assigned ON deals;
CREATE TRIGGER trigger_notify_deal_assigned
  AFTER UPDATE ON deals
  FOR EACH ROW
  WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
  EXECUTE FUNCTION notify_deal_assigned();

-- Function: Criar notificação quando automação é executada
CREATE OR REPLACE FUNCTION notify_automation_executed()
RETURNS TRIGGER AS $$
DECLARE
  v_deal_title TEXT;
  v_deal_owner_id UUID;
  v_rule_name TEXT;
BEGIN
  -- Buscar informações do deal
  SELECT title, owner_id INTO v_deal_title, v_deal_owner_id
  FROM deals
  WHERE id = NEW.deal_id;

  -- Buscar nome da regra
  SELECT name INTO v_rule_name
  FROM pipeline_automation_rules
  WHERE id = NEW.rule_id;

  -- Se deal tem owner e automação teve sucesso, criar notificação
  IF v_deal_owner_id IS NOT NULL AND NEW.status = 'success' THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      action_label,
      deal_id,
      automation_log_id,
      data,
      priority
    ) VALUES (
      v_deal_owner_id,
      'automation_executed',
      'Automação Executada',
      format('Automação "%s" foi executada no deal "%s"',
        COALESCE(v_rule_name, 'Desconhecida'),
        COALESCE(v_deal_title, 'Sem título')
      ),
      format('/dashboard/comercial/automacoes?log=%s', NEW.id),
      'Ver Detalhes',
      NEW.deal_id,
      NEW.id,
      jsonb_build_object(
        'rule_name', COALESCE(v_rule_name, 'Desconhecida'),
        'deal_title', COALESCE(v_deal_title, 'Sem título'),
        'action_type', NEW.action_result->>'action_type'
      ),
      'low'
    );
  END IF;

  -- Se automação falhou, notificar com prioridade alta
  IF v_deal_owner_id IS NOT NULL AND NEW.status = 'failed' THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      action_label,
      deal_id,
      automation_log_id,
      data,
      priority
    ) VALUES (
      v_deal_owner_id,
      'automation_failed',
      'Automação Falhou',
      format('Automação "%s" falhou no deal "%s"',
        COALESCE(v_rule_name, 'Desconhecida'),
        COALESCE(v_deal_title, 'Sem título')
      ),
      format('/dashboard/comercial/automacoes?log=%s', NEW.id),
      'Ver Erro',
      NEW.deal_id,
      NEW.id,
      jsonb_build_object(
        'rule_name', COALESCE(v_rule_name, 'Desconhecida'),
        'deal_title', COALESCE(v_deal_title, 'Sem título'),
        'error', NEW.error_message
      ),
      'urgent'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automação executada
DROP TRIGGER IF EXISTS trigger_notify_automation_executed ON pipeline_automation_logs;
CREATE TRIGGER trigger_notify_automation_executed
  AFTER INSERT ON pipeline_automation_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_automation_executed();

-- Function: Criar notificação quando documento precisa aprovação
CREATE OR REPLACE FUNCTION notify_document_approval_requested()
RETURNS TRIGGER AS $$
DECLARE
  v_document_name TEXT;
  v_document_deal_id UUID;
  v_deal_title TEXT;
BEGIN
  -- Buscar informações do documento
  SELECT file_name, deal_id INTO v_document_name, v_document_deal_id
  FROM deal_documents
  WHERE id = NEW.document_id;

  -- Buscar título do deal
  SELECT title INTO v_deal_title
  FROM deals
  WHERE id = v_document_deal_id;

  -- Criar notificação para o aprovador
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    action_label,
    deal_id,
    document_id,
    data,
    priority
  ) VALUES (
    NEW.approver_id,
    'document_approval_requested',
    'Aprovação Pendente',
    format('Documento "%s" aguarda sua aprovação no deal "%s"',
      COALESCE(v_document_name, 'Sem nome'),
      COALESCE(v_deal_title, 'Sem título')
    ),
    format('/dashboard/comercial/pipeline?deal=%s&tab=documents', v_document_deal_id),
    'Aprovar',
    v_document_deal_id,
    NEW.document_id,
    jsonb_build_object(
      'document_id', NEW.document_id,
      'document_name', COALESCE(v_document_name, 'Sem nome'),
      'deal_title', COALESCE(v_deal_title, 'Sem título')
    ),
    'high'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Solicitação de aprovação criada
DROP TRIGGER IF EXISTS trigger_notify_document_approval_requested ON document_approvals;
CREATE TRIGGER trigger_notify_document_approval_requested
  AFTER INSERT ON document_approvals
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_document_approval_requested();

-- Function: Criar notificação quando documento é aprovado/rejeitado
CREATE OR REPLACE FUNCTION notify_document_approval_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_document_name TEXT;
  v_document_deal_id UUID;
  v_document_uploaded_by UUID;
  v_deal_title TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Buscar informações do documento
  SELECT file_name, deal_id, uploaded_by
  INTO v_document_name, v_document_deal_id, v_document_uploaded_by
  FROM deal_documents
  WHERE id = NEW.document_id;

  -- Buscar título do deal
  SELECT title INTO v_deal_title
  FROM deals
  WHERE id = v_document_deal_id;

  -- Definir título e mensagem baseado no status
  IF NEW.status = 'approved' THEN
    v_title := 'Documento Aprovado';
    v_message := format('Documento "%s" foi aprovado', COALESCE(v_document_name, 'Sem nome'));
  ELSE
    v_title := 'Documento Rejeitado';
    v_message := format('Documento "%s" foi rejeitado', COALESCE(v_document_name, 'Sem nome'));
  END IF;

  -- Notificar quem fez upload do documento
  IF v_document_uploaded_by IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      action_label,
      deal_id,
      document_id,
      data,
      priority
    ) VALUES (
      v_document_uploaded_by,
      'document_approval_' || NEW.status::TEXT,
      v_title,
      v_message,
      format('/dashboard/comercial/pipeline?deal=%s&tab=documents', v_document_deal_id),
      'Ver Documento',
      v_document_deal_id,
      NEW.document_id,
      jsonb_build_object(
        'document_id', NEW.document_id,
        'document_name', COALESCE(v_document_name, 'Sem nome'),
        'approver_comment', NEW.comment
      ),
      CASE WHEN NEW.status = 'approved' THEN 'normal' ELSE 'high' END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Aprovação completada
DROP TRIGGER IF EXISTS trigger_notify_document_approval_completed ON document_approvals;
CREATE TRIGGER trigger_notify_document_approval_completed
  AFTER UPDATE ON document_approvals
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION notify_document_approval_completed();

-- Function: Auto-expirar notificações antigas
CREATE OR REPLACE FUNCTION auto_expire_notifications()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND read = false;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 4: FOREIGN KEYS
-- =====================================================
-- Adicionar foreign keys após todas as tabelas serem criadas

-- FK para notifications.deal_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_deal_id_fkey'
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications
    ADD CONSTRAINT notifications_deal_id_fkey
    FOREIGN KEY (deal_id)
    REFERENCES deals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- FK para notifications.automation_log_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_automation_log_id_fkey'
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications
    ADD CONSTRAINT notifications_automation_log_id_fkey
    FOREIGN KEY (automation_log_id)
    REFERENCES pipeline_automation_logs(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- FK para deal_documents.deal_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'deal_documents_deal_id_fkey'
    AND table_name = 'deal_documents'
  ) THEN
    ALTER TABLE deal_documents
    ADD CONSTRAINT deal_documents_deal_id_fkey
    FOREIGN KEY (deal_id)
    REFERENCES deals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Índices que dependem das FKs
CREATE INDEX IF NOT EXISTS idx_notifications_deal_id ON notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON deal_documents(deal_id);

-- =====================================================
-- PARTE 5: RLS (Row Level Security)
-- =====================================================

-- Notificações: usuário vê apenas suas notificações
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = notifications.user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = notifications.user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Preferências de Notificação
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = notification_preferences.user_id);

-- Documentos
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view documents from accessible deals" ON deal_documents;
CREATE POLICY "Users can view documents from accessible deals"
  ON deal_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_documents.deal_id
    )
  );

DROP POLICY IF EXISTS "Users can insert documents" ON deal_documents;
CREATE POLICY "Users can insert documents"
  ON deal_documents FOR INSERT
  WITH CHECK (auth.uid() = deal_documents.uploaded_by);

DROP POLICY IF EXISTS "Users can update their documents" ON deal_documents;
CREATE POLICY "Users can update their documents"
  ON deal_documents FOR UPDATE
  USING (auth.uid() = deal_documents.uploaded_by);

DROP POLICY IF EXISTS "Users can delete their documents" ON deal_documents;
CREATE POLICY "Users can delete their documents"
  ON deal_documents FOR DELETE
  USING (auth.uid() = deal_documents.uploaded_by);

-- Versões de Documentos
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view document versions" ON document_versions;
CREATE POLICY "Users can view document versions"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_documents dd
      JOIN deals d ON d.id = dd.deal_id
      WHERE dd.id = document_versions.document_id
    )
  );

DROP POLICY IF EXISTS "Users can insert versions" ON document_versions;
CREATE POLICY "Users can insert versions"
  ON document_versions FOR INSERT
  WITH CHECK (auth.uid() = document_versions.uploaded_by);

-- Aprovações
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approvals" ON document_approvals;
CREATE POLICY "Users can view approvals"
  ON document_approvals FOR SELECT
  USING (
    auth.uid() = document_approvals.approver_id OR
    EXISTS (
      SELECT 1 FROM deal_documents dd
      WHERE dd.id = document_approvals.document_id
        AND dd.uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Approvers can update their approvals" ON document_approvals;
CREATE POLICY "Approvers can update their approvals"
  ON document_approvals FOR UPDATE
  USING (auth.uid() = document_approvals.approver_id);

DROP POLICY IF EXISTS "Users can create approvals" ON document_approvals;
CREATE POLICY "Users can create approvals"
  ON document_approvals FOR INSERT
  WITH CHECK (true);

-- Links Compartilhados
ALTER TABLE document_shared_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their shared links" ON document_shared_links;
CREATE POLICY "Users can manage their shared links"
  ON document_shared_links FOR ALL
  USING (
    auth.uid() = document_shared_links.created_by OR
    EXISTS (
      SELECT 1 FROM deal_documents dd
      WHERE dd.id = document_shared_links.document_id
        AND dd.uploaded_by = auth.uid()
    )
  );

-- Acessos aos Links (público para permitir acesso via token)
ALTER TABLE document_link_accesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log link accesses" ON document_link_accesses;
CREATE POLICY "Anyone can log link accesses"
  ON document_link_accesses FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their link accesses" ON document_link_accesses;
CREATE POLICY "Users can view their link accesses"
  ON document_link_accesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_shared_links dsl
      JOIN deal_documents dd ON dd.id = dsl.document_id
      WHERE dsl.id = document_link_accesses.link_id
        AND dd.uploaded_by = auth.uid()
    )
  );

-- =====================================================
-- PARTE 5: DADOS INICIAIS
-- =====================================================

-- Inserir preferências padrão para tipos de notificação comuns
-- (serão criadas automaticamente quando usuário ajustar suas preferências)

-- Comentário: Preferências são criadas sob demanda pelo usuário

-- =====================================================
-- MIGRATION COMPLETA
-- =====================================================

COMMENT ON TABLE notifications IS 'Sistema de notificações in-app com suporte a múltiplos tipos e prioridades';
COMMENT ON TABLE notification_preferences IS 'Preferências de notificação por usuário e tipo';
COMMENT ON TABLE deal_documents IS 'Documentos anexados aos deals com versionamento';
COMMENT ON TABLE document_versions IS 'Histórico de versões dos documentos';
COMMENT ON TABLE document_approvals IS 'Sistema de aprovação de documentos';
COMMENT ON TABLE document_shared_links IS 'Links compartilháveis para documentos';
COMMENT ON TABLE document_link_accesses IS 'Registro de acessos aos links compartilhados';
