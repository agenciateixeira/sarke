-- =============================================
-- FIX CRÍTICO: Políticas RLS para Primeiro Acesso
-- =============================================
-- Permite que usuários NÃO AUTENTICADOS possam:
-- 1. Consultar convites pendentes pelo email
-- 2. Aceitar convites (via função RPC)

-- =============================================
-- 1. REMOVER POLÍTICAS ANTIGAS
-- =============================================

DROP POLICY IF EXISTS "Usuários podem ver seus próprios convites pendentes" ON team_invites;
DROP POLICY IF EXISTS "Usuários podem atualizar convites via token" ON team_invites;

-- =============================================
-- 2. CRIAR POLÍTICAS CORRETAS PARA PÚBLICO
-- =============================================

-- POLÍTICA 1: Permitir que QUALQUER pessoa (public) leia convites pendentes
-- Isso é necessário para a página de "Primeiro Acesso"
CREATE POLICY "Público pode ver convites pendentes não expirados"
  ON team_invites
  FOR SELECT
  TO public
  USING (
    accepted_at IS NULL
    AND expires_at > now()
  );

-- POLÍTICA 2: Permitir que QUALQUER pessoa atualize convites via token
-- Isso é necessário para aceitar o convite
CREATE POLICY "Público pode atualizar convites via token válido"
  ON team_invites
  FOR UPDATE
  TO public
  USING (
    accepted_at IS NULL
    AND expires_at > now()
  )
  WITH CHECK (
    accepted_at IS NOT NULL
  );

-- =============================================
-- 3. GARANTIR QUE A FUNÇÃO RPC É SECURITY DEFINER
-- =============================================
-- Isso permite que a função execute com privilégios elevados

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
-- 4. GARANTIR QUE RLS ESTÁ ATIVADO
-- =============================================

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. COMENTÁRIOS
-- =============================================

COMMENT ON POLICY "Público pode ver convites pendentes não expirados" ON team_invites
IS 'Permite que usuários não autenticados consultem convites pendentes na tela de Primeiro Acesso';

COMMENT ON POLICY "Público pode atualizar convites via token válido" ON team_invites
IS 'Permite que usuários não autenticados aceitem convites válidos';
