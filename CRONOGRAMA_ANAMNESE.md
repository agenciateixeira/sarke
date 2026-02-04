# Sistema de Anamnese Inteligente para Cronograma

## Visão Geral

O sistema de anamnese inteligente é um questionário dinâmico que cria cronogramas personalizados baseado nas respostas do usuário. Similar a um "wizard", ele guia o usuário através de perguntas específicas e gera automaticamente a estrutura, campos customizados e empresas parceiras necessárias.

## Objetivo

Substituir a planilha manual de 30-60 linhas com empresas prestadoras de serviço por um sistema automatizado e eficiente que:
- Identifica o tipo de obra
- Sugere atividades padrão
- Configura campos customizados relevantes
- Gera lista de empresas parceiras necessárias
- Cria estrutura WBS inicial

## Fluxo da Anamnese

### Etapa 1: Tipo de Obra
**Pergunta:** "Que tipo de obra você vai executar?"

**Opções:**
- Residencial
  - Casa Térrea
  - Sobrado
  - Apartamento
  - Condomínio
- Comercial
  - Loja
  - Escritório
  - Galpão
  - Shopping
- Industrial
  - Fábrica
  - Armazém
  - Centro de Distribuição
- Reforma
  - Parcial
  - Total

**Impacto:** Define as atividades padrão que serão sugeridas

---

### Etapa 2: Tamanho e Complexidade
**Perguntas condicionais baseadas no tipo:**

**Para Residencial:**
- Área construída: ___ m²
- Número de pavimentos: ___
- Padrão de acabamento: (Econômico / Médio / Alto / Luxo)

**Para Comercial:**
- Área total: ___ m²
- Requer alvará especial? (Sim / Não)
- Horário de trabalho: (Comercial / 24h)

**Para Industrial:**
- Área útil: ___ m²
- Pé direito: ___ metros
- Carga estrutural: (Leve / Média / Pesada)

**Para Reforma:**
- O que será reformado? (Múltipla escolha)
  - Estrutura
  - Instalações elétricas
  - Instalações hidráulicas
  - Acabamentos
  - Pintura
  - Cobertura

**Impacto:** Ajusta a duração estimada das atividades e complexidade

---

### Etapa 3: Prazo e Recursos
**Perguntas:**
- Data de início desejada: ___
- Data de término desejada: ___
- Orçamento total: R$ ___
- Quantas equipes simultâneas? (1-5+)
- Trabalho nos finais de semana? (Sim / Não)

**Impacto:** Calcula viabilidade e distribui atividades

---

### Etapa 4: Serviços Necessários
**Pergunta:** "Quais serviços serão executados?"

**Lista com checkboxes (baseada no tipo de obra):**

**Estrutura:**
- [ ] Fundação (Sapata / Radier / Estacas)
- [ ] Estrutura de concreto
- [ ] Estrutura metálica
- [ ] Alvenaria estrutural

**Instalações:**
- [ ] Elétrica
- [ ] Hidráulica
- [ ] Esgoto
- [ ] Gás
- [ ] Ar condicionado
- [ ] Sistema de incêndio
- [ ] Automação

**Acabamentos:**
- [ ] Revestimentos (Piso / Parede)
- [ ] Pintura
- [ ] Esquadrias
- [ ] Vidros
- [ ] Forro
- [ ] Louças e metais

**Externos:**
- [ ] Paisagismo
- [ ] Calçada
- [ ] Muro/Portão
- [ ] Piscina
- [ ] Churrasqueira

**Impacto:** Define quais empresas parceiras serão necessárias

---

### Etapa 5: Empresas Já Contratadas
**Pergunta:** "Você já tem empresas contratadas?"

**Para cada serviço marcado:**
- Serviço: [Nome do serviço]
  - Já tem empresa? (Sim / Não / Ainda não definido)
  - Se sim:
    - Nome da empresa: ___
    - CNPJ: ___
    - Responsável: ___
    - Telefone: ___
    - Email: ___
    - Valor contratado: R$ ___

**Impacto:** Cria registros de empresas parceiras e vincula às atividades

---

### Etapa 6: Campos Customizados
**Pergunta:** "Há alguma informação específica que você precisa rastrear nesta obra?"

**Exemplos sugeridos baseados no tipo:**
- Para Residencial: "Número de suítes", "Garagem (vagas)"
- Para Comercial: "Número de sanitários", "Carga elétrica instalada"
- Para Industrial: "Tipo de piso industrial", "Sistema de exaustão"

