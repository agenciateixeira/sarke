-- =====================================================
-- FIX: Adicionar todas as colunas que faltam na tabela notifications
-- Executar ANTES da Parte 2 (se ainda não executou)
-- =====================================================

-- Adicionar colunas de relacionamento
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS document_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS automation_log_id UUID;

-- Adicionar colunas de ação/link
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label TEXT;

-- Adicionar coluna de dados JSON
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Adicionar coluna de prioridade
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Adicionar coluna de expiração
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Verificar se as colunas foram adicionadas
SELECT 'Todas as colunas adicionadas com sucesso! ✅' as message;
