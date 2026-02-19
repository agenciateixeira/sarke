-- =============================================
-- SARKE - CONFIGURAÇÃO DE STORAGE BUCKETS
-- =============================================
-- Este script cria todos os buckets necessários para o sistema
-- =============================================

-- =============================================
-- 1. BUCKET: AVATARS (Fotos de perfil dos usuários)
-- =============================================

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Público (imagens podem ser acessadas por URL)
  5242880, -- 5MB em bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Políticas RLS para avatars
DROP POLICY IF EXISTS "Avatares são publicamente acessíveis" ON storage.objects;
CREATE POLICY "Avatares são publicamente acessíveis"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuários podem fazer upload de seus avatares" ON storage.objects;
CREATE POLICY "Usuários podem fazer upload de seus avatares"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Usuários podem atualizar seus avatares" ON storage.objects;
CREATE POLICY "Usuários podem atualizar seus avatares"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Usuários podem deletar seus avatares" ON storage.objects;
CREATE POLICY "Usuários podem deletar seus avatares"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- 2. BUCKET: RDO-FOTOS (Fotos dos RDOs)
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rdo-fotos',
  'rdo-fotos',
  true,
  10485760, -- 10MB em bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Políticas RLS para rdo-fotos
DROP POLICY IF EXISTS "RDO fotos são publicamente acessíveis" ON storage.objects;
CREATE POLICY "RDO fotos são publicamente acessíveis"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rdo-fotos');

DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de fotos de RDO" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de fotos de RDO"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rdo-fotos');

DROP POLICY IF EXISTS "Usuários autenticados podem deletar fotos de RDO" ON storage.objects;
CREATE POLICY "Usuários autenticados podem deletar fotos de RDO"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'rdo-fotos');

-- =============================================
-- 3. BUCKET: OBRA-FOTOS (Fotos das obras)
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obra-fotos',
  'obra-fotos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Políticas RLS para obra-fotos
DROP POLICY IF EXISTS "Obra fotos são publicamente acessíveis" ON storage.objects;
CREATE POLICY "Obra fotos são publicamente acessíveis"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'obra-fotos');

DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de fotos de obra" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de fotos de obra"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'obra-fotos');

DROP POLICY IF EXISTS "Usuários autenticados podem deletar fotos de obra" ON storage.objects;
CREATE POLICY "Usuários autenticados podem deletar fotos de obra"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'obra-fotos');

-- =============================================
-- 4. BUCKET: OBRA-DOCUMENTOS (Documentos das obras)
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'obra-documentos',
  'obra-documentos',
  true,
  52428800, -- 50MB
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

-- Políticas RLS para obra-documentos
DROP POLICY IF EXISTS "Documentos de obra são publicamente acessíveis" ON storage.objects;
CREATE POLICY "Documentos de obra são publicamente acessíveis"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'obra-documentos');

DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de documentos de obra" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de documentos de obra"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'obra-documentos');

DROP POLICY IF EXISTS "Usuários autenticados podem deletar documentos de obra" ON storage.objects;
CREATE POLICY "Usuários autenticados podem deletar documentos de obra"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'obra-documentos');

-- =============================================
-- VERIFICAÇÃO FINAL
-- =============================================

DO $$
DECLARE
  v_avatars_exists BOOLEAN;
  v_rdo_fotos_exists BOOLEAN;
  v_obra_fotos_exists BOOLEAN;
  v_obra_docs_exists BOOLEAN;
BEGIN
  -- Verificar buckets criados
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'avatars') INTO v_avatars_exists;
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'rdo-fotos') INTO v_rdo_fotos_exists;
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'obra-fotos') INTO v_obra_fotos_exists;
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'obra-documentos') INTO v_obra_docs_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ STORAGE BUCKETS CONFIGURADOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Buckets criados:';
  RAISE NOTICE '  %', CASE WHEN v_avatars_exists THEN '✅ avatars (fotos de perfil - 5MB)' ELSE '❌ avatars' END;
  RAISE NOTICE '  %', CASE WHEN v_rdo_fotos_exists THEN '✅ rdo-fotos (fotos de RDO - 10MB)' ELSE '❌ rdo-fotos' END;
  RAISE NOTICE '  %', CASE WHEN v_obra_fotos_exists THEN '✅ obra-fotos (fotos de obra - 10MB)' ELSE '❌ obra-fotos' END;
  RAISE NOTICE '  %', CASE WHEN v_obra_docs_exists THEN '✅ obra-documentos (documentos - 50MB)' ELSE '❌ obra-documentos' END;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Políticas RLS configuradas:';
  RAISE NOTICE '  - Avatares: usuários podem gerenciar apenas seus próprios';
  RAISE NOTICE '  - RDO/Obra: todos autenticados podem enviar/deletar';
  RAISE NOTICE '  - Todos os buckets são públicos para leitura';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
