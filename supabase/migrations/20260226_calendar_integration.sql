-- =====================================================
-- INTEGRAÇÃO DE CALENDÁRIO (CalDAV - Hostgator)
-- =====================================================

-- 1. Criar tabelas
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'hostgator',
  server_url TEXT NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  calendar_url TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 15,
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  attendees TEXT[],
  obra_id UUID,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar foreign keys depois
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_integration_id_fkey'
  ) THEN
    ALTER TABLE calendar_events
    ADD CONSTRAINT calendar_events_integration_id_fkey
    FOREIGN KEY (integration_id)
    REFERENCES calendar_integrations(id)
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_obra_id_fkey'
  ) THEN
    ALTER TABLE calendar_events
    ADD CONSTRAINT calendar_events_obra_id_fkey
    FOREIGN KEY (obra_id)
    REFERENCES obras(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_external_event'
  ) THEN
    ALTER TABLE calendar_events
    ADD CONSTRAINT unique_external_event
    UNIQUE(integration_id, external_id);
  END IF;
END $$;

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_active ON calendar_integrations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_calendar_events_integration ON calendar_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_obra ON calendar_events(obra_id) WHERE obra_id IS NOT NULL;

-- 4. Habilitar RLS
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem suas próprias integrações
CREATE POLICY "Users can view their own calendar integrations"
  ON calendar_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar integrations"
  ON calendar_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar integrations"
  ON calendar_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar integrations"
  ON calendar_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Usuários veem eventos das suas integrações
CREATE POLICY "Users can view their calendar events"
  ON calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations ci
      WHERE ci.id = calendar_events.integration_id
      AND ci.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their calendar events"
  ON calendar_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations ci
      WHERE ci.id = calendar_events.integration_id
      AND ci.user_id = auth.uid()
    )
  );

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_integrations_updated_at
  BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

-- Comentários
COMMENT ON TABLE calendar_integrations IS 'Configurações de integração com calendários externos (CalDAV, Google, Outlook, etc)';
COMMENT ON TABLE calendar_events IS 'Eventos sincronizados dos calendários externos';
COMMENT ON COLUMN calendar_integrations.password_encrypted IS 'Senha criptografada para acesso CalDAV';
COMMENT ON COLUMN calendar_events.external_id IS 'ID único do evento no calendário externo (URL CalDAV)';
