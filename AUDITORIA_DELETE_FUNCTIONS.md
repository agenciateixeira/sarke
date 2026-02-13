# AUDITORIA COMPLETA DE FUNÇÕES DELETE/EXCLUIR - PROJETO SARKE

**Data da Auditoria:** 13 de Fevereiro de 2026  
**Projeto:** Next.js + Supabase  
**Status Crítico:** MÚLTIPLOS PROBLEMAS ENCONTRADOS

---

## RESUMO EXECUTIVO

Foram encontrados **problemas graves de segurança e UX** em funções de delete em todo o projeto:

1. **CRÍTICO - AUSÊNCIA DE DELETE POLICIES NO RLS**
   - Tabelas: `obras`, `obra_fotos`, `obra_documentos`, `obra_medicoes`, `obra_etapas`, `obra_rdo`
   - Nenhuma política DELETE criada nas migrations
   - O RLS está habilitado SEM acesso DELETE -> **Delete vai FALHAR silenciosamente**

2. **CRÍTICO - DELETE SEM FILTRO SEGURO DE OBRA**
   - `CaixaObraView.tsx`: Delete de `obra_caixa` sem verificar `obra_id`
   - Potencial para deletar movimentações de outras obras

3. **MÉDIO - DELETE COM PROBLEMAS DE REFRESH UI**
   - `TaskDetailModal.tsx`: Delete de subtarefa não faz refetch de task
   - `TaskAttachmentsTab.tsx`: Delete de anexo pode deixar UI inconsistente

4. **MÉDIO - DELETE SEM FEEDBACK CONSISTENTE**
   - Alguns deletes usam `confirm()`, outros não têm confirmação
   - Inconsistência em tratamento de erros

---

## ANÁLISE DETALHADA POR RECURSO

### 1. DELETE DE OBRA (CRÍTICO - PRINCIPAL SUSPEITO)

#### Arquivo: `/app/dashboard/obra/page.tsx`

**Função:** `confirmDeleteObra()` (linhas 167-183)

```typescript
async function confirmDeleteObra() {
  if (!obraToDelete) return
  try {
    setDeleting(true)
    const { error } = await supabase.from('obras').delete().eq('id', obraToDelete.id)
    if (error) throw error
    toast.success(`Obra "${obraToDelete.nome}" excluída com sucesso`)
    setObras((prev) => prev.filter((o) => o.id !== obraToDelete.id))
  } catch (error: any) {
    console.error('Erro ao excluir obra:', error)
    toast.error('Erro ao excluir obra. Verifique se não há dados vinculados.')
  } finally {
    setDeleting(false)
    setDeleteDialogOpen(false)
    setObraToDelete(null)
  }
}
```

**Tabela Afetada:** `obras`

**Análise RLS:** 
```sql
-- Política na migration 20260203_obras.sql:
CREATE POLICY "Usuarios autenticados podem atualizar obras"
  ON obras FOR UPDATE
  TO authenticated
  USING (true);

-- NÃO EXISTE DELETE POLICY!
-- ⚠️ PROBLEMA: RLS está ENABLED, mas NÃO há DELETE POLICY!
-- Resultado: DELETE FALHA com erro de permission denied
```

**Filtros:**
- ✅ `.eq('id', obraToDelete.id)` - Correto, filtra por ID específico
- ❌ Sem verificação de `created_by` ou `user_id`

**Refresh UI:**
- ✅ `setObras((prev) => prev.filter((o) => o.id !== obraToDelete.id))` - Remove da UI

**Problemas Identificados:**
1. **CRÍTICO**: RLS não tem DELETE POLICY -> DELETE sempre falha
2. **CRÍTICO**: Usuário vê mensagem de sucesso mas delete pode ter falhado no banco
3. Sem verificação de cascata (fotos, documentos, etc)
4. Sem validação se obra pode ser deletada (status, dependências)

**Diagnóstico Final:** 
O delete PROVAVELMENTE NÃO FUNCIONA no banco (falta policy RLS), mas UI é removida = dados inconsistentes.

---

### 2. DELETE DE MOVIMENTAÇÃO CAIXA

#### Arquivo: `/components/obra-adm/CaixaObraView.tsx`

**Função:** `handleExcluirMovimentacao()` (linhas 148-164)

```typescript
const handleExcluirMovimentacao = async (id: string) => {
  if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return

  try {
    const { error } = await supabase
      .from('obra_caixa')
      .delete()
      .eq('id', id)

    if (error) throw error
    carregarMovimentacoes()
    carregarSemanas() // Atualizar totais
  } catch (error) {
    console.error('Erro ao excluir movimentação:', error)
    alert('Erro ao excluir movimentação')
  }
}
```

