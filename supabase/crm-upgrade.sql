-- =============================================
-- SARKE - CRM UPGRADE (Estilo Salesforce)
-- Adiciona campos para jurídico e contratos
-- =============================================

-- PASSO 1: Adicionar novos campos na tabela clients
-- =============================================

ALTER TABLE clients
  -- Documentos
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT CHECK (estado_civil IN ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel')),
  ADD COLUMN IF NOT EXISTS profissao TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS representante_legal TEXT,

  -- Informações adicionais
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT;

-- PASSO 2: Criar tabela de contratos
-- =============================================

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,

  -- Informações do contrato
  contract_number TEXT,
  object TEXT NOT NULL, -- Execução de Projeto, ADM de Obra, etc
  description TEXT NOT NULL, -- Descrição detalhada do que será feito

  -- Valores e prazos
  contract_value DECIMAL(15, 2) NOT NULL,
  start_date DATE,
  end_date DATE,
  deadline_months INTEGER, -- Prazo em meses

  -- Pagamento
  payment_method TEXT CHECK (payment_method IN ('boleto', 'transferencia', 'pix', 'cartao', 'cheque', 'dinheiro')),
  installments INTEGER DEFAULT 1,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',        -- Rascunho
    'pending',      -- Pendente aprovação
    'approved',     -- Aprovado
    'active',       -- Ativo/Em andamento
    'completed',    -- Concluído
    'cancelled',    -- Cancelado
    'suspended'     -- Suspenso
  )),

  -- Anexos e observações
  contract_file_url TEXT,
  notes TEXT,

  -- Metadados
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 3: Criar tabela de parcelas/vencimentos
-- =============================================

CREATE TABLE IF NOT EXISTS contract_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,

  -- Informações da parcela
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,

  -- Status de pagamento
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',   -- Pendente
    'paid',      -- Pago
    'overdue',   -- Vencido
    'cancelled'  -- Cancelado
  )),

  payment_date DATE,
  payment_method TEXT,
  payment_proof_url TEXT,

  -- Metadados
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 4: Criar tabela de atividades/histórico do cliente
-- =============================================

CREATE TABLE IF NOT EXISTS client_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,

  -- Tipo de atividade
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'call',           -- Ligação
    'email',          -- E-mail
    'meeting',        -- Reunião
    'visit',          -- Visita
    'proposal',       -- Proposta enviada
    'contract',       -- Contrato
    'payment',        -- Pagamento
    'note',           -- Nota/Observação
    'task',           -- Tarefa
    'milestone'       -- Marco importante
  )),

  title TEXT NOT NULL,
  description TEXT,

  -- Relacionamentos
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,

  -- Agendamento
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),

  -- Metadados
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 5: Criar tabela de pipeline/funil de vendas
-- =============================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  color TEXT DEFAULT '#3b82f6',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(order_index)
);

-- Inserir estágios padrão do pipeline
INSERT INTO pipeline_stages (name, order_index, color) VALUES
  ('Lead', 1, '#94a3b8'),
  ('Qualificação', 2, '#3b82f6'),
  ('Proposta', 3, '#f59e0b'),
  ('Negociação', 4, '#8b5cf6'),
  ('Fechamento', 5, '#10b981'),
  ('Perdido', 6, '#ef4444')
ON CONFLICT (order_index) DO NOTHING;

-- Adicionar coluna pipeline_stage_id nos clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100);

-- PASSO 6: Criar índices para performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_installments_contract ON contract_installments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_installments_due_date ON contract_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_contract_installments_status ON contract_installments(status);
CREATE INDEX IF NOT EXISTS idx_client_activities_client ON client_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_type ON client_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_clients_pipeline_stage ON clients(pipeline_stage_id);

-- PASSO 7: Criar triggers para updated_at
-- =============================================

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_installments_updated_at ON contract_installments;
CREATE TRIGGER update_contract_installments_updated_at
  BEFORE UPDATE ON contract_installments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_activities_updated_at ON client_activities;
