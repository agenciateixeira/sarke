-- =============================================
-- SPRINT 2: TEMPLATES DE COMUNICAÇÃO
-- Sistema de templates para Email, WhatsApp, SMS
-- Com variáveis dinâmicas e versionamento
-- =============================================

-- Tabela de Templates de Comunicação
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'sms')),
  category TEXT, -- 'follow_up', 'proposal', 'reminder', 'welcome', etc

  -- Conteúdo do template
  subject TEXT, -- Apenas para emails
  body TEXT NOT NULL,

  -- Variáveis disponíveis (array de strings)
  -- Ex: ['cliente_nome', 'deal_titulo', 'deal_valor', 'responsavel_nome']
  available_variables TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadados
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Template padrão para categoria
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Índices e constraints
  CONSTRAINT unique_default_per_category UNIQUE NULLS NOT DISTINCT (category, is_default, type)
);

-- Tabela de Histórico de Envios (ligada aos templates)
CREATE TABLE IF NOT EXISTS communication_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,

  -- Destinatário
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('client', 'deal', 'contact')),
  recipient_id UUID NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,

  -- Conteúdo renderizado (após substituir variáveis)
  rendered_subject TEXT,
  rendered_body TEXT NOT NULL,

  -- Status do envio
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  provider TEXT, -- 'sendgrid', 'twilio', 'whatsapp_business', etc
  provider_message_id TEXT,
  error_message TEXT,

  -- Metadados
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Contexto (de onde foi enviado)
  source TEXT, -- 'manual', 'automation', 'workflow'
  source_id UUID, -- ID da automação ou workflow

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Tabela de Variáveis de Template (mapeamento de variáveis disponíveis)
CREATE TABLE IF NOT EXISTS template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_key TEXT NOT NULL UNIQUE, -- 'cliente_nome', 'deal_valor', etc
  variable_label TEXT NOT NULL, -- 'Nome do Cliente', 'Valor do Deal', etc
  variable_description TEXT,
  variable_type TEXT NOT NULL CHECK (variable_type IN ('text', 'number', 'date', 'currency', 'boolean')),
  variable_category TEXT NOT NULL, -- 'client', 'deal', 'user', 'company', 'system'

  -- Exemplo de uso
  example_value TEXT,

  -- Formatação
  format_mask TEXT, -- Ex: 'R$ {value}' para currency

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_templates_type ON communication_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON communication_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON communication_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sends_template ON communication_sends(template_id);
CREATE INDEX IF NOT EXISTS idx_sends_recipient ON communication_sends(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_sends_status ON communication_sends(status);
CREATE INDEX IF NOT EXISTS idx_sends_created ON communication_sends(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER template_updated_at
  BEFORE UPDATE ON communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

-- Trigger para incrementar usage_count quando template é usado
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE communication_templates
    SET
      usage_count = usage_count + 1,
      last_used_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER template_usage_tracker
  AFTER INSERT ON communication_sends
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();

-- Function para renderizar template com variáveis
CREATE OR REPLACE FUNCTION render_template(
  p_template_id UUID,
  p_variables JSONB
)
RETURNS TABLE (
  subject TEXT,
  body TEXT
) AS $$
DECLARE
  v_template RECORD;
  v_subject TEXT;
  v_body TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Buscar template
  SELECT t.subject, t.body INTO v_template
  FROM communication_templates t
  WHERE t.id = p_template_id AND t.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template não encontrado ou inativo';
  END IF;

  v_subject := v_template.subject;
  v_body := v_template.body;

  -- Substituir variáveis no formato {{variavel}}
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := REPLACE(v_subject, '{{' || v_key || '}}', v_value);
    v_body := REPLACE(v_body, '{{' || v_key || '}}', v_value);
  END LOOP;

  RETURN QUERY SELECT v_subject, v_body;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;

-- Templates: Todos podem ver templates ativos
CREATE POLICY "Users can view active templates" ON communication_templates
  FOR SELECT USING (is_active = true);

-- Templates: Apenas criador ou admin pode editar
CREATE POLICY "Users can manage their templates" ON communication_templates
  FOR ALL USING (created_by = auth.uid());

-- Sends: Usuários veem envios relacionados aos seus deals/clientes
CREATE POLICY "Users can view their sends" ON communication_sends
  FOR SELECT USING (created_by = auth.uid());

-- Sends: Usuários podem criar envios
CREATE POLICY "Users can create sends" ON communication_sends
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Variables: Todos podem ver variáveis
CREATE POLICY "Users can view variables" ON template_variables
  FOR SELECT USING (true);

-- =============================================
-- DADOS INICIAIS: Templates padrão e variáveis
-- =============================================

-- Inserir variáveis padrão
INSERT INTO template_variables (variable_key, variable_label, variable_description, variable_type, variable_category, example_value, format_mask) VALUES
  -- Cliente
  ('cliente_nome', 'Nome do Cliente', 'Nome completo do cliente', 'text', 'client', 'João Silva', null),
  ('cliente_email', 'Email do Cliente', 'Endereço de email', 'text', 'client', 'joao@exemplo.com', null),
  ('cliente_telefone', 'Telefone do Cliente', 'Número de telefone', 'text', 'client', '(11) 98765-4321', null),
  ('cliente_empresa', 'Empresa do Cliente', 'Nome da empresa', 'text', 'client', 'Empresa LTDA', null),

  -- Deal
  ('deal_titulo', 'Título do Deal', 'Nome/título do negócio', 'text', 'deal', 'Proposta Comercial 2024', null),
  ('deal_valor', 'Valor do Deal', 'Valor em reais', 'currency', 'deal', '50000', 'R$ {value}'),
  ('deal_probabilidade', 'Probabilidade', 'Percentual de fechamento', 'number', 'deal', '75', '{value}%'),
  ('deal_etapa', 'Etapa Atual', 'Nome da etapa do pipeline', 'text', 'deal', 'Proposta Enviada', null),
  ('deal_temperatura', 'Temperatura', 'Nível de interesse', 'text', 'deal', 'Quente', null),

  -- Usuário/Responsável
  ('responsavel_nome', 'Nome do Responsável', 'Nome do vendedor/responsável', 'text', 'user', 'Maria Santos', null),
  ('responsavel_email', 'Email do Responsável', 'Email do vendedor', 'text', 'user', 'maria@empresa.com', null),
  ('responsavel_telefone', 'Telefone do Responsável', 'Telefone do vendedor', 'text', 'user', '(11) 91234-5678', null),

  -- Sistema
  ('data_hoje', 'Data de Hoje', 'Data atual formatada', 'date', 'system', '21/02/2024', null),
  ('hora_atual', 'Hora Atual', 'Hora atual formatada', 'text', 'system', '14:30', null),
  ('empresa_nome', 'Nome da Empresa', 'Nome da sua empresa', 'text', 'company', 'Sua Empresa S.A.', null)
ON CONFLICT (variable_key) DO NOTHING;

-- Templates padrão de Email
INSERT INTO communication_templates (name, description, type, category, subject, body, available_variables, is_default, created_by) VALUES
  (
    'Follow-up Inicial',
    'Email de primeiro contato após lead entrar no pipeline',
    'email',
    'follow_up',
    'Olá {{cliente_nome}}, vamos conversar sobre {{deal_titulo}}?',
    'Olá {{cliente_nome}},

Espero que este email encontre você bem!

Vi que você demonstrou interesse em {{deal_titulo}} e gostaria de agendar uma conversa para entender melhor suas necessidades.

Podemos conversar nos próximos dias? Estou à disposição para esclarecer qualquer dúvida.

Atenciosamente,
{{responsavel_nome}}
{{responsavel_email}}
{{responsavel_telefone}}',
    ARRAY['cliente_nome', 'deal_titulo', 'responsavel_nome', 'responsavel_email', 'responsavel_telefone'],
    true,
    (SELECT id FROM profiles LIMIT 1)
  ),
  (
    'Proposta Comercial',
    'Email para envio de proposta comercial',
    'email',
    'proposal',
    'Proposta Comercial - {{deal_titulo}}',
    'Prezado(a) {{cliente_nome}},

Conforme conversamos, segue em anexo nossa proposta comercial para {{deal_titulo}}.

Valor: {{deal_valor}}

Estou à disposição para esclarecer quaisquer dúvidas e ajustar a proposta conforme necessário.

Aguardo seu retorno!

Atenciosamente,
{{responsavel_nome}}',
    ARRAY['cliente_nome', 'deal_titulo', 'deal_valor', 'responsavel_nome'],
    true,
    (SELECT id FROM profiles LIMIT 1)
  );

-- Templates padrão de WhatsApp
INSERT INTO communication_templates (name, description, type, category, subject, body, available_variables, is_default, created_by) VALUES
  (
    'Lembrete de Reunião',
    'Mensagem de lembrete de reunião agendada',
    'whatsapp',
    'reminder',
    null,
    'Oi {{cliente_nome}}! 👋

Passando para lembrar da nossa reunião sobre {{deal_titulo}}.

Nos vemos em breve!

{{responsavel_nome}}',
    ARRAY['cliente_nome', 'deal_titulo', 'responsavel_nome'],
    true,
    (SELECT id FROM profiles LIMIT 1)
  ),
  (
    'Follow-up Rápido',
    'Mensagem curta de acompanhamento',
    'whatsapp',
    'follow_up',
    null,
    'Oi {{cliente_nome}}!

Como está? Conseguiu avaliar a proposta de {{deal_titulo}}?

Qualquer dúvida, estou à disposição! 😊',
    ARRAY['cliente_nome', 'deal_titulo'],
    true,
    (SELECT id FROM profiles LIMIT 1)
  );

-- Comentários finais
COMMENT ON TABLE communication_templates IS 'Templates reutilizáveis para comunicação com clientes';
COMMENT ON TABLE communication_sends IS 'Histórico de todos os envios de mensagens';
COMMENT ON TABLE template_variables IS 'Catálogo de variáveis disponíveis para templates';
