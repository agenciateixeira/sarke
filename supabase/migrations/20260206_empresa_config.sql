-- =====================================================
-- SISTEMA DE CONFIGURAÇÕES DA EMPRESA
-- Gerencia logo, dados da empresa e configurações
-- =====================================================

-- Tabela para armazenar configurações da empresa
CREATE TABLE IF NOT EXISTS empresa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT, -- URL do logo no Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_empresa_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER empresa_config_updated_at
  BEFORE UPDATE ON empresa_config
  FOR EACH ROW
  EXECUTE FUNCTION update_empresa_config_updated_at();

-- Inserir configuração padrão (apenas se não existir)
INSERT INTO empresa_config (nome_empresa, cnpj)
SELECT 'Minha Empresa', ''
WHERE NOT EXISTS (SELECT 1 FROM empresa_config LIMIT 1);

-- RLS Policies
ALTER TABLE empresa_config ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler as configurações
CREATE POLICY "Usuarios autenticados podem ler configuracoes"
  ON empresa_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Apenas usuários autenticados podem atualizar (pode adicionar restrição de role depois)
CREATE POLICY "Usuarios autenticados podem atualizar configuracoes"
  ON empresa_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKET PARA LOGOS
-- =====================================================

-- Criar bucket para logos (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('empresa-logos', 'empresa-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Usuarios autenticados podem fazer upload de logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'empresa-logos');

CREATE POLICY "Logos sao publicamente acessiveis"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'empresa-logos');

CREATE POLICY "Usuarios autenticados podem deletar logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'empresa-logos');

-- Comentários
COMMENT ON TABLE empresa_config IS 'Configurações gerais da empresa incluindo logo e dados de contato';
COMMENT ON COLUMN empresa_config.logo_url IS 'URL pública do logo no Supabase Storage';
