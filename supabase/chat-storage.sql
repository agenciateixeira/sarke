-- =============================================
-- SARKE - CONFIGURAÇÃO DE STORAGE PARA CHAT
-- =============================================

-- =============================================
-- 1. CRIAR BUCKET PARA MÍDIA DO CHAT
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. POLICIES DE STORAGE
-- =============================================

-- Permitir leitura pública
DROP POLICY IF EXISTS "Chat media é visível publicamente" ON storage.objects;
CREATE POLICY "Chat media é visível publicamente"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

-- Permitir upload apenas para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

-- Permitir update apenas do próprio arquivo
DROP POLICY IF EXISTS "Usuários podem atualizar próprios arquivos" ON storage.objects;
CREATE POLICY "Usuários podem atualizar próprios arquivos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chat-media' AND owner = auth.uid());

-- Permitir delete apenas do próprio arquivo
DROP POLICY IF EXISTS "Usuários podem deletar próprios arquivos" ON storage.objects;
CREATE POLICY "Usuários podem deletar próprios arquivos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-media' AND owner = auth.uid());