**Interface:**
- Botão: "+ Adicionar campo customizado"
- Para cada campo:
  - Nome do campo: ___
  - Tipo: (Texto / Número / Data / Sim/Não / Lista)
  - Obrigatório? (Sim / Não)

**Impacto:** Cria campos customizados no JSONB das atividades

---

### Etapa 7: Resumo e Confirmação
**Tela de resumo mostrando:**

```
📋 Resumo do Cronograma

Tipo de Obra: Casa Térrea
Área: 150m²
Prazo: 90 dias (01/03/2026 - 29/05/2026)
Orçamento: R$ 350.000,00

Atividades Geradas: 45
├─ Fundação (8 atividades)
├─ Estrutura (10 atividades)
├─ Instalações (12 atividades)
└─ Acabamentos (15 atividades)

Empresas Parceiras Necessárias: 12
✅ Já contratadas: 3
⚠️  A contratar: 9

Campos Customizados: 5
- Número de suítes
- Vagas de garagem
- Tipo de telhado
- Revestimento piso
- Revestimento parede
```

**Botões:**
- ← Voltar e ajustar
- ✓ Criar Cronograma

---

## Estrutura de Dados Gerada

### 1. Cronograma
```typescript
{
  nome: "Residência João Silva - Rua ABC, 123",
  tipo: "obra",
  obra_id: "uuid-da-obra",
  data_inicio: "2026-03-01",
  data_fim: "2026-05-29",
  metadata_anamnese: {
    tipo_obra: "casa_terrea",
    area_m2: 150,
    padrao_acabamento: "medio",
    orcamento_total: 350000,
    trabalho_fins_semana: false
  }
}
```

### 2. Atividades (Estrutura WBS)
```typescript
[
  {
    codigo: "1",
    nome: "Fundação",
    tipo: "fase",
    nivel: 0,
    ordem: 1,
    duracao_planejada: 15,
    campos_customizados: {}
  },
  {
    codigo: "1.1",
    nome: "Locação de Obra",
    tipo: "atividade",
    nivel: 1,
    parent_id: "[id-fundacao]",
    ordem: 1,
    duracao_planejada: 2,
    empresa_id: null, // A ser atribuída
    campos_customizados: {
      "tipo_fundacao": "sapata"
    }
  },
  {
    codigo: "1.2",
    nome: "Escavação",
    tipo: "atividade",
    nivel: 1,
    parent_id: "[id-fundacao]",
    ordem: 2,
    duracao_planejada: 3,
    empresa_id: "uuid-terraplenagem-ltda",
    campos_customizados: {}
  }
  // ... mais atividades
]
```

### 3. Empresas Parceiras
```typescript
[
  {
    nome: "Terraplenagem Silva Ltda",
    cnpj: "12.345.678/0001-90",
    responsavel: "José Silva",
    telefone: "(11) 98765-4321",
    email: "contato@terraplenagem.com",
    servico_principal: "escavacao",
    valor_contrato: 15000,
    status: "contratada"
  },
  {
    nome: "[A Contratar]",
    servico_principal: "estrutura_concreto",
    status: "pendente",
    observacoes: "Empresa especializada em estruturas de concreto"
  }
  // ... mais empresas
]
```

### 4. Vinculações Atividade-Empresa
```typescript
[
  {
    atividade_id: "uuid-escavacao",
    empresa_id: "uuid-terraplenagem",
    valor_alocado: 15000
  }
]
```

---

## Templates Pré-Configurados

### Casa Térrea (Padrão Médio)
**Fases principais:**
1. Serviços Preliminares (3 dias)
2. Fundação (12 dias)
3. Estrutura (20 dias)
4. Alvenaria (15 dias)
5. Cobertura (8 dias)
6. Instalações (18 dias)
7. Revestimentos (25 dias)
8. Esquadrias (5 dias)
9. Pintura (12 dias)
10. Acabamentos Finais (8 dias)
11. Limpeza e Entrega (2 dias)

**Total: ~128 dias úteis**

**Empresas típicas:**
- Topografia
- Terraplanagem
- Fundações
- Estrutura (concreto/ferragem)
- Alvenaria
- Telhado
- Elétrica
- Hidráulica
- Revestimentos
- Pintura
- Esquadrias
- Vidraçaria

---

## Gestão de Empresas Parceiras

