-- =============================================
-- SARKE - Pipeline FASE 2: AUTOMAÇÕES
-- Sistema de automação inteligente para pipeline
-- =============================================

-- =============================================
-- TABELA 1: REGRAS DE AUTOMAÇÃO
-- =============================================

CREATE TABLE IF NOT EXISTS pipeline_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações básicas
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Trigger (quando executar)
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'stage_changed',      -- Quando muda de etapa
    'time_in_stage',      -- Após X dias na mesma etapa
    'inactivity',         -- Sem atividades há X dias
    'temperature_changed', -- Quando temperatura muda
    'value_changed',      -- Quando valor muda
    'scheduled'           -- Execução agendada (diária/semanal)
  )),

  -- Condições (quando aplicar)
  conditions JSONB DEFAULT '{}'::jsonb,
  -- Exemplo de conditions:
  -- {
  --   "stage_id": "uuid",                    // Apenas nesta etapa
  --   "temperature": "frio",                 // Apenas se temperatura = frio
  --   "days_in_stage": 7,                   // Após 7 dias na etapa
  --   "days_without_activity": 14,          // Após 14 dias sem atividade
  --   "value_min": 10000,                   // Valor mínimo
  --   "value_max": 100000,                  // Valor máximo
  --   "business_type": "residencial",       // Tipo de negócio
  --   "lead_source": "website"              // Origem do lead
  -- }

  -- Ação (o que fazer)
  action_type TEXT NOT NULL CHECK (action_type IN (
    'move_to_stage',      -- Mover para outra etapa
    'create_task',        -- Criar tarefa
    'send_notification',  -- Enviar notificação
    'change_temperature', -- Alterar temperatura
    'archive_deal',       -- Arquivar deal
    'assign_owner',       -- Atribuir responsável
    'send_email'          -- Enviar email (futuro)
  )),

  -- Parâmetros da ação
  action_params JSONB DEFAULT '{}'::jsonb,
  -- Exemplo de action_params:
  -- Para move_to_stage: { "target_stage_id": "uuid" }
  -- Para create_task: { "title": "Follow-up necessário", "due_days": 3, "description": "..." }
  -- Para send_notification: { "message": "Deal inativo há 14 dias", "users": ["uuid1", "uuid2"] }
  -- Para change_temperature: { "temperature": "frio" }
  -- Para assign_owner: { "owner_id": "uuid" }

  -- Controle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Estatísticas
  execution_count INTEGER DEFAULT 0,
  last_execution_at TIMESTAMPTZ,

  -- Ordem de execução (menor = primeira)
  priority INTEGER DEFAULT 100
);

-- =============================================
-- TABELA 2: LOGS DE EXECUÇÃO
-- =============================================

CREATE TABLE IF NOT EXISTS pipeline_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referências
  rule_id UUID NOT NULL REFERENCES pipeline_automation_rules(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  -- Execução
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),

  -- Detalhes
  trigger_data JSONB DEFAULT '{}'::jsonb,  -- Dados que dispararam a regra
  action_result JSONB DEFAULT '{}'::jsonb, -- Resultado da ação
  error_message TEXT,                       -- Mensagem de erro se falhou

  -- Auditoria
  executed_by UUID REFERENCES profiles(id) ON DELETE SET NULL -- NULL = sistema
);

-- =============================================
-- TABELA 3: AÇÕES EXECUTADAS (para desfazer se necessário)
-- =============================================

CREATE TABLE IF NOT EXISTS pipeline_automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referências
  log_id UUID NOT NULL REFERENCES pipeline_automation_logs(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  -- Ação executada
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}'::jsonb,

  -- Estado anterior (para desfazer)
  previous_state JSONB DEFAULT '{}'::jsonb,
  -- Exemplo: { "stage_id": "uuid_anterior", "temperature": "morno" }

  -- Controle
  can_undo BOOLEAN DEFAULT true,
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON pipeline_automation_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON pipeline_automation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON pipeline_automation_rules(priority);

CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON pipeline_automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_deal ON pipeline_automation_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed ON pipeline_automation_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON pipeline_automation_logs(status);

CREATE INDEX IF NOT EXISTS idx_automation_actions_log ON pipeline_automation_actions(log_id);
CREATE INDEX IF NOT EXISTS idx_automation_actions_deal ON pipeline_automation_actions(deal_id);
CREATE INDEX IF NOT EXISTS idx_automation_actions_undone ON pipeline_automation_actions(can_undo) WHERE undone_at IS NULL;

