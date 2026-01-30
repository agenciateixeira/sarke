-- =============================================
-- SARKE - CALENDAR SCHEMA (Professional)
-- Sistema de Calendário Corporativo Integrado
-- =============================================

-- Tabela principal de eventos do calendário
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,

  -- Data e hora
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,

  -- Tipo de evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'meeting',              -- Reunião
    'task',                 -- Tarefa
    'reminder',             -- Lembrete
    'project_milestone',    -- Marco de projeto
    'client_appointment'    -- Compromisso com cliente
  )),

  -- Integrações com outras tabelas
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES architecture_projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES activities(id) ON DELETE CASCADE,

  -- Google Meet (para futuro)
  meet_link TEXT,
  meet_id TEXT,

  -- Participantes e organização
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participants UUID[] DEFAULT '{}',  -- Array de UUIDs de profiles

  -- Localização e configurações
  location TEXT,
  color TEXT DEFAULT '#ff2697',

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',    -- Agendado
    'completed',    -- Concluído
    'cancelled',    -- Cancelado
    'in_progress'   -- Em andamento
  )),

  -- Recorrência (para futuro)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,  -- RRULE format (RFC 5545)
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,

  -- Notificações
  reminder_minutes INTEGER[] DEFAULT '{15, 60}',  -- Lembrar 15min e 1h antes

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Tabela de participantes (para relações many-to-many)
CREATE TABLE IF NOT EXISTS calendar_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status de participação
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Pendente
    'accepted',     -- Aceito
    'declined',     -- Recusado
    'tentative'     -- Talvez
  )),

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(event_id, profile_id)
);

-- Tabela de anexos de eventos
CREATE TABLE IF NOT EXISTS calendar_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,

  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer ON calendar_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

CREATE INDEX IF NOT EXISTS idx_calendar_participants_event ON calendar_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_profile ON calendar_participants(profile_id);

CREATE INDEX IF NOT EXISTS idx_calendar_attachments_event ON calendar_attachments(event_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

CREATE TRIGGER calendar_participants_updated_at
  BEFORE UPDATE ON calendar_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para calendar_events
DROP POLICY IF EXISTS "Users can view events they organize or participate in" ON calendar_events;
CREATE POLICY "Users can view events they organize or participate in"
  ON calendar_events FOR SELECT
  USING (
    organizer_id = auth.uid()
    OR auth.uid() = ANY(participants)
    OR EXISTS (
      SELECT 1 FROM calendar_participants
      WHERE event_id = calendar_events.id
      AND profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create events" ON calendar_events;
CREATE POLICY "Users can create events"
  ON calendar_events FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own events" ON calendar_events;
CREATE POLICY "Users can update their own events"
  ON calendar_events FOR UPDATE
  USING (organizer_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own events" ON calendar_events;
CREATE POLICY "Users can delete their own events"
  ON calendar_events FOR DELETE
  USING (organizer_id = auth.uid());

-- Políticas para calendar_participants
DROP POLICY IF EXISTS "Users can view participants of their events" ON calendar_participants;
CREATE POLICY "Users can view participants of their events"
  ON calendar_participants FOR SELECT
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM calendar_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event organizers can manage participants" ON calendar_participants;
CREATE POLICY "Event organizers can manage participants"
  ON calendar_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- Políticas para calendar_attachments
DROP POLICY IF EXISTS "Users can view attachments of their events" ON calendar_attachments;
CREATE POLICY "Users can view attachments of their events"
  ON calendar_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE id = event_id
      AND (organizer_id = auth.uid() OR auth.uid() = ANY(participants))
    )
  );

DROP POLICY IF EXISTS "Event organizers can manage attachments" ON calendar_attachments;
CREATE POLICY "Event organizers can manage attachments"
  ON calendar_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- Views úteis
CREATE OR REPLACE VIEW calendar_events_with_details AS
SELECT
  ce.*,
  p.name as organizer_name,
  p.email as organizer_email,
  CASE
    WHEN c.id IS NOT NULL THEN c.name
    ELSE NULL
  END as client_name,
  CASE
    WHEN c.id IS NOT NULL THEN c.email
    ELSE NULL
  END as client_email,
  CASE
    WHEN proj.id IS NOT NULL THEN proj.name
    ELSE NULL
  END as project_name
FROM calendar_events ce
LEFT JOIN profiles p ON ce.organizer_id = p.id
LEFT JOIN clients c ON ce.client_id = c.id
LEFT JOIN architecture_projects proj ON ce.project_id = proj.id;

-- Comentários para documentação
COMMENT ON TABLE calendar_events IS 'Eventos do calendário corporativo integrado';
COMMENT ON TABLE calendar_participants IS 'Participantes dos eventos do calendário';
COMMENT ON TABLE calendar_attachments IS 'Anexos dos eventos do calendário';
COMMENT ON COLUMN calendar_events.meet_link IS 'Link do Google Meet (integração futura)';
COMMENT ON COLUMN calendar_events.recurrence_rule IS 'Regra de recorrência no formato RRULE (RFC 5545)';