### Submenu: Cronograma > Empresas Parceiras

**Funcionalidades:**

1. **Listagem de Empresas**
   - Cards com foto/logo
   - Status: Contratada / Proposta Enviada / A Contratar / Em Negociação
   - Serviços que executam
   - Valor contratado vs executado
   - Atividades vinculadas

2. **Cadastro/Edição**
   - Dados da empresa
   - Documentação (contrato, seguro, certidões)
   - Equipe técnica
   - Equipamentos disponíveis
   - Histórico de obras anteriores
   - Avaliação (1-5 estrelas)

3. **Dashboard de Empresas**
   - Empresas ativas por obra
   - Performance (prazos, qualidade, segurança)
   - Alertas (documentos vencidos, atrasos)
   - Próximas mobilizações

4. **Integração com Cronograma**
   - Ao atribuir empresa para atividade
   - Notificações automáticas
   - Sincronização de datas
   - Controle de medições

---

## Implementação Técnica

### Banco de Dados

#### Tabela: empresas_parceiras
```sql
CREATE TABLE empresas_parceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  responsavel TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  servicos TEXT[], -- array de serviços que executam

  -- Documentação
  logo_url TEXT,
  contrato_url TEXT,
  seguro_vigente BOOLEAN DEFAULT false,
  seguro_vencimento DATE,

  -- Avaliação
  avaliacao DECIMAL(2,1), -- 1.0 a 5.0
  numero_avaliacoes INTEGER DEFAULT 0,

  -- Valores
  valor_total_contratado DECIMAL(15,2),

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: cronograma_empresa_vinculos
```sql
CREATE TABLE cronograma_empresa_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id UUID NOT NULL REFERENCES cronogramas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas_parceiras(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pendente', -- pendente, contratada, em_execucao, concluida
  valor_contratado DECIMAL(15,2),
  valor_executado DECIMAL(15,2) DEFAULT 0,

  data_inicio_prevista DATE,
  data_fim_prevista DATE,
  data_inicio_real DATE,
  data_fim_real DATE,

  observacoes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(cronograma_id, empresa_id)
);
```

#### Atualizar: cronograma_atividades
```sql
-- Adicionar campo para vincular empresa
ALTER TABLE cronograma_atividades
ADD COLUMN empresa_id UUID REFERENCES empresas_parceiras(id) ON DELETE SET NULL;

CREATE INDEX idx_atividades_empresa ON cronograma_atividades(empresa_id)
WHERE empresa_id IS NOT NULL;
```

---

## Interface de Anamnese

### Componente: CronogramaWizard

```typescript
interface WizardStep {
  id: string
  title: string
  description: string
  component: React.ComponentType
  validate: () => boolean
}

const steps: WizardStep[] = [
  {
    id: 'tipo-obra',
    title: 'Tipo de Obra',
    description: 'Selecione o tipo de obra que será executada',
    component: StepTipoObra,
    validate: () => formData.tipoObra !== null
  },
  {
    id: 'detalhes',
    title: 'Detalhes',
    description: 'Informe os detalhes da obra',
    component: StepDetalhes,
    validate: () => formData.area > 0
  },
  // ... outros steps
]
```

### Visual Sugerido

```
╔════════════════════════════════════════════════════════════╗
║  Novo Cronograma - Anamnese Inteligente          [✕]      ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  [●]━━━━[○]━━━━[○]━━━━[○]━━━━[○]━━━━[○]━━━━[○]          ║
║  Tipo   Detalhes Prazo Serviços Empresas Custom Resumo   ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │  Que tipo de obra você vai executar?              │  ║
║  │                                                     │  ║
║  │  ┌─────────────┐  ┌─────────────┐                │  ║
║  │  │  🏠         │  │  🏢         │                │  ║
║  │  │ Residencial │  │ Comercial  │                │  ║
║  │  └─────────────┘  └─────────────┘                │  ║
║  │                                                     │  ║
║  │  ┌─────────────┐  ┌─────────────┐                │  ║
║  │  │  🏭         │  │  🔧         │                │  ║
║  │  │ Industrial  │  │  Reforma    │                │  ║
║  │  └─────────────┘  └─────────────┘                │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║                         [Próximo →]                        ║
╚════════════════════════════════════════════════════════════╝
```

---

**Criado em:** 04/02/2026
**Desenvolvedor:** Claude + Guilherme
**Status:** Planejamento completo ✅ | Implementação pendente 🚧