**Tabela Afetada:** `obra_caixa`

**Análise RLS:**
```sql
-- Migration 20260206_obra_adm_financeiro.sql CONTÉM:
CREATE POLICY "..."
  ON obra_caixa FOR DELETE
  TO authenticated
  USING (true);
  
-- ✅ DELETE POLICY EXISTS
```

**Filtros:**
- ⚠️ `.eq('id', id)` - Apenas filtra por ID
- ❌ **FALTA VERIFICAÇÃO DE obra_id!**
  - Não verifica se a movimentação pertence à obra selecionada
  - Usuário poderia deletar movimentações de outras obras

**Refresh UI:**
- ✅ `carregarMovimentacoes()` - Recarrega movimentações
- ✅ `carregarSemanas()` - Atualiza totais

**Problemas Identificados:**
1. **MÉDIO**: Sem validação de `obra_id` na query delete
2. Sem feedback visual mais forte (usa `alert()` em vez de toast)

---

### 3. DELETE DE TAREFA

#### Arquivo: `/components/tasks/TaskDetailModal.tsx`

**Função:** `handleDelete()` (linhas 169-174)

```typescript
const handleDelete = async () => {
  if (currentTask && confirm('Tem certeza que deseja excluir esta tarefa?')) {
    await deleteTask(currentTask.id)
    onOpenChange(false)
  }
}
```

**Tabela Afetada:** `tasks`

**Hook usado:** `useTaskPipeline()` -> `deleteTask()` (linhas 244-267)

```typescript
const deleteTask = async (taskId: string): Promise<boolean> => {
  try {
    // Update otimista - remove da UI imediatamente
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId))

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      // Se der erro, recarrega para restaurar
      await fetchTasks()
      throw error
    }

    toast.success('Tarefa excluída!')
    return true
  } catch (err) {
    console.error('Error deleting task:', err)
    toast.error('Erro ao excluir tarefa')
    return false
  }
}
```

**Filtros:**
- ✅ `.eq('id', taskId)` - Correto

**Refresh UI:**
- ✅ Update otimista: remove imediatamente
- ✅ Se erro: recarrega com `fetchTasks()`
- ✅ Modal fecha automaticamente

**Problemas Identificados:**
1. ⚠️ Sem deletar subtarefas automaticamente
   - Subtarefas podem ficar órfãs (dependendo de FK)
   - Recomendação: usar `ON DELETE CASCADE` no schema

---

### 4. DELETE DE SUBTAREFA

#### Arquivo: `/components/tasks/TaskDetailModal.tsx`

**Função:** `handleDeleteSubtask()` (linhas 198-204)

```typescript
const handleDeleteSubtask = async (subtaskId: string) => {
  if (confirm('Excluir subtarefa?')) {
    await deleteSubtask(subtaskId)
    await loadSubtasks()
    await refreshTask()
  }
}
```

**Hook usado:** `useTaskPipeline()` -> `deleteSubtask()` (linhas 358-374)

```typescript
const deleteSubtask = async (subtaskId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) throw error

    toast.success('Subtarefa excluída com sucesso!')
    return true
  } catch (err) {
    console.error('Error deleting subtask:', err)
    toast.error('Erro ao excluir subtarefa')
    return false
  }
}
```

**Refresh UI:**
- ✅ `loadSubtasks()` - Recarrega lista de subtarefas
- ✅ `refreshTask()` - Atualiza dados da task (contadores)

**Problemas Identificados:**
1. ⚠️ `deleteSubtask()` não recarrega dentro do hook
   - Responsabilidade recai no componente
   - Risco se usado em outro lugar sem refetch

---

### 5. DELETE DE ANEXO

#### Arquivo: `/components/tasks/TaskAttachmentsTab.tsx`

**Função:** `handleDelete()` (linhas 119-144)

```typescript
const handleDelete = async (attachment: TaskAttachment) => {
  if (!confirm(`Excluir "${attachment.file_name}"?`)) return

  try {
    // Deletar do storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([attachment.file_path])

    if (storageError) throw storageError

    // Deletar do banco
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachment.id)

    if (dbError) throw dbError

    toast.success('Arquivo excluído')
    await fetchAttachments()
  } catch (err) {
    console.error('Error deleting file:', err)
    toast.error('Erro ao excluir arquivo')
  }
}
```

