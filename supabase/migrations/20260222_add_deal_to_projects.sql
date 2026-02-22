-- =====================================================
-- STEP 1: Adicionar deal_id na tabela projects
-- =====================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_deal_id ON projects(deal_id);

-- =====================================================
-- STEP 2: Criar função para criar projeto automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION create_project_on_value_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old NUMERIC;
  v_new NUMERIC;
  v_client_name TEXT;
  v_project_title TEXT;
  v_project_description TEXT;
  v_new_project_id UUID;
  v_project_count INT;
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

  -- Verificar se já existe projeto recente (últimas 24h) para não duplicar
  SELECT COUNT(*) INTO v_project_count
  FROM projects
  WHERE deal_id = NEW.id
    AND name ILIKE '%Valor%'
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Se já tem projeto recente, não criar outro
  IF v_project_count > 0 THEN
    RAISE NOTICE '[create_project] Já existe projeto recente, pulando criação';
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

  -- VALOR DIMINUIU → Criar projeto de revisão
  IF v_new < v_old THEN
    v_project_title := format('⚠️ Revisar Negociação - %s', v_client_name);
    v_project_description := format(
      '🔴 ALERTA: O valor do deal "%s" foi reduzido de R$ %s para R$ %s.

📋 Ações necessárias:
• Confirmar o motivo da redução com o cliente
• Verificar se a negociação está alinhada
• Documentar as condições acordadas
• Avaliar se ainda é viável avançar

Cliente: %s
💡 Projeto criado automaticamente pelo sistema.',
      NEW.title,
      TO_CHAR(v_old, 'FM999G999G990D00'),
      TO_CHAR(v_new, 'FM999G999G990D00'),
      v_client_name
    );

    BEGIN
      INSERT INTO projects (
        name,
        description,
        deal_id,
        client_id,
        status,
        priority,
        start_date,
        due_date,
        created_by
      )
      VALUES (
        v_project_title,
        v_project_description,
        NEW.id,
        NEW.client_id,
        'in_progress',
        'high',
        NOW(),
        NOW() + INTERVAL '3 days',
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1))
      )
      RETURNING id INTO v_new_project_id;

      -- Criar notificação
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        deal_id,
        priority,
        read
      )
      VALUES (
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        'deal_assigned',
        '⚠️ Valor Reduzido',
        format('Projeto criado: "%s"', v_project_title),
        format('/dashboard/projetos/%s', v_new_project_id),
        NEW.id,
        'high',
        false
      );

      RAISE NOTICE '[create_project] ✅ Projeto de revisão criado: %', v_new_project_id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_project] Erro ao criar projeto: %', SQLERRM;
    END;

  -- VALOR AUMENTOU → Criar projeto de fechamento
  ELSIF v_new > v_old THEN
    v_project_title := format('✅ Preparar Fechamento - %s', v_client_name);
    v_project_description := format(
      '🟢 OPORTUNIDADE: O valor do deal "%s" foi aumentado de R$ %s para R$ %s!

✅ Próximos passos:
• Preparar documentação completa para fechamento
• Revisar termos e condições do contrato
• Agendar reunião de alinhamento final
• Verificar aprovações necessárias

Cliente: %s
💡 Projeto criado automaticamente pelo sistema.',
      NEW.title,
      TO_CHAR(v_old, 'FM999G999G990D00'),
      TO_CHAR(v_new, 'FM999G999G990D00'),
      v_client_name
    );

    BEGIN
      INSERT INTO projects (
        name,
        description,
        deal_id,
        client_id,
        status,
        priority,
        start_date,
        due_date,
        created_by
      )
      VALUES (
        v_project_title,
        v_project_description,
        NEW.id,
        NEW.client_id,
        'in_progress',
        'high',
        NOW(),
        NOW() + INTERVAL '5 days',
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1))
      )
      RETURNING id INTO v_new_project_id;

      -- Criar notificação
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        deal_id,
        priority,
        read
      )
      VALUES (
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        'deal_assigned',
        '✅ Valor Aumentado!',
        format('Projeto criado: "%s"', v_project_title),
        format('/dashboard/projetos/%s', v_new_project_id),
        NEW.id,
        'high',
        false
      );

      RAISE NOTICE '[create_project] ✅ Projeto de fechamento criado: %', v_new_project_id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_project] Erro ao criar projeto: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[create_project] Erro geral: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 3: Remover trigger antigo e criar novo
-- =====================================================

DROP TRIGGER IF EXISTS create_tasks_before_value_change ON deals;
DROP TRIGGER IF EXISTS create_project_on_value_change ON deals;

CREATE TRIGGER create_project_on_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_project_on_value_change();

-- =====================================================
-- STEP 4: TESTE COMPLETO
-- =====================================================

DO $$
DECLARE
  v_deal_id UUID;
  v_stage_before UUID;
  v_stage_after UUID;
  v_projects_before INT;
  v_projects_after INT;
  v_new_project_name TEXT;
BEGIN
  SELECT id, stage_id INTO v_deal_id, v_stage_before
  FROM deals WHERE title = 'teste';

  IF v_deal_id IS NULL THEN
    RAISE NOTICE '⚠️ Deal "teste" não encontrado. Teste ignorado.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_projects_before
  FROM projects WHERE deal_id = v_deal_id;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE: Aumentar valor (deve criar projeto)';
  RAISE NOTICE 'Deal: %', v_deal_id;
  RAISE NOTICE 'Projetos antes: %', v_projects_before;
  RAISE NOTICE '───────────────────────────────────────';

  -- Aumentar valor (de 8000 para 10000)
  UPDATE deals SET value = 10000 WHERE id = v_deal_id;

  SELECT stage_id INTO v_stage_after FROM deals WHERE id = v_deal_id;
  SELECT COUNT(*) INTO v_projects_after
  FROM projects WHERE deal_id = v_deal_id;

  SELECT name INTO v_new_project_name
  FROM projects WHERE deal_id = v_deal_id
  ORDER BY created_at DESC LIMIT 1;

  RAISE NOTICE 'Stage antes: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_before);
  RAISE NOTICE 'Stage depois: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_after);
  RAISE NOTICE 'Projetos depois: %', v_projects_after;

  IF (SELECT name FROM pipeline_stages WHERE id = v_stage_after) = 'Fechamento' THEN
    RAISE NOTICE '✅ FOI PARA FECHAMENTO!';
  ELSE
    RAISE NOTICE '❌ Não foi para Fechamento';
  END IF;

  IF v_projects_after > v_projects_before THEN
    RAISE NOTICE '✅ PROJETO CRIADO: "%"', v_new_project_name;
  ELSE
    RAISE NOTICE '⚠️ Projeto não criado (pode já existir)';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;

SELECT '✅ Campo deal_id adicionado à tabela projects!' as message;
SELECT 'Agora quando valor muda → Cria projeto → Projeto cria tarefas' as flow;
SELECT 'Tarefas aparecem automaticamente no /tarefas' as benefit;
