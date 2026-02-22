-- =====================================================
-- FIX: Trigger de automações não deve bloquear updates
-- =====================================================

-- Recriar função com tratamento de erros
CREATE OR REPLACE FUNCTION trigger_stage_change_automations()
RETURNS TRIGGER AS $$
BEGIN
  -- Processar automações quando mudar de etapa (com tratamento de erro)
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    BEGIN
      PERFORM process_deal_automations(NEW.id, 'stage_changed');
    EXCEPTION WHEN OTHERS THEN
      -- Log do erro mas não bloqueia o update
      RAISE WARNING 'Error processing stage_changed automation for deal %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Processar automações quando mudar temperatura (com tratamento de erro)
  IF OLD.temperature IS DISTINCT FROM NEW.temperature THEN
    BEGIN
      PERFORM process_deal_automations(NEW.id, 'temperature_changed');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing temperature_changed automation for deal %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Processar automações quando mudar valor (com tratamento de erro)
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    BEGIN
      PERFORM process_deal_automations(NEW.id, 'value_changed');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing value_changed automation for deal %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
DROP TRIGGER IF EXISTS deals_automation_trigger ON deals;
CREATE TRIGGER deals_automation_trigger
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_stage_change_automations();

SELECT 'Trigger de automações corrigido com tratamento de erros! ✅' as message;
