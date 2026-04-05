-- =============================================
-- SARKE - 02: Módulo Comercial (CRM / Pipeline)
-- Execute APÓS o arquivo 01_auth_profiles.sql
-- =============================================

-- =============================================
-- TABELA: clients
-- =============================================

CREATE TABLE IF NOT EXISTS public.clients (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL,
  email                TEXT,
  phone                TEXT,
  cpf_cnpj             TEXT,
  type                 TEXT        CHECK (type IN ('pessoa_fisica', 'pessoa_juridica')),
  -- Endereço
  address_street       TEXT,
  address_number       TEXT,
  address_complement   TEXT,
  address_neighborhood TEXT,
  address_city         TEXT,
  address_state        TEXT,
  address_zip          TEXT,
  -- Informações adicionais
  notes                TEXT,
  status               TEXT        DEFAULT 'active'
                                   CHECK (status IN ('active', 'inactive', 'prospect')),
  -- Controle
  created_by           UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_status     ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados veem clientes"     ON public.clients;
DROP POLICY IF EXISTS "Autenticados criam clientes"          ON public.clients;
DROP POLICY IF EXISTS "Criador ou admin atualiza cliente"    ON public.clients;
DROP POLICY IF EXISTS "Apenas admin deleta cliente"          ON public.clients;

CREATE POLICY "Todos autenticados veem clientes"
  ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam clientes"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Criador ou admin atualiza cliente"
  ON public.clients FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Apenas admin deleta cliente"
  ON public.clients FOR DELETE TO authenticated
  USING (is_admin());

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- TABELA: pipeline_stages
-- =============================================

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  order_index INTEGER     NOT NULL,
  color       TEXT        DEFAULT '#3B82F6',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_stages_order ON public.pipeline_stages(order_index);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos veem estágios"         ON public.pipeline_stages;
DROP POLICY IF EXISTS "Admin gerencia estágios"     ON public.pipeline_stages;

CREATE POLICY "Todos veem estágios"
  ON public.pipeline_stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gerencia estágios"
  ON public.pipeline_stages FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Estágios padrão — alinhados com a esteira comercial da Sarke
INSERT INTO public.pipeline_stages (name, description, order_index, color) VALUES
  ('Reunião',      'Primeiro contato e triagem',                                    1, '#6B7280'),
  ('Diagnóstico',  'Visita técnica e levantamento de necessidades',                 2, '#3B82F6'),
  ('Negociação',   'Apresentação e ajuste de propostas',                            3, '#F59E0B'),
  ('Contrato',     'Fase final de fechamento',                                      4, '#10B981'),
  ('Pós-Venda',    'CSAT / CRM — relacionamento e satisfação após entrega',         5, '#8B5CF6')
ON CONFLICT DO NOTHING;

-- =============================================
-- TABELA: deals (negócios / oportunidades)
-- =============================================

CREATE TABLE IF NOT EXISTS public.deals (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                TEXT        NOT NULL,
  description          TEXT,
  -- Relacionamentos
  client_id            UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  stage_id             UUID        NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  owner_id             UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Valor
  value                DECIMAL(15,2),
  probability          INTEGER     DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  -- Datas
  expected_close_date  DATE,
  actual_close_date    DATE,
  -- Status
  status               TEXT        DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  lost_reason          TEXT,
  -- Timestamps
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_stage   ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_client  ON public.deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_status  ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_owner   ON public.deals(owner_id);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados veem deals"   ON public.deals;
DROP POLICY IF EXISTS "Autenticados criam deals"        ON public.deals;
DROP POLICY IF EXISTS "Dono ou admin atualiza deal"     ON public.deals;
DROP POLICY IF EXISTS "Apenas admin deleta deal"        ON public.deals;

CREATE POLICY "Todos autenticados veem deals"
  ON public.deals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam deals"
  ON public.deals FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Dono ou admin atualiza deal"
  ON public.deals FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Apenas admin deleta deal"
  ON public.deals FOR DELETE TO authenticated
  USING (is_admin());

DROP TRIGGER IF EXISTS trg_deals_updated_at ON public.deals;
CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- TABELA: deal_activities (histórico do deal)
-- =============================================

CREATE TABLE IF NOT EXISTS public.deal_activities (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          UUID        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL
                               CHECK (type IN ('note','call','email','meeting','task','status_change')),
  title            TEXT        NOT NULL,
  description      TEXT,
  created_by       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date         TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  duration_minutes INTEGER,
  metadata         JSONB       DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON public.deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_type ON public.deal_activities(type);

ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos autenticados veem atividades" ON public.deal_activities;
DROP POLICY IF EXISTS "Autenticados criam atividades"      ON public.deal_activities;
DROP POLICY IF EXISTS "Criador ou admin atualiza atividade" ON public.deal_activities;
DROP POLICY IF EXISTS "Admin deleta atividade"             ON public.deal_activities;

CREATE POLICY "Todos autenticados veem atividades"
  ON public.deal_activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam atividades"
  ON public.deal_activities FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Criador ou admin atualiza atividade"
  ON public.deal_activities FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Admin deleta atividade"
  ON public.deal_activities FOR DELETE TO authenticated
  USING (is_admin());

DROP TRIGGER IF EXISTS trg_deal_activities_updated_at ON public.deal_activities;
CREATE TRIGGER trg_deal_activities_updated_at
  BEFORE UPDATE ON public.deal_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- TABELA: notifications (básica para alertas)
-- =============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  message          TEXT        NOT NULL,
  link             TEXT,
  deal_id          UUID        REFERENCES public.deals(id) ON DELETE CASCADE,
  read             BOOLEAN     DEFAULT false,
  read_at          TIMESTAMPTZ,
  priority         TEXT        DEFAULT 'normal',
  data             JSONB       DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_deal    ON public.notifications(deal_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário vê próprias notificações"    ON public.notifications;
DROP POLICY IF EXISTS "Usuário marca notificação como lida" ON public.notifications;
DROP POLICY IF EXISTS "Sistema cria notificações"           ON public.notifications;

CREATE POLICY "Usuário vê próprias notificações"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário marca notificação como lida"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema cria notificações"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

SELECT 'comercial OK' AS status;
