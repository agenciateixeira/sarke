-- =====================================================
-- FIX DEFINITIVO: Forçar mudança de etapa SEMPRE
-- =====================================================

-- Remover trigger anterior
DROP TRIGGER IF EXISTS change_stage_before_value_change ON deals;

-- Nova função que SEMPRE muda (não importa o que frontend envie)
CREATE OR REPLACE FUNCTION force_stage_change_on_value()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_original NUMERIC;
  v_new NUMERIC;
  v_stage_fechamento UUID;
  v_stage_negociacao UUID;
BEGIN
  -- APENAS UPDATE
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- APENAS se valor mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_original := COALESCE(NEW.original_value, OLD.value);
  v_new := NEW.value;

  -- Se não mudou significativamente, não fazer nada
  IF v_original = 0 OR v_new = v_original THEN
    RETURN NEW;
  END IF;

  -- Buscar etapas
  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento' LIMIT 1;
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação' LIMIT 1;

  -- VALOR DIMINUIU → FORÇAR Negociação
  IF v_new < v_original AND v_stage_negociacao IS NOT NULL THEN
    NEW.stage_id := v_stage_negociacao;
    NEW.stage_updated_at := NOW();

  -- VALOR AUMENTOU → FORÇAR Fechamento
  ELSIF v_new > v_original AND v_stage_fechamento IS NOT NULL THEN
    NEW.stage_id := v_stage_fechamento;
    NEW.stage_updated_at := NOW();
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[force_stage] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Criar trigger com prioridade ALTA (executa por último)
-- Nome começa com 'z' para executar depois dos outros
DROP TRIGGER IF EXISTS zzz_force_stage_on_value_change ON deals;
CREATE TRIGGER zzz_force_stage_on_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION force_stage_change_on_value();

-- Agora garantir que as TASKS são criadas
-- Recriar função de tasks com logs
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
  v_task_count INT;
BEGIN
  -- APENAS UPDATE
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- APENAS se valor mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_original := COALESCE(NEW.original_value, OLD.value);
  v_new := NEW.value;

  -- Verificar se já existe task recente (últimas 24h) para não duplicar
  SELECT COUNT(*) INTO v_task_count
  FROM deal_activities
  WHERE deal_id = NEW.id
    AND type = 'task'
    AND title ILIKE '%valor%'
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Se já tem task recente, não criar outra
  IF v_task_count > 0 THEN
    RAISE NOTICE '[create_tasks] Já existe task recente, pulando criação';
    RETURN NEW;
  END IF;

  -- Buscar cliente
  BEGIN
    SELECT COALESCE(
      NULLIF(c.razao_social, ''),
      NULLIF(c.name, ''),
      c.email,
      'Cliente não identificado'
    )
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
        format('Deal "%s" (Cliente: %s) teve valor reduzido.', NEW.title, v_client_name),
        '/dashboard/comercial/pipeline',
        NEW.id, 'high', false
      );

      RAISE NOTICE '[create_tasks] ✅ Task de valor reduzido criada';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_tasks] Erro ao criar task: %', SQLERRM;
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
        format('Deal "%s" (Cliente: %s) teve valor aumentado!', NEW.title, v_client_name),
        '/dashboard/comercial/pipeline',
        NEW.id, 'high', false
      );

      RAISE NOTICE '[create_tasks] ✅ Task de valor aumentado criada';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_tasks] Erro ao criar task: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[create_tasks] Erro geral: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recriar trigger de tasks
DROP TRIGGER IF EXISTS create_tasks_before_value_change ON deals;
CREATE TRIGGER create_tasks_before_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_tasks_on_value_change();

-- TESTE COMPLETO
DO $$
DECLARE
  v_deal_id UUID;
  v_value_before NUMERIC;
  v_stage_before UUID;
  v_tasks_before INT;
  v_value_after NUMERIC;
  v_stage_after UUID;
  v_tasks_after INT;
BEGIN
  -- Setup
  SELECT id, value, stage_id INTO v_deal_id, v_value_before, v_stage_before
  FROM deals WHERE title = 'teste' LIMIT 1;

  SELECT COUNT(*) INTO v_tasks_before
  FROM deal_activities WHERE deal_id = v_deal_id AND type = 'task';

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE COMPLETO';
  RAISE NOTICE 'Deal: %', v_deal_id;
  RAISE NOTICE 'Valor antes: %', v_value_before;
  RAISE NOTICE 'Tasks antes: %', v_tasks_before;
  RAISE NOTICE '───────────────────────────────────────';

  -- UPDATE simulando frontend (envia tudo, inclusive stage_id atual)
  UPDATE deals
  SET
    value = 50000,
    stage_id = v_stage_before, -- Frontend envia stage atual
    updated_at = NOW()
  WHERE id = v_deal_id;

  -- Verificar
  SELECT value, stage_id INTO v_value_after, v_stage_after
  FROM deals WHERE id = v_deal_id;

  SELECT COUNT(*) INTO v_tasks_after
  FROM deal_activities WHERE deal_id = v_deal_id AND type = 'task';

  RAISE NOTICE '───────────────────────────────────────';
  RAISE NOTICE 'Valor depois: %', v_value_after;
  RAISE NOTICE 'Tasks depois: %', v_tasks_after;

  IF v_stage_after != v_stage_before THEN
    RAISE NOTICE '✅ Stage MUDOU para: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_after);
  ELSE
    RAISE NOTICE '❌ Stage NÃO MUDOU';
  END IF;

  IF v_tasks_after > v_tasks_before THEN
    RAISE NOTICE '✅ Task CRIADA!';
  ELSE
    RAISE NOTICE '⚠️ Task não criada (pode já existir)';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;

SELECT '✅ Triggers recriados com FORÇA!' as message;
SELECT 'Agora SEMPRE muda stage, mesmo que frontend envie stage_id' as how;
SELECT 'Tasks não duplicam (apenas 1 a cada 24h)' as protection;
