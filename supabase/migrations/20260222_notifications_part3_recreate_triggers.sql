-- =====================================================
-- MIGRATION PARTE 3: Recriar Triggers
-- Data: 2026-02-22
-- Descrição: Recria os triggers após adicionar as colunas
-- =====================================================

-- Function: Notificar quando deal muda de etapa
CREATE OR REPLACE FUNCTION notify_deal_stage_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_from_name TEXT;
  v_stage_to_name TEXT;
BEGIN
  -- Buscar nomes das etapas
  SELECT name INTO v_stage_from_name FROM pipeline_stages WHERE id = OLD.stage_id;
  SELECT name INTO v_stage_to_name FROM pipeline_stages WHERE id = NEW.stage_id;

  -- Se mudou de etapa, criar notificação para o owner
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, type, title, message, link, action_label,
      deal_id, data, priority
    ) VALUES (
      NEW.owner_id,
      'deal_stage_changed',
      'Deal Movido',
      format('"%s" foi movido de "%s" para "%s"',
        NEW.title,
        COALESCE(v_stage_from_name, 'Sem etapa'),
        COALESCE(v_stage_to_name, 'Sem etapa')
      ),
      '/dashboard/comercial/pipeline',
      'Ver Pipeline',
      NEW.id,
      jsonb_build_object(
        'deal_id', NEW.id,
        'deal_title', NEW.title,
        'stage_from', COALESCE(v_stage_from_name, 'Sem etapa'),
        'stage_to', COALESCE(v_stage_to_name, 'Sem etapa')
      ),
      'normal'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Deal mudou de etapa
DROP TRIGGER IF EXISTS trigger_notify_deal_stage_changed ON deals;
CREATE TRIGGER trigger_notify_deal_stage_changed
  AFTER UPDATE ON deals
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  EXECUTE FUNCTION notify_deal_stage_changed();

-- Function: Notificar quando deal é atribuído
CREATE OR REPLACE FUNCTION notify_deal_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou de owner, notificar novo owner
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, type, title, message, link, action_label,
      deal_id, data, priority
    ) VALUES (
      NEW.owner_id,
      'deal_assigned',
      'Deal Atribuído',
      format('O deal "%s" foi atribuído a você', NEW.title),
      format('/dashboard/comercial/pipeline?deal=%s', NEW.id),
      'Ver Deal',
      NEW.id,
      jsonb_build_object(
        'deal_id', NEW.id,
        'deal_title', NEW.title,
        'deal_value', NEW.value
      ),
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Deal atribuído
DROP TRIGGER IF EXISTS trigger_notify_deal_assigned ON deals;
CREATE TRIGGER trigger_notify_deal_assigned
  AFTER UPDATE ON deals
  FOR EACH ROW
  WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
  EXECUTE FUNCTION notify_deal_assigned();

SELECT 'Triggers recriados com sucesso! ✅' as message;
