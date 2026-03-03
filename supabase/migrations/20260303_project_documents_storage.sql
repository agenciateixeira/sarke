-- Criar bucket de storage para documentos do projeto
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage
DROP POLICY IF EXISTS "Usuários autenticados podem ver arquivos project-documents" ON storage.objects;
CREATE POLICY "Usuários autenticados podem ver arquivos project-documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload project-documents" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload project-documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar arquivos project-documents" ON storage.objects;
CREATE POLICY "Usuários autenticados podem atualizar arquivos project-documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-documents'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Usuários autenticados podem deletar arquivos project-documents" ON storage.objects;
CREATE POLICY "Usuários autenticados podem deletar arquivos project-documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-documents'
  AND auth.role() = 'authenticated'
);
