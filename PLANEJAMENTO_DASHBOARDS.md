# 📊 Planejamento: Dashboards do Sistema Sarke

## 📋 Análise do Sistema Atual

### O que já existe:
- ✅ **Dashboard Admin** - Visão geral com obras, tarefas, RDOs
- ✅ **Obras** - Gestão completa de obras
- ✅ **Projetos** - Gestão de projetos arquitetônicos
- ✅ **CRM Comercial** - Pipeline de vendas (deals)
- ✅ **Tarefas** - Kanban de tarefas
- ✅ **Sistema Financeiro Básico** - Orçamento de materiais e caixa de obra

### O que falta:
- ❌ **Dashboard Financeiro Consolidado** - Visão macro do financeiro
- ❌ **Dashboard Jurídico** - Contratos, prazos, compliance
- ⚠️ **Dashboard Admin** - Precisa de melhorias

---

## 💰 DASHBOARD FINANCEIRO

### 🎯 Objetivo
Centralizar todas as informações financeiras da empresa em um único lugar, com:
- Visão consolidada de receitas e despesas
- Fluxo de caixa
- Contas a pagar e receber
- Indicadores financeiros (margem, lucratividade, inadimplência)

### 📊 KPIs Principais (Cards no Topo)

1. **Receita Total (Mês Atual)**
   - Valor total faturado no mês
   - Comparativo com mês anterior (%)
   - Ícone: DollarSign
   - Cor: Verde

2. **Despesas Totais (Mês Atual)**
   - Todas as despesas do mês
   - Comparativo com mês anterior (%)
   - Ícone: TrendingDown
   - Cor: Vermelho

3. **Saldo Líquido**
   - Receitas - Despesas
   - Status: Positivo/Negativo
   - Ícone: Wallet
   - Cor: Azul se positivo, Vermelho se negativo

4. **Contas a Receber**
   - Total pendente de clientes
   - Quantidade de faturas em aberto
   - Ícone: ArrowDownToLine
   - Cor: Laranja

5. **Contas a Pagar**
   - Total a pagar para fornecedores
   - Vencimentos próximos (7 dias)
   - Ícone: ArrowUpFromLine
   - Cor: Roxo

6. **Taxa de Inadimplência**
   - % de valores atrasados
   - Quantidade de clientes inadimplentes
   - Ícone: AlertCircle
   - Cor: Vermelho

### 📈 Gráficos e Visualizações

#### 1. **Gráfico de Linha: Fluxo de Caixa (12 meses)**
- Receitas (verde)
- Despesas (vermelho)
- Saldo líquido (azul)
- Projeção futura (tracejado)

#### 2. **Gráfico de Pizza: Receitas por Tipo**
- Projetos ARQ
- Projetos INT
- Obras
- Consultoria
- Outros

#### 3. **Gráfico de Barras: Despesas por Categoria**
- Materiais e Fornecedores
- Folha de Pagamento
- Impostos e Taxas
- Infraestrutura (aluguel, luz, etc)
- Marketing
- Outros

#### 4. **Timeline: Contas a Receber/Pagar (30 dias)**
- Visual de timeline mostrando vencimentos
- Cores: Verde (receber), Vermelho (pagar)
- Destacar vencidos em vermelho forte

### 📋 Tabelas e Listas

#### 1. **Últimas Movimentações Financeiras**
| Data | Tipo | Descrição | Categoria | Valor | Status |
|------|------|-----------|-----------|-------|--------|
| 20/02 | Receita | Pagamento Cliente X - Projeto Y | Projetos | +R$ 15.000 | ✅ Recebido |
| 19/02 | Despesa | Fornecedor ABC - Materiais | Materiais | -R$ 3.500 | ⏳ Pendente |

