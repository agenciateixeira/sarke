-- =====================================================
-- FIX: Trigger de INSERT não deve causar erro
-- =====================================================

-- Recriar função set_original_value com error handling
CREATE OR REPLACE FUNCTION set_original_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas setar na criação (INSERT)
  IF TG_OP = 'INSERT' AND NEW.value IS NOT NULL THEN
    NEW.original_value := NEW.value;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Se der erro, apenas logar mas não bloquear
  RAISE WARNING 'Erro em set_original_value: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS set_original_value_on_insert ON deals;
CREATE TRIGGER set_original_value_on_insert
  BEFORE INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_original_value();

-- Adicionar error handling no trigger de tasks também
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
  -- NÃO executar em INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Apenas UPDATE
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
        RAISE WARNING 'Erro ao criar task de valor reduzido: %', SQLERRM;
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
        RAISE WARNING 'Erro ao criar notificação de valor aumentado: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro geral em create_tasks_on_value_change: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS create_tasks_before_value_change ON deals;
CREATE TRIGGER create_tasks_before_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_tasks_on_value_change();

-- Adicionar error handling no trigger AFTER também
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
  -- NÃO executar em INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Apenas processar se o valor mudou E não é um INSERT
  IF OLD.value IS DISTINCT FROM NEW.value AND OLD.id IS NOT NULL THEN
    v_original := COALESCE(NEW.original_value, OLD.value);
    v_new := NEW.value;

    -- Buscar IDs das etapas
    SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento' LIMIT 1;
    SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação' LIMIT 1;

    RAISE NOTICE '🔄 change_stage_on_value_change ativado';
    RAISE NOTICE 'Valor: % → %', v_original, v_new;

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
  RAISE WARNING 'Erro em change_stage_on_value_change: %', SQLERRM;
  RETURN NEW; -- Não bloquear o update principal
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS change_stage_after_value_change ON deals;
CREATE TRIGGER change_stage_after_value_change
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION change_stage_on_value_change();

SELECT '✅ Triggers corrigidos com error handling!' as message;
SELECT 'Agora NÃO vão bloquear INSERT ou UPDATE de deals' as info;