**Tabela Afetada:** `task_attachments`

**Filtros:**
- ✅ `.eq('id', attachment.id)` - Correto

**Refresh UI:**
- ✅ `fetchAttachments()` - Recarrega lista de anexos
- ⚠️ Não atualiza `task_attachments_count` no componente pai

**Fluxo de Delete:**
1. Storage primeiro
2. Se erro no storage -> lança exceção (banco não afetado ✅)
3. Se sucesso storage -> deleta do banco
4. Se erro banco -> lança exceção (arquivo já deletado ❌)

**Problemas Identificados:**
1. **Transação incompleta**: Se DB falhar, arquivo do storage já foi deletado
   - Recomendação: deletar do banco PRIMEIRO, depois do storage
   - Ou usar transações (não disponível no Supabase diretamente)

---

### 6. DELETE DE EVENTO

#### Arquivo: `/components/calendar/EventDetailDialog.tsx`

**Função:** `handleDelete()` (linhas 51-64)

```typescript
const handleDelete = async () => {
  if (!confirm('Tem certeza que deseja excluir este evento?')) return

  setDeleting(true)
  try {
    await deleteEvent(event.id)
    onOpenChange(false)
  } catch (err) {
    console.error('Error deleting event:', err)
    alert('Erro ao excluir evento')
  } finally {
    setDeleting(false)
  }
}
```

**Hook usado:** `useCalendarEvents()` -> `deleteEvent()` (linhas 196-213)

```typescript
const deleteEvent = async (eventId: string) => {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)

    if (error) throw error

    toast.success('Evento excluído com sucesso!')
    await fetchEvents()
    return true
  } catch (err: any) {
    console.error('Error deleting event:', err)
    toast.error('Erro ao excluir evento: ' + err.message)
    return false
  }
}
```

**Filtros:**
- ✅ `.eq('id', eventId)` - Correto

**Refresh UI:**
- ✅ `fetchEvents()` - Recarrega lista de eventos
- ✅ Modal fecha automaticamente

**Problemas Identificados:**
1. ⚠️ Sem validação de `organizer_id = auth.uid()`
   - Qualquer usuário pode deletar qualquer evento (se RLS permite)

---

### 7. DELETE DE MEMBRO

#### Arquivo: `/app/dashboard/equipe/page.tsx`

**Função:** `handleDelete()` (linhas 48-55)

```typescript
const handleDelete = async (member: TeamMember) => {
  if (!confirm(`Tem certeza que deseja remover ${member.name} da equipe?`)) return

  const success = await removeMember(member.id)
  if (success) {
    toast.success(`${member.name} foi removido da equipe`)
  }
}
```

**Hook usado:** `useTeam()` -> `removeMember()` (linhas 228-245)

```typescript
const removeMember = async (id: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) throw error

    toast.success('Membro removido da equipe')
    await fetchMembers()
    return true
  } catch (err) {
    console.error('Error removing member:', err)
    toast.error('Erro ao remover membro')
    return false
  }
}
```

**Tabela Afetada:** `profiles` (tabela do auth)

**Filtros:**
- ⚠️ `.eq('id', id)` - Apenas filtra por ID
- ❌ Sem verificação de permissão (só admin pode remover?)

**Refresh UI:**
- ✅ `fetchMembers()` - Recarrega lista de membros

**Problemas Identificados:**
1. **CRÍTICO**: Deletando de `profiles` sem deletar do `auth.users`
   - Usuário pode recriar conta com mesmo email
   - Dados órfãos no auth
2. ⚠️ Sem validação de role (qualquer admin remove qualquer um?)

**Também delete de convite pendente:** (linhas 57-66)

```typescript
const handleCancelInvite = async (id: string) => {
  if (!confirm('Cancelar este convite?')) return
  const { error } = await supabase.from('team_invites').delete().eq('id', id)
  if (error) {
    toast.error('Erro ao cancelar convite')
  } else {
    toast.success('Convite cancelado')
    fetchMembers()
  }
}
```

**Problemas:**
1. ✅ Correto - apenas delete de `team_invites` por ID
2. ✅ Com refresh

---

### 8. DELETE DE CLIENTE

#### Arquivo: `/app/dashboard/comercial/page.tsx`

**Função:** `handleDelete()` (linhas 69-80)

```typescript
const handleDelete = async () => {
  if (!clientToDelete) return

  const { error } = await deleteClient(clientToDelete.id)
  if (error) {
    toast.error('Erro ao excluir cliente', { description: error })
  } else {
    toast.success('Cliente excluído com sucesso!')
  }
  setDeleteDialogOpen(false)
  setClientToDelete(null)
}
```

