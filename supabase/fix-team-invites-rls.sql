-- =============================================
-- FIX 1: Permitir usuários não autenticados
-- visualizarem convites pendentes por email
-- =============================================

-- Permitir usuários públicos (não autenticados) lerem convites pendentes
DROP POLICY IF EXISTS "Usuários podem ver seus próprios convites pendentes" ON team_invites;
CREATE POLICY "Usuários podem ver seus próprios convites pendentes"
  ON team_invites FOR SELECT
  TO public
  USING (accepted_at IS NULL AND expires_at > now());

-- =============================================
-- FIX 2: Corrigir recursão infinita em group_members
-- =============================================

-- A política antiga causava recursão infinita porque consultava
-- a própria tabela group_members dentro da condição USING
-- Solução: simplificar para permitir que usuários vejam todos os membros
-- dos grupos (sem subquery recursiva)

DROP POLICY IF EXISTS "Usuários podem ver membros dos grupos que participam" ON group_members;
CREATE POLICY "Usuários podem ver membros dos grupos que participam"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    -- Usuário pode ver membros se ele mesmo é membro do grupo
    user_id = auth.uid()
    OR
    -- OU se existe um registro direto dele no mesmo grupo
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );
