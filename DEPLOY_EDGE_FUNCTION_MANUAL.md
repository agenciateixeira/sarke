# 🚀 Deploy Manual da Edge Function (Passo a Passo)

## Acesse o Supabase Dashboard:
https://supabase.com/dashboard/project/hukbilmyblqlomoaiszm/functions

## Passo 1: Criar Nova Function

1. Clique em **"Create a new function"**
2. **Function name:** `notificar-comprovantes`
3. Cole o código de: `supabase/functions/notificar-comprovantes/index.ts`
4. Clique em **"Deploy function"**

## Passo 2: Configurar Secrets (Variáveis de Ambiente)

Na mesma página da function, vá em **"Secrets"** e adicione:

- **RESEND_API_KEY**: `sua-chave-do-resend` (crie em: https://resend.com)

## Passo 3: Testar a Function

1. Clique em **"Invoke"** na página da function
2. Veja os logs para verificar se funcionou

## Passo 4: Agendar Execução Diária (pg_cron)

Vá em **SQL Editor** e execute:

```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar para rodar todo dia às 9h
SELECT cron.schedule(
  'notificar-comprovantes-diario',
  '0 9 * * *',
  $$
    SELECT
      net.http_post(
        url:='https://hukbilmyblqlomoaiszm.supabase.co/functions/v1/notificar-comprovantes',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
      ) as request_id;
  $$
);
```

**Importante:** Substitua `YOUR_SERVICE_ROLE_KEY` pela service role key do projeto.

## Verificar se está agendado:

```sql
SELECT * FROM cron.job;
```

## Pronto! ✅

A function vai rodar todo dia às 9h da manhã e enviar notificações para:
- Usuários com comprovantes pendentes
- Administradores (resumo geral)
