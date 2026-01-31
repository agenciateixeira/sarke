-- =============================================
-- ADICIONAR CAMPO first_access_completed
-- =============================================

-- Adicionar coluna se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'first_access_completed'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN first_access_completed BOOLEAN DEFAULT true;

        -- Marcar todos os perfis existentes como já concluídos
        UPDATE profiles SET first_access_completed = true WHERE first_access_completed IS NULL;
    END IF;
END $$;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_profiles_first_access
ON profiles(email, first_access_completed);
