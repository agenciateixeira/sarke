# 💼 ERP Financeiro - Sistema Sarke

## 🎯 Visão Geral

### O que é um ERP Financeiro?
Sistema integrado que unifica **TODOS os aspectos financeiros** do negócio em uma única plataforma:
- Contabilidade
- Faturamento
- Contas a Pagar/Receber
- Fluxo de Caixa
- Notas Fiscais
- Impostos
- Conciliação Bancária
- Relatórios Gerenciais

### Por que faz sentido para o Sarke?

✅ **Centralização Total**
- Projetos → Orçamentos → Faturamento → Recebimento
- Obras → Despesas → Fornecedores → Pagamentos
- Tudo conectado e rastreável

✅ **Elimina Sistemas Externos**
- Não precisa de Excel
- Não precisa de software de terceiros
- Tudo integrado nativamente

✅ **Inteligência de Negócio**
- Margem de lucro por projeto/obra
- Análise de rentabilidade por tipo de serviço
- Previsão de fluxo de caixa automatizada
- Dashboards executivos

✅ **Compliance Automático**
- Impostos calculados automaticamente
- Relatórios fiscais prontos
- Auditoria completa de todas operações

---

## 🏗️ Arquitetura do ERP Financeiro

### Módulos Principais

```
┌─────────────────────────────────────────────────────┐
│                   ERP FINANCEIRO                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ FATURAMENTO  │  │   DESPESAS   │  │   CAIXA   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                 │        │
│         └─────────────────┼─────────────────┘        │
│                           │                          │
│              ┌────────────▼──────────────┐           │
│              │   PLANO DE CONTAS         │           │
│              └────────────┬──────────────┘           │
│                           │                          │
│         ┌─────────────────┼─────────────────┐        │
│         │                 │                 │        │
│  ┌──────▼───────┐  ┌─────▼──────┐  ┌──────▼─────┐  │
│  │   BANCOS     │  │  IMPOSTOS  │  │ RELATÓRIOS │  │
│  └──────────────┘  └────────────┘  └────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📦 MÓDULO 1: Plano de Contas

### O que é?
Estrutura hierárquica que organiza TODAS as movimentações financeiras.

### Estrutura Sugerida para Arquitetura/Construção

```
1. RECEITAS
  1.1. RECEITAS OPERACIONAIS
    1.1.1. Projetos Arquitetônicos
      1.1.1.1. Residencial
      1.1.1.2. Comercial
      1.1.1.3. Corporativo
    1.1.2. Projetos de Interiores
    1.1.3. Obras e Reformas
    1.1.4. Consultoria
    1.1.5. Aprovações e Legalizações
  1.2. RECEITAS NÃO OPERACIONAIS
    1.2.1. Juros Recebidos
    1.2.2. Descontos Obtidos

2. DESPESAS
  2.1. CUSTOS DIRETOS
    2.1.1. Materiais e Insumos
    2.1.2. Mão de Obra de Terceiros
    2.1.3. Subempreitadas
    2.1.4. Equipamentos e Ferramentas
  2.2. DESPESAS OPERACIONAIS
    2.2.1. Pessoal
      2.2.1.1. Salários e Pró-labore
      2.2.1.2. Encargos Sociais
      2.2.1.3. Benefícios
    2.2.2. Infraestrutura
      2.2.2.1. Aluguel
      2.2.2.2. Energia
      2.2.2.3. Internet e Telefonia
      2.2.2.4. Água
    2.2.3. Administrativo
      2.2.3.1. Material de Escritório
      2.2.3.2. Software e Licenças
      2.2.3.3. Contador
      2.2.3.4. Advogado
    2.2.4. Marketing e Vendas
      2.2.4.1. Publicidade
      2.2.4.2. Materiais de Divulgação
      2.2.4.3. Site e Redes Sociais
    2.2.5. Impostos e Taxas
      2.2.5.1. ISS
      2.2.5.2. IRPJ
      2.2.5.3. CSLL
      2.2.5.4. PIS/COFINS
      2.2.5.5. Taxas Diversas
  2.3. DESPESAS FINANCEIRAS
    2.3.1. Juros Pagos
    2.3.2. Tarifas Bancárias
    2.3.3. IOF