#### 2. **Contas a Receber (Próximos Vencimentos)**
| Cliente | Projeto/Obra | Valor | Vencimento | Status | Ações |
|---------|--------------|-------|------------|--------|-------|
| João Silva | Casa Moderna | R$ 25.000 | 28/02 | ⏰ 5 dias | Ver / Enviar Cobrança |

#### 3. **Contas a Pagar (Próximos Vencimentos)**
| Fornecedor | Descrição | Valor | Vencimento | Status | Ações |
|------------|-----------|-------|------------|--------|-------|
| Construtora XYZ | Materiais Obra A | R$ 12.000 | 25/02 | ⏰ 2 dias | Pagar / Agendar |

### 🎨 Filtros e Controles

- **Período**: Hoje / Semana / Mês / Trimestre / Ano / Personalizado
- **Tipo de Operação**: Todas / Receitas / Despesas
- **Status**: Todos / Recebido/Pago / Pendente / Atrasado
- **Categoria**: Todas / [lista de categorias]
- **Cliente/Fornecedor**: Busca

### 🔔 Alertas e Notificações

- 🔴 **Urgente**: Contas vencidas (vermelho)
- 🟡 **Atenção**: Vencimentos próximos (7 dias) (amarelo)
- 🔵 **Info**: Pagamentos recebidos hoje (azul)
- 🟢 **Sucesso**: Meta de faturamento atingida (verde)

### 💾 Dados Necessários (Tabelas)

**Criar novas tabelas:**

```sql
-- Tabela de movimentações financeiras gerais
CREATE TABLE financeiro_movimentacoes (
  id UUID PRIMARY KEY,
  tipo TEXT, -- 'receita', 'despesa'
  categoria TEXT, -- 'projeto', 'obra', 'folha', 'material', 'imposto', etc
  descricao TEXT,
  valor DECIMAL(15,2),
  data_emissao DATE,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT, -- 'pendente', 'pago', 'atrasado', 'cancelado'
  metodo_pagamento TEXT, -- 'pix', 'boleto', 'transferencia', 'dinheiro'

  -- Relacionamentos
  cliente_id UUID REFERENCES clients(id),
  fornecedor_id UUID REFERENCES empresas_parceiras(id),
  projeto_id UUID REFERENCES projetos(id),
  obra_id UUID REFERENCES obras(id),

  -- Comprovantes
  comprovante_url TEXT,
  nota_fiscal_numero TEXT,

  -- Observações
  observacoes TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de categorias financeiras
CREATE TABLE financeiro_categorias (
  id UUID PRIMARY KEY,
  nome TEXT,
  tipo TEXT, -- 'receita', 'despesa'
  icone TEXT,
  cor TEXT,
  descricao TEXT
);

-- Tabela de metas financeiras
CREATE TABLE financeiro_metas (
  id UUID PRIMARY KEY,
  mes INTEGER,
  ano INTEGER,
  meta_receita DECIMAL(15,2),
  meta_despesa DECIMAL(15,2),
  observacoes TEXT
);
```

---

## ⚖️ DASHBOARD JURÍDICO

### 🎯 Objetivo
Centralizar controle de contratos, documentos legais, prazos jurídicos e compliance.

### 📊 KPIs Principais (Cards no Topo)

1. **Contratos Ativos**
   - Total de contratos vigentes
   - % de renovações próximas (30 dias)
   - Ícone: FileText
   - Cor: Azul

2. **Contratos Vencendo**
   - Contratos com vencimento em 30 dias
   - Necessitam atenção/renovação
   - Ícone: AlertTriangle
   - Cor: Laranja

3. **Documentos Pendentes**
   - Documentos aguardando assinatura
   - Documentos em análise
   - Ícone: FileQuestion
   - Cor: Amarelo

4. **Taxa de Compliance**
   - % de contratos regularizados
   - % de documentos atualizados
   - Ícone: Shield
   - Cor: Verde

5. **Processos Ativos**
   - Quantidade de processos em andamento
   - Audiências próximas
   - Ícone: Scale
   - Cor: Roxo

