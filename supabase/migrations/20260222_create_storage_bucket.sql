-- =====================================================
-- Criar bucket de storage para documentos
-- =====================================================

-- Inserir bucket (só se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket
-- 1. Permitir usuários autenticados fazerem upload
CREATE POLICY "Usuários podem fazer upload de documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- 2. Permitir usuários autenticados verem seus documentos
CREATE POLICY "Usuários podem ver documentos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- 3. Permitir usuários autenticados deletarem seus documentos
CREATE POLICY "Usuários podem deletar documentos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- 4. Permitir usuários autenticados atualizarem seus documentos
CREATE POLICY "Usuários podem atualizar documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

SELECT 'Bucket de storage criado com sucesso! ✅' as message;
