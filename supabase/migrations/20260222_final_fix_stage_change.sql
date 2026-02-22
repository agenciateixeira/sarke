-- =====================================================
-- FIX FINAL: Mudança de etapa funcionando 100%
-- =====================================================

-- ESTRATÉGIA:
-- 1. Remover trigger AFTER (que faz UPDATE recursivo)
-- 2. Modificar trigger BEFORE para setar stage_id no NEW
-- 3. Adicionar lógica para detectar se frontend enviou stage_id

DROP TRIGGER IF EXISTS change_stage_after_value_change ON deals;

-- Recriar trigger BEFORE que muda stage_id diretamente
CREATE OR REPLACE FUNCTION change_stage_on_value_change_before()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_original NUMERIC;
  v_new NUMERIC;
  v_stage_fechamento UUID;
  v_stage_negociacao UUID;
  v_new_stage_id UUID;
BEGIN
  -- PROTEÇÃO: Apenas UPDATE
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- PROTEÇÃO: Apenas se valor mudou
  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  -- PROTEÇÃO: Se o frontend mudou explicitamente o stage_id, não sobrescrever
  -- (detectamos isso vendo se NEW.stage_id é diferente de OLD.stage_id E valor também mudou)
  -- Mas se APENAS o valor mudou, então devemos mudar o stage_id automaticamente
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    -- Frontend mudou stage_id explicitamente, não mexer
    RETURN NEW;
  END IF;

  v_original := COALESCE(NEW.original_value, OLD.value);
  v_new := NEW.value;

  -- Buscar IDs das etapas
  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento' LIMIT 1;
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação' LIMIT 1;

  -- VALOR DIMINUIU → Negociação
  IF v_new < v_original AND v_stage_negociacao IS NOT NULL THEN
    NEW.stage_id := v_stage_negociacao;
    NEW.stage_updated_at := NOW();
    RAISE NOTICE '[change_stage] Deal % → Negociação (valor diminuiu: % → %)', NEW.id, v_original, v_new;

  -- VALOR AUMENTOU → Fechamento
  ELSIF v_new > v_original AND v_stage_fechamento IS NOT NULL THEN
    NEW.stage_id := v_stage_fechamento;
    NEW.stage_updated_at := NOW();
    RAISE NOTICE '[change_stage] Deal % → Fechamento (valor aumentou: % → %)', NEW.id, v_original, v_new;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[change_stage] Erro: %', SQLERRM;
  RETURN NEW; -- Nunca bloquear
END;
$$;

-- Criar trigger BEFORE (roda antes de aplicar o UPDATE)
CREATE TRIGGER change_stage_before_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION change_stage_on_value_change_before();

-- TESTE
DO $$
DECLARE
  v_deal_id UUID;
  v_stage_before UUID;
  v_stage_after UUID;
  v_stage_negociacao UUID;
BEGIN
  -- Pegar deal teste
  SELECT id, stage_id INTO v_deal_id, v_stage_before
  FROM deals WHERE title = 'teste' LIMIT 1;

  -- Pegar ID da negociação
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação';

  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'TESTE: Mudança de etapa';
  RAISE NOTICE 'Deal: %', v_deal_id;
  RAISE NOTICE 'Stage antes: %', v_stage_before;
  RAISE NOTICE '───────────────────────────────────────';

  -- Atualizar APENAS o valor (não enviar stage_id)
  UPDATE deals
  SET value = 777,
      updated_at = NOW()
  WHERE id = v_deal_id;

  -- Ver resultado
  SELECT stage_id INTO v_stage_after FROM deals WHERE id = v_deal_id;

  RAISE NOTICE 'Stage depois: %', v_stage_after;

  IF v_stage_after = v_stage_negociacao THEN
    RAISE NOTICE '✅ FUNCIONOU! Stage mudou para Negociação';
  ELSE
    RAISE NOTICE '❌ NÃO FUNCIONOU - Stage: %', (SELECT name FROM pipeline_stages WHERE id = v_stage_after);
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erro no teste: %', SQLERRM;
END $$;

SELECT '✅ Trigger BEFORE recriado!' as message;
SELECT 'Agora muda stage_id diretamente em NEW antes do UPDATE ser aplicado' as how_it_works;
SELECT 'Só NÃO muda se o frontend enviar stage_id explicitamente' as protection;
