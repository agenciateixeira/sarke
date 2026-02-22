-- =====================================================
-- MIGRATION PARTE 1: Tabelas de Notificações e Documentos
-- Data: 2026-02-22
-- Descrição: Cria apenas as tabelas, sem FKs ou policies
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Categorias de Documentos
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

-- =====================================================
-- TABELAS
-- =====================================================

-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Tipo e conteúdo
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Ação
  link TEXT,
  action_label TEXT,

  -- Dados adicionais (JSON)
  data JSONB DEFAULT '{}'::jsonb,

  -- Relacionamentos (sem FK por enquanto)
  deal_id UUID,
  document_id UUID,
  automation_log_id UUID,

  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Prioridade
  priority TEXT DEFAULT 'normal',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Preferências de Notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Tipo de notificação
  notification_type TEXT NOT NULL,

  -- Configurações
  enabled BOOLEAN DEFAULT true,
  channel TEXT DEFAULT 'both',

  -- Email digest
  email_digest BOOLEAN DEFAULT false,
  digest_frequency TEXT,
  digest_time TIME,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, notification_type)
);

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS deal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL,

  -- Informações do arquivo
  category document_category DEFAULT 'outro',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,

  -- Versionamento
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  parent_document_id UUID,

  -- Metadados
  description TEXT,
  tags TEXT[],

  -- Aprovação
  status document_status DEFAULT 'draft',
  requires_approval BOOLEAN DEFAULT false,

  -- Compartilhamento
  is_shared BOOLEAN DEFAULT false,
  shared_with_client BOOLEAN DEFAULT false,

  -- Auditoria
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Histórico de Versões
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,

  -- Informações da versão
  version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,

  -- Mudanças
  changes_description TEXT,

  -- Auditoria
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(document_id, version)
);

-- Aprovações de Documentos
CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,

  -- Aprovador
  approver_id UUID NOT NULL,

  -- Status
  status approval_status DEFAULT 'pending',
  comment TEXT,

  -- Configurações
  required BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,

  -- Timestamps
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(document_id, approver_id)
);

-- Links Compartilhados
CREATE TABLE IF NOT EXISTS document_shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,

  -- Token único
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),

  -- Segurança
  password_hash TEXT,

  -- Controles
  expires_at TIMESTAMP WITH TIME ZONE,
  max_downloads INTEGER,
  download_count INTEGER DEFAULT 0,

  -- Auditoria
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Histórico de Acessos aos Links
CREATE TABLE IF NOT EXISTS document_link_accesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL,

  -- Informações do acesso
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Ação
  action TEXT,
  success BOOLEAN DEFAULT true
);

-- =====================================================
-- ÍNDICES BÁSICOS (sem deal_id)
-- =====================================================

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Notification Preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Deal Documents
CREATE INDEX IF NOT EXISTS idx_deal_documents_category ON deal_documents(category);
CREATE INDEX IF NOT EXISTS idx_deal_documents_status ON deal_documents(status);
CREATE INDEX IF NOT EXISTS idx_deal_documents_current ON deal_documents(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_deal_documents_uploaded_by ON deal_documents(uploaded_by);

-- Document Versions
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);

-- Document Approvals
CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver ON document_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_pending ON document_approvals(approver_id, status) WHERE status = 'pending';

-- Document Shared Links
CREATE INDEX IF NOT EXISTS idx_document_shared_links_document ON document_shared_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shared_links_token ON document_shared_links(token);

-- Document Link Accesses
CREATE INDEX IF NOT EXISTS idx_document_link_accesses_link ON document_link_accesses(link_id);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE notifications IS 'Sistema de notificações in-app';
COMMENT ON TABLE notification_preferences IS 'Preferências de notificação por usuário';
COMMENT ON TABLE deal_documents IS 'Documentos anexados aos deals';
COMMENT ON TABLE document_versions IS 'Histórico de versões dos documentos';
COMMENT ON TABLE document_approvals IS 'Sistema de aprovação de documentos';
COMMENT ON TABLE document_shared_links IS 'Links compartilháveis para documentos';
COMMENT ON TABLE document_link_accesses IS 'Registro de acessos aos links';

SELECT 'Parte 1: Tabelas criadas com sucesso! ✅' as message;
