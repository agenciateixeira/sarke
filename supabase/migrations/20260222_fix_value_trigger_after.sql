-- =====================================================
-- FIX: Trigger de valor rodando AFTER para não ser sobrescrito
-- =====================================================

-- Remover trigger BEFORE
DROP TRIGGER IF EXISTS check_value_change_trigger ON deals;

-- Manter a função check_value_change() para criar tasks e notificações
-- mas SEM mudar stage_id (isso será feito pelo novo trigger AFTER)

-- Nova função que SÓ muda a etapa (roda AFTER)
CREATE OR REPLACE FUNCTION change_stage_on_value_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original NUMERIC;
  v_new NUMERIC;
  v_stage_fechamento UUID;
  v_stage_negociacao UUID;
BEGIN
  -- Apenas processar se o valor mudou E não é um INSERT
  IF OLD.value IS DISTINCT FROM NEW.value AND OLD.id IS NOT NULL THEN
    v_original := COALESCE(NEW.original_value, OLD.value);
    v_new := NEW.value;

    -- Buscar IDs das etapas
    SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento' LIMIT 1;
    SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação' LIMIT 1;

    RAISE NOTICE '🔄 change_stage_on_value_change ativado';
    RAISE NOTICE 'Valor: % → %', v_original, v_new;
    RAISE NOTICE 'Etapa Negociação ID: %', v_stage_negociacao;
    RAISE NOTICE 'Etapa Fechamento ID: %', v_stage_fechamento;

    -- VALOR DIMINUIU → Mover para Negociação
    IF v_new < v_original AND v_stage_negociacao IS NOT NULL THEN
      RAISE NOTICE '📉 Movendo para Negociação...';

      UPDATE deals
      SET
        stage_id = v_stage_negociacao,
        stage_updated_at = NOW()
      WHERE id = NEW.id;

      RAISE NOTICE '✅ Deal movido para Negociação!';

    -- VALOR AUMENTOU → Mover para Fechamento
    ELSIF v_new > v_original AND v_stage_fechamento IS NOT NULL THEN
      RAISE NOTICE '📈 Movendo para Fechamento...';

      UPDATE deals
      SET
        stage_id = v_stage_fechamento,
        stage_updated_at = NOW()
      WHERE id = NEW.id;

      RAISE NOTICE '✅ Deal movido para Fechamento!';
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERRO: %', SQLERRM;
  RETURN NEW; -- Não bloquear o update principal
END;
$$;

-- Criar novo trigger AFTER (roda DEPOIS do UPDATE ser aplicado)
CREATE TRIGGER change_stage_after_value_change
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION change_stage_on_value_change();

-- Recriar trigger BEFORE apenas para tasks (SEM mudança de etapa)
CREATE OR REPLACE FUNCTION create_tasks_on_value_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original NUMERIC;
  v_new NUMERIC;
  v_client_name TEXT;
  v_task_description TEXT;
BEGIN
  IF OLD.value IS DISTINCT FROM NEW.value AND OLD.id IS NOT NULL THEN
    v_original := COALESCE(NEW.original_value, OLD.value);
    v_new := NEW.value;

    -- Buscar cliente
    BEGIN
      SELECT COALESCE(NULLIF(c.razao_social, ''), NULLIF(c.name, ''), c.email, 'Cliente não identificado')
      INTO v_client_name
      FROM clients c
      WHERE c.id = NEW.client_id;
    EXCEPTION WHEN OTHERS THEN
      v_client_name := 'Cliente não identificado';
    END;

    v_client_name := COALESCE(v_client_name, 'Cliente não identificado');

    -- VALOR DIMINUIU
    IF v_new < v_original THEN
      v_task_description := format(
        '🔴 ALERTA: O valor do deal "%s" (Cliente: %s) foi reduzido de R$ %s para R$ %s.

📋 Ações necessárias:
• Confirmar o motivo da redução com o cliente
• Verificar se a negociação está alinhada
• Documentar as condições acordadas
• Avaliar se ainda é viável avançar para fechamento

💡 Esta task foi criada automaticamente pelo sistema.',
        NEW.title, v_client_name,
        TO_CHAR(v_original, 'FM999G999G990D00'),
        TO_CHAR(v_new, 'FM999G999G990D00')
      );

      BEGIN
        INSERT INTO deal_activities (deal_id, type, title, description, created_by, due_date)
        VALUES (
          NEW.id, 'task',
          format('⚠️ Valor Reduzido - %s', v_client_name),
          v_task_description,
          COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
          NOW() + INTERVAL '1 day'
        );

        INSERT INTO notifications (user_id, type, title, message, link, deal_id, priority, read)
        VALUES (
          COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
          'deal_assigned',
          '⚠️ Valor Reduzido',
          format('O deal "%s" (Cliente: %s) teve valor reduzido.', NEW.title, v_client_name),
          '/dashboard/comercial/pipeline',
          NEW.id, 'high', false
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao criar task: %', SQLERRM;
      END;

    -- VALOR AUMENTOU
    ELSIF v_new > v_original THEN
      v_task_description := format(
        '🟢 OPORTUNIDADE: O valor do deal "%s" (Cliente: %s) foi aumentado de R$ %s para R$ %s!

✅ Próximos passos:
• Preparar documentação completa para fechamento
• Revisar termos e condições do contrato
• Agendar reunião de alinhamento final
• Verificar aprovações necessárias

💡 Esta task foi criada automaticamente pelo sistema.',
        NEW.title, v_client_name,
        TO_CHAR(v_original, 'FM999G999G990D00'),
        TO_CHAR(v_new, 'FM999G999G990D00')
      );

      BEGIN
        INSERT INTO deal_activities (deal_id, type, title, description, created_by, due_date)
        VALUES (
          NEW.id, 'task',
          format('✅ Valor Aumentado - %s', v_client_name),
          v_task_description,
          COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
          NOW() + INTERVAL '2 days'
        );

        INSERT INTO notifications (user_id, type, title, message, link, deal_id, priority, read)
        VALUES (
          COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
          'deal_assigned',
          '✅ Valor Aumentado!',
          format('O deal "%s" (Cliente: %s) teve valor aumentado!', NEW.title, v_client_name),
          '/dashboard/comercial/pipeline',
          NEW.id, 'high', false
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao criar notificação: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERRO GERAL: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_tasks_before_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_tasks_on_value_change();

SELECT '✅ Sistema de mudança de etapa corrigido!' as message;
SELECT 'Agora usa trigger AFTER que roda DEPOIS do frontend salvar' as info;
SELECT 'Isso evita que o frontend sobrescreva a mudança de etapa' as detail;
