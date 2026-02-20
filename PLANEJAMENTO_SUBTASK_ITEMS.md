# 📋 PLANEJAMENTO: Subtask Items (Checklist de Tarefas)

## 🎯 Objetivo
Adicionar um 4º nível de granularidade ao sistema de projetos:
- **Projeto** → **Tarefa** → **Subtarefa** → **Subtask Items** (novo!)

## 📊 Estrutura Atual vs Nova

### Atual:
```
PROJETO (AGENCIA GTX)
  └─ TAREFA (AGENCIA GTX - Residencial)
      ├─ SUBTAREFA (1. Planejamento)
      ├─ SUBTAREFA (2. Planta Baixa)
      ├─ SUBTAREFA (3. Modelo 3D)
      └─ SUBTAREFA (4. Executivo)
```

### Nova:
```
PROJETO (AGENCIA GTX)
  └─ TAREFA (AGENCIA GTX - Residencial)
      └─ SUBTAREFA (1. Planejamento)
          ├─ ITEM (Formulário inicial) [@João] [A FAZER]
          ├─ ITEM (Visita técnica) [@Maria] [EM ANDAMENTO]
          ├─ ITEM (Briefing) [@Pedro] [CONCLUÍDO]
          └─ ITEM (Aprovação cliente) [@Ana] [PAUSADO]
```

---

## 🗄️ PARTE 1: BANCO DE DADOS (SQL)

### 1.1 Criar Tabela `subtask_items`

```sql
CREATE TABLE IF NOT EXISTS subtask_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento
  subtask_id UUID REFERENCES subtasks(id) ON DELETE CASCADE NOT NULL,

  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT,

  -- Status e prioridade
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'paused', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Atribuição e prazos
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,

  -- Ordem de exibição
  order_index INTEGER DEFAULT 0,

  -- Controle de conclusão
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Metadados
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Criar Índices para Performance

```sql
CREATE INDEX IF NOT EXISTS idx_subtask_items_subtask ON subtask_items(subtask_id);
CREATE INDEX IF NOT EXISTS idx_subtask_items_assigned ON subtask_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_subtask_items_status ON subtask_items(status);
CREATE INDEX IF NOT EXISTS idx_subtask_items_completed ON subtask_items(is_completed);
CREATE INDEX IF NOT EXISTS idx_subtask_items_order ON subtask_items(subtask_id, order_index);
```

### 1.3 Criar Trigger para updated_at

```sql
DROP TRIGGER IF EXISTS update_subtask_items_updated_at ON subtask_items;
CREATE TRIGGER update_subtask_items_updated_at
  BEFORE UPDATE ON subtask_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.4 Habilitar RLS (Row Level Security)

```sql
ALTER TABLE subtask_items ENABLE ROW LEVEL SECURITY;

-- Policy: Visualizar
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar subtask items" ON subtask_items;
CREATE POLICY "Usuários autenticados podem visualizar subtask items"
  ON subtask_items FOR SELECT TO authenticated USING (true);

-- Policy: Criar
DROP POLICY IF EXISTS "Usuários autenticados podem criar subtask items" ON subtask_items;
CREATE POLICY "Usuários autenticados podem criar subtask items"
  ON subtask_items FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: Atualizar
DROP POLICY IF EXISTS "Usuários podem atualizar subtask items" ON subtask_items;
CREATE POLICY "Usuários podem atualizar subtask items"
  ON subtask_items FOR UPDATE TO authenticated USING (true);

-- Policy: Deletar
DROP POLICY IF EXISTS "Usuários podem deletar subtask items" ON subtask_items;
CREATE POLICY "Usuários podem deletar subtask items"
  ON subtask_items FOR DELETE TO authenticated USING (true);
```

### 1.5 Criar VIEW para Subtask Items com Detalhes

```sql
CREATE OR REPLACE VIEW subtask_items_with_details AS
SELECT
  si.*,

  -- Dados da subtask pai
  s.title as subtask_title,
  s.task_id,

  -- Responsável atribuído
  p_assigned.name as assigned_to_name,
  p_assigned.avatar_url as assigned_to_avatar,
  p_assigned.email as assigned_to_email,

  -- Criador
  p_created.name as created_by_name,

  -- Quem completou
  p_completed.name as completed_by_name

FROM subtask_items si
LEFT JOIN subtasks s ON si.subtask_id = s.id
LEFT JOIN profiles p_assigned ON si.assigned_to = p_assigned.id
LEFT JOIN profiles p_created ON si.created_by = p_created.id
LEFT JOIN profiles p_completed ON si.completed_by = p_completed.id;
```

