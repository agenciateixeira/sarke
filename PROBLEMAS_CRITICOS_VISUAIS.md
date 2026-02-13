# PROBLEMAS CRÍTICOS - VISUALIZAÇÃO POR SEVERIDADE

## 1. CRÍTICO - RLS DELETE POLICIES FALTANDO

```
TABELAS AFETADAS:
┌─────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Tabela              │ SELECT   │ INSERT   │ UPDATE   │ DELETE   │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ obras               │    ✅    │    ✅    │    ✅    │    ❌    │
│ obra_fotos          │    ✅    │    ✅    │    ❌    │    ❌    │
│ obra_documentos     │    ✅    │    ✅    │    ❌    │    ❌    │
│ obra_medicoes       │    ✅    │    ✅    │    ✅    │    ❌    │
│ obra_etapas         │    ✅    │    ✅    │    ✅    │    ❌    │
│ obra_rdo            │    ✅    │    ✅    │    ✅    │    ❌    │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┘

CENÁRIO:
┌─────────────────────────────────────────────┐
│  Usuário clica em "Excluir Obra"            │
└────────────────┬────────────────────────────┘
                 │
         ┌───────┴────────┐
         ▼                ▼
    FRONTEND           BACKEND
    (React)          (Supabase)
         │                │
    Envia DELETE       Recebe DELETE
    request           request
         │                │
         │          RLS verifica
         │               │
         │          DELETE policy?
         │               │
         │          NÃO EXISTE!
         │               │
         │          ❌ Permission Denied
         │          (silenciosamente)
         │                │
    "Sucesso!"        Sem deletar
    UI atualiza       no DB
         │                │
         │                │
    ❌ INCONSISTÊNCIA    ❌ DADOS ÓRFÃOS
       CRÍTICA!
```

---

## 2. CRÍTICO - DELETAR MEMBRO SEM REMOVER AUTH.USER

```
FLUXO ATUAL (BUGADO):

┌─────────────────────────────────────────────────────────┐
│  removeMember(userId)                                   │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
                    DELETE FROM profiles
                    WHERE id = userId
                          │
                          ✅ Sucesso
                          │
                          ▼
                    auth.users ainda
                    tem o registro!
                          │
                          ▼
        Usuário pode usar "Esqueci minha senha"
        E recriar conta com MESMO EMAIL
                          │
                          ▼
        ⚠️ DOIS REGISTROS CONFLITANTES


FLUXO CORRETO:

┌─────────────────────────────────────────────────────────┐
│  removeMember(userId)                                   │
└─────────────────────────┬───────────────────────────────┘
                          │
                ┌─────────┴──────────┐
                ▼                    ▼
        DELETE profiles      POST /api/admin/delete-user
        WHERE id = userId    (backend só)
                │                    │
                ✅                  ✅
                │                    │
                └─────────┬──────────┘
                          ▼
                  Usuario removido
                  completamente
                  (profiles + auth)
```

---

## 3. MÉDIO - DELETAR ANEXO COM ORDEM ERRADA

```
PROBLEMA:

     Storage.delete(file_path)
              │
              ▼
        ❌ ERRO na API!
              │
              ▼
    Throws exception
              │
              ▼
    DB.delete nunca executa
              │
              ▼
    ✅ BD está consistente
    ✅ Storage tem arquivo órfão
    ⚠️ Usuário vê erro (pode retentar)

vs.

DB.delete(attachment_id)
              │
              ▼
        ❌ ERRO no DB!
              │
              ▼
    Throws exception
              │
              ▼
    Storage.delete nunca executa
              │
              ▼
    ❌ Registro no BD foi deletado
    ✅ Arquivo ainda está no Storage
    ⚠️ Arquivo órfão permanente!


SOLUÇÃO: Sempre BD PRIMEIRO

DB.delete(attachment_id)
        │
        ✅ Success
        │
        ▼
Storage.delete(file_path)
        │
        ✅ ou ❌ (não importa!)
        │
        ▼
Se falhar:
- BD está consistente ✅
- Storage pode ter arquivo órfão (limpável depois)
```

---

## 4. MÉDIO - DELETE SEM VALIDAÇÃO DE PROPRIEDADE

```
CASO 1: Movimentação de Caixa

Supabase:  WHERE id = movement_id
           (sem validar obra_id!)

Ataque:
┌─────────────────────────────────────────────┐
│ curl -X DELETE /api/delete-movement          │
│   -H "Authorization: Bearer USER_TOKEN"      │
│   -d '{"id": "movement_from_other_work"}'    │
└─────────────────────────────────────────────┘
           │
           ▼
    ✅ DELETE sucede
           │
           ▼
    🔥 Deletou movimento de OUTRA obra
           │
           ▼
    Relatório financeiro quebrado!


SOLUÇÃO:

Supabase: WHERE id = movement_id
          AND obra_id = current_obra_id
                │
                ▼
           Se obra_id não combina:
           query retorna 0 rows
           DELETE falha (correto!)
```

---

## 5. MÉDIO - DELETE COM REFRESH INCOMPLETO

