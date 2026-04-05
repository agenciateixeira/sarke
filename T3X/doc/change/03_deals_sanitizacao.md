# Deals — Sanitização, Fixes e Importação ClickUp (2026-04-04 / 2026-04-05)

## Resumo da sessão
Seis mudanças: importação de tarefas do ClickUp (REUNIÃO + 3 novos status), correção de bugs no update de deals, renomeação do enum BusinessType, normalização de enums, campo opportunity_cod e indicador de atraso no kanban.

---

## Change 1 — Importação ClickUp REUNIÃO → Supabase

### O que foi feito
- Acessado o espaço **Comercial** do ClickUp via MCP
- Listadas todas as 5 tarefas com status **REUNIÃO**
- Criado arquivo de referência: `T3X/doc/clickup/espaço comercial/clickup_reuniao.md`
- Criado SQL de importação: `T3X/doc/clickup/espaço comercial/insert_reuniao_deals.sql`

### Mapeamentos aplicados
| Prefixo | service_type |
|---------|-------------|
| INT | projeto_interiores |
| ADM | gestao_obra |
| ARQ | projeto_arquitetonico |

| Sufixo | business_type |
|--------|--------------|
| _RES | residencial |
| _COM | comercial |
| _CORP | comercial |

### Tarefas importadas
| Título | Vencimento | Urgência |
|--------|-----------|---------|
| INT_Thomas Blumel_RES | 26/05/2026 | media |
| ADM_Juicy_COM | 19/05/2026 | media |
| INT_CaioPiracicaba_COM | 19/05/2026 | media |
| ARQ_Container Castelo_COM | 19/05/2026 | media |
| ADM_Flowinvest_CORP | 25/05/2026 | **alta** (urgente no ClickUp) |

### stage_id REUNIÃO
`e84fbb50-e666-4b22-906f-14456c5edf3b`

---

## Change 2 — Fix: UUID vazio em updateDeal

### Problema
Ao editar um deal, o erro `invalid input syntax for type uuid: ""` ocorria porque `updateDeal` enviava `client_id: ""` diretamente ao Supabase quando nenhum cliente estava selecionado.

### Causa raiz
`hooks/usePipeline.ts` — função `updateDeal` não sanitizava strings vazias para `null`, diferente de `createDeal` que já fazia isso corretamente.

### Solução
Adicionado bloco de sanitização no `updateDeal` (mesmo padrão do `createDeal`):

```typescript
const sanitized: Record<string, any> = {
  ...updates,
  client_id: updates.client_id || null,
  expected_close_date: updates.expected_close_date || null,
  next_follow_up_date: updates.next_follow_up_date || null,
  decision_deadline: updates.decision_deadline || null,
  lead_source_detail: updates.lead_source_detail || null,
  competitors: updates.competitors || null,
  description: updates.description || null,
  notes: updates.notes || null,
  updated_at: new Date().toISOString(),
}
Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k])
```

### Arquivo modificado
- `hooks/usePipeline.ts` — função `updateDeal` (~linha 168)

---

## Change 3 — Renomear "Industrial" → "Corporativo" em BusinessType (deals)

### Problema
O campo "Tipo de Negócio" dos deals tinha a opção "Industrial" que não refletia a realidade do negócio da Sarke (escritório de arquitetura). O valor correto é "Corporativo".

### Arquivos modificados
- `types/pipeline.ts` — tipo `BusinessType`: `'industrial'` → `'corporativo'`
- `components/comercial/DealDialog.tsx` — array `BUSINESS_TYPES`: label e value atualizados

### Migration necessária (banco de dados)
Arquivo: `supabase/migrations/20260404_fix_business_type_corporativo.sql`

> **Atenção:** O tipo `industrial` em **obras** (`TipoObra`) NÃO foi alterado — é um contexto diferente (obras de construção civil).

---

## Change 4 — Fix: Violação de constraint ao editar deal com enum desatualizado

### Problema
Ao editar qualquer campo de um deal que ainda tinha `business_type: 'industrial'` no banco, o form reenviava esse valor que a nova constraint já não aceitava: `"new row for relation "deals" violates check constraint "deals_business_type_check"`.

### Causa raiz
Dois pontos combinados:
1. A migration `20260404_fix_business_type_corporativo.sql` recriou a constraint antes de atualizar os registros existentes (ordem errada).
2. O `updateDeal` em `hooks/usePipeline.ts` não normalizava enums, apenas strings vazias/nulas.

### Solução

**Código — `hooks/usePipeline.ts`, função `updateDeal`:**

