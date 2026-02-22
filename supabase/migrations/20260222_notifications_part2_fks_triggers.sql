-- =====================================================
-- MIGRATION PARTE 2: FKs, Triggers e Policies
-- Data: 2026-02-22
-- Descrição: Adiciona FKs, triggers automáticos e RLS
-- =====================================================

-- =====================================================
-- PARTE 1: FOREIGN KEYS
-- =====================================================

-- FK: notifications -> profiles
DO $$ BEGIN
  ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: notifications -> deals
DO $$ BEGIN
  ALTER TABLE notifications
  ADD CONSTRAINT notifications_deal_id_fkey
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: notifications -> pipeline_automation_logs
DO $$ BEGIN
  ALTER TABLE notifications
  ADD CONSTRAINT notifications_automation_log_id_fkey
  FOREIGN KEY (automation_log_id) REFERENCES pipeline_automation_logs(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: notification_preferences -> profiles
DO $$ BEGIN
  ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: deal_documents -> deals
DO $$ BEGIN
  ALTER TABLE deal_documents
  ADD CONSTRAINT deal_documents_deal_id_fkey
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: deal_documents -> profiles (uploaded_by)
DO $$ BEGIN
  ALTER TABLE deal_documents
  ADD CONSTRAINT deal_documents_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: deal_documents -> deal_documents (parent)
DO $$ BEGIN
  ALTER TABLE deal_documents
  ADD CONSTRAINT deal_documents_parent_document_id_fkey
  FOREIGN KEY (parent_document_id) REFERENCES deal_documents(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: document_versions -> deal_documents
DO $$ BEGIN
  ALTER TABLE document_versions
  ADD CONSTRAINT document_versions_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES deal_documents(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: document_versions -> profiles (uploaded_by)
DO $$ BEGIN
  ALTER TABLE document_versions
  ADD CONSTRAINT document_versions_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: document_approvals -> deal_documents
DO $$ BEGIN
  ALTER TABLE document_approvals
  ADD CONSTRAINT document_approvals_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES deal_documents(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: document_approvals -> profiles (approver)
DO $$ BEGIN
  ALTER TABLE document_approvals
  ADD CONSTRAINT document_approvals_approver_id_fkey
  FOREIGN KEY (approver_id) REFERENCES profiles(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: document_shared_links -> deal_documents
DO $$ BEGIN
  ALTER TABLE document_shared_links
  ADD CONSTRAINT document_shared_links_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES deal_documents(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: document_shared_links -> profiles (created_by)
DO $$ BEGIN
  ALTER TABLE document_shared_links
  ADD CONSTRAINT document_shared_links_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- FK: document_link_accesses -> document_shared_links
DO $$ BEGIN
  ALTER TABLE document_link_accesses
  ADD CONSTRAINT document_link_accesses_link_id_fkey
  FOREIGN KEY (link_id) REFERENCES document_shared_links(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- PARTE 2: ÍNDICES ADICIONAIS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notifications_deal_id ON notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON deal_documents(deal_id);

-- =====================================================
-- PARTE 3: TRIGGERS E FUNCTIONS
-- =====================================================

-- Function: Notificar quando deal muda de etapa
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
      user_id, type, title, message, link, action_label,
      deal_id, data, priority
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

-- Function: Notificar quando deal é atribuído
CREATE OR REPLACE FUNCTION notify_deal_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou de owner, notificar novo owner
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, type, title, message, link, action_label,
      deal_id, data, priority
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

-- Function: Notificar quando automação é executada
CREATE OR REPLACE FUNCTION notify_automation_executed()
RETURNS TRIGGER AS $$
DECLARE
  v_deal_title TEXT;
  v_deal_owner_id UUID;
  v_rule_name TEXT;
BEGIN
  -- Buscar informações do deal
  SELECT title, owner_id INTO v_deal_title, v_deal_owner_id
  FROM deals WHERE id = NEW.deal_id;

  -- Buscar nome da regra
  SELECT name INTO v_rule_name
  FROM pipeline_automation_rules WHERE id = NEW.rule_id;

  -- Se deal tem owner e automação teve sucesso
  IF v_deal_owner_id IS NOT NULL AND NEW.status = 'success' THEN
    INSERT INTO notifications (
      user_id, type, title, message, link, action_label,
      deal_id, automation_log_id, data, priority
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
      NEW.deal_id, NEW.id,
      jsonb_build_object(
        'rule_name', COALESCE(v_rule_name, 'Desconhecida'),
        'deal_title', COALESCE(v_deal_title, 'Sem título'),
        'action_type', NEW.action_result->>'action_type'
      ),
      'low'
    );
  END IF;

  -- Se automação falhou
  IF v_deal_owner_id IS NOT NULL AND NEW.status = 'failed' THEN
    INSERT INTO notifications (
      user_id, type, title, message, link, action_label,
      deal_id, automation_log_id, data, priority
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
      NEW.deal_id, NEW.id,
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

-- Function: Notificar quando documento precisa aprovação
CREATE OR REPLACE FUNCTION notify_document_approval_requested()
RETURNS TRIGGER AS $$
DECLARE
  v_document_name TEXT;
  v_document_deal_id UUID;
  v_deal_title TEXT;
BEGIN
  -- Buscar informações do documento
  SELECT file_name, deal_id INTO v_document_name, v_document_deal_id
  FROM deal_documents WHERE id = NEW.document_id;

  -- Buscar título do deal
  SELECT title INTO v_deal_title FROM deals WHERE id = v_document_deal_id;

  -- Criar notificação para o aprovador
  INSERT INTO notifications (
    user_id, type, title, message, link, action_label,
    deal_id, document_id, data, priority
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
    v_document_deal_id, NEW.document_id,
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

-- Function: Notificar quando documento é aprovado/rejeitado
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
  FROM deal_documents WHERE id = NEW.document_id;

  -- Buscar título do deal
  SELECT title INTO v_deal_title FROM deals WHERE id = v_document_deal_id;

  -- Definir título e mensagem
  IF NEW.status = 'approved' THEN
    v_title := 'Documento Aprovado';
    v_message := format('Documento "%s" foi aprovado', COALESCE(v_document_name, 'Sem nome'));
  ELSE
    v_title := 'Documento Rejeitado';
    v_message := format('Documento "%s" foi rejeitado', COALESCE(v_document_name, 'Sem nome'));
  END IF;

  -- Notificar quem fez upload
  IF v_document_uploaded_by IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, type, title, message, link, action_label,
      deal_id, document_id, data, priority
    ) VALUES (
      v_document_uploaded_by,
      'document_approval_' || NEW.status::TEXT,
      v_title, v_message,
      format('/dashboard/comercial/pipeline?deal=%s&tab=documents', v_document_deal_id),
      'Ver Documento',
      v_document_deal_id, NEW.document_id,
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
-- PARTE 4: RLS (Row Level Security)
-- =====================================================

-- Notificações
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = notifications.user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = notifications.user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Preferências de Notificação
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = notification_preferences.user_id);

-- Documentos
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents from accessible deals"
  ON deal_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_documents.deal_id
    )
  );

CREATE POLICY "Users can insert documents"
  ON deal_documents FOR INSERT
  WITH CHECK (auth.uid() = deal_documents.uploaded_by);

CREATE POLICY "Users can update their documents"
  ON deal_documents FOR UPDATE
  USING (auth.uid() = deal_documents.uploaded_by);

CREATE POLICY "Users can delete their documents"
  ON deal_documents FOR DELETE
  USING (auth.uid() = deal_documents.uploaded_by);

-- Versões de Documentos
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document versions"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_documents dd
      JOIN deals d ON d.id = dd.deal_id
      WHERE dd.id = document_versions.document_id
    )
  );

CREATE POLICY "Users can insert versions"
  ON document_versions FOR INSERT
  WITH CHECK (auth.uid() = document_versions.uploaded_by);

-- Aprovações
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Approvers can update their approvals"
  ON document_approvals FOR UPDATE
  USING (auth.uid() = document_approvals.approver_id);

CREATE POLICY "Users can create approvals"
  ON document_approvals FOR INSERT
  WITH CHECK (true);

-- Links Compartilhados
ALTER TABLE document_shared_links ENABLE ROW LEVEL SECURITY;

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

-- Acessos aos Links
ALTER TABLE document_link_accesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log link accesses"
  ON document_link_accesses FOR INSERT
  WITH CHECK (true);

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
-- CONCLUÍDO
-- =====================================================

SELECT 'Parte 2: FKs, Triggers e RLS configurados com sucesso! 🎉' as message;
