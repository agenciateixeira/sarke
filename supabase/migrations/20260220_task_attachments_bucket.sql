-- =============================================
-- SARKE - BUCKET PARA ANEXOS DE TAREFAS
-- =============================================
-- Cria bucket para armazenar anexos das tarefas
-- =============================================

-- =============================================
-- 1. CRIAR BUCKET: TASK-ATTACHMENTS
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true, -- Público para facilitar acesso
  104857600, -- 100MB em bytes
  ARRAY[
    -- Imagens
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    -- Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    -- Arquivos
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    -- CAD
    'application/acad',
    'application/x-acad',
    'application/autocad_dwg',
    'image/x-dwg',
    'application/dwg',
    'application/x-dwg',
    'application/x-autocad',
    'image/vnd.dwg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/acad',
    'application/x-acad',
    'application/autocad_dwg',
    'image/x-dwg',
    'application/dwg',
    'application/x-dwg',
    'application/x-autocad',
    'image/vnd.dwg'
  ];

-- =============================================
-- 2. POLÍTICAS RLS PARA TASK-ATTACHMENTS
-- =============================================

-- Permitir leitura pública
DROP POLICY IF EXISTS "Anexos de tarefas são publicamente acessíveis" ON storage.objects;
CREATE POLICY "Anexos de tarefas são publicamente acessíveis"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments');

-- Permitir upload por usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de anexos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de anexos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

-- Permitir atualização por usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar anexos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem atualizar anexos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'task-attachments');

-- Permitir deletar por usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem deletar anexos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem deletar anexos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-attachments');

-- =============================================
-- 3. ÍNDICES PARA TASK_ATTACHMENTS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);

-- =============================================
-- 4. VERIFICAÇÃO
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ BUCKET TASK-ATTACHMENTS CRIADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Bucket: task-attachments';
  RAISE NOTICE '   - Limite: 100MB por arquivo';
  RAISE NOTICE '   - Tipos: Imagens, PDFs, Office, CAD, ZIP';
  RAISE NOTICE '   - Público: Sim (leitura)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Políticas RLS:';
  RAISE NOTICE '   - Leitura: Pública';
  RAISE NOTICE '   - Upload/Update/Delete: Autenticados';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
