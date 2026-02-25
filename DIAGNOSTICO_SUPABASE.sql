-- =====================================================
-- DIAGNÓSTICO: Execute este script PRIMEIRO para verificar as estruturas
-- =====================================================

-- 1. Verificar colunas da tabela obra_caixa
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'obra_caixa'
ORDER BY ordinal_position;

-- 2. Verificar se a função existe e sua definição
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'arquivar_obra_no_memorial';

-- 3. Verificar colunas da tabela memorial_caixa_obra
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'memorial_caixa_obra'
ORDER BY ordinal_position;
