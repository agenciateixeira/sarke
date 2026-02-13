# GUIA PRÁTICO DE FIXES PARA DELETE FUNCTIONS

## 1. FIX CRÍTICO: Adicionar DELETE POLICIES ao RLS (IMEDIATO)

### Criar nova migration:
**Arquivo:** `supabase/migrations/20260213_add_delete_policies.sql`

```sql
-- Adicionar DELETE policies para as tabelas que faltam

-- DELETE policy para obras
CREATE POLICY "Usuarios autenticados podem deletar obras"
  ON obras FOR DELETE
  TO authenticated
  USING (true);

-- DELETE policy para obra_fotos
CREATE POLICY "Usuarios autenticados podem deletar fotos"
  ON obra_fotos FOR DELETE
  TO authenticated
  USING (true);

-- DELETE policy para obra_documentos
CREATE POLICY "Usuarios autenticados podem deletar documentos"
  ON obra_documentos FOR DELETE
  TO authenticated
  USING (true);

-- DELETE policy para obra_medicoes
CREATE POLICY "Usuarios autenticados podem deletar medicoes"
  ON obra_medicoes FOR DELETE
  TO authenticated
  USING (true);

-- DELETE policy para obra_etapas
CREATE POLICY "Usuarios autenticados podem deletar etapas"
  ON obra_etapas FOR DELETE
  TO authenticated
  USING (true);

-- DELETE policy para obra_rdo
CREATE POLICY "Usuarios autenticados podem deletar rdo"
  ON obra_rdo FOR DELETE
  TO authenticated
  USING (true);
```

### Testar depois de aplicar a migration:
```javascript
// No console do Supabase:
const { error } = await supabase
  .from('obras')
  .delete()
  .eq('id', '00000000-0000-0000-0000-000000000000')

console.log(error) // Deve estar NULL se policy funciona
```

---

## 2. FIX: Delete de Movimentação com Validação de obra_id

### Arquivo: `/components/obra-adm/CaixaObraView.tsx`

**Antes:**
```typescript
const handleExcluirMovimentacao = async (id: string) => {
  if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return

  try {
    const { error } = await supabase
      .from('obra_caixa')
      .delete()
      .eq('id', id)  // ⚠️ RISCO: Sem validar obra_id

    if (error) throw error
    carregarMovimentacoes()
    carregarSemanas()
  } catch (error) {
    console.error('Erro ao excluir movimentação:', error)
    alert('Erro ao excluir movimentação')
  }
}
```

**Depois:**
```typescript
const handleExcluirMovimentacao = async (id: string) => {
  if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return

  try {
    // ✅ Adicionar filtro de obra_id
    const { error } = await supabase
      .from('obra_caixa')
      .delete()
      .eq('id', id)
      .eq('obra_id', obraId)  // Validar que pertence à obra

    if (error) throw error
    toast.success('Movimentação excluída com sucesso')
    carregarMovimentacoes()
    carregarSemanas()
  } catch (error) {
    console.error('Erro ao excluir movimentação:', error)
    toast.error('Erro ao excluir movimentação')
  }
}
```

---

## 3. FIX: Delete de Anexo (Inverter ordem: DB antes de Storage)

### Arquivo: `/components/tasks/TaskAttachmentsTab.tsx`

