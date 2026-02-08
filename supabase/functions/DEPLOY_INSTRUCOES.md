# 🚀 Instruções para Deploy da Edge Function

## Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse:** https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/functions

2. **Clique em "Create a new function"**

3. **Configurar:**
   - **Name:** `notificar-comprovantes`
   - **Código:** Copie todo o conteúdo de `supabase/functions/notificar-comprovantes/index.ts`

4. **Variáveis de Ambiente (Secrets):**
   - `RESEND_API_KEY` - Sua chave API do Resend (para envio de emails)
   - As outras variáveis (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) já estão disponíveis automaticamente

5. **Deploy:** Clique em "Deploy"

---

## Opção 2: Via CLI (se tiver permissões)

```bash
# 1. Login no Supabase
supabase login

# 2. Deploy da função
supabase functions deploy notificar-comprovantes --project-ref hukbilmyblqlomoaiszm

# 3. Configurar secrets
supabase secrets set RESEND_API_KEY=your_resend_api_key --project-ref hukbilmyblqlomoaiszm
```

---

## Configurar Execução Automática (Cronjob)

### Opção A: pg_cron (Recomendado - Mais simples)

Execute no SQL Editor do Supabase:

```sql
-- 1. Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Agendar execução diária às 9h da manhã
SELECT cron.schedule(
  'notificar-comprovantes-diario',
  '0 9 * * *',
  $$
    SELECT
      net.http_post(
        url:='https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/notificar-comprovantes',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
      ) as request_id;
  $$
);

-- 3. Verificar cronjobs agendados
SELECT * FROM cron.job;
```

### Opção B: GitHub Actions

Criar arquivo `.github/workflows/notificar-comprovantes.yml`:

```yaml
name: Notificar Comprovantes Pendentes

on:
  schedule:
    - cron: '0 9 * * *'  # Todo dia às 9h UTC (6h Brasília)
  workflow_dispatch:  # Permite executar manualmente

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Chamar Edge Function
        run: |
          curl -X POST \
            'https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/notificar-comprovantes' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}' \
            -H 'Content-Type: application/json'
```

### Opção C: Vercel Cron Jobs

Se estiver usando Vercel, criar arquivo `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/notificar-comprovantes",
    "schedule": "0 9 * * *"
  }]
}
```

E criar endpoint em `/pages/api/notificar-comprovantes.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validar que é o cronjob do Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(
      'https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/notificar-comprovantes',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

---

## Testar a Edge Function

### Via cURL:

```bash
curl -X POST \
  'https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/notificar-comprovantes' \
  -H 'Authorization: Bearer SEU_SUPABASE_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

### Via Supabase Dashboard:

1. Acesse: Functions > notificar-comprovantes
2. Clique em "Invoke"
3. Veja os logs em tempo real

---

## Configurar Resend (para emails)

1. **Criar conta:** https://resend.com
2. **Criar API Key**
3. **Verificar domínio** (opcional, para enviar de seu próprio domínio)
4. **Adicionar secret:**
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref hukbilmyblqlomoaiszm
   ```

**Alternativas ao Resend:**
- SendGrid
- Mailgun
- Amazon SES
- SMTP direto

---

## Monitoramento

### Ver logs da Edge Function:

```bash
supabase functions logs notificar-comprovantes --project-ref hukbilmyblqlomoaiszm
```

### Ou no Dashboard:
Functions > notificar-comprovantes > Logs

---

## Verificar Notificações Enviadas

```sql
-- Ver últimas notificações
SELECT * FROM obra_caixa_notificacoes_log
ORDER BY created_at DESC
LIMIT 50;

-- Ver notificações pendentes de envio
SELECT * FROM obra_caixa_notificacoes_log
WHERE enviada = FALSE;

-- Ver resumo de pendências
SELECT * FROM obra_comprovantes_pendentes_resumo;
```

---

## Troubleshooting

### Erro: "Docker is not running"
- Para deploy local, instale e inicie o Docker
- Ou use o Supabase Dashboard para deploy manual

### Erro: "403 Forbidden"
- Verifique se está logado: `supabase login`
- Ou use o Dashboard

### Emails não estão sendo enviados:
1. Verifique se RESEND_API_KEY está configurada
2. Verifique os logs da Edge Function
3. Verifique a tabela `obra_caixa_notificacoes_log` para erros

### Cronjob não está executando:
1. Verifique se a extensão pg_cron está instalada
2. Verifique se o agendamento foi criado: `SELECT * FROM cron.job`
3. Verifique os logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10`
