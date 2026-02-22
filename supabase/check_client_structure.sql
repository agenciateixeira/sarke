-- =====================================================
-- VERIFICAR: Estrutura da tabela clients
-- =====================================================

-- Ver todas as colunas da tabela clients
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- Ver um exemplo de cliente
SELECT *
FROM clients
LIMIT 1;
