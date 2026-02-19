-- =============================================
-- SARKE - LIMPEZA AUTOMÁTICA (VERSÃO SIMPLIFICADA)
-- =============================================
-- Execute este script se você JÁ tem a tabela team_invites
-- criada e só quer adicionar a limpeza automática
-- =============================================

-- =============================================
-- 1. FUNÇÃO PARA LIMPEZA AUTOMÁTICA (TRIGGER)
-- =============================================

CREATE OR REPLACE FUNCTION auto_cleanup_expired_invites()
RETURNS trigger AS $$
BEGIN
  -- Deletar convites expirados automaticamente
  DELETE FROM team_invites
  WHERE accepted_at IS NULL
  AND expires_at < now();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. CRIAR TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS trigger_cleanup_expired_invites ON team_invites;
CREATE TRIGGER trigger_cleanup_expired_invites
  AFTER INSERT OR UPDATE ON team_invites
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_cleanup_expired_invites();

-- =============================================
-- 3. FUNÇÃO PARA LIMPEZA MANUAL
-- =============================================

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
-- 4. TENTAR CONFIGURAR CRON (OPCIONAL)
-- =============================================
-- Se pg_cron não estiver disponível, apenas ignore os erros

DO $$
BEGIN
  -- Tentar criar extensão
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  RAISE NOTICE '✅ pg_cron habilitado';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ pg_cron não disponível. Usando apenas TRIGGER + MANUAL.';
END $$;

-- Tentar remover job anterior
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-invites');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Tentar agendar cron job
DO $$
BEGIN
  PERFORM cron.schedule(
    'cleanup-expired-invites',
    '0 3 * * *',
    $cron$DELETE FROM team_invites WHERE accepted_at IS NULL AND expires_at < now()$cron$
  );
  RAISE NOTICE '✅ Cron job agendado (executa diariamente às 3h)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Cron job não configurado. Sistema funcionará apenas com TRIGGER + MANUAL.';
END $$;

-- =============================================
-- 5. VERIFICAÇÃO FINAL
-- =============================================

DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_cron_exists BOOLEAN;
  v_expired_count INTEGER;
BEGIN
  -- Verificar trigger
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_cleanup_expired_invites'
  ) INTO v_trigger_exists;

  -- Verificar cron
  BEGIN
    SELECT EXISTS(
      SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-invites'
    ) INTO v_cron_exists;
  EXCEPTION
    WHEN OTHERS THEN
      v_cron_exists := false;
  END;

  -- Contar convites expirados
  SELECT COUNT(*) INTO v_expired_count
  FROM team_invites
  WHERE accepted_at IS NULL AND expires_at < now();

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LIMPEZA AUTOMÁTICA INSTALADA!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '  %', CASE WHEN v_trigger_exists THEN '✅ Trigger ativo' ELSE '❌ Trigger não criado' END;
  RAISE NOTICE '  %', CASE WHEN v_cron_exists THEN '✅ Cron job agendado (3h da manhã)' ELSE '⚠️ Cron job não disponível' END;
  RAISE NOTICE '  ✅ Função manual disponível';
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Convites expirados na base: %', v_expired_count;
  RAISE NOTICE '';

  IF v_expired_count > 0 THEN
    RAISE NOTICE '💡 Para limpar agora, execute:';
    RAISE NOTICE '   SELECT * FROM manual_cleanup_expired_invites();';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '🎯 Como funciona:';
  RAISE NOTICE '  1. Ao criar/editar convite → TRIGGER limpa expirados';
  IF v_cron_exists THEN
    RAISE NOTICE '  2. Todo dia às 3h → CRON limpa expirados';
  END IF;
  RAISE NOTICE '  3. Quando quiser → Execute função manual';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
