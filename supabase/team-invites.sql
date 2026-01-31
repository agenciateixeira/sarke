-- =============================================
-- SARKE - SISTEMA DE CONVITES DE EQUIPE
-- =============================================

-- =============================================
-- 1. TABELA DE CONVITES PENDENTES
-- =============================================

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  setor TEXT,
  cargo TEXT,
  departamento TEXT,
  telefone TEXT,
  horario_inicio TIME,
  horario_fim TIME,
  dias_trabalho INTEGER[] DEFAULT '{1,2,3,4,5}',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_team_invites_expires ON team_invites(expires_at);

-- =============================================
-- 3. TRIGGER PARA UPDATED_AT
-- =============================================

DROP TRIGGER IF EXISTS update_team_invites_updated_at ON team_invites;
CREATE TRIGGER update_team_invites_updated_at
  BEFORE UPDATE ON team_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4. RLS (ROW LEVEL SECURITY)
-- =============================================

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Admin e gerentes podem ver todos os convites
DROP POLICY IF EXISTS "Admin e gerentes podem ver convites" ON team_invites;
CREATE POLICY "Admin e gerentes podem ver convites"
  ON team_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gerente')
    )
  );

-- Admin e gerentes podem criar convites
DROP POLICY IF EXISTS "Admin e gerentes podem criar convites" ON team_invites;
CREATE POLICY "Admin e gerentes podem criar convites"
  ON team_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gerente')
    )
  );

-- Admin e gerentes podem deletar convites
DROP POLICY IF EXISTS "Admin e gerentes podem deletar convites" ON team_invites;
CREATE POLICY "Admin e gerentes podem deletar convites"
  ON team_invites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gerente')
    )
  );

-- Usuários podem aceitar seus próprios convites (via token público)
DROP POLICY IF EXISTS "Usuários podem atualizar convites via token" ON team_invites;
CREATE POLICY "Usuários podem atualizar convites via token"
  ON team_invites FOR UPDATE
  TO public
  USING (expires_at > now() AND accepted_at IS NULL);

-- =============================================
-- 5. FUNÇÃO PARA ACEITAR CONVITE
-- =============================================

CREATE OR REPLACE FUNCTION accept_team_invite(p_token TEXT, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_result JSON;
BEGIN
  -- Buscar convite
  SELECT * INTO v_invite
  FROM team_invites
  WHERE invite_token = p_token
  AND expires_at > now()
  AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Convite inválido ou expirado'
    );
  END IF;

  -- Criar perfil
  INSERT INTO profiles (
    id, email, name, role, setor, cargo, departamento, telefone,
    horario_inicio, horario_fim, dias_trabalho
  ) VALUES (
    p_user_id,
    v_invite.email,
    v_invite.name,
    v_invite.role,
    v_invite.setor,
    v_invite.cargo,
    v_invite.departamento,
    v_invite.telefone,
    v_invite.horario_inicio,
    v_invite.horario_fim,
    v_invite.dias_trabalho
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    setor = EXCLUDED.setor,
    cargo = EXCLUDED.cargo,
    departamento = EXCLUDED.departamento,
    telefone = EXCLUDED.telefone,
    horario_inicio = EXCLUDED.horario_inicio,
    horario_fim = EXCLUDED.horario_fim,
    dias_trabalho = EXCLUDED.dias_trabalho;

  -- Marcar convite como aceito
  UPDATE team_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN json_build_object(
    'success', true,
    'message', 'Convite aceito com sucesso!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. FUNÇÃO PARA LIMPAR CONVITES EXPIRADOS
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  DELETE FROM team_invites
  WHERE expires_at < now()
  AND accepted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
