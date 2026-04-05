-- =============================================
-- SARKE - 04: Pipeline Extendido
-- Adiciona colunas extras à tabela deals e
-- corrige/complementa tabelas do módulo comercial
-- Execute APÓS o arquivo 02_comercial.sql
-- =============================================

-- =============================================
-- COLUNAS: Arquivamento em deals
-- =============================================

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS archived      BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL;

-- =============================================
-- COLUNAS: Qualificação do Lead em deals
-- =============================================

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lead_source        TEXT
    CHECK (lead_source IN (
      'website','indicacao','instagram','facebook','linkedin',
      'google_ads','facebook_ads','evento','cold_call',
      'email_marketing','parceria','retorno','outros'
    )),
  ADD COLUMN IF NOT EXISTS lead_source_detail TEXT,
  ADD COLUMN IF NOT EXISTS business_type      TEXT
    CHECK (business_type IN ('residencial','comercial','industrial','publico')),
  ADD COLUMN IF NOT EXISTS service_type       TEXT
    CHECK (service_type IN (
      'projeto_arquitetonico','projeto_arquitetonico_completo','projeto_interiores',
      'gestao_obra','consultoria','regularizacao','reformas','acompanhamento','outros'
    )),
  ADD COLUMN IF NOT EXISTS temperature        TEXT        DEFAULT 'morno'
    CHECK (temperature IN ('quente','morno','frio')),
  ADD COLUMN IF NOT EXISTS urgency            TEXT        DEFAULT 'media'
    CHECK (urgency IN ('alta','media','baixa'));

-- =============================================
-- COLUNAS: Follow-up e Relacionamento em deals
-- =============================================

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS last_contact_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMPTZ;

-- =============================================
-- COLUNAS: Organização e Notas em deals
-- =============================================

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS tags              TEXT[],
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS competitors       TEXT,
  ADD COLUMN IF NOT EXISTS decision_deadline DATE;

-- =============================================
-- ÍNDICES para as novas colunas de deals
-- =============================================

CREATE INDEX IF NOT EXISTS idx_deals_archived        ON public.deals(archived);
CREATE INDEX IF NOT EXISTS idx_deals_temperature     ON public.deals(temperature);
CREATE INDEX IF NOT EXISTS idx_deals_lead_source     ON public.deals(lead_source);
CREATE INDEX IF NOT EXISTS idx_deals_follow_up       ON public.deals(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_deals_archived_by     ON public.deals(archived_by);

-- =============================================
-- DEFAULT: garante que deals existentes
-- tenham archived = false (evita erro no filtro)
-- =============================================

UPDATE public.deals
SET archived = false
WHERE archived IS NULL;

-- =============================================
-- CORRIGE: FK de deal_activities.created_by
-- A coluna foi criada com FK para auth.users,
-- mas o hook faz join via profiles!created_by.
-- Altera a FK para apontar para profiles(id).
-- =============================================

ALTER TABLE public.deal_activities
  DROP CONSTRAINT IF EXISTS deal_activities_created_by_fkey;

ALTER TABLE public.deal_activities
  ADD CONSTRAINT deal_activities_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- =============================================
-- TABELA: deal_attachments
-- Anexos vinculados a deals e atividades
-- =============================================

CREATE TABLE IF NOT EXISTS public.deal_attachments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  activity_id   UUID        REFERENCES public.deal_activities(id) ON DELETE SET NULL,
  file_name     TEXT        NOT NULL,
  file_path     TEXT        NOT NULL,
  file_size     INTEGER     NOT NULL,
  file_type     TEXT        NOT NULL,
  uploaded_by   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_attachments_deal     ON public.deal_attachments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_attachments_activity ON public.deal_attachments(activity_id);

ALTER TABLE public.deal_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados veem anexos" ON public.deal_attachments;
DROP POLICY IF EXISTS "Autenticados criam anexos" ON public.deal_attachments;
DROP POLICY IF EXISTS "Uploader ou admin deleta anexo" ON public.deal_attachments;

CREATE POLICY "Autenticados veem anexos"
  ON public.deal_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam anexos"
  ON public.deal_attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR is_admin());

CREATE POLICY "Uploader ou admin deleta anexo"
  ON public.deal_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin());

-- =============================================
-- VIEW: deal_activity_stats
-- Estatísticas de atividades por deal
-- =============================================

CREATE OR REPLACE VIEW public.deal_activity_stats AS
SELECT
  deal_id,
  COUNT(*)                                                    AS total_activities,
  COUNT(*) FILTER (WHERE type = 'note')                       AS notes_count,
  COUNT(*) FILTER (WHERE type = 'call')                       AS calls_count,
  COUNT(*) FILTER (WHERE type = 'email')                      AS emails_count,
  COUNT(*) FILTER (WHERE type = 'meeting')                    AS meetings_count,
  COUNT(*) FILTER (WHERE type = 'task')                       AS tasks_count,
  COUNT(*) FILTER (WHERE type = 'task' AND completed_at IS NOT NULL) AS completed_tasks_count,
  COUNT(*) FILTER (WHERE type = 'task' AND completed_at IS NULL AND due_date < NOW()) AS overdue_tasks_count,
  MAX(created_at)                                             AS last_activity_at
FROM public.deal_activities
GROUP BY deal_id;

SELECT 'pipeline_extendido OK' AS status;