-- =============================================
-- FUNÇÃO: VERIFICAR SE DEAL ATENDE CONDIÇÕES
-- =============================================

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
    EXTRACT(DAY FROM NOW() - d.stage_updated_at)::INTEGER as days_in_current_stage,
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

-- =============================================
-- FUNÇÃO: EXECUTAR AÇÃO DE AUTOMAÇÃO
-- =============================================

CREATE OR REPLACE FUNCTION execute_automation_action(
  p_rule_id UUID,
  p_deal_id UUID,
  p_action_type TEXT,
  p_action_params JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_log_id UUID;
  v_previous_state JSONB := '{}'::jsonb;
  v_deal RECORD;
  v_task_id UUID;
BEGIN
  -- Buscar deal atual
  SELECT * INTO v_deal FROM deals WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'failed',
      'error', 'Deal not found'
    );
  END IF;

  -- Criar log
  INSERT INTO pipeline_automation_logs (rule_id, deal_id, status, trigger_data)
  VALUES (p_rule_id, p_deal_id, 'success', jsonb_build_object('deal_title', v_deal.title))
  RETURNING id INTO v_log_id;

  -- Executar ação baseada no tipo
  CASE p_action_type

    -- MOVER PARA ETAPA
    WHEN 'move_to_stage' THEN
      v_previous_state := jsonb_build_object('stage_id', v_deal.stage_id);

      UPDATE deals
      SET
        stage_id = (p_action_params->>'target_stage_id')::UUID,
        stage_updated_at = NOW(),
        updated_at = NOW()
      WHERE id = p_deal_id;

      v_result := jsonb_build_object(
        'action', 'move_to_stage',
        'from_stage', v_deal.stage_id,
        'to_stage', p_action_params->>'target_stage_id'
      );

    -- CRIAR TAREFA
    WHEN 'create_task' THEN
      INSERT INTO deal_activities (
        deal_id,
        type,
        title,
        description,
        due_date,
        created_by
      ) VALUES (
        p_deal_id,
        'task',
        COALESCE(p_action_params->>'title', 'Tarefa automática'),
        p_action_params->>'description',
        CASE
          WHEN p_action_params ? 'due_days' THEN
            NOW() + (COALESCE((p_action_params->>'due_days')::INTEGER, 3) || ' days')::INTERVAL
          ELSE NULL
        END,
        COALESCE(v_deal.owner_id, (SELECT id FROM profiles LIMIT 1))
      )
      RETURNING id INTO v_task_id;

      v_result := jsonb_build_object(
        'action', 'create_task',
        'task_id', v_task_id,
        'title', p_action_params->>'title'
      );

    -- ALTERAR TEMPERATURA
    WHEN 'change_temperature' THEN
      v_previous_state := jsonb_build_object('temperature', v_deal.temperature);

      UPDATE deals
      SET
        temperature = (p_action_params->>'temperature')::TEXT,
        updated_at = NOW()
      WHERE id = p_deal_id;

      v_result := jsonb_build_object(
        'action', 'change_temperature',
        'from_temperature', v_deal.temperature,
        'to_temperature', p_action_params->>'temperature'
      );

    -- ARQUIVAR DEAL
    WHEN 'archive_deal' THEN
      v_previous_state := jsonb_build_object('archived', v_deal.archived);

      UPDATE deals
      SET
        archived = true,
        archived_at = NOW(),
        updated_at = NOW()
      WHERE id = p_deal_id;

      v_result := jsonb_build_object(
        'action', 'archive_deal',
        'deal_id', p_deal_id
      );

    -- ATRIBUIR RESPONSÁVEL
    WHEN 'assign_owner' THEN
      v_previous_state := jsonb_build_object('owner_id', v_deal.owner_id);

      UPDATE deals
      SET
        owner_id = (p_action_params->>'owner_id')::UUID,
        updated_at = NOW()
      WHERE id = p_deal_id;

      v_result := jsonb_build_object(
        'action', 'assign_owner',
        'from_owner', v_deal.owner_id,
        'to_owner', p_action_params->>'owner_id'
      );

    ELSE
      v_result := jsonb_build_object(
        'status', 'failed',
        'error', 'Unknown action type: ' || p_action_type
      );

      UPDATE pipeline_automation_logs
      SET status = 'failed', error_message = 'Unknown action type'
      WHERE id = v_log_id;

      RETURN v_result;
  END CASE;

  -- Registrar ação executada
  INSERT INTO pipeline_automation_actions (
    log_id,
    deal_id,
    action_type,
    action_details,
    previous_state,
    can_undo
  ) VALUES (
    v_log_id,
    p_deal_id,
    p_action_type,
    v_result,
    v_previous_state,
    p_action_type IN ('move_to_stage', 'change_temperature', 'assign_owner') -- Apenas estas podem ser desfeitas
  );

  -- Atualizar log com resultado
  UPDATE pipeline_automation_logs
  SET action_result = v_result
  WHERE id = v_log_id;

  -- Atualizar estatísticas da regra
  UPDATE pipeline_automation_rules
  SET
    execution_count = execution_count + 1,
    last_execution_at = NOW()
  WHERE id = p_rule_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: PROCESSAR AUTOMAÇÕES PARA UM DEAL
