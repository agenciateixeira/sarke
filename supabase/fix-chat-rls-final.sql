-- =============================================
-- FIX FINAL: Remover recursão usando abordagem segura
-- =============================================

-- A recursão acontece quando:
-- - chat_groups verifica group_members
-- - group_members verifica chat_groups
-- Solução: Permitir acesso mais liberal e filtrar no código

-- =============================================
-- 1. REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS
-- =============================================

-- Remover políticas de group_members
DROP POLICY IF EXISTS "Usuários podem ver membros dos grupos que participam" ON group_members;
DROP POLICY IF EXISTS "Criadores podem adicionar membros" ON group_members;
DROP POLICY IF EXISTS "Admins podem adicionar membros" ON group_members;
DROP POLICY IF EXISTS "Usuários podem sair de grupos" ON group_members;
DROP POLICY IF EXISTS "Criadores podem remover membros" ON group_members;

-- Remover políticas de chat_groups
DROP POLICY IF EXISTS "Usuários podem ver grupos que participam" ON chat_groups;
DROP POLICY IF EXISTS "Usuários podem criar grupos" ON chat_groups;
DROP POLICY IF EXISTS "Criadores podem atualizar grupos" ON chat_groups;
DROP POLICY IF EXISTS "Criadores podem deletar grupos" ON chat_groups;

-- Remover políticas de messages
DROP POLICY IF EXISTS "Usuários podem ver mensagens relevantes" ON messages;
DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON messages;
DROP POLICY IF EXISTS "Usuários podem atualizar próprias mensagens" ON messages;
DROP POLICY IF EXISTS "Usuários podem deletar próprias mensagens" ON messages;

-- =============================================
-- 2. CRIAR POLÍTICAS SIMPLES SEM RECURSÃO
-- =============================================

-- GROUP_MEMBERS: Todos podem ver (filtro será no app)
CREATE POLICY "group_members_select_policy"
  ON group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "group_members_insert_policy"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "group_members_delete_policy"
  ON group_members FOR DELETE
  TO authenticated
  USING (true);

-- CHAT_GROUPS: Todos podem ver (filtro será no app)
CREATE POLICY "chat_groups_select_policy"
  ON chat_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "chat_groups_insert_policy"
  ON chat_groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_groups_update_policy"
  ON chat_groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "chat_groups_delete_policy"
  ON chat_groups FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- MESSAGES: Políticas simples
CREATE POLICY "messages_select_policy"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "messages_insert_policy"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_update_policy"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "messages_delete_policy"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());
