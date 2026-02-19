-- =============================================
-- SARKE - SCRIPT COMPLETO DE INSTALAÇÃO
-- Sistema de Convites de Equipe
-- =============================================
-- INSTRUÇÕES:
-- 1. Acesse: https://eaphfgwyiaqelppopcrt.supabase.co
-- 2. Vá em SQL Editor → New Query
-- 3. Copie e cole TUDO deste arquivo
-- 4. Clique em RUN (Ctrl+Enter)
-- =============================================

-- =============================================
-- PARTE 1: CRIAR TABELA team_invites
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
-- PARTE 2: CRIAR ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_team_invites_expires ON team_invites(expires_at);

-- =============================================
-- PARTE 3: TRIGGER PARA UPDATED_AT
-- =============================================

DROP TRIGGER IF EXISTS update_team_invites_updated_at ON team_invites;
CREATE TRIGGER update_team_invites_updated_at
  BEFORE UPDATE ON team_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PARTE 4: ATIVAR RLS
-- =============================================

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PARTE 5: REMOVER POLÍTICAS ANTIGAS (se existirem)
-- =============================================

DROP POLICY IF EXISTS "Admin e gerentes podem ver convites" ON team_invites;
DROP POLICY IF EXISTS "Admin e gerentes podem criar convites" ON team_invites;
DROP POLICY IF EXISTS "Admin e gerentes podem deletar convites" ON team_invites;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios convites pendentes" ON team_invites;
DROP POLICY IF EXISTS "Usuários podem atualizar convites via token" ON team_invites;
DROP POLICY IF EXISTS "Público pode ver convites pendentes não expirados" ON team_invites;
DROP POLICY IF EXISTS "Público pode atualizar convites via token válido" ON team_invites;

-- =============================================
-- PARTE 6: CRIAR POLÍTICAS RLS CORRETAS
-- =============================================

-- POLÍTICA 1: Admin e gerentes podem ver todos os convites
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

-- POLÍTICA 2: Admin e gerentes podem criar convites
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

-- POLÍTICA 3: Admin e gerentes podem deletar convites
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

-- POLÍTICA 4: PÚBLICO pode ver convites pendentes (CRÍTICO PARA PRIMEIRO ACESSO)
CREATE POLICY "Público pode ver convites pendentes não expirados"
  ON team_invites FOR SELECT
  TO public
  USING (
    accepted_at IS NULL
    AND expires_at > now()
  );

-- POLÍTICA 5: PÚBLICO pode atualizar convites via token (CRÍTICO PARA ACEITAR CONVITE)
CREATE POLICY "Público pode atualizar convites via token válido"
  ON team_invites FOR UPDATE
  TO public
  USING (
    accepted_at IS NULL
    AND expires_at > now()
  )
  WITH CHECK (
    accepted_at IS NOT NULL
  );

-- =============================================
-- PARTE 7: FUNÇÃO PARA ACEITAR CONVITE
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
-- PARTE 8: FUNÇÃO PARA LIMPAR CONVITES EXPIRADOS
-- =============================================

CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  DELETE FROM team_invites
  WHERE expires_at < now()
  AND accepted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PARTE 9: COMENTÁRIOS
-- =============================================

COMMENT ON TABLE team_invites IS 'Convites pendentes para novos membros da equipe';
COMMENT ON FUNCTION accept_team_invite IS 'Aceita um convite de equipe e cria o perfil do usuário';
COMMENT ON FUNCTION cleanup_expired_invites IS 'Remove convites expirados que não foram aceitos';

COMMENT ON POLICY "Público pode ver convites pendentes não expirados" ON team_invites
IS 'CRÍTICO: Permite que usuários não autenticados consultem convites na tela de Primeiro Acesso';

COMMENT ON POLICY "Público pode atualizar convites via token válido" ON team_invites
IS 'CRÍTICO: Permite que usuários não autenticados aceitem convites válidos';

-- =============================================
-- PARTE 10: VERIFICAÇÃO FINAL
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Instalação concluída com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Verificação:';
  RAISE NOTICE '- Tabela team_invites: CRIADA';
  RAISE NOTICE '- Índices: CRIADOS';
  RAISE NOTICE '- Triggers: CRIADOS';
  RAISE NOTICE '- RLS: ATIVADO';
  RAISE NOTICE '- Políticas: % criadas', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'team_invites');
  RAISE NOTICE '- Funções: accept_team_invite, cleanup_expired_invites';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '1. Testar criar convite como admin/gerente';
  RAISE NOTICE '2. Testar primeiro acesso em aba anônima';
  RAISE NOTICE '3. Configurar envio de emails (opcional)';
END $$;

-- =============================================
-- FIM DO SCRIPT
-- =============================================
-- Após executar, você pode verificar com:
-- SELECT COUNT(*) FROM team_invites;
-- SELECT * FROM pg_policies WHERE tablename = 'team_invites';
-- =============================================
