-- =====================================================
-- Criar tabela de comentários em documentos
-- =====================================================

CREATE TABLE IF NOT EXISTS document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES deal_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_created_at ON document_comments(created_at DESC);

-- RLS Policies
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver comentários"
ON document_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem criar comentários"
ON document_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios comentários"
ON document_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios comentários"
ON document_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_document_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_comments_updated_at
BEFORE UPDATE ON document_comments
FOR EACH ROW
EXECUTE FUNCTION update_document_comments_updated_at();

SELECT 'Tabela de comentários em documentos criada com sucesso! ✅' as message;
