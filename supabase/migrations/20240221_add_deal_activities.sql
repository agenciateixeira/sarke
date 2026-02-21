-- Migration: Adicionar sistema de atividades e interações nos deals
-- Data: 2024-02-21
-- Descrição: Cria tabelas para registrar atividades, notas e anexos nos deals

-- 1. Criar tabela de atividades do deal
CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'note', 'call', 'email', 'meeting', 'task', 'status_change'
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Campos específicos por tipo
  due_date TIMESTAMPTZ, -- Para tasks
  completed_at TIMESTAMPTZ, -- Para tasks completadas
  duration_minutes INTEGER, -- Para calls e meetings

  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_type ON deal_activities(type);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_at ON deal_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_by ON deal_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_deal_activities_due_date ON deal_activities(due_date) WHERE due_date IS NOT NULL;

-- 3. Criar tabela de anexos do deal
CREATE TABLE IF NOT EXISTS deal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES deal_activities(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Caminho no Supabase Storage
  file_size BIGINT NOT NULL, -- Tamanho em bytes
  file_type TEXT NOT NULL, -- MIME type
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT
);

-- 4. Criar índices para anexos
CREATE INDEX IF NOT EXISTS idx_deal_attachments_deal_id ON deal_attachments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_attachments_activity_id ON deal_attachments(activity_id);
CREATE INDEX IF NOT EXISTS idx_deal_attachments_uploaded_at ON deal_attachments(uploaded_at DESC);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_attachments ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de acesso para atividades
CREATE POLICY "Usuários podem ver atividades de deals que podem ver"
  ON deal_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_activities.deal_id
    )
  );

CREATE POLICY "Usuários podem criar atividades em deals que podem editar"
  ON deal_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_activities.deal_id
    )
  );

CREATE POLICY "Usuários podem atualizar suas próprias atividades"
  ON deal_activities FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Usuários podem deletar suas próprias atividades"
  ON deal_activities FOR DELETE
  USING (created_by = auth.uid());

-- 7. Políticas de acesso para anexos
CREATE POLICY "Usuários podem ver anexos de deals que podem ver"
  ON deal_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_attachments.deal_id
    )
  );

CREATE POLICY "Usuários podem criar anexos em deals que podem editar"
  ON deal_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_attachments.deal_id
    )
  );

CREATE POLICY "Usuários podem deletar seus próprios anexos"
  ON deal_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- 8. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_deal_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_deal_activities_updated_at ON deal_activities;
CREATE TRIGGER trigger_update_deal_activities_updated_at
  BEFORE UPDATE ON deal_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_activities_updated_at();

-- 10. Função para criar atividade automática quando deal muda de status
CREATE OR REPLACE FUNCTION create_activity_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só criar atividade se o status realmente mudou
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO deal_activities (
      deal_id,
      type,
      title,
      description,
      created_by
    ) VALUES (
      NEW.id,
      'status_change',
      CASE
        WHEN NEW.status = 'won' THEN 'Negócio marcado como ganho'
        WHEN NEW.status = 'lost' THEN 'Negócio marcado como perdido'
        WHEN NEW.status = 'open' THEN 'Negócio reaberto'
      END,
      CASE
        WHEN NEW.status = 'lost' AND NEW.lost_reason IS NOT NULL
          THEN 'Motivo: ' || NEW.lost_reason
        ELSE NULL
      END,
      COALESCE(auth.uid(), NEW.owner_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Trigger para criar atividade em mudança de status
DROP TRIGGER IF EXISTS trigger_create_activity_on_status_change ON deals;
CREATE TRIGGER trigger_create_activity_on_status_change
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_activity_on_status_change();

-- 12. View para estatísticas de atividades por deal
CREATE OR REPLACE VIEW deal_activity_stats AS
SELECT
  deal_id,
  COUNT(*) as total_activities,
  COUNT(*) FILTER (WHERE type = 'note') as notes_count,
  COUNT(*) FILTER (WHERE type = 'call') as calls_count,
  COUNT(*) FILTER (WHERE type = 'email') as emails_count,
  COUNT(*) FILTER (WHERE type = 'meeting') as meetings_count,
  COUNT(*) FILTER (WHERE type = 'task') as tasks_count,
  COUNT(*) FILTER (WHERE type = 'task' AND completed_at IS NOT NULL) as completed_tasks_count,
  COUNT(*) FILTER (WHERE type = 'task' AND completed_at IS NULL AND due_date < NOW()) as overdue_tasks_count,
  MAX(created_at) as last_activity_at
FROM deal_activities
GROUP BY deal_id;

-- 13. Comentários nas tabelas
COMMENT ON TABLE deal_activities IS 'Registro de todas atividades e interações em um deal';
COMMENT ON TABLE deal_attachments IS 'Anexos e documentos vinculados aos deals';

COMMENT ON COLUMN deal_activities.type IS 'Tipo de atividade: note, call, email, meeting, task, status_change';
COMMENT ON COLUMN deal_activities.title IS 'Título/resumo da atividade';
COMMENT ON COLUMN deal_activities.description IS 'Descrição detalhada da atividade';
COMMENT ON COLUMN deal_activities.due_date IS 'Data de vencimento (para tasks)';
COMMENT ON COLUMN deal_activities.completed_at IS 'Data de conclusão (para tasks)';
COMMENT ON COLUMN deal_activities.duration_minutes IS 'Duração em minutos (para calls e meetings)';
COMMENT ON COLUMN deal_activities.metadata IS 'Dados adicionais em formato JSON';

COMMENT ON COLUMN deal_attachments.file_path IS 'Caminho do arquivo no Supabase Storage';
COMMENT ON COLUMN deal_attachments.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN deal_attachments.file_type IS 'MIME type do arquivo';