3. ATIVO
  3.1. ATIVO CIRCULANTE
    3.1.1. Caixa e Equivalentes
      3.1.1.1. Caixa
      3.1.1.2. Banco Itaú CC
      3.1.1.3. Banco Bradesco CC
      3.1.1.4. Mercado Pago
      3.1.1.5. PayPal
    3.1.2. Contas a Receber
      3.1.2.1. Clientes
      3.1.2.2. Adiantamentos
  3.2. ATIVO NÃO CIRCULANTE
    3.2.1. Imobilizado
      3.2.1.1. Computadores e Equipamentos
      3.2.1.2. Móveis e Utensílios
      3.2.1.3. Veículos

4. PASSIVO
  4.1. PASSIVO CIRCULANTE
    4.1.1. Fornecedores
    4.1.2. Salários a Pagar
    4.1.3. Impostos a Recolher
    4.1.4. Empréstimos CP
  4.2. PASSIVO NÃO CIRCULANTE
    4.2.1. Empréstimos LP
    4.2.2. Financiamentos

5. PATRIMÔNIO LÍQUIDO
  5.1. Capital Social
  5.2. Lucros/Prejuízos Acumulados
```

### Tabela SQL

```sql
CREATE TABLE plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Código e hierarquia
  codigo VARCHAR(20) UNIQUE NOT NULL, -- ex: "1.1.1.1", "2.2.1.3"
  nivel INTEGER NOT NULL, -- 1, 2, 3, 4 (profundidade)
  pai_id UUID REFERENCES plano_contas(id), -- conta pai

  -- Informações
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50) NOT NULL, -- 'receita', 'despesa', 'ativo', 'passivo', 'patrimonio'
  natureza VARCHAR(20) NOT NULL, -- 'debito', 'credito'

  -- Controles
  aceita_lancamento BOOLEAN DEFAULT TRUE, -- contas sintéticas não aceitam
  ativa BOOLEAN DEFAULT TRUE,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_plano_contas_codigo ON plano_contas(codigo);
CREATE INDEX idx_plano_contas_tipo ON plano_contas(tipo);
CREATE INDEX idx_plano_contas_pai ON plano_contas(pai_id);
```

---

## 💰 MÓDULO 2: Livro Caixa (Lançamentos)

### O que é?
Registro de TODAS as movimentações financeiras (partidas dobradas).

### Como funciona?

**Exemplo 1: Recebimento de Cliente**
```
DÉBITO:  Banco Itaú CC (+R$ 10.000)
CRÉDITO: Receita - Projetos Arquitetônicos (-R$ 10.000)
```

**Exemplo 2: Pagamento de Fornecedor**
```
DÉBITO:  Despesa - Materiais (+R$ 5.000)
CRÉDITO: Banco Bradesco CC (-R$ 5.000)
```

### Tabela SQL

```sql
-- Tabela principal de lançamentos
CREATE TABLE lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo e descrição
  tipo VARCHAR(50) NOT NULL, -- 'receita', 'despesa', 'transferencia'
  descricao TEXT NOT NULL,
  numero_documento VARCHAR(100), -- número NF, boleto, etc

  -- Data
  data_lancamento DATE NOT NULL,
  data_competencia DATE NOT NULL, -- regime de competência
  data_vencimento DATE,
  data_pagamento DATE,

  -- Valor
  valor_total DECIMAL(15,2) NOT NULL,
  valor_pago DECIMAL(15,2) DEFAULT 0,

  -- Status
  status VARCHAR(50) NOT NULL, -- 'pendente', 'parcial', 'pago', 'cancelado', 'atrasado'

  -- Relacionamentos
  cliente_id UUID REFERENCES clients(id),
  fornecedor_id UUID REFERENCES empresas_parceiras(id),
  projeto_id UUID REFERENCES projetos(id),
  obra_id UUID REFERENCES obras(id),
  deal_id UUID REFERENCES deals(id),

  -- Centro de custo (opcional)
  centro_custo_id UUID REFERENCES centros_custo(id),

  -- Banco/Caixa
  conta_bancaria_id UUID REFERENCES contas_bancarias(id),
  forma_pagamento VARCHAR(50), -- 'dinheiro', 'pix', 'boleto', 'cartao', 'transferencia'

  -- Impostos
  valor_impostos DECIMAL(15,2) DEFAULT 0,
  impostos_detalhes JSONB, -- breakdown dos impostos

  -- Anexos
  comprovante_url TEXT,
  nota_fiscal_url TEXT,

  -- Recorrência
  recorrente BOOLEAN DEFAULT FALSE,
  recorrencia_id UUID REFERENCES lancamentos_recorrencia(id),

  -- Observações
  observacoes TEXT,
  tags TEXT[], -- array de tags para filtros

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Tabela de itens do lançamento (partidas dobradas)
CREATE TABLE lancamentos_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,

  -- Plano de contas
  conta_id UUID NOT NULL REFERENCES plano_contas(id),

  -- Débito ou Crédito
  tipo VARCHAR(10) NOT NULL, -- 'debito', 'credito'
  valor DECIMAL(15,2) NOT NULL,

  -- Histórico específico do item
  historico TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que débitos = créditos
