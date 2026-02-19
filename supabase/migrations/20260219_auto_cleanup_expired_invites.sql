-- =============================================
-- SARKE - Limpeza Automática de Convites Expirados
-- =============================================
-- Este script configura limpeza automática de convites
-- expirados usando pg_cron (executado diariamente às 3h)
-- =============================================

-- =============================================
-- MÉTODO 1: TRIGGER (Limpeza em Tempo Real)
-- =============================================
-- Este trigger deleta automaticamente convites expirados
-- sempre que a tabela team_invites é consultada

CREATE OR REPLACE FUNCTION auto_cleanup_expired_invites()
RETURNS trigger AS $$
BEGIN
  -- Deletar convites expirados que não foram aceitos
  DELETE FROM team_invites
  WHERE accepted_at IS NULL
  AND expires_at < now();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger que executa APÓS qualquer SELECT na tabela
-- Isso garante limpeza sempre que a lista de convites é visualizada
DROP TRIGGER IF EXISTS trigger_cleanup_expired_invites ON team_invites;
CREATE TRIGGER trigger_cleanup_expired_invites
  AFTER INSERT OR UPDATE ON team_invites
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_cleanup_expired_invites();

-- =============================================
-- MÉTODO 2: pg_cron (Limpeza Agendada Diária)
-- =============================================
-- ATENÇÃO: pg_cron requer permissões especiais
-- Execute este bloco manualmente no Supabase Dashboard

-- Habilitar extensão pg_cron (se ainda não estiver)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover job anterior (se existir)
SELECT cron.unschedule('cleanup-expired-invites');

-- Agendar limpeza diária às 3h da manhã
SELECT cron.schedule(
  'cleanup-expired-invites',           -- nome do job
  '0 3 * * *',                         -- cron expression (3h da manhã todo dia)
  $cron$DELETE FROM team_invites WHERE accepted_at IS NULL AND expires_at < now()$cron$
);

-- =============================================
-- MÉTODO 3: Função Manual (Backup)
-- =============================================
-- Caso os métodos acima não funcionem, você pode
-- chamar esta função manualmente quando precisar

CREATE OR REPLACE FUNCTION manual_cleanup_expired_invites()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM team_invites
  WHERE accepted_at IS NULL
  AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VERIFICAÇÃO E COMENTÁRIOS
-- =============================================

COMMENT ON FUNCTION auto_cleanup_expired_invites()
IS 'Trigger function: Deleta automaticamente convites expirados após INSERT/UPDATE';

COMMENT ON FUNCTION manual_cleanup_expired_invites()
IS 'Função manual: Chame para limpar convites expirados (retorna quantidade deletada)';

-- Verificar jobs agendados
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de limpeza automática configurado!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Métodos de limpeza ativos:';
  RAISE NOTICE '1. TRIGGER: Executa após INSERT/UPDATE em team_invites';
  RAISE NOTICE '2. CRON: Executa diariamente às 3h da manhã';
  RAISE NOTICE '3. MANUAL: Chame manual_cleanup_expired_invites() quando precisar';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Verificar jobs agendados:';
  RAISE NOTICE 'SELECT * FROM cron.job WHERE jobname = ''cleanup-expired-invites'';';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Testar limpeza manual:';
  RAISE NOTICE 'SELECT * FROM manual_cleanup_expired_invites();';
END $$;
