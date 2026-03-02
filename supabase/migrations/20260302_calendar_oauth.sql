-- =====================================================
-- CALENDAR OAUTH INTEGRATION
-- =====================================================

-- Adicionar campos OAuth à tabela de integrações
ALTER TABLE calendar_integrations
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provider_user_id TEXT,
ADD COLUMN IF NOT EXISTS provider_email TEXT;

-- Tornar password_encrypted opcional (para OAuth não precisa)
ALTER TABLE calendar_integrations
ALTER COLUMN password_encrypted DROP NOT NULL;

-- Adicionar índice para buscar por provider_user_id
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider_user ON calendar_integrations(provider_user_id);

-- Comentários
COMMENT ON COLUMN calendar_integrations.access_token IS 'OAuth access token para Google Calendar API';
COMMENT ON COLUMN calendar_integrations.refresh_token IS 'OAuth refresh token para renovar acesso';
COMMENT ON COLUMN calendar_integrations.token_expires_at IS 'Data de expiração do access token';
COMMENT ON COLUMN calendar_integrations.provider_user_id IS 'ID do usuário no provider (ex: Google user ID)';
COMMENT ON COLUMN calendar_integrations.provider_email IS 'Email da conta conectada no provider';
