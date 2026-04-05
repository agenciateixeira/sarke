-- =============================================
-- SARKE - 03: Sistema Base
-- Tabelas usadas em background pela plataforma
-- Execute APÓS 01_auth_profiles.sql e 02_comercial.sql
-- =============================================

-- =============================================
-- TABELA: team_invites
-- Convites para entrada no time
-- =============================================

CREATE TABLE IF NOT EXISTS public.team_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'colaborador'
                          CHECK (role IN ('admin', 'gerente', 'colaborador', 'juridico')),
  token       TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  invited_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_email   ON public.team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token   ON public.team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_expires ON public.team_invites(expires_at);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin vê convites"    ON public.team_invites;
DROP POLICY IF EXISTS "Admin cria convites"  ON public.team_invites;
DROP POLICY IF EXISTS "Admin deleta convites" ON public.team_invites;
DROP POLICY IF EXISTS "Aceitar via token"    ON public.team_invites;

CREATE POLICY "Admin vê convites"
  ON public.team_invites FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Admin cria convites"
  ON public.team_invites FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin deleta convites"
  ON public.team_invites FOR DELETE TO authenticated
  USING (is_admin());

CREATE POLICY "Aceitar via token"
  ON public.team_invites FOR UPDATE TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS trg_team_invites_updated_at ON public.team_invites;
CREATE TRIGGER trg_team_invites_updated_at
  BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- TABELA: access_requests
-- Solicitações de acesso (módulo de notificações)
-- =============================================

CREATE TABLE IF NOT EXISTS public.access_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  valid_until   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_user   ON public.access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário vê próprias solicitações" ON public.access_requests;
DROP POLICY IF EXISTS "Usuário cria solicitação"         ON public.access_requests;
DROP POLICY IF EXISTS "Admin vê todas solicitações"      ON public.access_requests;
DROP POLICY IF EXISTS "Admin atualiza solicitações"      ON public.access_requests;

CREATE POLICY "Usuário vê próprias solicitações"
  ON public.access_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Usuário cria solicitação"
  ON public.access_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin atualiza solicitações"
  ON public.access_requests FOR UPDATE TO authenticated
  USING (is_admin());

DROP TRIGGER IF EXISTS trg_access_requests_updated_at ON public.access_requests;
CREATE TRIGGER trg_access_requests_updated_at
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- FUNÇÃO RPC: has_approved_access
-- Verifica se o usuário tem acesso aprovado ativo
-- =============================================

CREATE OR REPLACE FUNCTION public.has_approved_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE user_id = p_user_id
      AND status = 'approved'
      AND (valid_until IS NULL OR valid_until > NOW())
  );
END;
$$;

-- =============================================
-- FUNÇÃO RPC: review_access_request
-- Admin aprova ou rejeita solicitação de acesso
-- =============================================

CREATE OR REPLACE FUNCTION public.review_access_request(
  p_request_id  UUID,
  p_admin_id    UUID,
  p_approved    BOOLEAN,
  p_hours_valid INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
  v_valid_until TIMESTAMPTZ;
BEGIN
  v_status := CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END;

  IF p_approved THEN
    v_valid_until := NOW() + (p_hours_valid || ' hours')::INTERVAL;
  END IF;

  UPDATE public.access_requests
  SET
    status      = v_status,
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    valid_until = v_valid_until
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Solicitação não encontrada');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_approved
      THEN 'Acesso aprovado por ' || p_hours_valid || ' horas'
      ELSE 'Acesso rejeitado'
    END
  );
END;
$$;

SELECT 'sistema_base OK' AS status;
