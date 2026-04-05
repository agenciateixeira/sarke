-- =====================================================
-- CALENDÁRIO: Criar tabelas (sem FK para obras por enquanto)
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  server_url TEXT,
  username TEXT,
  password_encrypted TEXT,
  calendar_url TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 15,
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  provider_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  attendees TEXT[],
  obra_id UUID, -- FK para obras adicionada futuramente quando a tabela existir
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_external_event UNIQUE(integration_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_active ON calendar_integrations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider_user ON calendar_integrations(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_integration ON calendar_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_date, end_date);

ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar integrations"
  ON calendar_integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own calendar integrations"
  ON calendar_integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own calendar integrations"
  ON calendar_integrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own calendar integrations"
  ON calendar_integrations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their calendar events"
  ON calendar_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM calendar_integrations ci
    WHERE ci.id = calendar_events.integration_id AND ci.user_id = auth.uid()
  ));
CREATE POLICY "Users can manage their calendar events"
  ON calendar_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM calendar_integrations ci
    WHERE ci.id = calendar_events.integration_id AND ci.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_integrations_updated_at
  BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();

-- =====================================================
-- LEMBRETE FUTURO:
-- Quando a tabela obras for criada, adicionar a FK:
-- ALTER TABLE calendar_events
--   ADD CONSTRAINT fk_calendar_events_obra
--   FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL;
-- =====================================================
