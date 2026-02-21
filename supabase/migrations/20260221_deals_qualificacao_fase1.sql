-- =============================================
-- SARKE - Pipeline FASE 1: Campos de Qualificação
-- Adiciona campos essenciais para qualificação de leads
-- =============================================

-- PASSO 1: Adicionar campos de qualificação na tabela deals
-- =============================================

ALTER TABLE deals
  -- Origem e Qualificação do Lead
  ADD COLUMN IF NOT EXISTS lead_source TEXT CHECK (lead_source IN (
    'website',
    'indicacao',
    'instagram',
    'facebook',
    'linkedin',
    'google_ads',
    'facebook_ads',
    'evento',
    'cold_call',
    'email_marketing',
    'parceria',
    'retorno',
    'outros'
  )),
  ADD COLUMN IF NOT EXISTS lead_source_detail TEXT, -- Se indicação, quem indicou

  -- Tipo de Negócio e Serviço
  ADD COLUMN IF NOT EXISTS business_type TEXT CHECK (business_type IN (
    'residencial',
    'comercial',
    'industrial',
    'publico'
  )),
  ADD COLUMN IF NOT EXISTS service_type TEXT CHECK (service_type IN (
    'projeto_arquitetonico',
    'gestao_obra',
    'consultoria',
    'regularizacao',
    'reformas',
    'acompanhamento',
    'outros'
  )),

  -- Temperatura e Urgência
  ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'morno' CHECK (temperature IN (
    'quente',
    'morno',
    'frio'
  )),
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'media' CHECK (urgency IN (
    'alta',
    'media',
    'baixa'
  )),

  -- Controle de Follow-up
  ADD COLUMN IF NOT EXISTS last_contact_date DATE,
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE,

  -- Tags e Notas
  ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array de tags
  ADD COLUMN IF NOT EXISTS notes TEXT, -- Notas adicionais/observações

  -- Arquivamento
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Campos adicionais úteis
  ADD COLUMN IF NOT EXISTS competitors TEXT, -- Concorrentes envolvidos
  ADD COLUMN IF NOT EXISTS decision_deadline DATE; -- Prazo de decisão do cliente

-- PASSO 2: Criar índices para performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_deals_lead_source ON deals(lead_source);
CREATE INDEX IF NOT EXISTS idx_deals_business_type ON deals(business_type);
CREATE INDEX IF NOT EXISTS idx_deals_service_type ON deals(service_type);
CREATE INDEX IF NOT EXISTS idx_deals_temperature ON deals(temperature);
CREATE INDEX IF NOT EXISTS idx_deals_urgency ON deals(urgency);
CREATE INDEX IF NOT EXISTS idx_deals_archived ON deals(archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_deals_tags ON deals USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_deals_next_follow_up ON deals(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_last_contact ON deals(last_contact_date);

-- PASSO 3: Comentários nas colunas para documentação
-- =============================================

COMMENT ON COLUMN deals.lead_source IS 'Origem do lead: website, indicação, redes sociais, etc';
COMMENT ON COLUMN deals.lead_source_detail IS 'Detalhes da origem (ex: nome de quem indicou)';
COMMENT ON COLUMN deals.business_type IS 'Tipo de negócio: residencial, comercial, industrial, público';
COMMENT ON COLUMN deals.service_type IS 'Tipo de serviço solicitado';
COMMENT ON COLUMN deals.temperature IS 'Temperatura do lead: quente, morno, frio';
COMMENT ON COLUMN deals.urgency IS 'Urgência da negociação: alta, média, baixa';
COMMENT ON COLUMN deals.last_contact_date IS 'Data do último contato com o cliente';
COMMENT ON COLUMN deals.next_follow_up_date IS 'Data programada para próximo follow-up';
COMMENT ON COLUMN deals.tags IS 'Tags customizáveis para organização';
COMMENT ON COLUMN deals.notes IS 'Notas e observações sobre o negócio';
COMMENT ON COLUMN deals.archived IS 'Indica se o deal foi arquivado (não aparece no pipeline ativo)';
COMMENT ON COLUMN deals.competitors IS 'Concorrentes envolvidos na negociação';
COMMENT ON COLUMN deals.decision_deadline IS 'Prazo limite para decisão do cliente';

-- =============================================
-- FIM DA MIGRATION
-- =============================================

SELECT 'Campos de qualificação adicionados com sucesso! ✅' as message;

-- Verificar se os campos foram criados
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'deals'
AND column_name IN (
  'lead_source', 'business_type', 'service_type',
  'temperature', 'urgency', 'archived', 'tags'
)
ORDER BY column_name;