```
FLOW COM BUG:

DELETE subtask
        │
        ✅ Sucesso no DB
        │
        ▼
loadSubtasks()  ✅ Lista atualizada
        │
        ▼
refreshTask()   ❌ Não atualiza contadores!
        │
        ▼
UI mostra:
- Subtarefa removida da lista ✅
- Mas "2/3 concluídas" ainda (era 2/4) ❌


FLUXO CORRETO:

DELETE subtask
        │
        ✅ Sucesso no DB
        │
        ▼
loadSubtasks()
        │
        ✅ Lista atualizada
        │
        ▼
refreshTask()
        │
        ✅ Contadores recalculados:
           - subtasks_count decrementado
           - completed_subtasks_count ajustado
           - progress_percentage recalculado
```

---

## MAPA DE IMPACTO

```
                        DELETE POLICIES FALTANDO
                              (CRÍTICO)
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
        Delete Obra        Delete Fotos        Delete RDO
        falha silencio-    falha silencio-    falha silencio-
        samente            samente             samente
                │                 │                 │
                └─────────────────┼─────────────────┘
                                  │
                                  ▼
                        ⚠️ INCONSISTÊNCIA CRÍTICA
                    UI mostra deletado, DB não está

                                
        DELETE AUTH.USERS SEM SYNC
              (CRÍTICO)
                │
                ▼
        Remover membro da app
                │
                ▼
        auth.users ainda existe
                │
                ▼
        Usuário pode recriar conta
                │
                ▼
        ⚠️ VIOLAÇÃO DE INTEGRIDADE


        DELETE SEM VALIDAÇÃO DE PROPRIEDADE
                  (MÉDIO x3)
                  
        Obra_Caixa, Event, Task
                │
                ▼
        Sem filtro de propriedade
                │
                ▼
        Usuário A pode deletar dados de Usuário B
                │
                ▼
        ⚠️ VIOLAÇÃO DE SEGURANÇA


        DELETE ANEXO - ORDEM ERRADA
                (MÉDIO)
                │
                ▼
        Storage ANTES de DB
                │
                ▼
        Se falhar: arquivo órfão
                │
                ▼
        ⚠️ DESPERDÍCIO DE ARMAZENAMENTO
```

---

## IMPACTO POR RECURSO

### Obras (CRÍTICO)
```
Status de Risco: 🔴🔴🔴 CRÍTICO

Problema:        DELETE policy falta no RLS
Sintoma:         Usuário vê "Obra deletada!" mas obra ainda existe
Severidade:      Dados inconsistentes, relatórios errados
Impacto:         Impossível deletar obras
Frequência:      Toda vez que tenta deletar
Data Descoberta: 13/02/2026
```

### Movimentações Caixa (MÉDIO)
```
Status de Risco: 🟠 MÉDIO

Problema:        DELETE sem validar obra_id
Sintoma:         Pode deletar movimento de outra obra
Severidade:      Relatório financeiro quebrado
Impacto:         Corrupção de dados
Frequência:      Se alguém souber explorar
Data Descoberta: 13/02/2026
```

### Anexos (MÉDIO)
```
Status de Risco: 🟠 MÉDIO

Problema:        Storage deletado antes de DB
Sintoma:         Se DB falhar, arquivo órfão no storage
Severidade:      Desperdício de armazenamento
Impacto:         Uso de storage crescente sem controle
Frequência:      Raro (só se DB falhar)
Data Descoberta: 13/02/2026
```

### Membros (CRÍTICO)
```
Status de Risco: 🔴 CRÍTICO

Problema:        Deletar profile sem remover auth.user
Sintoma:         Usuário deletado pode se recriar
Severidade:      Violação de integridade, segurança
Impacto:         Dados órfãos, possível duplicação
Frequência:      Toda vez que remove membro
Data Descoberta: 13/02/2026
```

---

## TIMELINE DE IMPLEMENTAÇÃO VISUAL

```
┌─────────────────────────────────────────────────────────┐
│ HOJE (13/02)                                            │
├─────────────────────────────────────────────────────────┤
│  ⚡ Criar migration DELETE policies                      │
│  ⚡ Testar delete obras no console                      │
│  ⚡ Documento criado: FIXES_DELETE_RECOMENDADOS.md      │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ AMANHÃ (14/02)                                          │
├─────────────────────────────────────────────────────────┤
│  ✓ Fix CaixaObraView (obra_id filter)                   │
│  ✓ Fix TaskAttachmentsTab (DB first)                    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ ESTA SEMANA (15-17/02)                                  │
├─────────────────────────────────────────────────────────┤
│  ✓ Fix deleteTask validation                            │
│  ✓ Fix deleteEvent validation                           │
│  ✓ Criar /api/admin/delete-user endpoint                │
│  ✓ Rodar testes QA completos                            │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ PRÓXIMAS SPRINTS                                        │
├─────────────────────────────────────────────────────────┤
│  • Soft-deletes para dados críticos                      │
│  • Audit trail (quem deletou o quê)                      │
│  • Testes automatizados                                  │
│  • Limpeza de dados órfãos                               │
└─────────────────────────────────────────────────────────┘
```