### 1.6 Atualizar VIEW `subtasks` para incluir contadores

```sql
-- Adicionar contadores de items à view de subtasks
CREATE OR REPLACE VIEW subtasks_with_details AS
SELECT
  s.*,

  -- Contadores de subtask items
  (SELECT COUNT(*) FROM subtask_items WHERE subtask_items.subtask_id = s.id) as items_count,
  (SELECT COUNT(*) FROM subtask_items WHERE subtask_items.subtask_id = s.id AND subtask_items.is_completed = true) as completed_items_count,

  -- Progresso calculado (0-100)
  CASE
    WHEN (SELECT COUNT(*) FROM subtask_items WHERE subtask_items.subtask_id = s.id) = 0 THEN 0
    ELSE (
      (SELECT COUNT(*) FROM subtask_items WHERE subtask_items.subtask_id = s.id AND subtask_items.is_completed = true) * 100 /
      (SELECT COUNT(*) FROM subtask_items WHERE subtask_items.subtask_id = s.id)
    )
  END as items_progress_percentage,

  -- Responsável
  p_assigned.name as assigned_to_name,
  p_assigned.avatar_url as assigned_to_avatar,

  -- Criador
  p_created.name as created_by_name

FROM subtasks s
LEFT JOIN profiles p_assigned ON s.assigned_to = p_assigned.id
LEFT JOIN profiles p_created ON s.created_by = p_created.id;
```

### 1.7 Criar Trigger para Atualização Automática de Progresso da Subtask

```sql
-- Quando um item é marcado como concluído/não concluído, atualiza a subtask pai
CREATE OR REPLACE FUNCTION update_subtask_progress_on_item_change()
RETURNS TRIGGER AS $$
DECLARE
  v_total_items INTEGER;
  v_completed_items INTEGER;
  v_subtask_completed BOOLEAN;
BEGIN
  -- Contar total de itens e itens concluídos da subtask
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_completed = true)
  INTO v_total_items, v_completed_items
  FROM subtask_items
  WHERE subtask_id = COALESCE(NEW.subtask_id, OLD.subtask_id);

  -- Se todos os itens estão concluídos, marca a subtask como concluída
  -- Se houver pelo menos 1 item não concluído, desmarca a subtask
  IF v_total_items > 0 AND v_completed_items = v_total_items THEN
    v_subtask_completed := true;
  ELSE
    v_subtask_completed := false;
  END IF;

  -- Atualizar a subtask
  UPDATE subtasks
  SET
    is_completed = v_subtask_completed,
    completed_at = CASE WHEN v_subtask_completed THEN NOW() ELSE NULL END,
    completed_by = CASE WHEN v_subtask_completed THEN NEW.completed_by ELSE NULL END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.subtask_id, OLD.subtask_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_subtask_progress ON subtask_items;
CREATE TRIGGER trigger_update_subtask_progress
  AFTER INSERT OR UPDATE OF is_completed OR DELETE ON subtask_items
  FOR EACH ROW
  EXECUTE FUNCTION update_subtask_progress_on_item_change();
```

---

## 🎨 PARTE 2: INTERFACE (UI/UX)

### 2.1 Componentes Necessários

#### A. `SubtaskItemsList.tsx` (Lista Principal)
- Lista de items de uma subtask
- Botões de ação rápida
- Status com cores
- Responsável e prazo visíveis

#### B. `SubtaskItemCard.tsx` (Card Individual)
- Título e descrição
- Status badge
- Avatar do responsável
- Prazo
- Botões de ação

#### C. `SubtaskItemDialog.tsx` (Modal Criar/Editar)
- Form completo
- Campos: título, descrição, responsável, prazo, prioridade, status

#### D. `SubtaskItemActions.tsx` (Botões de Ação Rápida)
- Iniciar / Pausar / Retomar / Concluir
- Editar
- Excluir
- Comentar

### 2.2 Botões e Ações

#### Botões por Status:

**TODO (A Fazer):**
- ▶️ Iniciar → muda para `in_progress`
- ✏️ Editar → abre modal
- 🗑️ Excluir → deleta com confirmação

