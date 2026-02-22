-- =====================================================
-- MELHORIA: Automação de tarefas com atribuição e notificações
-- =====================================================

-- Atualizar função de executar ação para suportar assign_to em create_task
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
  v_assigned_user_id UUID;
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

    -- CRIAR TAREFA (MELHORADO)
    WHEN 'create_task' THEN
      -- Determinar quem será atribuído (prioridade: assign_to > owner_id > primeiro usuário)
      IF p_action_params ? 'assign_to' AND (p_action_params->>'assign_to')::UUID IS NOT NULL THEN
        v_assigned_user_id := (p_action_params->>'assign_to')::UUID;
      ELSIF v_deal.owner_id IS NOT NULL THEN
        v_assigned_user_id := v_deal.owner_id;
      ELSE
        SELECT id INTO v_assigned_user_id FROM profiles LIMIT 1;
      END IF;

      -- Criar atividade/tarefa
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
        v_assigned_user_id
      )
      RETURNING id INTO v_task_id;

      -- Criar notificação para o usuário atribuído
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        action_label,
        deal_id,
        priority,
        read
      ) VALUES (
        v_assigned_user_id,
        'deal_assigned',  -- Reutilizando tipo existente
        COALESCE(p_action_params->>'title', 'Nova tarefa automática'),
        COALESCE(
          p_action_params->>'description',
          'Uma tarefa foi criada automaticamente para o deal "' || v_deal.title || '"'
        ),
        '/dashboard/comercial/pipeline',
        'Ver Pipeline',
        p_deal_id,
        COALESCE((p_action_params->>'priority')::TEXT, 'normal'),
        false
      );

      v_result := jsonb_build_object(
        'action', 'create_task',
        'task_id', v_task_id,
        'title', p_action_params->>'title',
        'assigned_to', v_assigned_user_id,
        'notification_sent', true
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

    -- ENVIAR NOTIFICAÇÃO
    WHEN 'send_notification' THEN
      -- Inserir notificação para os usuários especificados ou para o owner
      IF p_action_params ? 'users' THEN
        -- Notificar múltiplos usuários
        INSERT INTO notifications (user_id, type, title, message, deal_id, priority, read)
        SELECT
          (jsonb_array_elements_text(p_action_params->'users'))::UUID,
          'automation_executed',
          'Automação Executada',
          COALESCE(p_action_params->>'message', 'Uma automação foi executada'),
          p_deal_id,
          'normal',
          false;
      ELSE
        -- Notificar apenas o owner
        INSERT INTO notifications (user_id, type, title, message, deal_id, priority, read)
        VALUES (
          v_deal.owner_id,
          'automation_executed',
          'Automação Executada',
          COALESCE(p_action_params->>'message', 'Uma automação foi executada'),
          p_deal_id,
          'normal',
          false
        );
      END IF;

      v_result := jsonb_build_object(
        'action', 'send_notification',
        'message', p_action_params->>'message'
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

SELECT 'Automação de tarefas melhorada com atribuição e notificações! ✅' as message;