CREATE TRIGGER update_client_activities_updated_at
  BEFORE UPDATE ON client_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PASSO 8: Habilitar RLS
-- =============================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- PASSO 9: Criar Policies
-- =============================================

-- Policies para contracts
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar contratos" ON contracts;
CREATE POLICY "Usuários autenticados podem visualizar contratos"
  ON contracts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar contratos" ON contracts;
CREATE POLICY "Usuários autenticados podem criar contratos"
  ON contracts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar contratos" ON contracts;
CREATE POLICY "Usuários podem atualizar contratos"
  ON contracts FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários podem deletar contratos" ON contracts;
CREATE POLICY "Usuários podem deletar contratos"
  ON contracts FOR DELETE TO authenticated USING (true);

-- Policies para contract_installments
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar parcelas" ON contract_installments;
CREATE POLICY "Usuários autenticados podem visualizar parcelas"
  ON contract_installments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar parcelas" ON contract_installments;
CREATE POLICY "Usuários autenticados podem criar parcelas"
  ON contract_installments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar parcelas" ON contract_installments;
CREATE POLICY "Usuários podem atualizar parcelas"
  ON contract_installments FOR UPDATE TO authenticated USING (true);

-- Policies para client_activities
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar atividades" ON client_activities;
CREATE POLICY "Usuários autenticados podem visualizar atividades"
  ON client_activities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar atividades" ON client_activities;
CREATE POLICY "Usuários autenticados podem criar atividades"
  ON client_activities FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar atividades" ON client_activities;
CREATE POLICY "Usuários podem atualizar atividades"
  ON client_activities FOR UPDATE TO authenticated USING (true);

-- Policies para pipeline_stages
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar estágios" ON pipeline_stages;
CREATE POLICY "Usuários autenticados podem visualizar estágios"
  ON pipeline_stages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins podem gerenciar estágios" ON pipeline_stages;
CREATE POLICY "Admins podem gerenciar estágios"
  ON pipeline_stages FOR ALL TO authenticated USING (is_admin());

-- PASSO 10: Criar Views úteis
-- =============================================

CREATE OR REPLACE VIEW clients_with_pipeline AS
SELECT
  c.*,
  ps.name as pipeline_stage_name,
  ps.color as pipeline_stage_color,
  ps.order_index as pipeline_stage_order,
  COUNT(DISTINCT ct.id) as contracts_count,
  COUNT(DISTINCT ca.id) as activities_count,
  SUM(ct.contract_value) as total_contract_value
FROM clients c
LEFT JOIN pipeline_stages ps ON c.pipeline_stage_id = ps.id
LEFT JOIN contracts ct ON c.id = ct.client_id
LEFT JOIN client_activities ca ON c.id = ca.client_id
GROUP BY c.id, ps.id, ps.name, ps.color, ps.order_index;

CREATE OR REPLACE VIEW contracts_with_details AS
SELECT
  ct.*,
  cl.name as client_name,
  cl.email as client_email,
  cl.phone as client_phone,
  COUNT(ci.id) as installments_count,
  SUM(CASE WHEN ci.status = 'paid' THEN ci.amount ELSE 0 END) as paid_amount,
  SUM(CASE WHEN ci.status = 'pending' THEN ci.amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN ci.status = 'overdue' THEN ci.amount ELSE 0 END) as overdue_amount
FROM contracts ct
LEFT JOIN clients cl ON ct.client_id = cl.id
LEFT JOIN contract_installments ci ON ct.id = ci.contract_id
GROUP BY ct.id, cl.name, cl.email, cl.phone;

-- =============================================
-- FIM DO UPGRADE
-- =============================================

SELECT 'CRM Upgrade completo! ✅' as message;

SELECT
  'Tabelas criadas: ' || COUNT(*) as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('contracts', 'contract_installments', 'client_activities', 'pipeline_stages');