CREATE OR REPLACE FUNCTION validar_partidas_dobradas()
RETURNS TRIGGER AS $$
DECLARE
  total_debitos DECIMAL(15,2);
  total_creditos DECIMAL(15,2);
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'debito' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE 0 END), 0)
  INTO total_debitos, total_creditos
  FROM lancamentos_itens
  WHERE lancamento_id = NEW.lancamento_id;

  IF total_debitos != total_creditos THEN
    RAISE EXCEPTION 'Partidas dobradas inválidas: débitos (%) != créditos (%)',
      total_debitos, total_creditos;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validar_partidas
  AFTER INSERT OR UPDATE ON lancamentos_itens
  FOR EACH ROW
  EXECUTE FUNCTION validar_partidas_dobradas();

-- Índices
CREATE INDEX idx_lancamentos_data ON lancamentos(data_lancamento);
CREATE INDEX idx_lancamentos_status ON lancamentos(status);
CREATE INDEX idx_lancamentos_tipo ON lancamentos(tipo);
CREATE INDEX idx_lancamentos_cliente ON lancamentos(cliente_id);
CREATE INDEX idx_lancamentos_projeto ON lancamentos(projeto_id);
CREATE INDEX idx_lancamentos_competencia ON lancamentos(data_competencia);
```

---

## 🏦 MÓDULO 3: Contas Bancárias

### Tabela SQL

```sql
CREATE TABLE contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações do banco
  banco_codigo VARCHAR(10), -- ex: "341" (Itaú), "237" (Bradesco)
  banco_nome VARCHAR(100),

  -- Conta
  tipo VARCHAR(50), -- 'conta_corrente', 'poupanca', 'caixa', 'carteira_digital'
  agencia VARCHAR(20),
  numero_conta VARCHAR(50),

  -- Identificação
  nome VARCHAR(200) NOT NULL, -- ex: "Banco Itaú - Conta Corrente Principal"
  apelido VARCHAR(100), -- ex: "Itaú Principal"

  -- Saldo
  saldo_inicial DECIMAL(15,2) DEFAULT 0,
  saldo_atual DECIMAL(15,2) DEFAULT 0,

  -- Integração bancária (futuro)
  integrado BOOLEAN DEFAULT FALSE,
  api_token TEXT,
  ultima_sincronizacao TIMESTAMPTZ,

  -- Status
  ativa BOOLEAN DEFAULT TRUE,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atualizar saldo automaticamente
