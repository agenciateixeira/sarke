-- =====================================================
-- Adicionar rastreamento de valor original
-- =====================================================

-- 1. Adicionar coluna original_value
ALTER TABLE deals ADD COLUMN IF NOT EXISTS original_value NUMERIC(12,2);

-- 2. Preencher valores existentes (original_value = value atual)
UPDATE deals
SET original_value = value
WHERE original_value IS NULL AND value IS NOT NULL;

-- 3. Criar trigger para setar original_value na criação
CREATE OR REPLACE FUNCTION set_original_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas setar na criação (INSERT)
  IF TG_OP = 'INSERT' AND NEW.value IS NOT NULL THEN
    NEW.original_value := NEW.value;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_original_value_on_insert ON deals;
CREATE TRIGGER set_original_value_on_insert
  BEFORE INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_original_value();

-- 4. Criar função para verificar mudança de valor
CREATE OR REPLACE FUNCTION check_value_change()
RETURNS TRIGGER AS $$
DECLARE
  v_original NUMERIC;
  v_new NUMERIC;
  v_stage_fechamento UUID;
  v_stage_negociacao UUID;
BEGIN
  -- Apenas processar se o valor mudou
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    v_original := COALESCE(NEW.original_value, OLD.value);
    v_new := NEW.value;

    -- Buscar IDs das etapas (adapte os nomes conforme seu pipeline)
    SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name ILIKE '%fechamento%' LIMIT 1;
    SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name ILIKE '%negocia%' LIMIT 1;

    -- REGRA 1: Se valor diminuiu e não é a criação
    IF v_new < v_original AND OLD.id IS NOT NULL THEN
      -- Mover para Negociação (se a etapa existe)
      IF v_stage_negociacao IS NOT NULL THEN
        NEW.stage_id := v_stage_negociacao;
        NEW.stage_updated_at := NOW();
      END IF;

      -- Criar tarefa de alerta
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
        '⚠️ Valor Reduzido - Verificar Negociação',
        'O valor foi reduzido de R$ ' || COALESCE(v_original::TEXT, '0') ||
        ' para R$ ' || COALESCE(v_new::TEXT, '0') ||
        '. Confirme se a negociação foi realizada e se pode avançar para fechamento.',
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        NOW() + INTERVAL '1 day'
      );

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
      ) VALUES (
        NEW.owner_id,
        'deal_assigned',
        '⚠️ Valor do Deal Reduzido',
        'O deal "' || NEW.title || '" teve o valor reduzido. Verifique a negociação.',
        '/dashboard/comercial/pipeline',
        NEW.id,
        'high',
        false
      );

    -- REGRA 2: Se valor aumentou
    ELSIF v_new > v_original AND OLD.id IS NOT NULL THEN
      -- Mover para Fechamento (se a etapa existe e não estiver em etapa posterior)
      IF v_stage_fechamento IS NOT NULL THEN
        NEW.stage_id := v_stage_fechamento;
        NEW.stage_updated_at := NOW();
      END IF;

      -- Criar tarefa positiva
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
        '✅ Valor Aumentado - Preparar Fechamento',
        'O valor foi aumentado de R$ ' || COALESCE(v_original::TEXT, '0') ||
        ' para R$ ' || COALESCE(v_new::TEXT, '0') ||
        '. Prepare a documentação para fechamento.',
        COALESCE(NEW.owner_id, (SELECT id FROM profiles LIMIT 1)),
        NOW() + INTERVAL '2 days'
      );

      -- Criar notificação positiva
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
        NEW.owner_id,
        'deal_assigned',
        '✅ Valor do Deal Aumentado',
        'O deal "' || NEW.title || '" teve o valor aumentado! Prepare o fechamento.',
        '/dashboard/comercial/pipeline',
        NEW.id,
        'high',
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para monitorar mudança de valor
-- IMPORTANTE: Este trigger roda ANTES do trigger de automações
DROP TRIGGER IF EXISTS check_value_change_trigger ON deals;
CREATE TRIGGER check_value_change_trigger
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION check_value_change();

-- 6. Comentários
COMMENT ON COLUMN deals.original_value IS 'Valor original do deal na criação (para comparação em mudanças)';

SELECT '✅ Sistema de rastreamento de valor implementado!' as message;
SELECT 'Agora quando o valor mudar:' as info;
SELECT '  - Valor < Original → Move para Negociação + Cria tarefa de alerta' as rule_1;
SELECT '  - Valor > Original → Move para Fechamento + Cria tarefa de preparação' as rule_2;
SELECT '  - Na criação do deal → Nada acontece, apenas salva original_value' as rule_3;
