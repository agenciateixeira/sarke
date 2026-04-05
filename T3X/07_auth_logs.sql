-- =====================================================
-- AUTH LOGS: Registro de eventos da autenticação Google
-- =====================================================

CREATE TABLE IF NOT EXISTS auth_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID,                          -- pode ser null antes do perfil ser encontrado
  user_email  TEXT,
  event       TEXT        NOT NULL,          -- ex: 'oauth_callback', 'token_saved', 'sync'
  status      TEXT        NOT NULL,          -- 'success' | 'error' | 'warning'
  message     TEXT,
  metadata    JSONB       DEFAULT '{}',      -- detalhes extras (stack, error code, etc.)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user    ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event   ON auth_logs(event);
CREATE INDEX IF NOT EXISTS idx_auth_logs_status  ON auth_logs(status);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at DESC);

-- Apenas admins consultam os logs
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view auth logs"
  ON auth_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role insere (usado pelos API routes server-side)
CREATE POLICY "Service role can insert auth logs"
  ON auth_logs FOR INSERT
  WITH CHECK (true);
