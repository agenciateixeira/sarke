-- Script para verificar e adicionar coluna status se não existir

-- Adicionar coluna status se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'clients'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect'));
    END IF;
END $$;

-- Criar índice se não existir
DROP INDEX IF EXISTS idx_clients_status;
CREATE INDEX idx_clients_status ON clients(status);
