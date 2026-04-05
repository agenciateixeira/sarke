-- Migration: Renomear business_type 'industrial' → 'corporativo' na tabela deals
-- Contexto: O tipo 'industrial' não reflete o negócio de escritório de arquitetura.
--           'corporativo' representa melhor projetos para empresas/corporações.
-- Nota: TipoObra (obras) NÃO é afetado por esta migration.

-- 1. Remover constraint de CHECK antiga (se existir como constraint nomeada)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_business_type_check;

-- 2. Atualizar registros existentes ANTES de recriar a constraint
UPDATE deals
SET business_type = 'corporativo'
WHERE business_type = 'industrial';

-- 3. Recriar constraint com novo valor
ALTER TABLE deals
  ADD CONSTRAINT deals_business_type_check
  CHECK (business_type IN ('residencial', 'comercial', 'corporativo', 'publico'));
