-- =====================================================
-- FIX: Tornar server_url e username opcionais
-- Necessário para integração Google OAuth (não usa esses campos)
-- =====================================================

ALTER TABLE calendar_integrations
ALTER COLUMN server_url DROP NOT NULL,
ALTER COLUMN username DROP NOT NULL;
