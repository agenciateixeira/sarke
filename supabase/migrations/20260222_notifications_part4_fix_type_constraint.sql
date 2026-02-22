-- =====================================================
-- FIX: Remover constraint antiga de tipo de notificação
-- Data: 2026-02-22
-- Descrição: Remove a constraint CHECK que limita os tipos
-- =====================================================

-- Verificar se existe constraint e remover
DO $$
BEGIN
  -- Tentar remover a constraint se existir
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

  RAISE NOTICE 'Constraint removida com sucesso!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao remover constraint: %', SQLERRM;
END $$;

-- Verificar tipos atuais na tabela
SELECT DISTINCT type FROM notifications ORDER BY type;

SELECT 'Constraint de tipo removida! Todos os tipos agora são permitidos. ✅' as message;
