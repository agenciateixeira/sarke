# Edge Function: Enviar Convite de Equipe

## 📧 Descrição

Esta Edge Function envia emails de convite para novos membros da equipe através do Resend.

## 🚀 Deploy

### 1. Instalar Supabase CLI (se ainda não tiver)

```bash
brew install supabase/tap/supabase
```

### 2. Fazer login no Supabase

```bash
supabase login
```

### 3. Linkar com seu projeto

```bash
supabase link --project-ref eaphfgwyiaqelppopcrt
```

### 4. Configurar variáveis de ambiente

No Supabase Dashboard (https://eaphfgwyiaqelppopcrt.supabase.co):

1. Vá em **Edge Functions**
2. Clique em **Manage secrets**
3. Adicione as seguintes variáveis:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
APP_URL=https://seu-dominio.com.br
```

**Como obter RESEND_API_KEY:**
1. Crie uma conta em https://resend.com
2. Vá em **API Keys**
3. Crie uma nova chave
4. Copie e cole no Supabase

### 5. Deploy da função

```bash
supabase functions deploy enviar-convite-equipe
```

## 📝 Como usar

A função é chamada automaticamente quando um convite é criado através do hook `useTeam.ts`.

### Manualmente via API:

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/enviar-convite-equipe`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
  },
  body: JSON.stringify({
    inviteId: 'uuid-do-convite'
  }),
})
```

## 🎨 Template do Email

O email inclui:
- ✅ Header bonito com gradiente
- ✅ Dados do convite (cargo, departamento, etc)
- ✅ Botão de CTA para aceitar convite
- ✅ Link alternativo para Primeiro Acesso
- ✅ Instruções claras
- ✅ Data de expiração
- ✅ Design responsivo

## 🔒 Segurança

- ✅ Verifica se o convite existe
- ✅ Verifica se o convite não expirou
- ✅ Usa Service Role Key para consultas
- ✅ Requer autenticação para chamar a função

## 🐛 Troubleshooting

### Erro: "RESEND_API_KEY not found"
**Solução:** Configure a variável de ambiente no Supabase Dashboard

### Erro: "Failed to send email"
**Solução:** Verifique se a API key do Resend está correta e ativa

### Email não chega
**Soluções:**
1. Verifique spam/lixo eletrônico
2. Confirme que o domínio remetente está verificado no Resend
3. Veja os logs da função: `supabase functions logs enviar-convite-equipe`

## 📊 Logs

Para ver os logs da função:

```bash
supabase functions logs enviar-convite-equipe --tail
```

## 🔄 Atualizar função

Após fazer alterações no código:

```bash
supabase functions deploy enviar-convite-equipe
```