6. **Alertas Jurídicos**
   - Prazos críticos (7 dias)
   - Documentos vencidos
   - Ícone: Bell
   - Cor: Vermelho

### 📈 Gráficos e Visualizações

#### 1. **Gráfico de Linha: Contratos ao Longo do Tempo**
- Contratos assinados por mês
- Contratos encerrados
- Renovações

#### 2. **Gráfico de Pizza: Tipos de Contrato**
- Contratos de prestação de serviço
- Contratos de obra
- Contratos trabalhistas
- Parcerias
- Outros

#### 3. **Gráfico de Barras: Status de Documentos**
- Assinados
- Pendentes
- Em análise
- Vencidos

#### 4. **Timeline: Prazos Jurídicos (90 dias)**
- Vencimentos de contratos
- Audiências
- Prazos processuais
- Renovações

### 📋 Tabelas e Listas

#### 1. **Contratos Vigentes**
| Contrato | Tipo | Cliente/Parte | Início | Vencimento | Valor | Status | Ações |
|----------|------|---------------|--------|------------|-------|--------|-------|
| #2024-001 | Prestação Serviço | João Silva | 01/01/24 | 31/12/24 | R$ 50k | ✅ Ativo | Ver / Renovar |

#### 2. **Documentos Pendentes de Assinatura**
| Documento | Tipo | Cliente | Envio | Prazo | Status | Ações |
|-----------|------|---------|-------|-------|--------|-------|
| Contrato Obra A | Contrato | Maria | 15/02 | 25/02 | ⏳ Aguardando | Lembrar / Ver |

#### 3. **Prazos Jurídicos Próximos**
| Tipo | Descrição | Projeto/Caso | Data | Dias Restantes | Ações |
|------|-----------|--------------|------|----------------|-------|
| Audiência | Processo X | - | 28/02 | 5 dias | Preparar / Ver |

#### 4. **Processos em Andamento**
| Número | Tipo | Parte | Última Atualização | Próxima Ação | Status |
|--------|------|-------|-------------------|--------------|--------|
| 001/24 | Trabalhista | Ex-funcionário | 10/02 | Audiência 28/02 | Em andamento |

### 🎨 Funcionalidades Específicas

#### 1. **Central de Assinaturas Digitais**
- Integração com plataformas (ClickSign, DocuSign, etc)
- Status de assinaturas pendentes
- Envio de lembretes automáticos

#### 2. **Biblioteca de Modelos**
- Templates de contratos
- Cláusulas padrão
- Termos de uso
- Editável com variáveis dinâmicas

#### 3. **Controle de Alvarás e Licenças**
- Alvará de funcionamento
- Licenças de obra
- Registros profissionais (CAU, CREA)
- Alertas de vencimento

#### 4. **Gestão de Seguros**
- Seguros de obra
- Seguros de responsabilidade civil
- Apólices de equipe
- Renovações automáticas

### 🔔 Alertas e Notificações

- 🔴 **Urgente**: Prazo processual em 3 dias
- 🟡 **Atenção**: Contrato vencendo em 15 dias
- 🔵 **Info**: Documento assinado
- 🟢 **Sucesso**: Processo encerrado favoravelmente

### 💾 Dados Necessários (Tabelas)

**Criar novas tabelas:**

