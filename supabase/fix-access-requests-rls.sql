-- =============================================
-- FIX: Permitir que usuários autenticados criem access_requests
-- =============================================

-- Remover política restritiva de INSERT
DROP POLICY IF EXISTS "access_requests_insert_policy" ON access_requests;

-- Nova política: Qualquer usuário autenticado pode criar access_request
CREATE POLICY "access_requests_insert_policy"
  ON access_requests FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Permitir qualquer INSERT de usuário autenticado

-- NOTA: A validação de user_id será feita na aplicação
-- e o trigger garantirá que notificações sejam criadas
