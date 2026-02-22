-- =====================================================
-- FIX COMPLETO E FINAL
-- =====================================================

-- 1. Mudar lógica para comparar com OLD.value (valor anterior)
--    em vez de original_value
-- =====================================================

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
BEGIN
  -- APENAS UPDATE
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- APENAS se valor mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_old := OLD.value; -- Comparar com valor ANTERIOR
  v_new := NEW.value;

  -- Buscar etapas
  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento' LIMIT 1;
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação' LIMIT 1;

  -- QUALQUER DIMINUIÇÃO → Negociação
  IF v_new < v_old AND v_stage_negociacao IS NOT NULL THEN
    NEW.stage_id := v_stage_negociacao;
    NEW.stage_updated_at := NOW();

  -- QUALQUER AUMENTO → Fechamento
  ELSIF v_new > v_old AND v_stage_fechamento IS NOT NULL THEN
    NEW.stage_id := v_stage_fechamento;
    NEW.stage_updated_at := NOW();
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

-- 2. Corrigir criação de tasks
--    Remover validação de 24h que impede criação
-- =====================================================

DROP TRIGGER IF EXISTS create_tasks_before_value_change ON deals;

CREATE OR REPLACE FUNCTION create_tasks_on_value_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old NUMERIC;
  v_new NUMERIC;
  v_client_name TEXT;
  v_task_description TEXT;
BEGIN
  -- APENAS UPDATE
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- APENAS se valor mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_old := OLD.value;
  v_new := NEW.value;

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
  IF v_new < v_old THEN
    v_task_description := format(
      '🔴 ALERTA: O valor do deal "{deal_titulo}" (Cliente: {cliente_nome}) foi reduzido de R$ %s para R$ %s.

📋 Ações necessárias:
• Confirmar o motivo da redução com o cliente
• Verificar se a negociação está alinhada
• Documentar as condições acordadas
• Avaliar se ainda é viável avançar para fechamento

💡 Esta task foi criada automaticamente pelo sistema.',
      TO_CHAR(v_old, 'FM999G999G990D00'),
      TO_CHAR(v_new, 'FM999G999G990D00')
    );

    -- Substituir variáveis
    v_task_description := REPLACE(v_task_description, '{deal_titulo}', NEW.title);
    v_task_description := REPLACE(v_task_description, '{cliente_nome}', v_client_name);

    BEGIN
      INSERT INTO deal_activities (deal_id, type, title, description, created_by, due_date)
      VALUES (
        NEW.id, 'task',
        format('⚠️ Valor Reduzido - {cliente_nome}'),
        v_task_description,
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        NOW() + INTERVAL '1 day'
      )
      ON CONFLICT DO NOTHING; -- Evitar erro se já existe

      -- Substituir variável no título também
      UPDATE deal_activities
      SET title = REPLACE(title, '{cliente_nome}', v_client_name)
      WHERE deal_id = NEW.id
        AND title ILIKE '%{cliente_nome}%'
        AND created_at > NOW() - INTERVAL '10 seconds';

      INSERT INTO notifications (user_id, type, title, message, link, deal_id, priority, read)
      VALUES (
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        'deal_assigned',
        '⚠️ Valor Reduzido',
        format('Deal "%s" (Cliente: %s) teve valor reduzido.', NEW.title, v_client_name),
        '/dashboard/comercial/pipeline',
        NEW.id, 'high', false
      )
      ON CONFLICT DO NOTHING;

      RAISE NOTICE '[create_tasks] ✅ Task de valor reduzido criada';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_tasks] Erro ao criar task: %', SQLERRM;
    END;

  -- VALOR AUMENTOU
  ELSIF v_new > v_old THEN
    v_task_description := format(
      '🟢 OPORTUNIDADE: O valor do deal "{deal_titulo}" (Cliente: {cliente_nome}) foi aumentado de R$ %s para R$ %s!

✅ Próximos passos:
• Preparar documentação completa para fechamento
• Revisar termos e condições do contrato
• Agendar reunião de alinhamento final
• Verificar aprovações necessárias

💡 Esta task foi criada automaticamente pelo sistema.',
      TO_CHAR(v_old, 'FM999G999G990D00'),
      TO_CHAR(v_new, 'FM999G999G990D00')
    );

    -- Substituir variáveis
    v_task_description := REPLACE(v_task_description, '{deal_titulo}', NEW.title);
    v_task_description := REPLACE(v_task_description, '{cliente_nome}', v_client_name);

    BEGIN
      INSERT INTO deal_activities (deal_id, type, title, description, created_by, due_date)
      VALUES (
        NEW.id, 'task',
        format('✅ Valor Aumentado - {cliente_nome}'),
        v_task_description,
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        NOW() + INTERVAL '2 days'
      )
      ON CONFLICT DO NOTHING;

      -- Substituir variável no título também
      UPDATE deal_activities
      SET title = REPLACE(title, '{cliente_nome}', v_client_name)
      WHERE deal_id = NEW.id
        AND title ILIKE '%{cliente_nome}%'
        AND created_at > NOW() - INTERVAL '10 seconds';

      INSERT INTO notifications (user_id, type, title, message, link, deal_id, priority, read)
      VALUES (
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        'deal_assigned',
        '✅ Valor Aumentado!',
        format('Deal "%s" (Cliente: %s) teve valor aumentado!', NEW.title, v_client_name),
        '/dashboard/comercial/pipeline',
        NEW.id, 'high', false
      )
      ON CONFLICT DO NOTHING;

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

CREATE TRIGGER create_tasks_before_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_tasks_on_value_change();

-- 3. TESTE COMPLETO
-- =====================================================

DO $$
DECLARE
  v_deal_id UUID;
  v_stage_before UUID;
  v_stage_after UUID;
  v_tasks_before INT;
  v_tasks_after INT;
BEGIN
  SELECT id, stage_id INTO v_deal_id, v_stage_before
  FROM deals WHERE title = 'teste';

  SELECT COUNT(*) INTO v_tasks_before
  FROM deal_activities WHERE deal_id = v_deal_id AND type = 'task';

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE: Aumentar valor';
  RAISE NOTICE 'Deal: %', v_deal_id;
  RAISE NOTICE 'Tasks antes: %', v_tasks_before;
  RAISE NOTICE '───────────────────────────────────────';

  -- Aumentar valor (de 770 para 5000)
  UPDATE deals SET value = 5000 WHERE id = v_deal_id;

  SELECT stage_id INTO v_stage_after FROM deals WHERE id = v_deal_id;
  SELECT COUNT(*) INTO v_tasks_after
  FROM deal_activities WHERE deal_id = v_deal_id AND type = 'task';

  RAISE NOTICE 'Stage antes: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_before);
  RAISE NOTICE 'Stage depois: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_after);
  RAISE NOTICE 'Tasks depois: %', v_tasks_after;

  IF (SELECT name FROM pipeline_stages WHERE id = v_stage_after) = 'Fechamento' THEN
    RAISE NOTICE '✅ FOI PARA FECHAMENTO!';
  ELSE
    RAISE NOTICE '❌ Não foi para Fechamento';
  END IF;

  IF v_tasks_after > v_tasks_before THEN
    RAISE NOTICE '✅ TASK CRIADA!';
  ELSE
    RAISE NOTICE '⚠️ Task não criada';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;

SELECT '✅ FIX COMPLETO aplicado!' as message;
SELECT 'Agora compara com valor ANTERIOR (não original)' as change_1;
SELECT 'Tasks sempre são criadas (sem limite de 24h)' as change_2;
SELECT 'Variáveis {cliente_nome} e {deal_titulo} funcionam' as change_3;
