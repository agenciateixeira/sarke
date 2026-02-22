-- ===========================================
-- Tabela de Log de Execuções de Automações
-- ===========================================

CREATE TABLE IF NOT EXISTS automation_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name TEXT NOT NULL,
  automation_type TEXT NOT NULL, -- 'stage_change', 'project_creation', etc
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  -- Resultado da execução
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,

  -- Metadados
  metadata JSONB, -- Para armazenar dados adicionais (valor anterior, novo, etc)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_automation_log_deal ON automation_execution_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_type ON automation_execution_log(automation_type);
CREATE INDEX IF NOT EXISTS idx_automation_log_created ON automation_execution_log(created_at DESC);

-- RLS Policies
ALTER TABLE automation_execution_log ENABLE ROW LEVEL SECURITY;

-- Admins podem ver tudo
DROP POLICY IF EXISTS "Admins can view all automation logs" ON automation_execution_log;
CREATE POLICY "Admins can view all automation logs"
  ON automation_execution_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Gerentes podem ver logs dos seus deals
DROP POLICY IF EXISTS "Gerentes can view their automation logs" ON automation_execution_log;
CREATE POLICY "Gerentes can view their automation logs"
  ON automation_execution_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('gerente', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = automation_execution_log.deal_id
      AND d.owner_id = auth.uid()
    )
  );

-- Função auxiliar para logar execuções
CREATE OR REPLACE FUNCTION log_automation_execution(
  p_automation_name TEXT,
  p_automation_type TEXT,
  p_deal_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO automation_execution_log (
    automation_name,
    automation_type,
    deal_id,
    status,
    error_message,
    metadata
  )
  VALUES (
    p_automation_name,
    p_automation_type,
    p_deal_id,
    p_status,
    p_error_message,
    p_metadata
  );
EXCEPTION WHEN OTHERS THEN
  -- Não bloquear se logging falhar
  RAISE WARNING '[log_automation] Erro ao registrar log: %', SQLERRM;
END;
$$;

-- Atualizar trigger de mudança de stage para logar (sem modificar a lógica)
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
  v_old_stage_name TEXT;
BEGIN
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.value IS NOT DISTINCT FROM NEW.value THEN
    RETURN NEW;
  END IF;

  v_old := OLD.value;
  v_new := NEW.value;

  SELECT id INTO v_stage_fechamento FROM pipeline_stages WHERE name = 'Fechamento' LIMIT 1;
  SELECT id INTO v_stage_negociacao FROM pipeline_stages WHERE name = 'Negociação' LIMIT 1;

  -- Pegar nome do stage anterior
  SELECT name INTO v_old_stage_name FROM pipeline_stages WHERE id = OLD.stage_id;

  -- VALOR DIMINUIU → Negociação
  IF v_new < v_old AND v_stage_negociacao IS NOT NULL THEN
    NEW.stage_id := v_stage_negociacao;
    NEW.stage_updated_at := NOW();

    -- Logar execução (não bloqueia se falhar)
    BEGIN
      PERFORM log_automation_execution(
        'Mudança Automática de Etapa - Valor Reduzido',
        'stage_change',
        NEW.id,
        'success',
        NULL,
        jsonb_build_object(
          'old_value', v_old,
          'new_value', v_new,
          'old_stage', v_old_stage_name,
          'new_stage', 'Negociação'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[force_stage] Erro ao logar: %', SQLERRM;
    END;

  -- VALOR AUMENTOU → Fechamento
  ELSIF v_new > v_old AND v_stage_fechamento IS NOT NULL THEN
    NEW.stage_id := v_stage_fechamento;
    NEW.stage_updated_at := NOW();

    -- Logar execução (não bloqueia se falhar)
    BEGIN
      PERFORM log_automation_execution(
        'Mudança Automática de Etapa - Valor Aumentado',
        'stage_change',
        NEW.id,
        'success',
        NULL,
        jsonb_build_object(
          'old_value', v_old,
          'new_value', v_new,
          'old_stage', v_old_stage_name,
          'new_stage', 'Fechamento'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[force_stage] Erro ao logar: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[force_stage] Erro: %', SQLERRM;

  -- Logar erro (não bloqueia se falhar)
  BEGIN
    PERFORM log_automation_execution(
      'Mudança Automática de Etapa',
      'stage_change',
      NEW.id,
      'error',
      SQLERRM,
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar erro no log
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER zzz_force_stage_on_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION force_stage_change_on_value();

-- Atualizar trigger de criação de projetos para logar
DROP TRIGGER IF EXISTS create_project_on_value_change ON deals;

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
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

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

      -- Logar execução
      PERFORM log_automation_execution(
        'Criar Projeto - Valor Reduzido',
        'project_creation',
        NEW.id,
        'success',
        NULL,
        jsonb_build_object(
          'project_id', v_new_project_id,
          'old_value', v_old,
          'new_value', v_new
        )
      );

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_project] Erro ao criar projeto: %', SQLERRM;

      -- Logar erro
      PERFORM log_automation_execution(
        'Criar Projeto - Valor Reduzido',
        'project_creation',
        NEW.id,
        'error',
        SQLERRM,
        NULL
      );
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

      -- Logar execução
      PERFORM log_automation_execution(
        'Criar Projeto - Valor Aumentado',
        'project_creation',
        NEW.id,
        'success',
        NULL,
        jsonb_build_object(
          'project_id', v_new_project_id,
          'old_value', v_old,
          'new_value', v_new
        )
      );

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[create_project] Erro ao criar projeto: %', SQLERRM;

      -- Logar erro
      PERFORM log_automation_execution(
        'Criar Projeto - Valor Aumentado',
        'project_creation',
        NEW.id,
        'error',
        SQLERRM,
        NULL
      );
    END;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[create_project] Erro geral: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_project_on_value_change
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_project_on_value_change();

-- View para estatísticas de automações (SEM DROP, apenas CREATE OR REPLACE)
CREATE OR REPLACE VIEW automation_stats AS
SELECT
  automation_name,
  automation_type,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
  COUNT(*) FILTER (WHERE status = 'error') as failed_executions,
  MAX(created_at) as last_execution,
  MIN(created_at) as first_execution
FROM automation_execution_log
GROUP BY automation_name, automation_type;

SELECT '✅ Tabela de log de automações criada!' as message;
SELECT 'Triggers atualizados para registrar execuções' as update_1;
SELECT 'View automation_stats disponível para estatísticas' as view_created;
