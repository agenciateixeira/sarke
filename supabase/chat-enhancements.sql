-- =============================================
-- MELHORIAS NO SISTEMA DE CHAT
-- - Indicador de digitação em tempo real
-- - Tags de usuários
-- - Tabela de tarefas/reuniões
-- =============================================

-- =============================================
-- 1. TABELA DE INDICADORES DE DIGITAÇÃO
-- =============================================

CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID NOT NULL, -- Pode ser group_id ou recipient_id
  conversation_type TEXT NOT NULL, -- 'direct' ou 'group'
  is_typing BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, conversation_id, conversation_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_typing_conversation ON typing_indicators(conversation_id, conversation_type);
CREATE INDEX IF NOT EXISTS idx_typing_user ON typing_indicators(user_id);

-- Auto-delete após 10 segundos de inatividade
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. TABELA DE TAGS DE USUÁRIOS
-- =============================================

CREATE TABLE IF NOT EXISTS user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL, -- Quem criou a tag
  tagged_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL, -- Quem recebeu a tag
  tag_name TEXT NOT NULL,
  tag_color TEXT DEFAULT '#3b82f6', -- Cor em hexadecimal
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, tagged_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tags_user ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tagged ON user_tags(tagged_user_id);

-- =============================================
-- 3. TABELA DE REUNIÕES AGENDADAS
-- =============================================

CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID, -- Referência ao grupo ou usuário
  conversation_type TEXT, -- 'direct' ou 'group'
  meeting_url TEXT,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'cancelled', 'completed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_creator ON scheduled_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_conversation ON scheduled_meetings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON scheduled_meetings(scheduled_for);

-- =============================================
-- 4. TABELA DE PARTICIPANTES DE REUNIÕES
-- =============================================

CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants(user_id);

-- =============================================
-- 5. TABELA DE TAREFAS DO CHAT
-- =============================================

CREATE TABLE IF NOT EXISTS chat_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID, -- Referência ao grupo ou usuário
  conversation_type TEXT, -- 'direct' ou 'group'
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  parent_task_id UUID REFERENCES chat_tasks(id) ON DELETE CASCADE, -- Para subtarefas
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_tasks_assigned ON chat_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_tasks_creator ON chat_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_tasks_conversation ON chat_tasks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_tasks_parent ON chat_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_chat_tasks_due_date ON chat_tasks(due_date);

-- =============================================
-- 6. RLS POLICIES - TYPING_INDICATORS
-- =============================================

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver indicadores de digitação" ON typing_indicators;
CREATE POLICY "Usuários podem ver indicadores de digitação"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários podem criar indicadores de digitação" ON typing_indicators;
CREATE POLICY "Usuários podem criar indicadores de digitação"
  ON typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem atualizar próprios indicadores" ON typing_indicators;
CREATE POLICY "Usuários podem atualizar próprios indicadores"
  ON typing_indicators FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar próprios indicadores" ON typing_indicators;
CREATE POLICY "Usuários podem deletar próprios indicadores"
  ON typing_indicators FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 7. RLS POLICIES - USER_TAGS
-- =============================================

ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver próprias tags" ON user_tags;
CREATE POLICY "Usuários podem ver próprias tags"
  ON user_tags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem criar tags" ON user_tags;
CREATE POLICY "Usuários podem criar tags"
  ON user_tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem atualizar próprias tags" ON user_tags;
CREATE POLICY "Usuários podem atualizar próprias tags"
  ON user_tags FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuários podem deletar próprias tags" ON user_tags;
CREATE POLICY "Usuários podem deletar próprias tags"
  ON user_tags FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 8. RLS POLICIES - SCHEDULED_MEETINGS
-- =============================================

ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver reuniões relevantes" ON scheduled_meetings;
CREATE POLICY "Usuários podem ver reuniões relevantes"
  ON scheduled_meetings FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM meeting_participants
      WHERE meeting_id = scheduled_meetings.id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem criar reuniões" ON scheduled_meetings;
CREATE POLICY "Usuários podem criar reuniões"
  ON scheduled_meetings FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Criadores podem atualizar reuniões" ON scheduled_meetings;
CREATE POLICY "Criadores podem atualizar reuniões"
  ON scheduled_meetings FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Criadores podem deletar reuniões" ON scheduled_meetings;
CREATE POLICY "Criadores podem deletar reuniões"
  ON scheduled_meetings FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- =============================================
-- 9. RLS POLICIES - MEETING_PARTICIPANTS
-- =============================================

ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver participantes de reuniões" ON meeting_participants;
CREATE POLICY "Usuários podem ver participantes de reuniões"
  ON meeting_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM scheduled_meetings
      WHERE id = meeting_participants.meeting_id
      AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Criadores podem adicionar participantes" ON meeting_participants;
CREATE POLICY "Criadores podem adicionar participantes"
  ON meeting_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scheduled_meetings
      WHERE id = meeting_participants.meeting_id
      AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem atualizar própria participação" ON meeting_participants;
CREATE POLICY "Usuários podem atualizar própria participação"
  ON meeting_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 10. RLS POLICIES - CHAT_TASKS
-- =============================================

ALTER TABLE chat_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver tarefas relevantes" ON chat_tasks;
CREATE POLICY "Usuários podem ver tarefas relevantes"
  ON chat_tasks FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "Usuários podem criar tarefas" ON chat_tasks;
CREATE POLICY "Usuários podem criar tarefas"
  ON chat_tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Criadores e assignees podem atualizar tarefas" ON chat_tasks;
CREATE POLICY "Criadores e assignees podem atualizar tarefas"
  ON chat_tasks FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "Criadores podem deletar tarefas" ON chat_tasks;
CREATE POLICY "Criadores podem deletar tarefas"
  ON chat_tasks FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- =============================================
-- 11. HABILITAR REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE user_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_tasks;

-- =============================================
-- 12. TRIGGERS PARA UPDATED_AT
-- =============================================

DROP TRIGGER IF EXISTS update_typing_indicators_updated_at ON typing_indicators;
CREATE TRIGGER update_typing_indicators_updated_at
  BEFORE UPDATE ON typing_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_meetings_updated_at ON scheduled_meetings;
CREATE TRIGGER update_scheduled_meetings_updated_at
  BEFORE UPDATE ON scheduled_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_tasks_updated_at ON chat_tasks;
CREATE TRIGGER update_chat_tasks_updated_at
  BEFORE UPDATE ON chat_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
