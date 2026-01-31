-- =============================================
-- SARKE - SISTEMA DE CHAMADAS WebRTC
-- =============================================

-- =============================================
-- 1. TABELA DE CHAMADAS
-- =============================================

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de chamada
  type TEXT NOT NULL CHECK (type IN ('audio', 'video', 'screen')),

  -- Participantes
  caller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Status da chamada
  status TEXT NOT NULL DEFAULT 'calling' CHECK (
    status IN ('calling', 'ringing', 'accepted', 'rejected', 'ended', 'missed', 'failed')
  ),

  -- Metadados
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- em segundos

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. TABELA DE SINALIZAÇÕES WebRTC
-- =============================================

CREATE TABLE IF NOT EXISTS webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE NOT NULL,

  -- De quem / para quem
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Tipo de sinal
  signal_type TEXT NOT NULL CHECK (
    signal_type IN ('offer', 'answer', 'ice-candidate')
  ),

  -- Payload do sinal (JSON com SDP ou ICE candidate)
  signal_data JSONB NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webrtc_signals_call ON webrtc_signals(call_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user ON webrtc_signals(to_user_id);

-- =============================================
-- 4. TRIGGER PARA UPDATED_AT
-- =============================================

DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. FUNÇÃO PARA FINALIZAR CHAMADA
-- =============================================

CREATE OR REPLACE FUNCTION end_call(p_call_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_call RECORD;
  v_duration INTEGER;
BEGIN
  -- Buscar chamada
  SELECT * INTO v_call
  FROM calls
  WHERE id = p_call_id
  AND (caller_id = p_user_id OR receiver_id = p_user_id);

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Chamada não encontrada'
    );
  END IF;

  -- Calcular duração se foi aceita
  IF v_call.started_at IS NOT NULL THEN
    v_duration := EXTRACT(EPOCH FROM (now() - v_call.started_at))::INTEGER;
  ELSE
    v_duration := 0;
  END IF;

  -- Atualizar chamada
  UPDATE calls
  SET
    status = 'ended',
    ended_at = now(),
    duration = v_duration
  WHERE id = p_call_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Chamada finalizada',
    'duration', v_duration
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. RLS (ROW LEVEL SECURITY)
-- =============================================

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;

-- CALLS: Usuário vê chamadas onde participa
CREATE POLICY "calls_select_policy"
  ON calls FOR SELECT
  TO authenticated
  USING (caller_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "calls_insert_policy"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "calls_update_policy"
  ON calls FOR UPDATE
  TO authenticated
  USING (caller_id = auth.uid() OR receiver_id = auth.uid());

-- WEBRTC_SIGNALS: Usuário vê sinais destinados a ele
CREATE POLICY "webrtc_signals_select_policy"
  ON webrtc_signals FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

CREATE POLICY "webrtc_signals_insert_policy"
  ON webrtc_signals FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- =============================================
-- 7. HABILITAR REALTIME
-- =============================================

-- Garantir que as tabelas estão no Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE calls;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE webrtc_signals;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