-- =============================================

CREATE OR REPLACE FUNCTION process_deal_automations(
  p_deal_id UUID,
  p_trigger_type TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_rule RECORD;
  v_results JSONB := '[]'::jsonb;
  v_result JSONB;
BEGIN
  -- Buscar regras ativas
  FOR v_rule IN
    SELECT *
    FROM pipeline_automation_rules
    WHERE is_active = true
    AND (p_trigger_type IS NULL OR trigger_type = p_trigger_type)
    ORDER BY priority ASC, created_at ASC
  LOOP
    -- Verificar se condições são atendidas
    IF check_automation_conditions(p_deal_id, v_rule.conditions) THEN
      -- Executar ação
      v_result := execute_automation_action(
        v_rule.id,
        p_deal_id,
        v_rule.action_type,
        v_rule.action_params
      );

      -- Adicionar ao array de resultados
      v_results := v_results || jsonb_build_object(
        'rule_id', v_rule.id,
        'rule_name', v_rule.name,
        'result', v_result
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', jsonb_array_length(v_results),
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: DESFAZER AÇÃO DE AUTOMAÇÃO
-- =============================================

CREATE OR REPLACE FUNCTION undo_automation_action(
  p_action_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_action RECORD;
  v_deal_id UUID;
BEGIN
  -- Buscar ação
  SELECT * INTO v_action
  FROM pipeline_automation_actions
  WHERE id = p_action_id
  AND can_undo = true
  AND undone_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'failed',
      'error', 'Action not found or cannot be undone'
    );
  END IF;

  -- Restaurar estado anterior baseado no tipo de ação
  CASE v_action.action_type
    WHEN 'move_to_stage' THEN
      UPDATE deals
      SET stage_id = (v_action.previous_state->>'stage_id')::UUID
      WHERE id = v_action.deal_id;

    WHEN 'change_temperature' THEN
      UPDATE deals
      SET temperature = (v_action.previous_state->>'temperature')::TEXT
      WHERE id = v_action.deal_id;

    WHEN 'assign_owner' THEN
      UPDATE deals
      SET owner_id = (v_action.previous_state->>'owner_id')::UUID
      WHERE id = v_action.deal_id;
  END CASE;

  -- Marcar como desfeita
  UPDATE pipeline_automation_actions
  SET
    undone_at = NOW(),
    undone_by = p_user_id
  WHERE id = p_action_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'action_id', p_action_id,
    'action_type', v_action.action_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGER: PROCESSAR AUTOMAÇÕES AO MUDAR ETAPA
-- =============================================

CREATE OR REPLACE FUNCTION trigger_stage_change_automations()
RETURNS TRIGGER AS $$
BEGIN
  -- Processar automações quando mudar de etapa
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    PERFORM process_deal_automations(NEW.id, 'stage_changed');
  END IF;

  -- Processar automações quando mudar temperatura
  IF OLD.temperature IS DISTINCT FROM NEW.temperature THEN
    PERFORM process_deal_automations(NEW.id, 'temperature_changed');
  END IF;

  -- Processar automações quando mudar valor
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    PERFORM process_deal_automations(NEW.id, 'value_changed');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS deals_automation_trigger ON deals;
CREATE TRIGGER deals_automation_trigger
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_stage_change_automations();

-- =============================================
-- VIEW: ESTATÍSTICAS DE AUTOMAÇÕES
-- =============================================

CREATE OR REPLACE VIEW automation_stats AS
SELECT
  r.id as rule_id,
  r.name,
  r.trigger_type,
  r.action_type,
  r.is_active,
  r.execution_count,
  r.last_execution_at,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'success') as success_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'failed') as failed_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'skipped') as skipped_count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.undone_at IS NOT NULL) as undone_count
