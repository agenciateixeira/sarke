-- =====================================================
-- FIX: Permissões do trigger
-- =====================================================

-- Problema: O trigger pode estar falhando por falta de permissões
-- quando tenta inserir em deal_activities ou notifications

-- Solução: Adicionar SECURITY DEFINER nas funções do trigger
-- Isso faz o trigger rodar com permissões do owner, não do usuário

DROP TRIGGER IF EXISTS check_value_change_trigger ON deals;
DROP FUNCTION IF EXISTS check_value_change() CASCADE;

CREATE OR REPLACE FUNCTION check_value_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- IMPORTANTE: Roda com permissões do owner
SET search_path = public
AS $$
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

    RAISE NOTICE '🔍 Trigger ativado - Deal: %, Valor: % → %', NEW.title, v_original, v_new;

    -- BUSCAR NOME DO CLIENTE (inteligente)
    BEGIN
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

      RAISE NOTICE '👤 Cliente: %', COALESCE(v_client_name, 'NULL');
    EXCEPTION WHEN OTHERS THEN
      v_client_name := 'Cliente não identificado';
      RAISE NOTICE '⚠️ Erro ao buscar cliente: %', SQLERRM;
    END;

    -- Se não encontrou, usar valor padrão
    v_client_name := COALESCE(v_client_name, 'Cliente não identificado');

    -- Buscar IDs das etapas
    BEGIN
      SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name ILIKE '%fechamento%' LIMIT 1;
      SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name ILIKE '%negocia%' LIMIT 1;

      RAISE NOTICE '📊 Etapas - Negociação: %, Fechamento: %',
        COALESCE(v_stage_negociacao::TEXT, 'NÃO ENCONTRADA'),
        COALESCE(v_stage_fechamento::TEXT, 'NÃO ENCONTRADA');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Erro ao buscar etapas: %', SQLERRM;
    END;

    -- REGRA 1: VALOR DIMINUIU
    IF v_new < v_original THEN
      RAISE NOTICE '📉 VALOR DIMINUIU de % para %', v_original, v_new;

      -- Mover para Negociação (se a etapa existe)
      IF v_stage_negociacao IS NOT NULL THEN
        NEW.stage_id := v_stage_negociacao;
        NEW.stage_updated_at := NOW();
        RAISE NOTICE '✅ Movendo para Negociação';
      ELSE
        RAISE NOTICE '⚠️ Etapa Negociação não encontrada, não movendo';
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
        RAISE NOTICE '✅ Task criada com sucesso';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao criar task: %', SQLERRM;
        -- Não lançar erro, apenas logar
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
        RAISE NOTICE '✅ Notificação criada com sucesso';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao criar notificação: %', SQLERRM;
        -- Não lançar erro, apenas logar
      END;

    -- REGRA 2: VALOR AUMENTOU
    ELSIF v_new > v_original THEN
      RAISE NOTICE '📈 VALOR AUMENTOU de % para %', v_original, v_new;

      -- Mover para Fechamento (se a etapa existe)
      IF v_stage_fechamento IS NOT NULL THEN
        NEW.stage_id := v_stage_fechamento;
        NEW.stage_updated_at := NOW();
        RAISE NOTICE '✅ Movendo para Fechamento';
      ELSE
        RAISE NOTICE '⚠️ Etapa Fechamento não encontrada, não movendo';
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
        RAISE NOTICE '✅ Task criada com sucesso';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao criar task: %', SQLERRM;
        -- Não lançar erro, apenas logar
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
        RAISE NOTICE '✅ Notificação criada com sucesso';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao criar notificação: %', SQLERRM;
        -- Não lançar erro, apenas logar
      END;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Se der qualquer erro, apenas logar mas não bloquear o update
  RAISE NOTICE '❌ ERRO GERAL NO TRIGGER: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER check_value_change_trigger
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION check_value_change();

SELECT '✅ Trigger recriado com SECURITY DEFINER e logs detalhados!' as message;
SELECT 'Agora você verá logs NOTICE no PostgreSQL quando testar' as info;