```sql
-- Tabela de contratos
CREATE TABLE juridico_contratos (
  id UUID PRIMARY KEY,
  numero_contrato TEXT UNIQUE,
  tipo TEXT, -- 'prestacao_servico', 'obra', 'trabalhista', 'parceria'
  titulo TEXT,
  descricao TEXT,

  -- Partes
  cliente_id UUID REFERENCES clients(id),
  fornecedor_id UUID REFERENCES empresas_parceiras(id),
  projeto_id UUID REFERENCES projetos(id),
  obra_id UUID REFERENCES obras(id),

  -- Datas
  data_assinatura DATE,
  data_inicio DATE,
  data_vencimento DATE,
  prazo_rescisao_dias INTEGER, -- prazo de aviso para rescisão

  -- Valores
  valor_total DECIMAL(15,2),
  forma_pagamento TEXT,

  -- Status
  status TEXT, -- 'rascunho', 'aguardando_assinatura', 'ativo', 'vencido', 'rescindido', 'encerrado'

  -- Documentos
  arquivo_url TEXT,
  template_id UUID REFERENCES juridico_templates(id),

  -- Cláusulas importantes
  clausulas_especiais JSONB,
  observacoes TEXT,

  -- Renovação
  renovacao_automatica BOOLEAN DEFAULT FALSE,
  aviso_renovacao_dias INTEGER DEFAULT 30,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id)
);

-- Tabela de processos jurídicos
CREATE TABLE juridico_processos (
  id UUID PRIMARY KEY,
  numero_processo TEXT UNIQUE,
  tipo TEXT, -- 'trabalhista', 'civil', 'tributario'
  titulo TEXT,
  descricao TEXT,

  -- Partes
  parte_contraria TEXT,
  advogado_responsavel TEXT,

  -- Status
  status TEXT, -- 'em_andamento', 'aguardando', 'encerrado', 'ganho', 'perdido'
  probabilidade_ganho INTEGER, -- 0-100%

  -- Valores
  valor_causa DECIMAL(15,2),
  valor_acordo DECIMAL(15,2),

  -- Datas
  data_abertura DATE,
  data_encerramento DATE,
  proxima_audiencia DATE,

  -- Documentos
  documentos JSONB, -- array de URLs

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de prazos jurídicos
CREATE TABLE juridico_prazos (
  id UUID PRIMARY KEY,
  tipo TEXT, -- 'audiencia', 'entrega_documento', 'recurso', 'vencimento_contrato'
  titulo TEXT,
  descricao TEXT,
  data_prazo DATE,
  data_limite DATE,

  -- Relacionamentos
  contrato_id UUID REFERENCES juridico_contratos(id),
  processo_id UUID REFERENCES juridico_processos(id),

  -- Status
  concluido BOOLEAN DEFAULT FALSE,
  concluido_em TIMESTAMPTZ,

  -- Alertas
  alerta_dias_antes INTEGER DEFAULT 7,

  created_at TIMESTAMPTZ
);

-- Tabela de templates de contratos
CREATE TABLE juridico_templates (
  id UUID PRIMARY KEY,
  nome TEXT,
  tipo TEXT,
  conteudo TEXT, -- markdown ou HTML com variáveis {{nome_cliente}}, etc
  variaveis JSONB, -- lista de variáveis disponíveis

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Tabela de alvarás e licenças
CREATE TABLE juridico_licencas (
  id UUID PRIMARY KEY,
  tipo TEXT, -- 'alvara_funcionamento', 'licenca_obra', 'registro_profissional'
  numero TEXT,
  orgao_emissor TEXT,

  -- Relacionamentos
  obra_id UUID REFERENCES obras(id),

  -- Datas
  data_emissao DATE,
  data_vencimento DATE,

  -- Status
  status TEXT, -- 'vigente', 'vencido', 'em_renovacao'

  -- Documentos
  arquivo_url TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🎨 MELHORIAS DASHBOARD ADMIN

### Problemas Atuais
1. ❌ Dados muito genéricos
2. ❌ Falta indicadores de performance
3. ❌ Sem gráficos de tendência
4. ❌ Não mostra saúde financeira
5. ❌ Falta visão de produtividade da equipe

### 💡 Sugestões de Melhorias

#### 1. **Adicionar Novos KPIs**

**Novos Cards:**
- **Faturamento do Mês**
  - Total faturado
  - Comparativo com meta
  - Progresso visual

- **Ticket Médio por Projeto**
  - Valor médio dos projetos
  - Tendência (↑↓)

- **Taxa de Conversão (CRM)**
  - % de deals ganhos vs perdidos
  - Funil de vendas resumido

- **Produtividade da Equipe**
  - Tarefas concluídas / atribuídas
  - % de eficiência

- **Projetos por Etapa**
  - Distribuição: Planejamento, Planta, 3D, Executivo
  - Visual de barras horizontal

#### 2. **Adicionar Gráficos**

**Gráfico 1: Faturamento vs Despesas (6 meses)**
- Linha dupla
- Mostra tendência financeira

**Gráfico 2: Projetos por Status (Pizza)**
- Em andamento
- Pausados
- Concluídos
- Cancelados

**Gráfico 3: Distribuição de Tarefas por Pessoa (Barras)**
- Mostra carga de trabalho da equipe
- Identifica sobrecarga

**Gráfico 4: Taxa de Conclusão de Tarefas (Barras Empilhadas)**
- Concluídas vs Atrasadas vs Pendentes
- Por semana/mês

#### 3. **Seção de Saúde do Negócio**

Card especial com score de 0-100:
- ✅ Faturamento acima da meta (+20 pontos)
- ✅ Inadimplência baixa (+15 pontos)
- ✅ Tarefas em dia (+15 pontos)
- ✅ Projetos concluídos no prazo (+20 pontos)
- ✅ Equipe produtiva (+15 pontos)
- ✅ Pipeline de vendas saudável (+15 pontos)

**Visual:**
- 0-30: 🔴 Crítico
- 31-60: 🟡 Atenção
- 61-80: 🔵 Bom
- 81-100: 🟢 Excelente

#### 4. **Feed de Atividades**

Seção mostrando atividades recentes:
- ✅ João concluiu a tarefa "Render 3D Casa X"
- 📝 Maria criou novo projeto "Apartamento Y"
- 💰 Recebido R$ 15.000 do Cliente Z
- ⚠️ Tarefa "Aprovação prefeitura" está atrasada
- 📞 Reunião agendada com cliente ABC

#### 5. **Widgets Personalizáveis**

Permitir que admin escolha quais widgets ver:
- Drag & drop para reorganizar
- Mostrar/ocultar seções
- Salvar layout preferido

---

## 🚀 Priorização de Implementação

### Fase 1 (Essencial - 1 semana)
1. ✅ Melhorar Dashboard Admin (gráficos + novos KPIs)
2. ✅ Dashboard Financeiro (básico com principais indicadores)

### Fase 2 (Importante - 2 semanas)
3. ✅ Dashboard Financeiro (completo com todos gráficos)
4. ✅ Sistema de movimentações financeiras

### Fase 3 (Complementar - 2 semanas)
5. ✅ Dashboard Jurídico (contratos + prazos)
6. ✅ Sistema de assinaturas digitais

---

## 📱 Considerações de UX/UI

### Paleta de Cores Sugerida
- **Receitas/Positivo**: Verde (#10b981)
- **Despesas/Negativo**: Vermelho (#ef4444)
- **Neutro/Info**: Azul (#3b82f6)
- **Atenção**: Amarelo (#f59e0b)
- **Urgente**: Vermelho Escuro (#dc2626)
- **Sucesso**: Verde Claro (#22c55e)

### Responsividade
- Mobile: Cards em coluna única
- Tablet: Grid 2 colunas
- Desktop: Grid 3-4 colunas
- Gráficos adaptáveis

### Acessibilidade
- Tooltips explicativos em todos KPIs
- Cores com contraste adequado
- Suporte a dark mode
- Atalhos de teclado

---

**Próximos Passos:**
1. Escolher qual dashboard implementar primeiro
2. Criar designs de alta fidelidade (Figma)
3. Implementar as tabelas no banco de dados
4. Desenvolver os componentes React
5. Integrar com APIs do Supabase
6. Testar com dados reais
