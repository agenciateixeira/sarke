-- Migration: Adicionar campo opportunity_cod na tabela deals
-- Formato: EST00050, EST00051, ... (EST = estimativa, ainda não fechou contrato)
-- Deals existentes iniciam em EST00050. Novos deals continuam a sequência via trigger.

-- 1. Criar sequência (valor ser�� ajustado após backfill)
CREATE SEQUENCE IF NOT EXISTS opportunity_cod_seq;

-- 2. Adicionar coluna (nullable primeiro para permitir backfill)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS opportunity_cod VARCHAR(20) UNIQUE;

-- 3. Backfill: atribuir EST00050 em diante para deals existentes, por ordem de criação
WITH numbered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC) + 49) AS seq_num
  FROM deals
  WHERE opportunity_cod IS NULL
)
UPDATE deals
SET opportunity_cod = 'EST' || LPAD(numbered.seq_num::text, 5, '0')
FROM numbered
WHERE deals.id = numbered.id;

-- 4. Ajustar sequência para continuar após o último número atribuído pelo backfill
SELECT setval('opportunity_cod_seq',
  COALESCE((
    SELECT MAX(CAST(SUBSTRING(opportunity_cod FROM 4) AS INTEGER))
    FROM deals
    WHERE opportunity_cod IS NOT NULL
  ), 49)
);

-- 5. Tornar NOT NULL após backfill
ALTER TABLE deals ALTER COLUMN opportunity_cod SET NOT NULL;

-- 6. Criar função do trigger
CREATE OR REPLACE FUNCTION generate_opportunity_cod()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.opportunity_cod IS NULL OR NEW.opportunity_cod = '' THEN
    NEW.opportunity_cod := 'EST' || LPAD(nextval('opportunity_cod_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger BEFORE INSERT
DROP TRIGGER IF EXISTS set_opportunity_cod ON deals;
CREATE TRIGGER set_opportunity_cod
  BEFORE INSERT ON deals
  FOR EACH ROW
  EXECUTE FUNCTION generate_opportunity_cod();
