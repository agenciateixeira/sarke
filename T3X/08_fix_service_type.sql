-- =============================================
-- SARKE - 08: Fix service_type constraint
-- Corrige a constraint de service_type na tabela deals
-- para incluir os valores projeto_arquitetonico_completo
-- e projeto_interiores (faltavam na migração original).
-- Execute APÓS o arquivo 04_pipeline_extendido.sql
-- =============================================

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_service_type_check;

ALTER TABLE public.deals
  ADD CONSTRAINT deals_service_type_check CHECK (service_type IN (
    'projeto_arquitetonico',
    'projeto_arquitetonico_completo',
    'projeto_interiores',
    'gestao_obra',
    'consultoria',
    'regularizacao',
    'reformas',
    'acompanhamento',
    'outros'
  ));

SELECT '08_fix_service_type OK' AS status;
