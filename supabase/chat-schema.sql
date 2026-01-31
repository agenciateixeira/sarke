-- =============================================
-- SARKE - SISTEMA DE CHAT COMPLETO
-- Baseado no chat do projeto T3
-- =============================================

-- =============================================
-- 1. TABELA DE GRUPOS DE CHAT
-- =============================================

CREATE TABLE IF NOT EXISTS chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. TABELA DE MEMBROS DOS GRUPOS
-- =============================================

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- =============================================
-- 3. TABELA DE MENSAGENS
-- =============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  is_thread_reply BOOLEAN DEFAULT false,
  thread_reply_count INTEGER DEFAULT 0,
  mentioned_users UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: mensagem deve ter grupo OU destinatário
  CONSTRAINT message_destination_check CHECK (
    (group_id IS NOT NULL AND recipient_id IS NULL) OR
    (group_id IS NULL AND recipient_id IS NOT NULL)
  )
);

-- =============================================
-- 4. TABELA DE LEITURA DE MENSAGENS
-- =============================================

CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- =============================================
-- 5. ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);

-- =============================================
-- 6. TRIGGER PARA UPDATED_AT
-- =============================================

DROP TRIGGER IF EXISTS update_chat_groups_updated_at ON chat_groups;
CREATE TRIGGER update_chat_groups_updated_at
  BEFORE UPDATE ON chat_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. FUNÇÕES PARA CONTADORES DE THREADS
-- =============================================

CREATE OR REPLACE FUNCTION increment_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL AND NEW.is_thread_reply = true THEN
    UPDATE messages
    SET thread_reply_count = thread_reply_count + 1
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.thread_id IS NOT NULL AND OLD.is_thread_reply = true THEN
    UPDATE messages
    SET thread_reply_count = GREATEST(thread_reply_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. TRIGGERS PARA CONTADORES DE THREADS
-- =============================================

DROP TRIGGER IF EXISTS increment_thread_count_trigger ON messages;
CREATE TRIGGER increment_thread_count_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_thread_reply_count();

DROP TRIGGER IF EXISTS decrement_thread_count_trigger ON messages;
CREATE TRIGGER decrement_thread_count_trigger
  AFTER DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION decrement_thread_reply_count();

-- =============================================
-- 9. FUNÇÃO PARA DELETAR CONVERSAS (RPC)
-- =============================================

CREATE OR REPLACE FUNCTION delete_conversation(
  p_conversation_id UUID,
  p_conversation_type TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF p_conversation_type = 'group' THEN
    -- Remove usuário do grupo
    DELETE FROM group_members
    WHERE group_id = p_conversation_id
    AND user_id = p_user_id;

    v_result := json_build_object(
      'success', true,
      'message', 'Você saiu do grupo com sucesso'
    );
  ELSE
    -- Deleta mensagens da conversa direta (apenas as enviadas pelo usuário)
    DELETE FROM messages
    WHERE (sender_id = p_user_id AND recipient_id = p_conversation_id)
       OR (sender_id = p_conversation_id AND recipient_id = p_user_id);

    v_result := json_build_object(
      'success', true,
      'message', 'Conversa deletada com sucesso'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 10. RLS (ROW LEVEL SECURITY)
-- =============================================

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. POLICIES - CHAT_GROUPS
-- =============================================

DROP POLICY IF EXISTS "Usuários podem ver grupos que participam" ON chat_groups;
CREATE POLICY "Usuários podem ver grupos que participam"
  ON chat_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = chat_groups.id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem criar grupos" ON chat_groups;
CREATE POLICY "Usuários podem criar grupos"
  ON chat_groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Criadores podem atualizar grupos" ON chat_groups;
CREATE POLICY "Criadores podem atualizar grupos"
  ON chat_groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Criadores podem deletar grupos" ON chat_groups;
CREATE POLICY "Criadores podem deletar grupos"
  ON chat_groups FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- =============================================
-- 12. POLICIES - GROUP_MEMBERS
-- =============================================

DROP POLICY IF EXISTS "Usuários podem ver membros dos grupos que participam" ON group_members;
CREATE POLICY "Usuários podem ver membros dos grupos que participam"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Criadores podem adicionar membros" ON group_members;
CREATE POLICY "Criadores podem adicionar membros"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE id = group_members.group_id
      AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem sair de grupos" ON group_members;
CREATE POLICY "Usuários podem sair de grupos"
  ON group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Criadores podem remover membros" ON group_members;
CREATE POLICY "Criadores podem remover membros"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE id = group_members.group_id
      AND created_by = auth.uid()
    )
  );

-- =============================================
-- 13. POLICIES - MESSAGES
-- =============================================

DROP POLICY IF EXISTS "Usuários podem ver mensagens relevantes" ON messages;
CREATE POLICY "Usuários podem ver mensagens relevantes"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    recipient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = messages.group_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON messages;
CREATE POLICY "Usuários podem enviar mensagens"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem atualizar próprias mensagens" ON messages;
CREATE POLICY "Usuários podem atualizar próprias mensagens"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar próprias mensagens" ON messages;
CREATE POLICY "Usuários podem deletar próprias mensagens"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- =============================================
-- 14. POLICIES - MESSAGE_READS
-- =============================================

DROP POLICY IF EXISTS "Usuários podem ver próprias leituras" ON message_reads;
CREATE POLICY "Usuários podem ver próprias leituras"
  ON message_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem marcar mensagens como lidas" ON message_reads;
CREATE POLICY "Usuários podem marcar mensagens como lidas"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- 15. HABILITAR REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
