-- =====================================================
-- FIX: Rastreamento de valor com nome do cliente
-- =====================================================

-- Recriar função com mapeamento inteligente do cliente
CREATE OR REPLACE FUNCTION check_value_change()
RETURNS TRIGGER AS $$
DECLARE
  v_original NUMERIC;
  v_new NUMERIC;
  v_stage_fechamento UUID;
  v_stage_negociacao UUID;
  v_client_name TEXT;
  v_task_description TEXT;
BEGIN
  -- Apenas processar se o valor mudou E não é um INSERT
  IF OLD.value IS DISTINCT FROM NEW.value AND OLD.id IS NOT NULL THEN
    v_original := COALESCE(NEW.original_value, OLD.value);
    v_new := NEW.value;

    -- BUSCAR NOME DO CLIENTE (inteligente)
    SELECT
      COALESCE(
        c.name,
        c.company_name,
        c.email,
        'Cliente não identificado'
      )
    INTO v_client_name
    FROM clients c
    WHERE c.id = NEW.client_id;

    -- Se não encontrou, usar valor padrão
    v_client_name := COALESCE(v_client_name, 'Cliente não identificado');

    -- Buscar IDs das etapas
    SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name ILIKE '%fechamento%' LIMIT 1;
    SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name ILIKE '%negocia%' LIMIT 1;

    -- REGRA 1: VALOR DIMINUIU
    IF v_new < v_original THEN
      -- Mover para Negociação (se a etapa existe)
      IF v_stage_negociacao IS NOT NULL THEN
        NEW.stage_id := v_stage_negociacao;
        NEW.stage_updated_at := NOW();
      END IF;

      -- Construir descrição inteligente
      v_task_description := format(
        '🔴 ALERTA: O valor do deal "%s" (Cliente: %s) foi reduzido de R$ %s para R$ %s.

📋 Ações necessárias:
• Confirmar o motivo da redução com o cliente
• Verificar se a negociação está alinhada
• Documentar as condições acordadas
• Avaliar se ainda é viável avançar para fechamento

💡 Esta task foi criada automaticamente pelo sistema de rastreamento de valores.',
        NEW.title,
        v_client_name,
        TO_CHAR(v_original, 'FM999G999G990D00'),
        TO_CHAR(v_new, 'FM999G999G990D00')
      );

      -- Criar tarefa de alerta com informações completas
      BEGIN
        INSERT INTO deal_activities (
          deal_id,
          type,
          title,
          description,
          created_by,
          due_date
        ) VALUES (
          NEW.id,
          'task',
          format('⚠️ Valor Reduzido - %s', v_client_name),
          v_task_description,
          COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
          NOW() + INTERVAL '1 day'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar task de valor reduzido: %', SQLERRM;
      END;

      -- Criar notificação
      BEGIN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link,
          deal_id,
          priority,
          read
        ) VALUES (
          COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
          'deal_assigned',
          '⚠️ Valor Reduzido',
          format('O deal "%s" (Cliente: %s) teve o valor reduzido de R$ %s para R$ %s.',
            NEW.title,
            v_client_name,
            TO_CHAR(v_original, 'FM999G999G990D00'),
            TO_CHAR(v_new, 'FM999G999G990D00')
          ),
          '/dashboard/comercial/pipeline',
          NEW.id,
          'high',
          false
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar notificação de valor reduzido: %', SQLERRM;
      END;

      -- Log para debug
      RAISE NOTICE '✅ Valor reduzido processado: Deal "%" (Cliente: %), R$ % → R$ %',
        NEW.title, v_client_name, v_original, v_new;

    -- REGRA 2: VALOR AUMENTOU
    ELSIF v_new > v_original THEN
      -- Mover para Fechamento (se a etapa existe)
      IF v_stage_fechamento IS NOT NULL THEN
        NEW.stage_id := v_stage_fechamento;
        NEW.stage_updated_at := NOW();
      END IF;

      -- Construir descrição inteligente
      v_task_description := format(
        '🟢 OPORTUNIDADE: O valor do deal "%s" (Cliente: %s) foi aumentado de R$ %s para R$ %s!

✅ Próximos passos:
• Preparar documentação completa para fechamento
• Revisar termos e condições do contrato
• Agendar reunião de alinhamento final
• Verificar aprovações necessárias

💡 Esta task foi criada automaticamente pelo sistema de rastreamento de valores.',
        NEW.title,
        v_client_name,
        TO_CHAR(v_original, 'FM999G999G990D00'),
        TO_CHAR(v_new, 'FM999G999G990D00')
      );

      -- Criar tarefa positiva com informações completas
      BEGIN
        INSERT INTO deal_activities (
          deal_id,
          type,
          title,
          description,
          created_by,
          due_date
        ) VALUES (
          NEW.id,
          'task',
          format('✅ Valor Aumentado - %s', v_client_name),
          v_task_description,
          COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
          NOW() + INTERVAL '2 days'
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar task de valor aumentado: %', SQLERRM;
      END;

      -- Criar notificação positiva
      BEGIN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link,
          deal_id,
          priority,
          read
        ) VALUES (
          COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
          'deal_assigned',
          '✅ Valor Aumentado!',
          format('O deal "%s" (Cliente: %s) teve o valor aumentado de R$ %s para R$ %s!',
            NEW.title,
            v_client_name,
            TO_CHAR(v_original, 'FM999G999G990D00'),
            TO_CHAR(v_new, 'FM999G999G990D00')
          ),
          '/dashboard/comercial/pipeline',
          NEW.id,
          'high',
          false
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar notificação de valor aumentado: %', SQLERRM;
      END;

      -- Log para debug
      RAISE NOTICE '✅ Valor aumentado processado: Deal "%" (Cliente: %), R$ % → R$ %',
        NEW.title, v_client_name, v_original, v_new;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS check_value_change_trigger ON deals;
CREATE TRIGGER check_value_change_trigger
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION check_value_change();

SELECT '✅ Sistema de rastreamento de valor MELHORADO com nome do cliente!' as message;
SELECT 'Agora as tasks incluem automaticamente:' as info;
SELECT '  • Nome do cliente (name, company_name ou email)' as feature_1;
SELECT '  • Valor antigo e novo formatados em R$' as feature_2;
SELECT '  • Descrição completa com ações recomendadas' as feature_3;
SELECT '  • Logs para debug (RAISE NOTICE)' as feature_4;
SELECT '  • Error handling para não bloquear updates' as feature_5;
