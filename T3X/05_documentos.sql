-- =============================================
-- SARKE - 05: Documentos de Deals
-- Tabelas de gestão de documentos e Storage
-- Execute APÓS 04_pipeline_extendido.sql
-- =============================================

-- =============================================
-- STORAGE: Buckets
-- =============================================

-- Bucket para documentos de deals (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para anexos de atividades (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'deals',
  'deals',
  false,
  52428800 -- 50MB
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES: bucket documents
-- =============================================

DROP POLICY IF EXISTS "Autenticados leem documentos" ON storage.objects;
CREATE POLICY "Autenticados leem documentos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Autenticados fazem upload de documentos" ON storage.objects;
CREATE POLICY "Autenticados fazem upload de documentos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Autenticados deletam documentos" ON storage.objects;
CREATE POLICY "Autenticados deletam documentos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

-- =============================================
-- STORAGE POLICIES: bucket deals (anexos)
-- =============================================

DROP POLICY IF EXISTS "Autenticados leem anexos de deals" ON storage.objects;
CREATE POLICY "Autenticados leem anexos de deals"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deals');

DROP POLICY IF EXISTS "Autenticados fazem upload de anexos de deals" ON storage.objects;
CREATE POLICY "Autenticados fazem upload de anexos de deals"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deals');

DROP POLICY IF EXISTS "Autenticados deletam anexos de deals" ON storage.objects;
CREATE POLICY "Autenticados deletam anexos de deals"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deals');

-- =============================================
-- TABELA: deal_documents
-- Documentos vinculados a deals
-- =============================================

CREATE TABLE IF NOT EXISTS public.deal_documents (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             UUID        NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  category            TEXT        NOT NULL
    CHECK (category IN (
      'proposta','contrato','planta','orcamento','planilha',
      'rrt_art','imagem','email','outro'
    )),
  file_name           TEXT        NOT NULL,
  file_path           TEXT        NOT NULL,
  file_size           INTEGER     NOT NULL,
  file_type           TEXT        NOT NULL,
  version             INTEGER     NOT NULL DEFAULT 1,
  is_current          BOOLEAN     NOT NULL DEFAULT true,
  parent_document_id  UUID        REFERENCES public.deal_documents(id) ON DELETE SET NULL,
  description         TEXT,
  tags                TEXT[],
  status              TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','rejected')),
  requires_approval   BOOLEAN     DEFAULT false,
  is_shared           BOOLEAN     DEFAULT false,
  shared_with_client  BOOLEAN     DEFAULT false,
  uploaded_by         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_documents_deal    ON public.deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_category ON public.deal_documents(category);
CREATE INDEX IF NOT EXISTS idx_deal_documents_current ON public.deal_documents(deal_id, is_current);

ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados veem documentos de deals" ON public.deal_documents;
DROP POLICY IF EXISTS "Autenticados criam documentos de deals" ON public.deal_documents;
DROP POLICY IF EXISTS "Uploader ou admin atualiza documento" ON public.deal_documents;
DROP POLICY IF EXISTS "Uploader ou admin deleta documento" ON public.deal_documents;

CREATE POLICY "Autenticados veem documentos de deals"
  ON public.deal_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam documentos de deals"
  ON public.deal_documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR is_admin());

CREATE POLICY "Uploader ou admin atualiza documento"
  ON public.deal_documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin());

CREATE POLICY "Uploader ou admin deleta documento"
  ON public.deal_documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin());

DROP TRIGGER IF EXISTS trg_deal_documents_updated_at ON public.deal_documents;
CREATE TRIGGER trg_deal_documents_updated_at
  BEFORE UPDATE ON public.deal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- TABELA: document_versions
-- Histórico de versões de um documento
-- =============================================

CREATE TABLE IF NOT EXISTS public.document_versions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id          UUID        NOT NULL REFERENCES public.deal_documents(id) ON DELETE CASCADE,
  version              INTEGER     NOT NULL,
  file_path            TEXT        NOT NULL,
  file_size            INTEGER     NOT NULL,
  changes_description  TEXT,
  uploaded_by          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON public.document_versions(document_id);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados veem versões" ON public.document_versions;
DROP POLICY IF EXISTS "Autenticados criam versões" ON public.document_versions;

CREATE POLICY "Autenticados veem versões"
  ON public.document_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam versões"
  ON public.document_versions FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR is_admin());

-- =============================================
-- TABELA: document_shared_links
-- Links de compartilhamento de documentos
-- =============================================

CREATE TABLE IF NOT EXISTS public.document_shared_links (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID        NOT NULL REFERENCES public.deal_documents(id) ON DELETE CASCADE,
  token           TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  password_hash   TEXT,
  expires_at      TIMESTAMPTZ,
  max_downloads   INTEGER,
  download_count  INTEGER     DEFAULT 0,
  created_by      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shared_links_document ON public.document_shared_links(document_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_token    ON public.document_shared_links(token);

ALTER TABLE public.document_shared_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Criador ou admin vê links" ON public.document_shared_links;
DROP POLICY IF EXISTS "Autenticados criam links" ON public.document_shared_links;
DROP POLICY IF EXISTS "Criador ou admin deleta links" ON public.document_shared_links;

CREATE POLICY "Criador ou admin vê links"
  ON public.document_shared_links FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Autenticados criam links"
  ON public.document_shared_links FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Criador ou admin deleta links"
  ON public.document_shared_links FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_admin());

-- =============================================
-- TABELA: document_comments
-- Comentários em documentos
-- =============================================

CREATE TABLE IF NOT EXISTS public.document_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES public.deal_documents(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_comments_doc ON public.document_comments(document_id);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados veem comentários" ON public.document_comments;
DROP POLICY IF EXISTS "Autenticados criam comentários" ON public.document_comments;
DROP POLICY IF EXISTS "Autor ou admin atualiza comentário" ON public.document_comments;
DROP POLICY IF EXISTS "Autor ou admin deleta comentário" ON public.document_comments;

CREATE POLICY "Autenticados veem comentários"
  ON public.document_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam comentários"
  ON public.document_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Autor ou admin atualiza comentário"
  ON public.document_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Autor ou admin deleta comentário"
  ON public.document_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());

DROP TRIGGER IF EXISTS trg_document_comments_updated_at ON public.document_comments;
CREATE TRIGGER trg_document_comments_updated_at
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

SELECT 'documentos OK' AS status;