Adicionado após o bloco de sanitização existente:
```typescript
// Backward-compat: renomeações de enum conhecidas
if (sanitized.business_type === 'industrial') sanitized.business_type = 'corporativo'

// Nulifica enums com valores inválidos para evitar violação de constraint
const VALID_BUSINESS_TYPES = ['residencial', 'comercial', 'corporativo', 'publico']
const VALID_SERVICE_TYPES = ['projeto_arquitetonico', 'projeto_arquitetonico_completo', 'projeto_interiores', 'gestao_obra', 'consultoria', 'regularizacao', 'reformas', 'acompanhamento', 'outros']
const VALID_LEAD_SOURCES = ['website', 'indicacao', 'instagram', 'facebook', 'linkedin', 'google_ads', 'facebook_ads', 'evento', 'cold_call', 'email_marketing', 'parceria', 'retorno', 'outros']
const VALID_TEMPERATURES = ['quente', 'morno', 'frio']
const VALID_URGENCIES = ['alta', 'media', 'baixa']

if (sanitized.business_type && !VALID_BUSINESS_TYPES.includes(sanitized.business_type)) sanitized.business_type = null
if (sanitized.service_type && !VALID_SERVICE_TYPES.includes(sanitized.service_type)) sanitized.service_type = null
if (sanitized.lead_source && !VALID_LEAD_SOURCES.includes(sanitized.lead_source)) sanitized.lead_source = null
if (sanitized.temperature && !VALID_TEMPERATURES.includes(sanitized.temperature)) sanitized.temperature = null
if (sanitized.urgency && !VALID_URGENCIES.includes(sanitized.urgency)) sanitized.urgency = null
```

**Migration — `supabase/migrations/20260404_fix_business_type_corporativo.sql`:**

Corrigida a ordem: DROP constraint → UPDATE registros → ADD constraint.

### Arquivos modificados
- `hooks/usePipeline.ts` — normalização de enums no `updateDeal`
- `supabase/migrations/20260404_fix_business_type_corporativo.sql` — ordem corrigida
- `T3X/09_fix_business_type_corporativo.sql` — cópia na pasta T3X (padrão do projeto)

### Padrão estabelecido
Sempre que um enum mudar no banco, deve-se:
1. Adicionar o `backward-compat` no `updateDeal` (renomeia o valor antigo para o novo)
2. Atualizar as listas `VALID_*` no `updateDeal`
3. Na migration: DROP constraint → UPDATE registros → ADD constraint (nessa ordem)

---

---

## Change 5 — Novo campo opportunity_cod em deals

### Objetivo
Adicionar um código identificador de oportunidade no formato `EST00001` (EST = estimativa, pois o contrato ainda não foi fechado) para facilitar a referência e busca de negócios.

### Decisões de design
- Campo **gerado automaticamente** via trigger PostgreSQL — não aparece no `DealFormData`
- **Read-only** na UI em todos os componentes
- Sequência global (`opportunity_cod_seq`) garante unicidade sem race condition
- `EST` = prefixo fixo de estimativa (pré-contrato). Futuro: pode evoluir para `CON` quando ganho

### Schema (banco de dados)
```sql
-- Sequência global
CREATE SEQUENCE opportunity_cod_seq START 1;

-- Coluna
ALTER TABLE deals ADD COLUMN opportunity_cod VARCHAR(20) UNIQUE NOT NULL;

-- Trigger BEFORE INSERT
CREATE TRIGGER set_opportunity_cod
  BEFORE INSERT ON deals
  FOR EACH ROW EXECUTE FUNCTION generate_opportunity_cod();
-- Função: 'EST' || LPAD(nextval('opportunity_cod_seq')::text, 5, '0')
```

### Arquivos SQL
- `supabase/migrations/20260405_opportunity_cod.sql` — migration completa
- `T3X/10_opportunity_cod.sql` — cópia no padrão da pasta T3X

### Tipos alterados
- `types/pipeline.ts` — adicionado `opportunity_cod: string` na interface `Deal` (não no `DealFormData`)

### Componentes alterados
| Componente | Exibição |
|-----------|---------|
| `components/comercial/DealDialog.tsx` | Badge `<Badge variant="secondary" className="font-mono">EST00001</Badge>` no topo da aba "Básico" (apenas em edição) |
| `components/comercial/DealCard.tsx` | Código em `font-mono text-xs` acima do título (kanban) |
| `components/comercial/DealsListView.tsx` | Badge `variant="outline"` antes do título (lista ganhos/perdidos/arquivados) |
| `components/comercial/client-details/ClientDeals.tsx` | Código em `font-mono text-xs` acima do título no detalhe do cliente |

### Para rodar
Execute `T3X/10_opportunity_cod.sql` (ou a migration) no Supabase SQL Editor. O backfill popula deals existentes automaticamente.

---

---

## Change 6 — Importação ClickUp: Diagnóstico|Proposta, Negociação e Contrato

### O que foi feito
- Exportados 3 novos status do espaço Comercial do ClickUp (2026-04-05)
- Criados arquivos de referência individuais por status
- Criado SQL unificado com todos os 14 deals (3 status)

### Tarefas por status

**Diagnóstico | Proposta (2):**
| Título | Vencimento | Obs |
|--------|-----------|-----|
| 3D_Bendita Carrinho_COM | 25/05/2026 | prefixo 3D → service: outros |
| Diagnóstico - Reunião | 28/09/2025 | ⚠️ vencido, urgente, sem padrão |

