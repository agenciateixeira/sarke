-- =============================================
-- Fix RLS policies for webrtc_signals
-- Garante que qualquer usuario autenticado pode:
-- 1. Inserir sinais onde from_user_id = auth.uid()
-- 2. Ler sinais onde to_user_id = auth.uid() (para postgres_changes filter)
-- =============================================

-- Remove politicas antigas que podem estar conflitando
DROP POLICY IF EXISTS "webrtc_signals_select_policy" ON webrtc_signals;
DROP POLICY IF EXISTS "webrtc_signals_insert_policy" ON webrtc_signals;
DROP POLICY IF EXISTS "webrtc_signals_select" ON webrtc_signals;
DROP POLICY IF EXISTS "webrtc_signals_insert" ON webrtc_signals;

-- Habilita RLS (caso nao esteja)
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario ve sinais onde eh remetente ou destinatario
CREATE POLICY "webrtc_signals_select"
  ON webrtc_signals FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

-- INSERT: usuario pode inserir sinais onde ele eh o remetente
CREATE POLICY "webrtc_signals_insert"
  ON webrtc_signals FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- DELETE: usuario pode deletar sinais antigos da chamada dele (cleanup)
CREATE POLICY "webrtc_signals_delete"
  ON webrtc_signals FOR DELETE
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Garante que webrtc_signals esta no Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE webrtc_signals;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- ja esta, tudo bem
  END;
END $$;
