-- =====================================================
-- FIX: Corrigir funções de automação
-- =====================================================

-- PROBLEMA: A coluna stage_updated_at não existe na tabela deals
-- SOLUÇÃO: Usar updated_at como referência ou criar a coluna

-- Opção 1: Adicionar coluna stage_updated_at se não existir
ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ;

-- Atualizar valores existentes (usar updated_at como base inicial)
UPDATE deals
SET stage_updated_at = updated_at
WHERE stage_updated_at IS NULL;

-- Criar trigger para atualizar stage_updated_at quando mudar de etapa
CREATE OR REPLACE FUNCTION update_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    NEW.stage_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stage_updated_at ON deals;
CREATE TRIGGER update_stage_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_timestamp();

-- Agora recriar a função check_automation_conditions (já deve funcionar)
CREATE OR REPLACE FUNCTION check_automation_conditions(
  p_deal_id UUID,
  p_conditions JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_deal RECORD;
  v_days_in_stage INTEGER;
  v_days_without_activity INTEGER;
BEGIN
  -- Buscar deal com informações necessárias
  SELECT
    d.*,
    EXTRACT(DAY FROM NOW() - COALESCE(d.stage_updated_at, d.updated_at))::INTEGER as days_in_current_stage,
    EXTRACT(DAY FROM NOW() - COALESCE(
      (SELECT MAX(created_at) FROM deal_activities WHERE deal_id = d.id),
      d.created_at
    ))::INTEGER as days_since_last_activity
  INTO v_deal
  FROM deals d
  WHERE d.id = p_deal_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Verificar cada condição

  -- Stage ID
  IF p_conditions ? 'stage_id' AND
     v_deal.stage_id::TEXT != (p_conditions->>'stage_id') THEN
    RETURN false;
  END IF;

  -- Temperature
  IF p_conditions ? 'temperature' AND
     v_deal.temperature != (p_conditions->>'temperature') THEN
    RETURN false;
  END IF;

  -- Dias na etapa
  IF p_conditions ? 'days_in_stage' AND
     v_deal.days_in_current_stage < (p_conditions->>'days_in_stage')::INTEGER THEN
    RETURN false;
  END IF;

  -- Dias sem atividade
  IF p_conditions ? 'days_without_activity' AND
     v_deal.days_since_last_activity < (p_conditions->>'days_without_activity')::INTEGER THEN
    RETURN false;
  END IF;

  -- Valor mínimo
  IF p_conditions ? 'value_min' AND
     (v_deal.value IS NULL OR v_deal.value < (p_conditions->>'value_min')::NUMERIC) THEN
    RETURN false;
  END IF;

  -- Valor máximo
  IF p_conditions ? 'value_max' AND
     (v_deal.value IS NULL OR v_deal.value > (p_conditions->>'value_max')::NUMERIC) THEN
    RETURN false;
  END IF;

  -- Business type
  IF p_conditions ? 'business_type' AND
     v_deal.business_type != (p_conditions->>'business_type') THEN
    RETURN false;
  END IF;

  -- Lead source
  IF p_conditions ? 'lead_source' AND
     v_deal.lead_source != (p_conditions->>'lead_source') THEN
    RETURN false;
  END IF;

  -- Status
  IF p_conditions ? 'status' AND
     v_deal.status != (p_conditions->>'status') THEN
    RETURN false;
  END IF;

  -- Todas as condições foram atendidas
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Funções de automação corrigidas! ✅' as message;
