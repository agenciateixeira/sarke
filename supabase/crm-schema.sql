-- Schema CRM para Empresa de Arquitetura - Sarke
-- Execute APÓS o schema-fixed.sql

-- ========================================
-- CLIENTES
-- ========================================
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

  -- Informações adicionais
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),

  -- Controle
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_created_by ON clients(created_by);

-- RLS para clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable update for creators and admins"
  ON clients FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable delete for admins only"
  ON clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- ========================================
-- PROJETOS DE ARQUITETURA
-- ========================================
CREATE TABLE IF NOT EXISTS architecture_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Tipo de projeto
  project_type TEXT CHECK (project_type IN (
    'residencial',
    'comercial',
    'industrial',
    'reforma',
    'paisagismo',
    'interiores',
    'urbanismo',
    'outro'
  )),

  -- Valores
  estimated_value DECIMAL(15, 2),
  final_value DECIMAL(15, 2),

  -- Status do projeto
  status TEXT DEFAULT 'prospeccao' CHECK (status IN (
    'prospeccao',      -- Primeiro contato
    'orcamento',       -- Orçamento enviado
    'aprovado',        -- Projeto aprovado
    'em_andamento',    -- Em desenvolvimento
    'em_obra',         -- Em execução
    'concluido',       -- Finalizado
    'cancelado',       -- Cancelado
    'pausado'          -- Temporariamente pausado
  )),

  -- Datas importantes
  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,

  -- Área e localização
  area_m2 DECIMAL(10, 2),
  location TEXT,

  -- Prioridade
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),

  -- Responsável técnico
  architect_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Controle
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_arch_projects_status ON architecture_projects(status);
CREATE INDEX idx_arch_projects_client ON architecture_projects(client_id);
CREATE INDEX idx_arch_projects_architect ON architecture_projects(architect_id);

-- RLS para architecture_projects
ALTER TABLE architecture_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
  ON architecture_projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON architecture_projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable update for involved users"
  ON architecture_projects FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR architect_id = auth.uid() OR is_admin());

CREATE POLICY "Enable delete for admins only"
  ON architecture_projects FOR DELETE
  TO authenticated
  USING (is_admin());

-- ========================================
-- PIPELINE / FUNIL DE VENDAS
-- ========================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir estágios padrão do pipeline
INSERT INTO pipeline_stages (name, description, order_index, color) VALUES
  ('Prospecção', 'Primeiro contato com o cliente', 1, '#6B7280'),
  ('Qualificação', 'Entendimento das necessidades', 2, '#3B82F6'),
  ('Proposta', 'Elaboração e envio de proposta', 3, '#F59E0B'),
  ('Negociação', 'Ajustes e negociação de valores', 4, '#EF4444'),
  ('Fechado', 'Contrato assinado', 5, '#10B981')
ON CONFLICT DO NOTHING;

-- Deals (oportunidades)
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES architecture_projects(id) ON DELETE SET NULL,

  -- Pipeline
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,

  -- Valor
  value DECIMAL(15, 2),
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),

  -- Datas
  expected_close_date DATE,
  actual_close_date DATE,

  -- Responsável
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  lost_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_deals_client ON deals(client_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_owner ON deals(owner_id);

-- RLS para deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
  ON deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Enable update for owners and admins"
  ON deals FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Enable delete for admins only"
  ON deals FOR DELETE
  TO authenticated
  USING (is_admin());

-- ========================================
-- ATIVIDADES / HISTÓRICO
-- ========================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'call',
    'meeting',
    'email',
    'note',
    'task',
    'deadline'
  )),
  title TEXT NOT NULL,
  description TEXT,

  -- Relacionamentos
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES architecture_projects(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  -- Data e hora
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),

  -- Responsável
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_client ON activities(client_id);
CREATE INDEX idx_activities_project ON activities(project_id);
CREATE INDEX idx_activities_deal ON activities(deal_id);
CREATE INDEX idx_activities_assigned ON activities(assigned_to);
CREATE INDEX idx_activities_status ON activities(status);

-- RLS para activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
  ON activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable all for creators and assigned users"
  ON activities FOR ALL
  TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR is_admin());

-- ========================================
-- DOCUMENTOS
-- ========================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,

  -- Relacionamentos
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES architecture_projects(id) ON DELETE CASCADE,

  -- Controle
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_project ON documents(project_id);

-- RLS para documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR is_admin());

CREATE POLICY "Enable delete for uploaders and admins"
  ON documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin());

-- ========================================
-- TRIGGERS
-- ========================================

-- Atualizar updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_architecture_projects_updated_at
  BEFORE UPDATE ON architecture_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VIEWS ÚTEIS
-- ========================================

-- View de projetos com informações de cliente
CREATE OR REPLACE VIEW projects_with_clients AS
SELECT
  p.*,
  c.name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  prof.name as architect_name
FROM architecture_projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN profiles prof ON p.architect_id = prof.id;

-- View de pipeline com valores
CREATE OR REPLACE VIEW pipeline_overview AS
SELECT
  ps.name as stage_name,
  ps.order_index,
  ps.color,
  COUNT(d.id) as deal_count,
  COALESCE(SUM(d.value), 0) as total_value,
  ROUND(AVG(d.probability), 2) as avg_probability
FROM pipeline_stages ps
LEFT JOIN deals d ON ps.id = d.stage_id AND d.status = 'open'
GROUP BY ps.id, ps.name, ps.order_index, ps.color
ORDER BY ps.order_index;
