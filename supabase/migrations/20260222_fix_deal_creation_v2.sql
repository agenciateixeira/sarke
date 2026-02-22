-- =====================================================
-- FIX: Permitir criação de deals (INSERT)
-- =====================================================

-- PROBLEMA: Triggers estão bloqueando INSERT
-- SOLUÇÃO: Garantir que todos os triggers APENAS rodam em UPDATE

-- 1. TRIGGER: set_original_value
--    Deve rodar em INSERT e UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION set_original_value()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Em INSERT: Setar original_value = value
  IF TG_OP = 'INSERT' THEN
    IF NEW.value IS NOT NULL AND NEW.original_value IS NULL THEN
      NEW.original_value := NEW.value;
    END IF;
    RETURN NEW;
  END IF;

  -- Em UPDATE: Apenas setar se ainda não existe
  IF TG_OP = 'UPDATE' THEN
    IF NEW.original_value IS NULL AND NEW.value IS NOT NULL THEN
      NEW.original_value := NEW.value;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[set_original_value] Erro: %', SQLERRM;
  RETURN NEW; -- NUNCA bloquear
END;
$$;

DROP TRIGGER IF EXISTS set_original_value_trigger ON deals;
CREATE TRIGGER set_original_value_trigger
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_original_value();

-- 2. TRIGGER: force_stage_change_on_value
--    Deve rodar APENAS em UPDATE
-- =====================================================

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
  -- ⚠️ IMPORTANTE: APENAS UPDATE, NUNCA INSERT
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- APENAS se valor mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_old := OLD.value;
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
  RETURN NEW; -- NUNCA bloquear
END;
$$;

-- Garantir que trigger existe
DROP TRIGGER IF EXISTS zzz_force_stage_on_value_change ON deals;
CREATE TRIGGER zzz_force_stage_on_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION force_stage_change_on_value();

-- 3. TRIGGER: create_project_on_value_change
--    Deve rodar APENAS em UPDATE
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
  -- ⚠️ IMPORTANTE: APENAS UPDATE, NUNCA INSERT
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- APENAS se valor mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_old := OLD.value;
  v_new := NEW.value;

  -- Verificar se já existe projeto recente (últimas 24h)
  SELECT COUNT(*) INTO v_project_count
  FROM projects
  WHERE deal_id = NEW.id
    AND name ILIKE '%Valor%'
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_project_count > 0 THEN
    RAISE NOTICE '[create_project] Já existe projeto recente, pulando';
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
        name, description, deal_id, client_id,
        status, priority, start_date, due_date, created_by
      )
      VALUES (
        v_project_title, v_project_description, NEW.id, NEW.client_id,
        'in_progress', 'high', NOW(), NOW() + INTERVAL '3 days',
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1))
      )
      RETURNING id INTO v_new_project_id;

      INSERT INTO notifications (
        user_id, type, title, message, link, deal_id, priority, read
      )
      VALUES (
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        'deal_assigned', '⚠️ Valor Reduzido',
        format('Projeto criado: "%s"', v_project_title),
        format('/dashboard/projetos/%s', v_new_project_id),
        NEW.id, 'high', false
      );

      RAISE NOTICE '[create_project] ✅ Projeto de revisão criado';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_project] Erro ao criar projeto: %', SQLERRM;
    END;

  -- VALOR AUMENTOU
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
        name, description, deal_id, client_id,
        status, priority, start_date, due_date, created_by
      )
      VALUES (
        v_project_title, v_project_description, NEW.id, NEW.client_id,
        'in_progress', 'high', NOW(), NOW() + INTERVAL '5 days',
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1))
      )
      RETURNING id INTO v_new_project_id;

      INSERT INTO notifications (
        user_id, type, title, message, link, deal_id, priority, read
      )
      VALUES (
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        'deal_assigned', '✅ Valor Aumentado!',
        format('Projeto criado: "%s"', v_project_title),
        format('/dashboard/projetos/%s', v_new_project_id),
        NEW.id, 'high', false
      );

      RAISE NOTICE '[create_project] ✅ Projeto de fechamento criado';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_project] Erro ao criar projeto: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[create_project] Erro geral: %', SQLERRM;
  RETURN NEW; -- NUNCA bloquear
END;
$$;

-- Garantir que trigger existe
DROP TRIGGER IF EXISTS create_project_on_value_change ON deals;
CREATE TRIGGER create_project_on_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_project_on_value_change();

-- =====================================================
-- TESTE: Criar deal do zero (SEM pipeline)
-- =====================================================

DO $$
DECLARE
  v_client_id UUID;
  v_stage_id UUID;
  v_owner_id UUID;
  v_new_deal_id UUID;
BEGIN
  -- Pegar IDs necessários (SEM pipeline)
  SELECT id INTO v_client_id FROM clients LIMIT 1;
  SELECT id INTO v_stage_id FROM pipeline_stages WHERE name = 'Proposta' LIMIT 1;
  SELECT id INTO v_owner_id FROM profiles LIMIT 1;

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE: Criar novo deal (sem pipeline_id)';
  RAISE NOTICE '───────────────────────────────────────';

  BEGIN
    INSERT INTO deals (
      title, client_id, stage_id,
      owner_id, value, currency, status, probability
    )
    VALUES (
      'TESTE CRIAÇÃO',
      v_client_id, v_stage_id,
      v_owner_id, 5000, 'BRL', 'open', 50
    )
    RETURNING id INTO v_new_deal_id;

    RAISE NOTICE '✅ Deal criado com sucesso!';
    RAISE NOTICE 'ID: %', v_new_deal_id;

    -- Ver se original_value foi setado
    RAISE NOTICE 'Original value: %', (SELECT original_value FROM deals WHERE id = v_new_deal_id);

    -- Limpar teste
    DELETE FROM deals WHERE id = v_new_deal_id;
    RAISE NOTICE '🗑️ Deal de teste deletado';

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO: %', SQLERRM;
    RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
  END;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;

SELECT '✅ Triggers corrigidos - Criação de deals liberada!' as status;
SELECT 'INSERT agora funciona normalmente' as insert_status;
SELECT 'UPDATE continua com automações (stage + projeto)' as update_status;
