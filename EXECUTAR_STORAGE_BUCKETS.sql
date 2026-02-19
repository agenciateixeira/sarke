-- =============================================
-- SARKE - CRIAR BUCKETS DE STORAGE
-- =============================================
-- Execute este script no Supabase Dashboard para criar
-- os buckets de armazenamento de arquivos
-- =============================================

-- =============================================
-- 1. BUCKET: AVATARS (Fotos de perfil - 5MB)
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Políticas RLS
CREATE POLICY IF NOT EXISTS "Avatares públicos para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "Usuários podem fazer upload de seus avatares"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS "Usuários podem atualizar seus avatares"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY IF NOT EXISTS "Usuários podem deletar seus avatares"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- 2. BUCKET: RDO-FOTOS (Fotos dos RDOs - 10MB)
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rdo-fotos',
  'rdo-fotos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Políticas RLS
CREATE POLICY IF NOT EXISTS "RDO fotos públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rdo-fotos');

CREATE POLICY IF NOT EXISTS "Usuários podem fazer upload de fotos de RDO"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rdo-fotos');

CREATE POLICY IF NOT EXISTS "Usuários podem deletar fotos de RDO"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'rdo-fotos');

-- =============================================
-- 3. BUCKET: OBRA-FOTOS (Fotos das obras - 10MB)
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obra-fotos',
  'obra-fotos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Políticas RLS
CREATE POLICY IF NOT EXISTS "Obra fotos públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'obra-fotos');

CREATE POLICY IF NOT EXISTS "Usuários podem fazer upload de fotos de obra"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'obra-fotos');

CREATE POLICY IF NOT EXISTS "Usuários podem deletar fotos de obra"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'obra-fotos');

-- =============================================
-- 4. BUCKET: OBRA-DOCUMENTOS (Documentos - 50MB)
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obra-documentos',
  'obra-documentos',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

-- Políticas RLS
CREATE POLICY IF NOT EXISTS "Documentos públicos para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'obra-documentos');

CREATE POLICY IF NOT EXISTS "Usuários podem fazer upload de documentos de obra"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'obra-documentos');

CREATE POLICY IF NOT EXISTS "Usuários podem deletar documentos de obra"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'obra-documentos');

-- =============================================
-- VERIFICAÇÃO
-- =============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM storage.buckets
  WHERE id IN ('avatars', 'rdo-fotos', 'obra-fotos', 'obra-documentos');

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ STORAGE BUCKETS CRIADOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Total de buckets: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ avatars (fotos de perfil - 5MB)';
  RAISE NOTICE '✅ rdo-fotos (fotos de RDO - 10MB)';
  RAISE NOTICE '✅ obra-fotos (fotos de obra - 10MB)';
  RAISE NOTICE '✅ obra-documentos (documentos - 50MB)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Políticas RLS configuradas';
  RAISE NOTICE '========================================';
END $$;
