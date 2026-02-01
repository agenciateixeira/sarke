-- =============================================
-- FIX: Permitir que TODOS os usuários vejam outros perfis
-- Necessário para o chat funcionar corretamente
-- =============================================

-- Remover política antiga que restringe visualização
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Nova política: Todos os usuários autenticados podem ver todos os perfis
CREATE POLICY "All authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Manter política de update apenas para próprio perfil OU admin
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Users can update own profile or admins can update all"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- NOTA: Esta mudança permite que:
-- 1. Colaboradores vejam lista de usuários para chat
-- 2. Gerentes vejam sua equipe
-- 3. Admins continuam com acesso total
-- 4. Cada um só pode editar seu próprio perfil (exceto admins)
-- =============================================
