-- =====================================================
-- FIX: Adicionar colunas que faltam nas tabelas
-- Executar ANTES da Parte 2
-- =====================================================

-- Adicionar colunas que podem estar faltando na tabela notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS document_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS automation_log_id UUID;

-- Verificar se as colunas foram adicionadas
SELECT 'Colunas adicionadas com sucesso! ✅' as message;