CREATE OR REPLACE FUNCTION atualizar_saldo_bancario()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'pago' THEN
      -- Atualizar saldo
      UPDATE contas_bancarias
      SET saldo_atual = saldo_atual +
        CASE
          WHEN NEW.tipo = 'receita' THEN NEW.valor_pago
          WHEN NEW.tipo = 'despesa' THEN -NEW.valor_pago
          ELSE 0
        END
      WHERE id = NEW.conta_bancaria_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_saldo
  AFTER INSERT OR UPDATE ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_saldo_bancario();
```

---

## 📊 MÓDULO 4: Centros de Custo

### O que é?
Permite analisar custos por departamento/projeto/área.

**Exemplos:**
- Projetos Residenciais
- Projetos Comerciais
- Obras
- Administrativo
- Marketing
- RH

### Tabela SQL

```sql
CREATE TABLE centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  codigo VARCHAR(20) UNIQUE,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,

  -- Hierarquia (opcional)
  pai_id UUID REFERENCES centros_custo(id),

  -- Orçamento
  orcamento_mensal DECIMAL(15,2),

  -- Status
  ativo BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 💳 MÓDULO 5: Formas de Pagamento e Parcelamento

### Tabela SQL

```sql
-- Formas de pagamento configuráveis
CREATE TABLE formas_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50), -- 'dinheiro', 'pix', 'boleto', 'cartao_credito', 'cartao_debito'

  -- Taxas
  taxa_percentual DECIMAL(5,2) DEFAULT 0,
  taxa_fixa DECIMAL(10,2) DEFAULT 0,

  -- Prazo
  dias_recebimento INTEGER DEFAULT 0, -- dias até cair na conta

  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parcelas de lançamentos
CREATE TABLE lancamentos_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,

  numero_parcela INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,

  valor DECIMAL(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,

  status VARCHAR(50) DEFAULT 'pendente', -- 'pendente', 'pago', 'atrasado'

  forma_pagamento_id UUID REFERENCES formas_pagamento(id),
  conta_bancaria_id UUID REFERENCES contas_bancarias(id),

  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📈 MÓDULO 6: Impostos e Tributação

### Tabela SQL

```sql
-- Configuração de impostos
CREATE TABLE impostos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  nome VARCHAR(100) NOT NULL, -- ex: "ISS", "IRPJ", "CSLL"
  sigla VARCHAR(20),
  tipo VARCHAR(50), -- 'federal', 'estadual', 'municipal'

  -- Cálculo
  base_calculo VARCHAR(50), -- 'faturamento', 'lucro', 'folha'
  aliquota DECIMAL(5,2) NOT NULL, -- percentual
  valor_fixo DECIMAL(15,2) DEFAULT 0,

  -- Regras
  regime_tributario VARCHAR(50), -- 'simples', 'lucro_presumido', 'lucro_real'
  aplicavel_em JSONB, -- em quais tipos de receita se aplica

  -- Pagamento
  dia_vencimento INTEGER, -- dia do mês

  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impostos calculados por lançamento
