-- ===========================================
-- Tabela de Log de Execuções de Automações
-- ===========================================

CREATE TABLE IF NOT EXISTS automation_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name TEXT NOT NULL,
  automation_type TEXT NOT NULL, -- 'stage_change', 'project_creation', etc
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  -- Resultado da execução
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,

  -- Metadados
  metadata JSONB, -- Para armazenar dados adicionais (valor anterior, novo, etc)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_automation_log_deal ON automation_execution_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_type ON automation_execution_log(automation_type);
CREATE INDEX IF NOT EXISTS idx_automation_log_created ON automation_execution_log(created_at DESC);

-- RLS Policies
ALTER TABLE automation_execution_log ENABLE ROW LEVEL SECURITY;

-- Admins podem ver tudo
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

-- Gerentes podem ver logs dos seus deals
CREATE POLICY "Gerentes can view their automation logs"
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

-- Inserir logs quando triggers executarem
-- Vamos modificar os triggers existentes para registrar execuções

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
  -- Não bloquear se logging falhar
  RAISE WARNING '[log_automation] Erro ao registrar log: %', SQLERRM;
END;
$$;

-- Atualizar trigger de mudança de stage para logar
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
  v_new_stage_name TEXT;
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

  -- Pegar nome do stage anterior
  SELECT name INTO v_old_stage_name FROM pipeline_stages WHERE id = OLD.stage_id;

  -- VALOR DIMINUIU → Negociação
  IF v_new < v_old AND v_stage_negociacao IS NOT NULL THEN
    NEW.stage_id := v_stage_negociacao;
    NEW.stage_updated_at := NOW();

    -- Logar execução
    PERFORM log_automation_execution(
      'Mudança Automática de Etapa - Valor Reduzido',
      'stage_change',
      NEW.id,
      'success',
      NULL,
      jsonb_build_object(
        'old_value', v_old,
        'new_value', v_new,
        'old_stage', v_old_stage_name,
        'new_stage', 'Negociação'
      )
    );

  -- VALOR AUMENTOU → Fechamento
  ELSIF v_new > v_old AND v_stage_fechamento IS NOT NULL THEN
    NEW.stage_id := v_stage_fechamento;
    NEW.stage_updated_at := NOW();

    -- Logar execução
    PERFORM log_automation_execution(
      'Mudança Automática de Etapa - Valor Aumentado',
      'stage_change',
      NEW.id,
      'success',
      NULL,
      jsonb_build_object(
        'old_value', v_old,
        'new_value', v_new,
        'old_stage', v_old_stage_name,
        'new_stage', 'Fechamento'
      )
    );
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[force_stage] Erro: %', SQLERRM;

  -- Logar erro
  PERFORM log_automation_execution(
    'Mudança Automática de Etapa',
    'stage_change',
    NEW.id,
    'error',
    SQLERRM,
    NULL
  );

  RETURN NEW;
END;
$$;

-- View para estatísticas de automações
CREATE OR REPLACE VIEW automation_stats AS
SELECT
  automation_name,
  automation_type,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
  COUNT(*) FILTER (WHERE status = 'error') as failed_executions,
  MAX(created_at) as last_execution,
  MIN(created_at) as first_execution
FROM automation_execution_log
GROUP BY automation_name, automation_type;

SELECT '✅ Tabela de log de automações criada!' as message;
SELECT 'Triggers atualizados para registrar execuções' as update_1;
SELECT 'View automation_stats disponível para estatísticas' as view_created;