**IN_PROGRESS (Em Andamento):**
- ⏸️ Pausar → muda para `paused`
- ✅ Concluir → muda para `completed`
- ✏️ Editar → abre modal
- 🗑️ Excluir → deleta com confirmação

**PAUSED (Pausado):**
- ▶️ Retomar → muda para `in_progress`
- ✅ Concluir → muda para `completed`
- ✏️ Editar → abre modal
- 🗑️ Excluir → deleta com confirmação

**COMPLETED (Concluído):**
- 🔄 Reabrir → muda para `todo`
- 👁️ Ver detalhes → abre modal readonly
- 🗑️ Excluir → deleta com confirmação

### 2.3 Cores por Status

```typescript
const STATUS_CONFIG = {
  todo: {
    label: 'A Fazer',
    color: 'bg-slate-500',
    icon: '⏱️',
    badge: 'secondary'
  },
  in_progress: {
    label: 'Em Andamento',
    color: 'bg-blue-500',
    icon: '🔵',
    badge: 'default'
  },
  paused: {
    label: 'Pausado',
    color: 'bg-amber-500',
    icon: '⏸️',
    badge: 'warning'
  },
  completed: {
    label: 'Concluído',
    color: 'bg-green-500',
    icon: '✅',
    badge: 'success'
  }
}
```

---

## 🔧 PARTE 3: TIPOS TYPESCRIPT

```typescript
// types/subtask-items.ts

export interface SubtaskItem {
  id: string
  subtask_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'paused' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  due_date?: string
  order_index: number
  is_completed: boolean
  completed_at?: string
  completed_by?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface SubtaskItemWithDetails extends SubtaskItem {
  subtask_title?: string
  task_id?: string
  assigned_to_name?: string
  assigned_to_avatar?: string
  assigned_to_email?: string
  created_by_name?: string
  completed_by_name?: string
}

export interface CreateSubtaskItemData {
  subtask_id: string
  title: string
  description?: string
  status?: 'todo' | 'in_progress' | 'paused' | 'completed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  due_date?: string
  order_index?: number
}

export interface UpdateSubtaskItemData {
  title?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'paused' | 'completed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  due_date?: string
  order_index?: number
  is_completed?: boolean
}
```

---

## 📝 PARTE 4: HOOK PARA GERENCIAR ITEMS

```typescript
// hooks/useSubtaskItems.ts

export function useSubtaskItems(subtaskId: string) {
  const [items, setItems] = useState<SubtaskItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Funções:
  // - fetchItems()
  // - createItem(data)
  // - updateItem(id, data)
  // - deleteItem(id)
  // - toggleComplete(id, isCompleted)
  // - changeStatus(id, newStatus)
  // - reorderItems(items)
}
```

---

## 🎯 PARTE 5: ORDEM DE IMPLEMENTAÇÃO

### FASE 1: Backend/SQL ✅
1. Criar migration completa
2. Testar no Supabase SQL Editor
3. Verificar triggers funcionando
4. Confirmar RLS policies

### FASE 2: Types ✅
1. Criar arquivo de tipos
2. Atualizar types/tasks.ts se necessário

### FASE 3: Hook ✅
1. Criar useSubtaskItems
2. Implementar CRUD completo
3. Testar com console.log

### FASE 4: Componentes ✅
1. SubtaskItemCard (card individual)
2. SubtaskItemActions (botões)
3. SubtaskItemDialog (modal criar/editar)
4. SubtaskItemsList (lista completa)

### FASE 5: Integração ✅
1. Adicionar lista de items no TaskDetailModal
2. Testar fluxo completo
3. Verificar atualização de progresso

---

## ✅ CHECKLIST PRÉ-EXECUÇÃO

- [ ] Estrutura SQL planejada e revisada
- [ ] Triggers e funções planejados
- [ ] RLS policies definidas
- [ ] Tipos TypeScript definidos
- [ ] Componentes mapeados
- [ ] Botões e ações definidos por status
- [ ] Cores e estilos planejados
- [ ] Ordem de implementação clara

---

## 🚀 PRÓXIMO PASSO

Aguardando aprovação para começar pela **FASE 1: Backend/SQL**

Criar arquivo: `supabase/migrations/20260220_subtask_items.sql`