CREATE TABLE lancamentos_impostos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  imposto_id UUID NOT NULL REFERENCES impostos(id),

  base_calculo DECIMAL(15,2) NOT NULL,
  aliquota_aplicada DECIMAL(5,2) NOT NULL,
  valor_calculado DECIMAL(15,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calcular impostos automaticamente
CREATE OR REPLACE FUNCTION calcular_impostos_lancamento()
RETURNS TRIGGER AS $$
DECLARE
  imposto_rec RECORD;
  valor_imposto DECIMAL(15,2);
BEGIN
  -- Deletar impostos antigos se for update
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM lancamentos_impostos WHERE lancamento_id = NEW.id;
  END IF;

  -- Calcular novos impostos apenas para receitas
  IF NEW.tipo = 'receita' THEN
    FOR imposto_rec IN
      SELECT * FROM impostos WHERE ativo = TRUE
    LOOP
      valor_imposto := (NEW.valor_total * imposto_rec.aliquota / 100) + imposto_rec.valor_fixo;

      INSERT INTO lancamentos_impostos (
        lancamento_id, imposto_id, base_calculo,
        aliquota_aplicada, valor_calculado
      ) VALUES (
        NEW.id, imposto_rec.id, NEW.valor_total,
        imposto_rec.aliquota, valor_imposto
      );
    END LOOP;

    -- Atualizar valor total de impostos no lançamento
    UPDATE lancamentos
    SET valor_impostos = (
      SELECT COALESCE(SUM(valor_calculado), 0)
      FROM lancamentos_impostos
      WHERE lancamento_id = NEW.id
    )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_impostos
  AFTER INSERT OR UPDATE ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_impostos_lancamento();
```

---

## 🔄 MÓDULO 7: Conciliação Bancária

### O que é?
Comparar lançamentos do sistema com extratos bancários.

### Tabela SQL

```sql
CREATE TABLE conciliacoes_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id UUID NOT NULL REFERENCES contas_bancarias(id),

  -- Período
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,

  -- Saldos
  saldo_inicial_extrato DECIMAL(15,2),
  saldo_final_extrato DECIMAL(15,2),
  saldo_final_sistema DECIMAL(15,2),
  diferenca DECIMAL(15,2) GENERATED ALWAYS AS (saldo_final_extrato - saldo_final_sistema) STORED,

  -- Status
  status VARCHAR(50) DEFAULT 'em_andamento', -- 'em_andamento', 'conciliado', 'divergencia'

  -- Arquivo
  extrato_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Itens da conciliação
CREATE TABLE conciliacoes_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conciliacao_id UUID NOT NULL REFERENCES conciliacoes_bancarias(id) ON DELETE CASCADE,

  -- Lançamento
  lancamento_id UUID REFERENCES lancamentos(id),

  -- Dados do extrato
  data_extrato DATE,
  descricao_extrato TEXT,
  valor_extrato DECIMAL(15,2),

  -- Status
  conciliado BOOLEAN DEFAULT FALSE,
  divergente BOOLEAN DEFAULT FALSE,
  observacao TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📊 MÓDULO 8: Relatórios Gerenciais

### Relatórios Disponíveis

1. **DRE (Demonstração do Resultado do Exercício)**
   - Receitas
   - (-) Custos Diretos
   - (=) Lucro Bruto
   - (-) Despesas Operacionais
   - (=) EBITDA
   - (-) Depreciação
   - (=) EBIT
   - (-) Despesas Financeiras
   - (=) Lucro Antes dos Impostos
   - (-) Impostos
   - (=) Lucro Líquido

2. **Fluxo de Caixa**
   - Saldo inicial
   - (+) Entradas
   - (-) Saídas
   - (=) Saldo final
   - Projeção futura

3. **Balanço Patrimonial**
   - Ativo
   - Passivo
   - Patrimônio Líquido

4. **Análise de Rentabilidade**
   - Por projeto
   - Por tipo de serviço
   - Por cliente
   - Por período

5. **Aging de Recebíveis**
   - A vencer
   - Vencidos 1-30 dias
   - Vencidos 31-60 dias
   - Vencidos 61-90 dias
   - Vencidos >90 dias

6. **Curva ABC**
   - Clientes que mais faturam
   - Despesas mais relevantes

---

## 🔌 MÓDULO 9: Integrações (Futuro)

### Integrações Possíveis

1. **Open Banking**
   - Importar extratos automaticamente
   - Conciliação automática
   - Saldo em tempo real

2. **Nota Fiscal Eletrônica (NF-e/NFS-e)**
   - Emissão automática
   - Armazenamento XML
   - Cálculo de impostos

3. **Bancos e Fintechs**
   - Stripe
   - Mercado Pago
   - PagSeguro
   - Asaas

4. **Contabilidade**
   - Export para Contabilizei
   - Export para ContaAzul
   - Export para Excel padrão contador

---

## 🎯 INTERFACE DO USUÁRIO

### Dashboard Principal do ERP

```
┌─────────────────────────────────────────────────────────────────┐
│  💼 ERP Financeiro                                    Fev 2026  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cards KPI:                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐│
│  │ Receita Mês │ │ Despesa Mês │ │ Lucro Líqdo │ │ A Receber ││
│  │ R$ 150.000  │ │ R$ 95.000   │ │ R$ 55.000   │ │ R$ 80.000 ││
│  │ +15% ↑      │ │ +8% ↑       │ │ +25% ↑      │ │ 12 faturas││
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘│
│                                                                  │
│  Gráficos:                                                       │
│  ┌────────────────────────────────┐ ┌──────────────────────────┐│
│  │ Fluxo de Caixa (12 meses)     │ │ DRE do Mês               ││
│  │                                │ │                          ││
│  │  [Gráfico de Linha]           │ │  [Gráfico de Barras]     ││
│  │                                │ │                          ││
│  └────────────────────────────────┘ └──────────────────────────┘│
│                                                                  │
│  Lançamentos Recentes:                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Data   │ Tipo    │ Descrição           │ Valor    │ Status│ │
│  │ 20/02  │ Receita │ Cliente X - Proj Y  │ +15.000  │ ✅    │ │
│  │ 19/02  │ Despesa │ Fornecedor ABC      │ -3.500   │ ⏳    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Menu Lateral

```
💼 ERP Financeiro
  └─ 📊 Dashboard
  └─ 💰 Lançamentos
      └─ Novo Lançamento
      └─ Lista de Lançamentos
      └─ Conciliação Bancária
  └─ 📥 Contas a Receber
  └─ 📤 Contas a Pagar
  └─ 🏦 Bancos e Caixas
  └─ 📋 Plano de Contas
  └─ 📊 Relatórios
      └─ DRE
      └─ Fluxo de Caixa
      └─ Balanço Patrimonial
      └─ Análise de Rentabilidade
  └─ 💳 Formas de Pagamento
  └─ 🏢 Centros de Custo
  └─ 📝 Impostos
  └─ ⚙️ Configurações
```

---

## ⚡ Principais Vantagens vs Sistemas Externos

| Recurso | Sarke ERP | ContaAzul/Bling | Excel |
|---------|-----------|-----------------|-------|
| Integração Projetos → Financeiro | ✅ Nativo | ❌ Manual | ❌ Manual |
| Custo | ✅ Grátis | ❌ R$ 150-300/mês | ✅ Grátis |
| Customização | ✅ Total | ⚠️ Limitada | ✅ Total |
| Automação | ✅ Alta | ✅ Alta | ❌ Zero |
| Curva de Aprendizado | ✅ Baixa (integrado) | ⚠️ Média | ⚠️ Média |
| Relatórios Personalizados | ✅ Ilimitados | ⚠️ Limitados | ✅ Ilimitados |
| Multiusuário | ✅ Sim | ✅ Sim | ❌ Difícil |

---

## 🚀 Plano de Implementação

### Fase 1 - Core (2-3 semanas)
- ✅ Plano de contas
- ✅ Contas bancárias
- ✅ Lançamentos básicos (receitas e despesas)
- ✅ Dashboard inicial

### Fase 2 - Essencial (2 semanas)
- ✅ Contas a pagar/receber
- ✅ Parcelamentos
- ✅ Formas de pagamento
- ✅ Relatórios básicos (DRE, Fluxo)

### Fase 3 - Avançado (2 semanas)
- ✅ Impostos automáticos
- ✅ Centros de custo
- ✅ Conciliação bancária
- ✅ Relatórios avançados

### Fase 4 - Integrações (3-4 semanas)
- ✅ Open Banking
- ✅ NF-e / NFS-e
- ✅ APIs de pagamento

---

## ❓ Próximos Passos

1. **Validar estrutura** - Está alinhado com suas necessidades?
2. **Ajustar plano de contas** - Precisa de mais categorias?
3. **Priorizar features** - O que é mais importante primeiro?
4. **Começar desenvolvimento** - Por qual módulo começamos?

---

**O que você acha? Faz sentido?** 🤔