**Antes:**
```typescript
const handleDelete = async (attachment: TaskAttachment) => {
  if (!confirm(`Excluir "${attachment.file_name}"?`)) return

  try {
    // ❌ PROBLEMA: Storage PRIMEIRO
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([attachment.file_path])

    if (storageError) throw storageError

    // Se falhar aqui, arquivo já foi deletado do storage
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

**Depois:**
```typescript
const handleDelete = async (attachment: TaskAttachment) => {
  if (!confirm(`Excluir "${attachment.file_name}"?`)) return

  try {
    // ✅ CORRETO: Banco PRIMEIRO
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachment.id)

    if (dbError) throw dbError

    // Só depois deletar do storage (se falhar, pelo menos BD foi atualizado)
    try {
      await supabase.storage
        .from('documents')
        .remove([attachment.file_path])
    } catch (storageErr) {
      // Log do erro mas não quebra o fluxo
      console.warn('Erro ao deletar arquivo do storage:', storageErr)
      // O registro do BD já foi deletado, então está OK
    }

    toast.success('Arquivo excluído')
    await fetchAttachments()
  } catch (err) {
    console.error('Error deleting file:', err)
    toast.error('Erro ao excluir arquivo')
  }
}
```

---

## 4. FIX: Delete de Tarefa com Validação Melhorada

### Arquivo: `/hooks/useTaskPipeline.ts`

**Antes:**
```typescript
const deleteTask = async (taskId: string): Promise<boolean> => {
  try {
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId))

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)  // ⚠️ Sem validar proprietário

    if (error) {
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

**Depois:**
```typescript
const deleteTask = async (taskId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Update otimista
    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId))

    // ✅ Adicionar validação de propriedade
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('created_by', user?.id)  // Garante que só criador deleta

    if (error) {
      // Se permission denied, é porque não é proprietário
      if (error.message.includes('permission denied')) {
        toast.error('Você não tem permissão para deletar esta tarefa')
      } else {
        toast.error('Erro ao excluir tarefa')
      }
      await fetchTasks()
      throw error
    }

    toast.success('Tarefa excluída!')
    return true
  } catch (err) {
    console.error('Error deleting task:', err)
    return false
  }
}
```

---

## 5. FIX: Delete de Evento com Validação de Propriedade

### Arquivo: `/hooks/useCalendarEvents.ts`

**Antes:**
```typescript
const deleteEvent = async (eventId: string) => {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)  // ⚠️ Sem validar organizador

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

**Depois:**
```typescript
const deleteEvent = async (eventId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    // ✅ Validar que é o organizador
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('organizer_id', user?.id)  // Só organizador pode deletar

    if (error) {
      if (error.message.includes('permission denied') || error.message.includes('no rows')) {
        toast.error('Você não tem permissão para deletar este evento')
      } else {
        throw error
      }
      return false
    }

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

---

## 6. FIX: Adicionar DELETE POLICY para Melhor Segurança com RLS

### Atualizar migration 20260206_obra_adm_financeiro.sql:

```sql
-- Essas políticas devem existir. Se não existem, adicione:

CREATE POLICY "Usuario pode deletar movimentacoes da sua obra"
  ON obra_caixa FOR DELETE
  TO authenticated
  USING (
    obra_id IN (
      SELECT id FROM obras 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Usuario pode deletar semanas da sua obra"
  ON obra_caixa_semanas FOR DELETE
  TO authenticated
  USING (
    obra_id IN (
      SELECT id FROM obras 
      WHERE created_by = auth.uid()
    )
  );
```

---

## 7. LISTA DE VERIFICAÇÃO (QA Testing)

Depois de fazer os fixes, testar cada um:

- [ ] Delete obra -> Verificar se sumiu do banco (SELECT)
- [ ] Delete foto -> Verificar se foi deletado no storage + DB
- [ ] Delete documento -> Verificar cascata de relacionamentos
- [ ] Delete movimentação -> Verificar se valores de semana foram atualizados
- [ ] Delete tarefa -> Verificar se subtarefas foram deletadas (ou cascata)
- [ ] Delete subtarefa -> Verificar se contadores da tarefa foram atualizados
- [ ] Delete anexo -> Verificar se foi removido do storage E do DB
- [ ] Delete evento -> Verificar se foi removido do calendário
- [ ] Delete membro -> Verificar se consegue se recriar com mesmo email
- [ ] Delete cliente -> Verificar se falha se tem obras vinculadas

---

## 8. SQL PARA ENCONTRAR DADOS ÓRFÃOS

Depois de todos os fixes, rodar estas queries para verificar integridade:

```sql
-- Fotos de obras deletadas
SELECT f.id FROM obra_fotos f
LEFT JOIN obras o ON f.obra_id = o.id
WHERE o.id IS NULL;

-- Documentos de obras deletadas
SELECT d.id FROM obra_documentos d
LEFT JOIN obras o ON d.obra_id = o.id
WHERE o.id IS NULL;

-- Movimentações sem semana
SELECT m.id FROM obra_caixa m
LEFT JOIN obra_caixa_semanas s ON m.semana = s.nome
WHERE s.id IS NULL;

-- Subtarefas de tarefas deletadas
SELECT st.id FROM subtasks st
LEFT JOIN tasks t ON st.task_id = t.id
WHERE t.id IS NULL;

-- Anexos de tarefas deletadas
SELECT ta.id FROM task_attachments ta
LEFT JOIN tasks t ON ta.task_id = t.id
WHERE t.id IS NULL;
```

Se encontrar órfãos, deletar:
```sql
DELETE FROM obra_fotos WHERE obra_id NOT IN (SELECT id FROM obras);
DELETE FROM obra_documentos WHERE obra_id NOT IN (SELECT id FROM obras);
DELETE FROM subtasks WHERE task_id NOT IN (SELECT id FROM tasks);
DELETE FROM task_attachments WHERE task_id NOT IN (SELECT id FROM tasks);
```

---

## TIMELINE DE IMPLEMENTAÇÃO

**Hoje (Urgente):**
1. Criar migration com DELETE policies
2. Testar delete de obras

**Amanhã:**
1. Fix movimentação (obra_id)
2. Fix anexo (inverter ordem)

**Esta semana:**
1. Fix tarefa (validação)
2. Fix evento (validação)
3. Fix cliente (cascata)

**Próxima semana:**
1. Fix membro (auth.users)
2. Testes completos
3. Limpeza de dados órfãos

