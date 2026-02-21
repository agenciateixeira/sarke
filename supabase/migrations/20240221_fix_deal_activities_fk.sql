-- Migration: Corrigir foreign keys de deal_activities e deal_attachments
-- Data: 2024-02-21
-- Descrição: Altera as foreign keys para referenciar a tabela profiles ao invés de auth.users

-- 1. Remover foreign key antiga de deal_activities.created_by
ALTER TABLE deal_activities
DROP CONSTRAINT IF EXISTS deal_activities_created_by_fkey;

-- 2. Adicionar nova foreign key referenciando profiles
ALTER TABLE deal_activities
ADD CONSTRAINT deal_activities_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Remover foreign key antiga de deal_attachments.uploaded_by
ALTER TABLE deal_attachments
DROP CONSTRAINT IF EXISTS deal_attachments_uploaded_by_fkey;

-- 4. Adicionar nova foreign key referenciando profiles
ALTER TABLE deal_attachments
ADD CONSTRAINT deal_attachments_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 5. Comentários para documentação
COMMENT ON CONSTRAINT deal_activities_created_by_fkey ON deal_activities
IS 'Foreign key para profiles ao invés de auth.users para permitir joins com PostgREST';

COMMENT ON CONSTRAINT deal_attachments_uploaded_by_fkey ON deal_attachments
IS 'Foreign key para profiles ao invés de auth.users para permitir joins com PostgREST';