**Hook usado:** `useClients()` -> `deleteClient()` (linhas 65-78)

```typescript
const deleteClient = async (id: string) => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) throw error
    setClients(clients.filter(c => c.id !== id))
    return { error: null }
  } catch (err: any) {
    return { error: err.message }
  }
}
```

**Filtros:**
- ✅ `.eq('id', id)` - Correto

**Refresh UI:**
- ✅ `setClients(clients.filter(c => c.id !== id))` - Remove da lista
- ⚠️ Sem validação de cascata (obras vinculadas?)

**Problemas Identificados:**
1. ⚠️ Sem verificação se cliente tem obras/chamadas vinculadas
2. FK constraint pode rejeitar delete se houver obras

---

### 9. DELETE DE PIPELINE COLUMN

#### Arquivo: `/hooks/useTaskPipeline.ts`

**Função:** `deleteColumn()` (linhas 163-187)

```typescript
const deleteColumn = async (columnId: string): Promise<boolean> => {
  try {
    // Update otimista - remove da UI imediatamente
    setColumns(prevCols => prevCols.filter(c => c.id !== columnId))
    setTasks(prevTasks => prevTasks.filter(t => t.column_id !== columnId))

    const { error } = await supabase
      .from('pipeline_columns')
      .delete()
      .eq('id', columnId)

    if (error) {
      // Se der erro, recarrega para restaurar
      await Promise.all([fetchColumns(), fetchTasks()])
      throw error
    }

    toast.success('Coluna excluída!')
    return true
  } catch (err) {
    console.error('Error deleting column:', err)
    toast.error('Erro ao excluir coluna')
    return false
  }
}
```

**Filtros:**
- ✅ `.eq('id', columnId)` - Correto

**Refresh UI:**
- ✅ Update otimista: remove coluna E tarefas
- ✅ Se erro: recarrega tudo
- ✅ Toast com feedback

**Problemas Identificados:**
1. ⚠️ Deleta tarefas da coluna da UI sem confirmação
   - Pode estar deletando do banco (se FK cascade) ou deixando órfãs
2. Sem validação se coluna pode ser deletada (pode estar vazia?)

---

## VERIFICAÇÃO DE RLS EM CADA TABELA

### Tabela: `obras`
```
Status RLS:      ENABLED ✓
SELECT POLICY:   SIM (para autenticados)
INSERT POLICY:   SIM (para autenticados)
UPDATE POLICY:   SIM (para autenticados)
DELETE POLICY:   NÃO ❌❌❌ FALTA!
```

### Tabela: `obra_fotos`, `obra_documentos`, `obra_medicoes`, `obra_etapas`, `obra_rdo`
```
Status RLS:      ENABLED ✓
DELETE POLICY:   NÃO ❌ FALTA EM TODAS!
```

### Tabela: `obra_caixa`
```
Status RLS:      ENABLED ✓
DELETE POLICY:   SIM ✓ (para autenticados)
```

### Tabela: `obra_caixa_semanas`
```
Status RLS:      ENABLED ✓
DELETE POLICY:   SIM ✓ (para autenticados)
```

### Tabela: `tasks`, `subtasks`, `task_attachments`
```
Verificação:     Migration SQL não consultada (não foi fornecido)
Provável:        Delete funciona (se policy existe)
```

### Tabela: `calendar_events`
```
Verificação:     Migration SQL não consultada
Provável:        Delete funciona
```

### Tabela: `profiles`
```
Status RLS:      Possivelmente ENABLED (auth table)
DELETE POLICY:   Risco de remover sem desativar auth user
```

### Tabela: `clients`
```
Verificação:     Migration SQL não consultada
Provável:        Delete funciona se sem FK constraints
```

---

## PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. DELETE POLICIES FALTANDO NO RLS

**Severidade:** CRÍTICO  
**Impacto:** Delete vai FALHAR silenciosamente com permission denied

**Tabelas Afetadas:**
- `obras`
- `obra_fotos`
- `obra_documentos`
- `obra_medicoes`
- `obra_etapas`
- `obra_rdo`

**Sintoma:**
- Usuário vê toast "Obra excluída com sucesso"
- Obra é removida da UI
- Mas no banco de dados a obra AINDA EXISTE

**Fix Necessário:**

