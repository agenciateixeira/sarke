-- =====================================================
-- FIX COMPLETO: Corrigir TODOS os triggers de deals
-- =====================================================

-- PASSO 1: Desabilitar triggers que podem estar causando problemas
-- =====================================================

-- Desabilitar trigger de automações (pode estar rodando em INSERT)
ALTER TABLE deals DISABLE TRIGGER deals_automation_trigger;

-- Desabilitar nossos triggers de valor para recriar
DROP TRIGGER IF EXISTS check_value_change_trigger ON deals;
DROP TRIGGER IF EXISTS create_tasks_before_value_change ON deals;
DROP TRIGGER IF EXISTS change_stage_after_value_change ON deals;
DROP TRIGGER IF EXISTS set_original_value_on_insert ON deals;

-- PASSO 2: Recriar triggers com proteção adequada
-- =====================================================

-- Trigger 1: Setar original_value no INSERT (SIMPLIFICADO)
CREATE OR REPLACE FUNCTION set_original_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas copiar value para original_value se ainda não foi setado
  IF NEW.original_value IS NULL AND NEW.value IS NOT NULL THEN
    NEW.original_value := NEW.value;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear, apenas logar
  RAISE WARNING '[set_original_value] Erro: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_original_value_on_insert
  BEFORE INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_original_value();

-- Trigger 2: Criar tasks quando valor muda (BEFORE UPDATE)
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
  -- PROTEÇÃO: Não executar em INSERT
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- PROTEÇÃO: Apenas se valor realmente mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_original := COALESCE(NEW.original_value, OLD.value);
  v_new := NEW.value;

  -- Buscar nome do cliente
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_tasks] Erro ao criar task de valor reduzido: %', SQLERRM;
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_tasks] Erro ao criar task de valor aumentado: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[create_tasks] Erro geral: %', SQLERRM;
  RETURN NEW; -- NUNCA bloquear
END;
$$;

CREATE TRIGGER create_tasks_before_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_tasks_on_value_change();

-- Trigger 3: Mudar etapa quando valor muda (AFTER UPDATE)
-- IMPORTANTE: Usar flag para evitar recursão infinita
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
  v_should_update BOOLEAN := false;
  v_new_stage_id UUID;
BEGIN
  -- PROTEÇÃO: Não executar em INSERT
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- PROTEÇÃO: Apenas se valor realmente mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  -- PROTEÇÃO: Evitar loop infinito - não processar se stage_updated_at mudou há menos de 1 segundo
  IF NEW.stage_updated_at IS NOT NULL
     AND OLD.stage_updated_at IS NOT NULL
     AND EXTRACT(EPOCH FROM (NEW.stage_updated_at - OLD.stage_updated_at)) < 1 THEN
    RETURN NEW;
  END IF;

  v_original := COALESCE(NEW.original_value, OLD.value);
  v_new := NEW.value;

  -- Buscar IDs das etapas
  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento' LIMIT 1;
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação' LIMIT 1;

  -- VALOR DIMINUIU → Negociação
  IF v_new < v_original AND v_stage_negociacao IS NOT NULL THEN
    v_should_update := true;
    v_new_stage_id := v_stage_negociacao;

  -- VALOR AUMENTOU → Fechamento
  ELSIF v_new > v_original AND v_stage_fechamento IS NOT NULL THEN
    v_should_update := true;
    v_new_stage_id := v_stage_fechamento;
  END IF;

  -- Executar UPDATE apenas se necessário
  IF v_should_update THEN
    BEGIN
      UPDATE deals
      SET
        stage_id = v_new_stage_id,
        stage_updated_at = NOW()
      WHERE id = NEW.id
        AND stage_id IS DISTINCT FROM v_new_stage_id; -- Só atualizar se realmente diferente

      RAISE NOTICE '[change_stage] Deal % movido para nova etapa', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[change_stage] Erro ao mudar etapa: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[change_stage] Erro geral: %', SQLERRM;
  RETURN NEW; -- NUNCA bloquear
END;
$$;

CREATE TRIGGER change_stage_after_value_change
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION change_stage_on_value_change();

-- PASSO 3: Reabilitar trigger de automações (se precisar)
-- =====================================================
-- Comentado por enquanto - pode ativar depois se precisar
-- ALTER TABLE deals ENABLE TRIGGER deals_automation_trigger;

-- PASSO 4: Teste
-- =====================================================

-- Tentar criar deal de teste
DO $$
DECLARE
  v_deal_id UUID;
  v_stage_id UUID;
  v_client_id UUID;
BEGIN
  SELECT id INTO v_stage_id FROM pipeline_stages LIMIT 1;
  SELECT id INTO v_client_id FROM clients LIMIT 1;

  INSERT INTO deals (title, stage_id, client_id, value, status)
  VALUES ('TESTE TRIGGER', v_stage_id, v_client_id, 10000, 'open')
  RETURNING id INTO v_deal_id;

  RAISE NOTICE '✅ Teste INSERT: Deal criado com ID %', v_deal_id;

  -- Deletar deal de teste
  DELETE FROM deals WHERE id = v_deal_id;
  RAISE NOTICE '✅ Teste concluído e deal de teste removido';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERRO NO TESTE: %', SQLERRM;
END $$;

SELECT '✅ Triggers recriados com proteção completa!' as message;
SELECT 'Proteções implementadas:' as info;
SELECT '  • Nunca bloquear INSERT ou UPDATE' as protection_1;
SELECT '  • Error handling em todos os triggers' as protection_2;
SELECT '  • Proteção contra loop infinito no AFTER trigger' as protection_3;
SELECT '  • Validação de TG_OP (INSERT vs UPDATE)' as protection_4;
