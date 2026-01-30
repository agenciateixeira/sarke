-- =============================================
-- SARKE - SETUP COMPLETO DO BANCO DE DADOS
-- Execute este arquivo ÚNICO no Supabase SQL Editor
-- =============================================

-- PASSO 1: Garantir que a tabela clients existe e tem a coluna status
-- =============================================

-- Criar tabela clients se não existir
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  type TEXT CHECK (type IN ('pessoa_fisica', 'pessoa_juridica')),

  -- Endereço
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna status se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'clients'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect'));
    END IF;
END $$;

-- PASSO 2: Criar tabelas do CRM
-- =============================================

-- Tabela de projetos de arquitetura
CREATE TABLE IF NOT EXISTS architecture_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  project_type TEXT CHECK (project_type IN (
    'residencial', 'comercial', 'industrial', 'reforma',
    'paisagismo', 'interiores', 'urbanismo', 'outro'
  )),

  estimated_value DECIMAL(15, 2),
  final_value DECIMAL(15, 2),
  status TEXT DEFAULT 'prospeccao' CHECK (status IN (
    'prospeccao', 'orcamento', 'aprovado', 'em_andamento',
    'em_obra', 'concluido', 'cancelado', 'pausado'
  )),

  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,

  area_m2 DECIMAL(10, 2),
  location TEXT,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),

  architect_id UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de atividades (usada como tasks no calendário)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('call', 'meeting', 'email', 'note', 'task', 'deadline')),
  title TEXT NOT NULL,
  description TEXT,

  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES architecture_projects(id) ON DELETE CASCADE,

  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),

  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASSO 3: Criar tabelas do Calendário
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
  participants UUID[] DEFAULT '{}',

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
  recurrence_rule TEXT,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,

  -- Notificações
  reminder_minutes INTEGER[] DEFAULT '{15, 60}',

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Tabela de participantes
CREATE TABLE IF NOT EXISTS calendar_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'declined', 'tentative'
  )),

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

-- PASSO 4: Criar Índices
-- =============================================

-- Índices para clients
DROP INDEX IF EXISTS idx_clients_status;
CREATE INDEX idx_clients_status ON clients(status);

DROP INDEX IF EXISTS idx_clients_created_by;
CREATE INDEX idx_clients_created_by ON clients(created_by);

-- Índices para calendar_events
DROP INDEX IF EXISTS idx_calendar_events_start_time;
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);

DROP INDEX IF EXISTS idx_calendar_events_end_time;
CREATE INDEX idx_calendar_events_end_time ON calendar_events(end_time);

DROP INDEX IF EXISTS idx_calendar_events_organizer;
CREATE INDEX idx_calendar_events_organizer ON calendar_events(organizer_id);

DROP INDEX IF EXISTS idx_calendar_events_type;
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);

DROP INDEX IF EXISTS idx_calendar_events_client;
CREATE INDEX idx_calendar_events_client ON calendar_events(client_id);

DROP INDEX IF EXISTS idx_calendar_events_project;
CREATE INDEX idx_calendar_events_project ON calendar_events(project_id);

DROP INDEX IF EXISTS idx_calendar_events_status;
CREATE INDEX idx_calendar_events_status ON calendar_events(status);

-- PASSO 5: Criar Triggers
-- =============================================

-- Função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para clients
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calendar_events
DROP TRIGGER IF EXISTS calendar_events_updated_at ON calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PASSO 6: Habilitar RLS
-- =============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_attachments ENABLE ROW LEVEL SECURITY;

-- PASSO 7: Criar Policies
-- =============================================

-- Policies para clients
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar clientes" ON clients;
CREATE POLICY "Usuários autenticados podem visualizar clientes"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar clientes" ON clients;
CREATE POLICY "Usuários autenticados podem criar clientes"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar clientes" ON clients;
CREATE POLICY "Usuários podem atualizar clientes"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

-- Policies para calendar_events
DROP POLICY IF EXISTS "Users can view events they organize or participate in" ON calendar_events;
CREATE POLICY "Users can view events they organize or participate in"
  ON calendar_events FOR SELECT
  USING (
    organizer_id = auth.uid()
    OR auth.uid() = ANY(participants)
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

-- PASSO 8: Criar View
-- =============================================

CREATE OR REPLACE VIEW calendar_events_with_details AS
SELECT
  ce.*,
  p.name as organizer_name,
  p.email as organizer_email,
  c.name as client_name,
  c.email as client_email,
  proj.name as project_name
FROM calendar_events ce
LEFT JOIN profiles p ON ce.organizer_id = p.id
LEFT JOIN clients c ON ce.client_id = c.id
LEFT JOIN architecture_projects proj ON ce.project_id = proj.id;

-- =============================================
-- FIM DO SETUP
-- =============================================

-- Verificar se tudo foi criado
SELECT 'Setup completo! Tabelas criadas:' as message;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'architecture_projects', 'activities', 'calendar_events', 'calendar_participants', 'calendar_attachments')
ORDER BY table_name;
