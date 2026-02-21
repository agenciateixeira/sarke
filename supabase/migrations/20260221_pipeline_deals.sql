-- =============================================
-- SARKE - Pipeline de Vendas (Deals)
-- =============================================

-- PASSO 1: Adicionar campo description na tabela pipeline_stages
-- =============================================

ALTER TABLE pipeline_stages
  ADD COLUMN IF NOT EXISTS description TEXT;

-- PASSO 2: Criar tabela de deals (negócios)
-- =============================================

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,

  -- Relacionamentos
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE RESTRICT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Valores e probabilidade
  value DECIMAL(15, 2),
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),

  -- Datas
  expected_close_date DATE,
  actual_close_date DATE,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  lost_reason TEXT,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 3: Criar índices para performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date);

-- PASSO 4: Criar trigger para updated_at
-- =============================================

DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PASSO 5: Habilitar RLS
-- =============================================

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- PASSO 6: Criar Policies
-- =============================================

DROP POLICY IF EXISTS "Usuários autenticados podem visualizar deals" ON deals;
CREATE POLICY "Usuários autenticados podem visualizar deals"
  ON deals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar deals" ON deals;
CREATE POLICY "Usuários autenticados podem criar deals"
  ON deals FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários podem atualizar deals" ON deals;
CREATE POLICY "Usuários podem atualizar deals"
  ON deals FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários podem deletar deals" ON deals;
CREATE POLICY "Usuários podem deletar deals"
  ON deals FOR DELETE TO authenticated USING (true);

-- PASSO 7: Atualizar policies de pipeline_stages para permitir CRUD
-- =============================================

DROP POLICY IF EXISTS "Admins podem gerenciar estágios" ON pipeline_stages;
DROP POLICY IF EXISTS "Usuários podem gerenciar estágios" ON pipeline_stages;

CREATE POLICY "Usuários podem criar estágios"
  ON pipeline_stages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar estágios"
  ON pipeline_stages FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários podem deletar estágios"
  ON pipeline_stages FOR DELETE TO authenticated USING (true);

-- =============================================
-- FIM
-- =============================================

SELECT 'Pipeline e Deals configurados! ✅' as message;
