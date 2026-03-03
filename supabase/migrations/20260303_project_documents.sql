-- Tabela para categorias de documentos (itens do checklist)
CREATE TABLE IF NOT EXISTS project_document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,

  -- Ordenação e agrupamento
  order_index INTEGER NOT NULL DEFAULT 0,
  stage TEXT CHECK (stage IN ('planejamento', 'planta_baixa', '3d', 'executivo', 'outros')),

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela para arquivos de documentos
CREATE TABLE IF NOT EXISTS project_document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES project_document_categories(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Informações do arquivo
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Caminho no Supabase Storage
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type

  -- Metadados
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),

  -- Controle de versão
  version INTEGER DEFAULT 1
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_doc_categories_projeto ON project_document_categories(projeto_id);
CREATE INDEX IF NOT EXISTS idx_doc_categories_stage ON project_document_categories(stage);
CREATE INDEX IF NOT EXISTS idx_doc_files_category ON project_document_files(category_id);
CREATE INDEX IF NOT EXISTS idx_doc_files_projeto ON project_document_files(projeto_id);

-- RLS Policies para project_document_categories
ALTER TABLE project_document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver categorias de documentos"
  ON project_document_categories FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projetos p
      WHERE p.id = project_document_categories.projeto_id
    )
  );

CREATE POLICY "Usuários autenticados podem criar categorias de documentos"
  ON project_document_categories FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projetos p
      WHERE p.id = project_document_categories.projeto_id
    )
  );

CREATE POLICY "Usuários autenticados podem atualizar categorias de documentos"
  ON project_document_categories FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projetos p
      WHERE p.id = project_document_categories.projeto_id
    )
  );

CREATE POLICY "Usuários autenticados podem deletar categorias de documentos"
  ON project_document_categories FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projetos p
      WHERE p.id = project_document_categories.projeto_id
    )
  );

-- RLS Policies para project_document_files
ALTER TABLE project_document_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver arquivos de projetos"
  ON project_document_files FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projetos p
      WHERE p.id = project_document_files.projeto_id
    )
  );

CREATE POLICY "Usuários autenticados podem fazer upload de arquivos"
  ON project_document_files FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projetos p
      WHERE p.id = project_document_files.projeto_id
    )
  );

CREATE POLICY "Usuários autenticados podem atualizar arquivos"
  ON project_document_files FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projetos p
      WHERE p.id = project_document_files.projeto_id
    )
  );

CREATE POLICY "Usuários autenticados podem deletar arquivos"
  ON project_document_files FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM projetos p
      WHERE p.id = project_document_files.projeto_id
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_project_document_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_document_categories_updated_at
  BEFORE UPDATE ON project_document_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_project_document_categories_updated_at();
