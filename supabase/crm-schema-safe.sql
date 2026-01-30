-- Schema CRM para Sarke - Versão Segura
-- Este script pode ser executado múltiplas vezes sem erros

-- =============================================
-- TABELA: clients
-- =============================================
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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para clients
DROP INDEX IF EXISTS idx_clients_status;
CREATE INDEX idx_clients_status ON clients(status);

DROP INDEX IF EXISTS idx_clients_created_by;
CREATE INDEX idx_clients_created_by ON clients(created_by);

DROP INDEX IF EXISTS idx_clients_email;
CREATE INDEX idx_clients_email ON clients(email) WHERE email IS NOT NULL;

-- Trigger para updated_at em clients
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABELA: architecture_projects
-- =============================================
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

-- Índices para architecture_projects
DROP INDEX IF EXISTS idx_projects_status;
CREATE INDEX idx_projects_status ON architecture_projects(status);

DROP INDEX IF EXISTS idx_projects_client_id;
CREATE INDEX idx_projects_client_id ON architecture_projects(client_id);

DROP INDEX IF EXISTS idx_projects_architect_id;
CREATE INDEX idx_projects_architect_id ON architecture_projects(architect_id);

-- Trigger para updated_at em architecture_projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON architecture_projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON architecture_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABELA: pipeline_stages
-- =============================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir stages padrão apenas se não existirem
INSERT INTO pipeline_stages (name, description, order_index, color)
SELECT * FROM (VALUES
  ('Prospecção', 'Leads em fase inicial de contato', 1, '#9ca3af'),
  ('Qualificação', 'Leads qualificados com potencial', 2, '#3b82f6'),
  ('Proposta', 'Proposta comercial enviada', 3, '#8b5cf6'),
  ('Negociação', 'Em processo de negociação', 4, '#f59e0b'),
  ('Fechado (Ganho)', 'Negócio fechado com sucesso', 5, '#10b981'),
  ('Fechado (Perdido)', 'Negócio não concretizado', 6, '#ef4444')
) AS v(name, description, order_index, color)
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages);

-- =============================================
-- TABELA: deals
-- =============================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES architecture_projects(id) ON DELETE SET NULL,

  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  value DECIMAL(15, 2),
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),

  expected_close_date DATE,
  actual_close_date DATE,

  owner_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  lost_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para deals
DROP INDEX IF EXISTS idx_deals_status;
CREATE INDEX idx_deals_status ON deals(status);

DROP INDEX IF EXISTS idx_deals_stage_id;
CREATE INDEX idx_deals_stage_id ON deals(stage_id);

DROP INDEX IF EXISTS idx_deals_client_id;
CREATE INDEX idx_deals_client_id ON deals(client_id);

DROP INDEX IF EXISTS idx_deals_owner_id;
CREATE INDEX idx_deals_owner_id ON deals(owner_id);

-- Trigger para updated_at em deals
DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABELA: activities
-- =============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('call', 'meeting', 'email', 'note', 'task', 'deadline')),
  title TEXT NOT NULL,
  description TEXT,

  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES architecture_projects(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),

  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para activities
DROP INDEX IF EXISTS idx_activities_status;
CREATE INDEX idx_activities_status ON activities(status);

DROP INDEX IF EXISTS idx_activities_type;
CREATE INDEX idx_activities_type ON activities(type);

DROP INDEX IF EXISTS idx_activities_scheduled_at;
CREATE INDEX idx_activities_scheduled_at ON activities(scheduled_at);

DROP INDEX IF EXISTS idx_activities_assigned_to;
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to);

DROP INDEX IF EXISTS idx_activities_client_id;
CREATE INDEX idx_activities_client_id ON activities(client_id);

DROP INDEX IF EXISTS idx_activities_project_id;
CREATE INDEX idx_activities_project_id ON activities(project_id);

-- Trigger para updated_at em activities
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABELA: documents
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,

  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES architecture_projects(id) ON DELETE CASCADE,

  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para documents
DROP INDEX IF EXISTS idx_documents_client_id;
CREATE INDEX idx_documents_client_id ON documents(client_id);

DROP INDEX IF EXISTS idx_documents_project_id;
CREATE INDEX idx_documents_project_id ON documents(project_id);