**Negociação (2):**
| Título | Vencimento |
|--------|-----------|
| INT_Flow Maringá A11_CORP | 20/05/2026 |
| ARQ_Jairo_CORP | 20/05/2026 |

**Contrato (10):**
| Título | Vencimento | Obs |
|--------|-----------|-----|
| ADM_Andre e Mariana_RES | 18/05/2026 | |
| ADM_Flow Maringa_CORP | 18/05/2026 | |
| PREF_Darlen_RES | 20/05/2026 | prefixo PREF → service: null |
| INT_Angelinos_COM | 20/05/2026 | |
| ARQ+INT_Tc Thiago_RES | 19/05/2026 | → projeto_arquitetonico_completo |
| INT_Adata_CORP | 18/05/2026 | |
| INT_Bronco_COM | 18/05/2026 | |
| ARQ_Eduardo Atibaia_COM | 18/05/2026 | |
| Reunião | 25/11/2025 | ⚠️ vencido, tarefa interna |
| Aguardar confirmação reunião do Aldo | 27/10/2025 | ⚠️ vencido, tarefa interna |

### Novos prefixos identificados
| Prefixo | Mapeamento | Observação |
|---------|-----------|-----------|
| `3D` | service_type: `null` | Visualização 3D, não cobre o padrão atual |
| `PREF` | service_type: `null` | Provável Prefeitura → considerar `publico` como business_type |
| `ARQ+INT` | service_type: `projeto_arquitetonico_completo` | Projeto completo com interiores |

### Arquivos criados
- `T3X/doc/clickup/espaço comercial/clickup_diagnostico_proposta.md`
- `T3X/doc/clickup/espaço comercial/clickup_negociacao.md`
- `T3X/doc/clickup/espaço comercial/clickup_contrato.md`
- `T3X/doc/clickup/espaço comercial/insert_todos_deals.sql` — SQL único com 14 deals, stage_id resolvido por subquery (`LOWER(name) LIKE '%...'`)

### Nota importante
Os stage_ids são resolvidos via subquery por nome (`pipeline_stages WHERE LOWER(name) LIKE '%contrato%'`). Se os nomes dos estágios no banco forem diferentes, ajustar o LIKE antes de rodar.

Os itens "Reunião" e "Aguardar a confirmação da reunião do Aldo" parecem tarefas internas/operacionais do ClickUp, não clientes reais. Avaliar se devem ser mantidos no pipeline.

---

## Contexto para próxima sessão

O sistema Sarke é um ERP para escritório de arquitetura (cliente: Guilherme). Stack: Next.js 15 + Supabase.

### Estado atual do módulo comercial (pipeline)
- O pipeline usa stages com UUIDs fixos no banco. O stage "REUNIÃO" tem ID `e84fbb50-e666-4b22-906f-14456c5edf3b`.
- Deals importados do ClickUp estão na tabela `deals` com `client_id: null` (sem cliente vinculado ainda).
- `updateDeal` em `hooks/usePipeline.ts` sanitiza: strings vazias → null, enums inválidos → null, backward-compat de renomeações.
- `BusinessType` em deals: `'corporativo'` no lugar de `'industrial'`. Migration `20260404_fix_business_type_corporativo.sql` deve ser rodada no Supabase SQL Editor.
- `industrial` em obras (`TipoObra`) não foi alterado — contexto diferente.
- Campo `opportunity_cod` adicionado na tabela `deals` (formato `EST00050` em diante). Gerado via trigger PostgreSQL. Migration `20260405_opportunity_cod.sql` / `T3X/10_opportunity_cod.sql` deve ser rodada.
- **14 deals do ClickUp** prontos para importar via `T3X/doc/clickup/espaço comercial/insert_todos_deals.sql` (inclui Diagnóstico|Proposta, Negociação, Contrato). Os 5 da REUNIÃO têm SQL próprio em `insert_reuniao_deals.sql`.
- Prefixos não mapeados identificados: `3D`, `PREF`, `ARQ+INT`. O `ARQ+INT` foi mapeado para `projeto_arquitetonico_completo`. `3D` e `PREF` ficam com service_type: null.

### Arquivos chave do módulo comercial
| Arquivo | Responsabilidade |
|---------|-----------------|
| `hooks/usePipeline.ts` | CRUD de deals, stages, movimentação, sanitização |
| `components/comercial/DealDialog.tsx` | Formulário de criação/edição de deal |
| `components/comercial/DealsListView.tsx` | Listagem de deals |
| `types/pipeline.ts` | Tipos TypeScript do pipeline |
| `supabase/migrations/20260221_deals_qualificacao_fase1.sql` | Schema dos campos de qualificação |
| `supabase/migrations/20260404_fix_business_type_corporativo.sql` | Fix enum industrial→corporativo |
| `T3X/09_fix_business_type_corporativo.sql` | Idem — cópia no padrão da pasta T3X |
| `supabase/migrations/20260405_opportunity_cod.sql` | Adiciona opportunity_cod + trigger |
| `T3X/10_opportunity_cod.sql` | Idem — cópia no padrão da pasta T3X |
