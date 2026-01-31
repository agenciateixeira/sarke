-- =============================================
-- FIX: Corrigir TODAS as políticas RLS do chat
-- =============================================

-- =============================================
-- 1. FIX GROUP_MEMBERS (recursão infinita)
-- =============================================

-- Remover política problemática
DROP POLICY IF EXISTS "Usuários podem ver membros dos grupos que participam" ON group_members;

-- Nova política SEM recursão
CREATE POLICY "Usuários podem ver membros dos grupos que participam"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    -- Permitir ver se o usuário está no mesmo grupo
    group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid()
    )
  );

-- =============================================
-- 2. SIMPLIFICAR POLÍTICAS DE CHAT_GROUPS
-- =============================================

-- Remover política antiga
DROP POLICY IF EXISTS "Usuários podem ver grupos que participam" ON chat_groups;

-- Nova política simplificada
CREATE POLICY "Usuários podem ver grupos que participam"
  ON chat_groups FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT group_id
      FROM group_members
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 3. ADICIONAR POLÍTICA PARA INSERIR MEMBROS
-- =============================================

-- Garantir que qualquer admin de grupo pode adicionar membros
DROP POLICY IF EXISTS "Admins podem adicionar membros" ON group_members;
CREATE POLICY "Admins podem adicionar membros"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Criador do grupo pode adicionar
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE id = group_id
      AND created_by = auth.uid()
    )
    OR
    -- Ou o próprio usuário está se adicionando (se for criador)
    user_id = auth.uid()
  );

-- =============================================
-- 4. VERIFICAR POLÍTICAS DE MESSAGES
-- =============================================

-- Garantir que política de SELECT está correta
DROP POLICY IF EXISTS "Usuários podem ver mensagens relevantes" ON messages;
CREATE POLICY "Usuários podem ver mensagens relevantes"
  ON messages FOR SELECT
  TO authenticated
  USING (
    -- Mensagens enviadas ou recebidas pelo usuário
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR
    -- Ou mensagens de grupos que o usuário participa
    (
      group_id IS NOT NULL
      AND group_id IN (
        SELECT group_id
        FROM group_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Garantir que pode inserir mensagens
DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON messages;
CREATE POLICY "Usuários podem enviar mensagens"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Só pode enviar se for o sender
    sender_id = auth.uid()
    AND
    (
      -- Para mensagens diretas: pode enviar para qualquer usuário
      (recipient_id IS NOT NULL AND group_id IS NULL)
      OR
      -- Para grupos: precisa ser membro do grupo
      (
        group_id IS NOT NULL
        AND recipient_id IS NULL
        AND group_id IN (
          SELECT group_id
          FROM group_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- =============================================
-- 5. HABILITAR REALTIME (garantir que está ativo)
-- =============================================

-- Garantir que as tabelas estão no Realtime
DO $$
BEGIN
  -- Tentar adicionar, ignorar se já existir
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
