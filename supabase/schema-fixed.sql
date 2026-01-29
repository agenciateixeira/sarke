-- Sarke Database Schema (CORRIGIDO)
-- Sistema de Gestão Empresarial

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Remover tabela se existir
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Remover trigger e função se existirem
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Criação da tabela de perfis (usuários)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gerente', 'colaborador', 'juridico')),
  setor TEXT CHECK (setor IN (
    'dashboard', 'tarefas', 'comercial', 'financeiro', 'juridico',
    'calendario', 'gestao_equipe', 'chat_interno', 'ferramentas',
    'gestao_obra', 'cronograma', 'memorial'
  )),
  avatar_url TEXT,
  telefone TEXT,
  cargo TEXT,
  departamento TEXT,

  -- Controle de horário de acesso (para colaboradores)
  horario_inicio TIME,
  horario_fim TIME,
  dias_trabalho INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Segunda a Sexta por padrão

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- RLS (Row Level Security) para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política SIMPLIFICADA: Usuários podem ver e atualizar apenas seu próprio perfil
CREATE POLICY "Enable read access for own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable update for own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política SIMPLIFICADA: Admins podem fazer tudo (SEM RECURSÃO)
-- Usando uma função auxiliar para verificar admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para admins (usando a função auxiliar)
CREATE POLICY "Enable all for admins"
  ON profiles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Tabela de Tarefas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,

  -- Relacionamentos
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);

-- RLS para tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable insert for authenticated"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable update for own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable delete for creators and admins"
  ON tasks FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin());

-- Tabela de Projetos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  budget DECIMAL(15, 2),
  start_date DATE,
  end_date DATE,

  -- Relacionamentos
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_manager ON projects(manager_id);

-- RLS para projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for involved users"
  ON projects FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable insert for authenticated"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable update for managers and admins"
  ON projects FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid() OR created_by = auth.uid() OR is_admin());

CREATE POLICY "Enable delete for admins"
  ON projects FOR DELETE
  TO authenticated
  USING (is_admin());

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'colaborador')
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil ao criar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Inserir um usuário admin de exemplo (opcional - REMOVER EM PRODUÇÃO)
-- Você pode criar o primeiro admin manualmente via Supabase Dashboard
