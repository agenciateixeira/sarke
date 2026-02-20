# Configuração do Cron para Notificações Diárias

## Como configurar no Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/eaphfgwyiaqelppopcrt/functions
2. Clique em "Deploy new function"
3. Selecione "daily-notifications"
4. Após deploy, vá em "Settings" > "Cron Jobs"
5. Clique em "Create a new cron job"

## Configuração do Cron:

- **Nome**: Daily Task Notifications
- **Schedule**: `0 9 * * *` (Todo dia às 9h da manhã)
- **Endpoint**: `https://eaphfgwyiaqelppopcrt.supabase.co/functions/v1/daily-notifications`
- **Method**: POST
- **Headers**:
  - `Authorization: Bearer <SERVICE_ROLE_KEY>`

## Alternativa - Usar pg_cron diretamente no banco:

```sql
-- Executar no SQL Editor do Supabase

-- Habilitar extensão pg_cron (se ainda não habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar job para executar diariamente às 9h
SELECT cron.schedule(
  'daily-task-notifications-due-soon',
  '0 9 * * *',
  $$SELECT check_due_soon_tasks();$$
);

SELECT cron.schedule(
  'daily-task-notifications-overdue',
  '0 9 * * *',
  $$SELECT check_overdue_tasks();$$
);

-- Ver jobs agendados
SELECT * FROM cron.job;

-- Desagendar se necessário
-- SELECT cron.unschedule('daily-task-notifications-due-soon');
-- SELECT cron.unschedule('daily-task-notifications-overdue');
```

## Teste Manual:

Para testar manualmente, execute no SQL Editor:

```sql
SELECT check_due_soon_tasks();
SELECT check_overdue_tasks();
```

Ou via API:

```bash
curl -X POST 'https://eaphfgwyiaqelppopcrt.supabase.co/functions/v1/daily-notifications' \
  -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json'
```