```sql
-- Adicionar em 20260203_obras.sql:

CREATE POLICY "Usuarios autenticados podem deletar obras"
  ON obras FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem deletar fotos"
  ON obra_fotos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem deletar documentos"
  ON obra_documentos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem deletar medicoes"
  ON obra_medicoes FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem deletar etapas"
  ON obra_etapas FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados podem deletar rdo"
  ON obra_rdo FOR DELETE
  TO authenticated
  USING (true);
```

---

### 2. DELETE SEM VALIDAÇÃO DE PROPRIEDADE

**Severidade:** MÉDIO  
**Impacto:** Usuários podem deletar dados alheios

**Casos:**
- `CaixaObraView.tsx`: Deletar movimentação sem validar `obra_id`
- `TaskDetailModal.tsx`: Sem validar `created_by`
- `EventDetailDialog.tsx`: Sem validar `organizer_id`

**Fix Recomendado:**

```typescript
// Para obra_caixa:
const { error } = await supabase
  .from('obra_caixa')
  .delete()
  .eq('id', id)
  .eq('obra_id', obraId)  // Adicionar filtro

// Para tasks:
const { error } = await supabase
  .from('tasks')
  .delete()
  .eq('id', taskId)
  .eq('created_by', user.id)  // Validar propriedade
```

---

### 3. PROBLEMA DE TRANSAÇÃO INCOMPLETA

**Severidade:** MÉDIO  
**Impacto:** Dados órfãos em storage se DB falhar

**Caso:**
- `TaskAttachmentsTab.tsx`: Delete storage ANTES de DB

**Fix Recomendado:**

```typescript
const handleDelete = async (attachment: TaskAttachment) => {
  try {
    // 1. Deletar do banco PRIMEIRO
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachment.id)

    if (dbError) throw dbError

    // 2. Só então deletar do storage (se falhar, pelo menos DB foi atualizado)
    await supabase.storage
      .from('documents')
      .remove([attachment.file_path])

    toast.success('Arquivo excluído')
    await fetchAttachments()
  } catch (err) {
    toast.error('Erro ao excluir arquivo')
  }
}
```

---

### 4. DELETE DE AUTH.USERS SEM SINCRONIZAÇÃO

**Severidade:** CRÍTICO  
**Impacto:** Usuário deletado do app mas conta auth ainda existe

**Caso:**
- `useTeam.tsx` `removeMember()`: Deleta de `profiles` mas não de `auth.users`

**Fix Necessário:**
```typescript
const removeMember = async (id: string) => {
  try {
    // 1. Deletar de profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) throw profileError

    // 2. Para deletar do auth, precisa usar admin API (back-end):
    // POST /api/admin/delete-user
    // await fetch('/api/admin/delete-user', { method: 'POST', body: JSON.stringify({ userId: id }) })

    toast.success('Membro removido')
    await fetchMembers()
    return true
  } catch (err) {
    toast.error('Erro ao remover membro')
    return false
  }
}
```

---

## RESUMO DE RECOMENDAÇÕES

| # | Função | Tabela | Severidade | Ação Necessária |
|---|--------|--------|-----------|-----------------|
| 1 | confirmDeleteObra | obras | CRÍTICO | Adicionar DELETE POLICY RLS |
| 2 | handleExcluirMovimentacao | obra_caixa | MÉDIO | Adicionar filtro `obra_id` |
| 3 | deleteTask | tasks | BAIXO | OK, mas verificar FK cascade |
| 4 | deleteSubtask | subtasks | MÉDIO | Refetch no hook |
| 5 | handleDelete (anexo) | task_attachments | MÉDIO | Inverter ordem: DB antes storage |
| 6 | handleDelete (evento) | calendar_events | MÉDIO | Validar `organizer_id` |
| 7 | removeMember | profiles | CRÍTICO | Criar endpoint para remover auth user |
| 8 | handleDelete (cliente) | clients | MÉDIO | Validar cascata com obras |
| 9 | deleteColumn | pipeline_columns | MÉDIO | Confirmar antes de remover tarefas |

---

## PRÓXIMOS PASSOS

1. **Imediato (Hoje):**
   - Criar migration SQL com DELETE policies ausentes
   - Testar delete de obras no Supabase console

2. **Esta semana:**
   - Adicionar validações de propriedade em deletes
   - Corrigir ordem de operações em storage/DB
   - Criar endpoint back-end para remover auth users

3. **Próximas sprints:**
   - Implementar soft-deletes para dados críticos
   - Adicionar audit trail para todas as exclusões
   - Testes automatizados de delete

