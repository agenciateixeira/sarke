-- Criar bucket de storage para documentos do projeto
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage
CREATE POLICY "Usuários autenticados podem ver arquivos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários autenticados podem atualizar arquivos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários autenticados podem deletar arquivos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-documents'
  AND auth.role() = 'authenticated'
);
