-- ===========================================
-- Tabela de Log de Execuções de Automações
-- (APENAS criar tabela, sem tocar em views)
-- ===========================================

-- 1. Criar tabela de log
CREATE TABLE IF NOT EXISTS automation_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name TEXT NOT NULL,
  automation_type TEXT NOT NULL, -- 'stage_change', 'project_creation', etc
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  -- Resultado da execução
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,

  -- Metadados
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_automation_log_deal ON automation_execution_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_type ON automation_execution_log(automation_type);
CREATE INDEX IF NOT EXISTS idx_automation_log_created ON automation_execution_log(created_at DESC);

-- 3. RLS Policies
ALTER TABLE automation_execution_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all automation logs" ON automation_execution_log;
CREATE POLICY "Admins can view all automation logs"
  ON automation_execution_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their automation logs" ON automation_execution_log;
CREATE POLICY "Users can view their automation logs"
  ON automation_execution_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gerente', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = automation_execution_log.deal_id
      AND d.owner_id = auth.uid()
    )
  );

-- 4. Função auxiliar para logar
CREATE OR REPLACE FUNCTION log_automation_execution(
  p_automation_name TEXT,
  p_automation_type TEXT,
  p_deal_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO automation_execution_log (
    automation_name,
    automation_type,
    deal_id,
    status,
    error_message,
    metadata
  )
  VALUES (
    p_automation_name,
    p_automation_type,
    p_deal_id,
    p_status,
    p_error_message,
    p_metadata
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[log_automation] Erro ao registrar log: %', SQLERRM;
END;
$$;

-- 5. Atualizar apenas o trigger de stage change
DROP TRIGGER IF EXISTS zzz_force_stage_on_value_change ON deals;

CREATE OR REPLACE FUNCTION force_stage_change_on_value()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old NUMERIC;
  v_new NUMERIC;
  v_stage_fechamento UUID;
  v_stage_negociacao UUID;
  v_old_stage_name TEXT;
BEGIN
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_old := OLD.value;
  v_new := NEW.value;

  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento' LIMIT 1;
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação' LIMIT 1;
  SELECT name INTO v_old_stage_name FROM pipeline_stages WHERE id = OLD.stage_id;

  -- VALOR DIMINUIU
  IF v_new < v_old AND v_stage_negociacao IS NOT NULL THEN
    NEW.stage_id := v_stage_negociacao;
    NEW.stage_updated_at := NOW();

    BEGIN
      PERFORM log_automation_execution(
        'Mudança Automática de Etapa - Valor Reduzido',
        'stage_change',
        NEW.id,
        'success',
        NULL,
        jsonb_build_object('old_value', v_old, 'new_value', v_new, 'old_stage', v_old_stage_name, 'new_stage', 'Negociação')
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

  -- VALOR AUMENTOU
  ELSIF v_new > v_old AND v_stage_fechamento IS NOT NULL THEN
    NEW.stage_id := v_stage_fechamento;
    NEW.stage_updated_at := NOW();

    BEGIN
      PERFORM log_automation_execution(
        'Mudança Automática de Etapa - Valor Aumentado',
        'stage_change',
        NEW.id,
        'success',
        NULL,
        jsonb_build_object('old_value', v_old, 'new_value', v_new, 'old_stage', v_old_stage_name, 'new_stage', 'Fechamento')
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[force_stage] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER zzz_force_stage_on_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION force_stage_change_on_value();

SELECT '✅ Tabela automation_execution_log criada!' as message;
SELECT 'Trigger de stage change atualizado para logar execuções' as info;
