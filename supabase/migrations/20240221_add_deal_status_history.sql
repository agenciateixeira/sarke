-- Migration: Adicionar histórico de status dos deals para tracking de churn e conversão
-- Data: 2024-02-21
-- Descrição: Cria tabela para rastrear todas mudanças de status dos deals

-- 1. Criar tabela de histórico de status
CREATE TABLE IF NOT EXISTS deal_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  previous_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  new_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  lost_reason TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_deal_status_history_deal_id ON deal_status_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_status_history_created_at ON deal_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_status_history_new_status ON deal_status_history(new_status);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE deal_status_history ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acesso (mesmas permissões da tabela deals)
CREATE POLICY "Usuários podem ver histórico de deals que podem ver"
  ON deal_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_status_history.deal_id
    )
  );

CREATE POLICY "Usuários podem criar histórico de deals que podem editar"
  ON deal_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_status_history.deal_id
    )
  );

-- 5. Função para registrar mudança de status automaticamente
CREATE OR REPLACE FUNCTION log_deal_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra se o status realmente mudou
  IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    INSERT INTO deal_status_history (
      deal_id,
      previous_status,
      new_status,
      previous_stage_id,
      new_stage_id,
      lost_reason,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      OLD.stage_id,
      NEW.stage_id,
      NEW.lost_reason,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar trigger para capturar mudanças automaticamente
DROP TRIGGER IF EXISTS trigger_log_deal_status_change ON deals;
CREATE TRIGGER trigger_log_deal_status_change
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_status_change();

-- 7. Popular histórico com dados existentes (snapshot inicial)
INSERT INTO deal_status_history (deal_id, new_status, new_stage_id, created_at)
SELECT
  id,
  status,
  stage_id,
  created_at
FROM deals
WHERE NOT EXISTS (
  SELECT 1 FROM deal_status_history WHERE deal_status_history.deal_id = deals.id
);

-- 8. Comentários nas tabelas e colunas
COMMENT ON TABLE deal_status_history IS 'Histórico de mudanças de status dos deals para análise de churn e conversão';
COMMENT ON COLUMN deal_status_history.deal_id IS 'ID do deal que teve status alterado';
COMMENT ON COLUMN deal_status_history.previous_status IS 'Status anterior (open, won, lost)';
COMMENT ON COLUMN deal_status_history.new_status IS 'Novo status (open, won, lost)';
COMMENT ON COLUMN deal_status_history.lost_reason IS 'Motivo da perda, se aplicável';
COMMENT ON COLUMN deal_status_history.changed_by IS 'Usuário que fez a alteração';
