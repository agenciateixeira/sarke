-- =============================================
-- SARKE - SISTEMA DE SOLICITAÇÕES DE ACESSO
-- Fora do horário de trabalho
-- =============================================

-- =============================================
-- 1. TABELA DE SOLICITAÇÕES DE ACESSO
-- =============================================

CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Usuário solicitante
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Motivo da solicitação
  reason TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'denied')
  ),

  -- Admin que respondeu
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  -- Validade do acesso (se aprovado)
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. TABELA DE NOTIFICAÇÕES
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Destinatário
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Tipo de notificação
  type TEXT NOT NULL CHECK (
    type IN ('access_request', 'access_approved', 'access_denied', 'mention', 'task_assigned', 'message')
  ),

  -- Título e descrição
  title TEXT NOT NULL,
  description TEXT,

  -- Referência (ID da solicitação, mensagem, etc)
  reference_type TEXT,
  reference_id UUID,

  -- Lida ou não
  read BOOLEAN DEFAULT false,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_access_requests_user ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_created ON access_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- 4. TRIGGER PARA UPDATED_AT
-- =============================================

DROP TRIGGER IF EXISTS update_access_requests_updated_at ON access_requests;
CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. FUNÇÃO PARA CRIAR NOTIFICAÇÃO AO SOLICITAR ACESSO
-- =============================================

CREATE OR REPLACE FUNCTION notify_admins_on_access_request()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
  v_user_name TEXT;
BEGIN
  -- Buscar nome do usuário que solicitou
  SELECT name INTO v_user_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Criar notificação para todos os admins
  FOR v_admin IN
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      description,
      reference_type,
      reference_id
    ) VALUES (
      v_admin.id,
      'access_request',
      'Solicitação de acesso fora do horário',
      v_user_name || ' está solicitando acesso ao sistema fora do horário de trabalho.',
      'access_request',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_admins_on_access_request_trigger ON access_requests;
CREATE TRIGGER notify_admins_on_access_request_trigger
  AFTER INSERT ON access_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admins_on_access_request();

-- =============================================
-- 6. FUNÇÃO PARA NOTIFICAR USUÁRIO APÓS DECISÃO
-- =============================================

CREATE OR REPLACE FUNCTION notify_user_on_decision()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_name TEXT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  -- Buscar nome do admin que decidiu
  SELECT name INTO v_admin_name
  FROM profiles
  WHERE id = NEW.reviewed_by;

  -- Definir título e descrição baseado na decisão
  IF NEW.status = 'approved' THEN
    v_title := 'Acesso aprovado!';
    v_description := 'Sua solicitação de acesso fora do horário foi aprovada por ' || v_admin_name || '.';
  ELSIF NEW.status = 'denied' THEN
    v_title := 'Acesso negado';
    v_description := 'Sua solicitação de acesso fora do horário foi negada por ' || v_admin_name || '.';
  ELSE
    RETURN NEW;
  END IF;

  -- Criar notificação para o usuário
  INSERT INTO notifications (
    user_id,
    type,
    title,
    description,
    reference_type,
    reference_id
  ) VALUES (
    NEW.user_id,
    'access_' || NEW.status,
    v_title,
    v_description,
    'access_request',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_user_on_decision_trigger ON access_requests;
CREATE TRIGGER notify_user_on_decision_trigger
  AFTER UPDATE ON access_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND (NEW.status = 'approved' OR NEW.status = 'denied'))
  EXECUTE FUNCTION notify_user_on_decision();

-- =============================================
-- 7. FUNÇÃO PARA APROVAR/NEGAR ACESSO
-- =============================================

CREATE OR REPLACE FUNCTION review_access_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_approved BOOLEAN,
  p_hours_valid INTEGER DEFAULT 24
)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_new_status TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id
    AND role IN ('admin', 'gerente')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não tem permissão para revisar solicitações'
    );
  END IF;

  -- Buscar solicitação
  SELECT * INTO v_request
  FROM access_requests
  WHERE id = p_request_id
  AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Solicitação não encontrada ou já foi revisada'
    );
  END IF;

  -- Definir status e validade
  IF p_approved THEN
    v_new_status := 'approved';
    v_expires_at := now() + (p_hours_valid || ' hours')::interval;
  ELSE
    v_new_status := 'denied';
    v_expires_at := NULL;
  END IF;

  -- Atualizar solicitação
  UPDATE access_requests
  SET
    status = v_new_status,
    reviewed_by = p_admin_id,
    reviewed_at = now(),
    expires_at = v_expires_at
  WHERE id = p_request_id;

  RETURN json_build_object(
    'success', true,
    'message', CASE
      WHEN p_approved THEN 'Acesso aprovado com sucesso'
      ELSE 'Acesso negado'
    END,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. FUNÇÃO PARA VERIFICAR SE USUÁRIO TEM ACESSO APROVADO
-- =============================================

CREATE OR REPLACE FUNCTION has_approved_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM access_requests
    WHERE user_id = p_user_id
    AND status = 'approved'
    AND expires_at > now()
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 9. RLS (ROW LEVEL SECURITY)
-- =============================================

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ACCESS_REQUESTS: Usuário vê próprias solicitações, admin vê todas
CREATE POLICY "access_requests_select_policy"
  ON access_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "access_requests_insert_policy"
  ON access_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "access_requests_update_policy"
  ON access_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gerente')
    )
  );

-- NOTIFICATIONS: Usuário vê apenas próprias notificações
CREATE POLICY "notifications_select_policy"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_policy"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_policy"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 10. HABILITAR REALTIME
-- =============================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE access_requests;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