FROM pipeline_automation_rules r
LEFT JOIN pipeline_automation_logs l ON l.rule_id = r.id
LEFT JOIN pipeline_automation_actions a ON a.log_id = l.id
GROUP BY r.id, r.name, r.trigger_type, r.action_type, r.is_active, r.execution_count, r.last_execution_at;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE pipeline_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_automation_actions ENABLE ROW LEVEL SECURITY;

-- Automations rules: admin pode tudo, outros podem ver
CREATE POLICY "Admins can manage automation rules" ON pipeline_automation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Users can view automation rules" ON pipeline_automation_rules
  FOR SELECT USING (true);

-- Logs: todos podem ver seus deals
CREATE POLICY "Users can view automation logs for their deals" ON pipeline_automation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_id
      AND deals.owner_id = auth.uid()
    )
  );

-- Actions: todos podem ver e desfazer suas ações
CREATE POLICY "Users can view automation actions for their deals" ON pipeline_automation_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_id
      AND deals.owner_id = auth.uid()
    )
  );

-- =============================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- =============================================

COMMENT ON TABLE pipeline_automation_rules IS 'Regras de automação do pipeline';
COMMENT ON TABLE pipeline_automation_logs IS 'Histórico de execuções de automações';
COMMENT ON TABLE pipeline_automation_actions IS 'Ações executadas pelas automações (pode ser desfeito)';

COMMENT ON FUNCTION check_automation_conditions IS 'Verifica se deal atende as condições de uma regra';
COMMENT ON FUNCTION execute_automation_action IS 'Executa uma ação de automação em um deal';
COMMENT ON FUNCTION process_deal_automations IS 'Processa todas as automações aplicáveis a um deal';
COMMENT ON FUNCTION undo_automation_action IS 'Desfaz uma ação de automação executada';

-- =============================================
-- DADOS INICIAIS: REGRAS PADRÃO
-- =============================================

-- Regra 1: Arquivar deals inativos há 90 dias
INSERT INTO pipeline_automation_rules (name, description, trigger_type, conditions, action_type, action_params, priority)
VALUES (
  'Arquivar deals inativos há 90 dias',
  'Move automaticamente para arquivados os deals sem atividade há mais de 90 dias',
  'inactivity',
  '{"days_without_activity": 90, "status": "open"}'::jsonb,
  'archive_deal',
  '{}'::jsonb,
  10
);

-- Regra 2: Criar tarefa de follow-up após 7 dias
INSERT INTO pipeline_automation_rules (name, description, trigger_type, conditions, action_type, action_params, priority)
VALUES (
  'Follow-up após 7 dias sem contato',
  'Cria tarefa de follow-up quando deal fica 7 dias sem atividade',
  'inactivity',
  '{"days_without_activity": 7, "status": "open"}'::jsonb,
  'create_task',
  '{"title": "Follow-up necessário", "description": "Este deal está há 7 dias sem atividades. Entre em contato com o cliente.", "due_days": 1}'::jsonb,
  20
);

-- Regra 3: Alterar para frio após 14 dias na mesma etapa
INSERT INTO pipeline_automation_rules (name, description, trigger_type, conditions, action_type, action_params, priority)
VALUES (
  'Marcar como frio após 14 dias parado',
  'Altera temperatura para frio quando deal fica 14 dias na mesma etapa',
  'time_in_stage',
  '{"days_in_stage": 14, "status": "open"}'::jsonb,
  'change_temperature',
  '{"temperature": "frio"}'::jsonb,
  30
);

-- =============================================
-- FIM DA MIGRATION
-- =============================================

SELECT 'Sistema de Automações criado com sucesso! 🤖' as message;

-- Verificar regras criadas
SELECT
  name,
  trigger_type,
  action_type,
  is_active,
  priority
FROM pipeline_automation_rules
ORDER BY priority;
