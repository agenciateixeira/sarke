-- Notificações para Administradores e Colaboradores sobre Projetos e Obras Atrasadas

-- Função para verificar projetos atrasados e notificar admins e colaboradores
CREATE OR REPLACE FUNCTION check_overdue_projects()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  project_record RECORD;
BEGIN
  -- Buscar todos os administradores E colaboradores envolvidos em projetos
  FOR user_record IN
    SELECT DISTINCT u.id as user_id
    FROM auth.users u
    INNER JOIN profiles p ON u.id = p.id
    WHERE p.role = 'admin'

    UNION

    -- Colaboradores (arquitetos, designers, coordenadores) de projetos
    SELECT DISTINCT arquiteto_id as user_id FROM projetos WHERE arquiteto_id IS NOT NULL
    UNION
    SELECT DISTINCT designer_id as user_id FROM projetos WHERE designer_id IS NOT NULL
    UNION
    SELECT DISTINCT coordenador_id as user_id FROM projetos WHERE coordenador_id IS NOT NULL
  LOOP
    -- Buscar projetos atrasados
    -- Admins veem TODOS os projetos, colaboradores veem apenas os SEUS
    FOR project_record IN
      SELECT
        p.id,
        p.nome,
        p.data_previsao_entrega,
        p.etapa_atual,
        p.progresso_percentual,
        p.arquiteto_id,
        p.designer_id,
        p.coordenador_id
      FROM projetos p
      WHERE p.data_previsao_entrega IS NOT NULL
        AND p.data_previsao_entrega::date < CURRENT_DATE
        AND p.etapa_atual != 'concluido'
        AND p.progresso_percentual < 100
        -- Filtro: Admin vê todos OU colaborador vê apenas seus projetos
        AND (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = user_record.user_id AND role = 'admin'
          )
          OR p.arquiteto_id = user_record.user_id
          OR p.designer_id = user_record.user_id
          OR p.coordenador_id = user_record.user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE related_project_id = p.id
            AND type = 'project_updated'
            AND title LIKE '%atrasado%'
            AND created_at::date = CURRENT_DATE
            AND user_id = user_record.user_id
        )
      ORDER BY p.data_previsao_entrega ASC
      LIMIT 50
    LOOP
      -- Calcular dias de atraso
      DECLARE
        dias_atraso INTEGER;
      BEGIN
        dias_atraso := CURRENT_DATE - project_record.data_previsao_entrega::date;

        -- Criar notificação para o usuário (admin ou colaborador)
        INSERT INTO notifications (user_id, title, message, type, related_project_id)
        VALUES (
          user_record.user_id,
          'Projeto Atrasado: ' || project_record.nome,
          'O projeto está atrasado há ' || dias_atraso || ' dia(s). ' ||
          'Etapa atual: ' || project_record.etapa_atual || '. ' ||
          'Progresso: ' || project_record.progresso_percentual || '%.',
          'project_updated',
          project_record.id
        );
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar obras atrasadas e notificar admins
CREATE OR REPLACE FUNCTION check_overdue_obras()
RETURNS void AS $$
DECLARE
  admin_record RECORD;
  obra_record RECORD;
