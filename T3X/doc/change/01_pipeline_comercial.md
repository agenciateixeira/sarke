# CHANGE 01 — Pipeline Comercial

**Data:** 2026-03 / 2026-04
**Responsável:** T3X Software
**Status:** ✅ Entregue

---

## Objetivo

Implementar o módulo de Pipeline Comercial (CRM) da plataforma Sarke — funil de vendas em kanban com gestão de leads, atividades, documentos e qualificação.

---

## Banco de dados

### Migrations executadas

| Arquivo | Descrição |
|---|---|
| `02_comercial.sql` | Tabelas base: `clients`, `pipeline_stages`, `deals`, `deal_activities`, `notifications` |
| `04_pipeline_extendido.sql` | Colunas extras em `deals` (qualificação, follow-up, arquivamento, tags) + tabela `deal_attachments` + view `deal_activity_stats` + correção FK `deal_activities.created_by` |
| `05_documentos.sql` | Tabelas `deal_documents`, `document_versions`, `document_shared_links`, `document_comments` + buckets `documents` e `deals` no Supabase Storage |

### Correções de schema

- `deal_activities.created_by` referenciava `auth.users` → corrigido para `profiles(id)` para funcionar com PostgREST join (`creator:profiles!created_by`)
- Estágios do pipeline alinhados com a esteira comercial da Sarke (definidos em reunião com Guilherme):

| Ordem | Estágio | Cor |
|---|---|---|
| 1 | Reunião | `#6B7280` |
| 2 | Diagnóstico | `#3B82F6` |
| 3 | Negociação | `#F59E0B` |
| 4 | Contrato | `#10B981` |
| 5 | Pós-Venda | `#8B5CF6` |

---

## Código alterado

### `types/pipeline.ts`

- Adicionados `projeto_arquitetonico_completo` e `projeto_interiores` ao tipo `ServiceType`

---

### `components/comercial/DealDialog.tsx`

| # | Alteração | Motivo |
|---|---|---|
| 1 | `handleSaveClient`: `owner_id` → `created_by` | Coluna da tabela `clients` é `created_by` |
| 2 | Log detalhado de erros Supabase (`code`, `message`, `details`, `hint`) | `console.error({})` não exibe props não-enumeráveis do objeto de erro |
| 3 | Adicionados `projeto_arquitetonico_completo` e `projeto_interiores` em `SERVICE_TYPES` | Solicitado pelo cliente Guilherme |

---

### `components/comercial/DealsListView.tsx`

| # | Alteração | Motivo |
|---|---|---|
| 1 | Cards `won`/`lost`: fundo suave (`bg-green-50/50` / `bg-red-50/50`) + borda colorida à esquerda | Legibilidade em light e dark mode |
| 2 | Cards `archived`: fundo neutro `bg-card`, sem destaque de cor | Arquivados não devem parecer com status ativo |
| 3 | Botões "Restaurar" e excluir sempre visíveis nos arquivados (sem hover) | UX — facilitar ação de desarquivar |
| 4 | Badges "Ganho"/"Perdido" substituem emojis no título | Visual mais limpo |

---

## Observações

- O arquivo `all_migrations.sql` na pasta T3X **não deve ser usado** para novas tabelas — sempre criar arquivo numerado novo
- Se os estágios padrão já foram inseridos antes, executar `DELETE FROM public.pipeline_stages;` antes de rodar `02_comercial.sql` novamente
