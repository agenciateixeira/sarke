-- =============================================
-- SARKE - FRESH START (Limpa e recria tudo)
-- =============================================
-- ATENÇÃO: Este script apaga TODAS as tabelas relacionadas
-- ao calendário e CRM e recria do zero
-- =============================================

-- PASSO 1: Dropar tudo que pode estar quebrado
-- =============================================

-- Dropar views primeiro
DROP VIEW IF EXISTS calendar_events_with_details CASCADE;
DROP VIEW IF EXISTS projects_with_client CASCADE;
DROP VIEW IF EXISTS pipeline_overview CASCADE;

-- Dropar tabelas do calendário (na ordem correta - dependências primeiro)
DROP TABLE IF EXISTS calendar_attachments CASCADE;
DROP TABLE IF EXISTS calendar_participants CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;

-- Dropar tabelas do CRM que podem ter problemas
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS pipeline_stages CASCADE;
DROP TABLE IF EXISTS architecture_projects CASCADE;

-- NÃO dropar clients se já existir com dados
-- Apenas adicionar a coluna status se não existir
DO $$
BEGIN
    -- Se a tabela clients existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        -- Adicionar coluna status se não existir
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'clients'
            AND column_name = 'status'
        ) THEN
            ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active';

            -- Adicionar constraint depois
            ALTER TABLE clients ADD CONSTRAINT clients_status_check
            CHECK (status IN ('active', 'inactive', 'prospect'));
        END IF;
    ELSE
        -- Criar tabela clients do zero
        CREATE TABLE clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            cpf_cnpj TEXT,
            type TEXT CHECK (type IN ('pessoa_fisica', 'pessoa_juridica')),

            address_street TEXT,
            address_number TEXT,
            address_complement TEXT,
            address_neighborhood TEXT,
            address_city TEXT,
            address_state TEXT,
            address_zip TEXT,

            notes TEXT,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),

            created_by UUID REFERENCES profiles(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- PASSO 2: Criar tabelas do CRM
-- =============================================

CREATE TABLE architecture_projects (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('call', 'meeting', 'email', 'note', 'task', 'deadline')),
    title TEXT NOT NULL,
    description TEXT,

    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES architecture_projects(id) ON DELETE CASCADE,

    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),

    assigned_to UUID REFERENCES profiles(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 3: Criar tabelas do Calendário
-- =============================================

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,
    description TEXT,

    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,

    event_type TEXT NOT NULL CHECK (event_type IN (
        'meeting', 'task', 'reminder', 'project_milestone', 'client_appointment'
    )),

    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES architecture_projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES activities(id) ON DELETE CASCADE,

    meet_link TEXT,
    meet_id TEXT,

    organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    participants UUID[] DEFAULT '{}',

    location TEXT,
    color TEXT DEFAULT '#ff2697',

    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'completed', 'cancelled', 'in_progress'
    )),

    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,

    reminder_minutes INTEGER[] DEFAULT '{15, 60}',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE calendar_participants (
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

CREATE TABLE calendar_attachments (
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

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer ON calendar_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);

-- PASSO 5: Criar Funções Auxiliares
-- =============================================

-- Função is_admin (necessária para as policies)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
    ON clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar clientes" ON clients;
CREATE POLICY "Usuários autenticados podem criar clientes"
    ON clients FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar clientes" ON clients;
CREATE POLICY "Usuários podem atualizar clientes"
    ON clients FOR UPDATE TO authenticated USING (true);

-- Policies para calendar_events
DROP POLICY IF EXISTS "Users can view their events" ON calendar_events;
CREATE POLICY "Users can view their events"
    ON calendar_events FOR SELECT
    USING (organizer_id = auth.uid() OR auth.uid() = ANY(participants));

DROP POLICY IF EXISTS "Users can create events" ON calendar_events;
CREATE POLICY "Users can create events"
    ON calendar_events FOR INSERT
    WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their events" ON calendar_events;
CREATE POLICY "Users can update their events"
    ON calendar_events FOR UPDATE
    USING (organizer_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their events" ON calendar_events;
CREATE POLICY "Users can delete their events"
    ON calendar_events FOR DELETE
    USING (organizer_id = auth.uid());

-- PASSO 8: Criar View
-- =============================================

CREATE VIEW calendar_events_with_details AS
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
-- Verificação Final
-- =============================================

SELECT 'Setup completo! ✅' as message;

SELECT
    'Tabela criada: ' || table_name as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('clients', 'calendar_events', 'calendar_participants', 'calendar_attachments')
ORDER BY table_name;