BEGIN
  -- Buscar todos os administradores
  FOR admin_record IN
    SELECT DISTINCT u.id as user_id
    FROM auth.users u
    INNER JOIN profiles p ON u.id = p.id
    WHERE p.role = 'admin'
  LOOP
    -- Buscar obras atrasadas
    FOR obra_record IN
      SELECT
        o.id,
        o.nome,
        o.data_previsao_termino,
        o.status,
        o.progresso_geral
      FROM obras o
      WHERE o.data_previsao_termino IS NOT NULL
        AND o.data_previsao_termino::date < CURRENT_DATE
        AND o.status NOT IN ('concluida', 'cancelada', 'suspensa')
        AND (o.progresso_geral IS NULL OR o.progresso_geral < 100)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.reference_id = o.id::text
            AND n.type = 'project_updated'
            AND n.title LIKE '%Obra Atrasada%'
            AND n.created_at::date = CURRENT_DATE
            AND n.user_id = admin_record.user_id
        )
      ORDER BY o.data_previsao_termino ASC
      LIMIT 50
    LOOP
      -- Calcular dias de atraso
      DECLARE
        dias_atraso INTEGER;
        progresso TEXT;
      BEGIN
        dias_atraso := CURRENT_DATE - obra_record.data_previsao_termino::date;
        progresso := COALESCE(obra_record.progresso_geral::text || '%', 'N/A');

        -- Criar notificação para o admin
        INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
          admin_record.user_id,
          'Obra Atrasada: ' || obra_record.nome,
          'A obra está atrasada há ' || dias_atraso || ' dia(s). ' ||
          'Status: ' || obra_record.status || '. ' ||
          'Progresso: ' || progresso || '.',
          'project_updated',
          obra_record.id::text,
          'obra'
        );
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar projetos próximos do prazo (5 dias antes)
CREATE OR REPLACE FUNCTION check_projects_due_soon()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  project_record RECORD;
BEGIN
  -- Admins e colaboradores
  FOR user_record IN
    SELECT DISTINCT u.id as user_id
    FROM auth.users u
    INNER JOIN profiles p ON u.id = p.id
    WHERE p.role = 'admin'

    UNION

    SELECT DISTINCT arquiteto_id as user_id FROM projetos WHERE arquiteto_id IS NOT NULL
    UNION
    SELECT DISTINCT designer_id as user_id FROM projetos WHERE designer_id IS NOT NULL
    UNION
    SELECT DISTINCT coordenador_id as user_id FROM projetos WHERE coordenador_id IS NOT NULL
  LOOP
    FOR project_record IN
      SELECT
        p.id,
        p.nome,
        p.data_previsao_entrega,
        p.etapa_atual,
        p.progresso_percentual,
        p.arquiteto_id,
        p.designer_id,
        p.coordenador_id
      FROM projetos p
      WHERE p.data_previsao_entrega IS NOT NULL
        AND p.data_previsao_entrega::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '5 days')
        AND p.etapa_atual != 'concluido'
        AND p.progresso_percentual < 100
        -- Filtro: Admin vê todos OU colaborador vê apenas seus projetos
        AND (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE id = user_record.user_id AND role = 'admin'
          )
          OR p.arquiteto_id = user_record.user_id
          OR p.designer_id = user_record.user_id
          OR p.coordenador_id = user_record.user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE related_project_id = p.id
            AND type = 'task_due_soon'
            AND created_at::date = CURRENT_DATE
            AND user_id = user_record.user_id
        )
      ORDER BY p.data_previsao_entrega ASC
    LOOP
      DECLARE
        dias_restantes INTEGER;
      BEGIN
        dias_restantes := project_record.data_previsao_entrega::date - CURRENT_DATE;

        INSERT INTO notifications (user_id, title, message, type, related_project_id)
        VALUES (
          user_record.user_id,
          'Projeto vence em breve: ' || project_record.nome,
          'Faltam ' || dias_restantes || ' dia(s) para o prazo. ' ||
          'Progresso atual: ' || project_record.progresso_percentual || '%.',
          'task_due_soon',
          project_record.id
        );
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Agendar execução diária das novas funções
SELECT cron.schedule(
  'daily-admin-overdue-projects',
  '0 9 * * *',
  $$SELECT check_overdue_projects();$$
);

SELECT cron.schedule(
  'daily-admin-overdue-obras',
  '0 9 * * *',
  $$SELECT check_overdue_obras();$$
);

SELECT cron.schedule(
  'daily-admin-projects-due-soon',
  '0 9 * * *',
  $$SELECT check_projects_due_soon();$$
);

-- Comentário para referência:
COMMENT ON FUNCTION check_overdue_projects() IS 'Verifica projetos atrasados e notifica administradores diariamente';
COMMENT ON FUNCTION check_overdue_obras() IS 'Verifica obras atrasadas e notifica administradores diariamente';
COMMENT ON FUNCTION check_projects_due_soon() IS 'Verifica projetos próximos do prazo (5 dias) e notifica administradores';
