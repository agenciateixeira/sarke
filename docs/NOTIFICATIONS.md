# Sistema de Notificações

Sistema completo de notificações em tempo real para o Sarke.

## Tipos de Notificações

### Notificações Automáticas de Tarefas

1. **Tarefa Atribuída** (`task_assigned`)
   - Disparada automaticamente quando uma tarefa é atribuída a um usuário
   - Trigger no banco de dados

2. **Prazo Próximo** (`task_due_soon`)
   - Notifica 2 dias antes do vencimento
   - Executada diariamente via cron job

3. **Tarefa Atrasada** (`task_overdue`)
   - Notifica quando uma tarefa passa do prazo
   - Executada diariamente via cron job

4. **Tarefa Concluída** (`task_completed`)
   - Pode ser implementada para notificar gestores

5. **Comentário Adicionado** (`comment_added`)
   - Para futuro sistema de comentários

6. **Projeto Atualizado** (`project_updated`)
   - Para mudanças importantes em projetos

## Arquitetura

### Banco de Dados

Tabela `notifications`:
- `id`: UUID
- `user_id`: Usuário que receberá a notificação
- `title`: Título da notificação
- `message`: Mensagem detalhada
- `type`: Tipo da notificação
- `related_task_id`: Referência à tarefa (opcional)
- `related_subtask_id`: Referência à subtarefa (opcional)
- `related_project_id`: Referência ao projeto (opcional)
- `is_read`: Se foi lida
- `read_at`: Quando foi lida
- `created_at`: Data de criação
- `updated_at`: Data de atualização

### Triggers Automáticos

#### 1. Notificar Atribuição de Tarefa
```sql
-- Executado automaticamente ao INSERT ou UPDATE em subtasks
CREATE TRIGGER trigger_notify_task_assigned
  AFTER INSERT OR UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();
```

### Funções de Verificação

#### 1. Verificar Tarefas Próximas
```sql
SELECT check_due_soon_tasks();
```

#### 2. Verificar Tarefas Atrasadas
```sql
SELECT check_overdue_tasks();
```

## Componentes Frontend

### NotificationBell
Componente no header que mostra:
- Badge com contador de não lidas
- Dropdown com lista de notificações
- Botão "Marcar todas como lidas"
- Atualização em tempo real via Supabase Realtime

### useNotifications Hook
Hook customizado que gerencia:
- Carregamento de notificações
- Subscrição em tempo real
- Marcar como lida
- Deletar notificações

## Configuração do Cron Job

### Opção 1: Edge Function + Cron (Recomendado)

1. Deploy da função:
```bash
supabase functions deploy daily-notifications
```

2. Configure no Dashboard:
   - Vá em Settings > Cron Jobs
   - Agende: `0 9 * * *` (9h da manhã)
   - Endpoint: `/functions/v1/daily-notifications`

### Opção 2: pg_cron direto no banco

Execute no SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'daily-task-notifications',
  '0 9 * * *',
  $$
  SELECT check_due_soon_tasks();
  SELECT check_overdue_tasks();
  $$
);
```

## Teste Manual

### 1. Criar uma notificação manualmente:
```sql
INSERT INTO notifications (user_id, title, message, type, related_subtask_id)
VALUES (
  '<USER_ID>',
  'Teste de Notificação',
  'Esta é uma notificação de teste',
  'task_assigned',
  '<SUBTASK_ID>'
);
```

### 2. Executar verificações:
```sql
SELECT check_due_soon_tasks();
SELECT check_overdue_tasks();
```

### 3. Ver notificações de um usuário:
```sql
SELECT * FROM notifications
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC;
```

## Permissões (RLS)

As políticas de Row Level Security garantem que:
- Usuários veem apenas suas próprias notificações
- Usuários podem marcar suas notificações como lidas
- Sistema pode criar notificações para qualquer usuário

## Próximas Melhorias

- [ ] Notificações por email
- [ ] Notificações push no navegador
- [ ] Preferências de notificação por usuário
- [ ] Agrupamento de notificações similares
- [ ] Notificações de menção em comentários
- [ ] Notificações de mudanças em projetos favoritos