DROP INDEX IF EXISTS idx_documents_uploaded_by;
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Apenas admins podem deletar clientes" ON clients;
CREATE POLICY "Apenas admins podem deletar clientes"
  ON clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies para architecture_projects (mesma lógica)
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar projetos" ON architecture_projects;
CREATE POLICY "Usuários autenticados podem visualizar projetos"
  ON architecture_projects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar projetos" ON architecture_projects;
CREATE POLICY "Usuários autenticados podem criar projetos"
  ON architecture_projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar projetos" ON architecture_projects;
CREATE POLICY "Usuários podem atualizar projetos"
  ON architecture_projects FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas admins podem deletar projetos" ON architecture_projects;
CREATE POLICY "Apenas admins podem deletar projetos"
  ON architecture_projects FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies para pipeline_stages (leitura para todos, escrita para admins)
DROP POLICY IF EXISTS "Todos podem visualizar stages" ON pipeline_stages;
CREATE POLICY "Todos podem visualizar stages"
  ON pipeline_stages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas admins podem modificar stages" ON pipeline_stages;
CREATE POLICY "Apenas admins podem modificar stages"
  ON pipeline_stages FOR ALL
  TO authenticated
  USING (is_admin());

-- Policies para deals
DROP POLICY IF EXISTS "Usuários podem visualizar deals" ON deals;
CREATE POLICY "Usuários podem visualizar deals"
  ON deals FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários podem criar deals" ON deals;
CREATE POLICY "Usuários podem criar deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar deals" ON deals;
CREATE POLICY "Usuários podem atualizar deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas admins podem deletar deals" ON deals;
CREATE POLICY "Apenas admins podem deletar deals"
  ON deals FOR DELETE
  TO authenticated
  USING (is_admin());

-- Policies para activities
DROP POLICY IF EXISTS "Usuários podem visualizar activities" ON activities;
CREATE POLICY "Usuários podem visualizar activities"
  ON activities FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários podem criar activities" ON activities;
CREATE POLICY "Usuários podem criar activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar suas activities" ON activities;
CREATE POLICY "Usuários podem atualizar suas activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Usuários podem deletar suas activities" ON activities;
CREATE POLICY "Usuários podem deletar suas activities"
  ON activities FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin());

-- Policies para documents
DROP POLICY IF EXISTS "Usuários podem visualizar documents" ON documents;
CREATE POLICY "Usuários podem visualizar documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários podem criar documents" ON documents;
CREATE POLICY "Usuários podem criar documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas o uploader ou admin podem deletar documents" ON documents;
CREATE POLICY "Apenas o uploader ou admin podem deletar documents"
  ON documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin());

-- =============================================
-- VIEWS ÚTEIS
-- =============================================

-- View de projetos com informações do cliente
CREATE OR REPLACE VIEW projects_with_client AS
SELECT
  p.*,
  c.name AS client_name,
  c.email AS client_email,
  c.phone AS client_phone,
  arch.name AS architect_name
FROM architecture_projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN profiles arch ON p.architect_id = arch.id;

-- View de pipeline overview
CREATE OR REPLACE VIEW pipeline_overview AS
SELECT
  ps.name AS stage_name,
  ps.order_index,
  ps.color,
  COUNT(d.id) AS deal_count,
  COALESCE(SUM(d.value), 0) AS total_value,
  COALESCE(AVG(d.probability), 0) AS avg_probability
FROM pipeline_stages ps
LEFT JOIN deals d ON ps.id = d.stage_id AND d.status = 'open'
GROUP BY ps.id, ps.name, ps.order_index, ps.color
ORDER BY ps.order_index;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON TABLE clients IS 'Clientes e prospects da empresa';
COMMENT ON TABLE architecture_projects IS 'Projetos de arquitetura';
COMMENT ON TABLE pipeline_stages IS 'Etapas do pipeline de vendas';
COMMENT ON TABLE deals IS 'Negociações comerciais';
COMMENT ON TABLE activities IS 'Atividades e tarefas relacionadas';
COMMENT ON TABLE documents IS 'Documentos anexados a clientes e projetos';
