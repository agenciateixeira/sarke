# 🎯 SOLUÇÃO COMPLETA - Sistema de Convites

## ⚠️ PROBLEMAS IDENTIFICADOS

Analisei todo o sistema de convites e encontrei **4 problemas críticos**:

### 1. ❌ Tabela `team_invites` não existe no banco
- **Sintoma:** Erro ao criar convites
- **Causa:** Migration SQL não foi executada
- **Impacto:** Sistema não funciona

### 2. ❌ Função `accept_team_invite` não criada
- **Sintoma:** Erro ao aceitar convite via "Primeiro Acesso"
- **Causa:** Função RPC não existe no banco
- **Impacto:** Usuários não conseguem criar conta

### 3. ❌ Políticas RLS não aplicadas
- **Sintoma:** Permissões negadas
- **Causa:** Row Level Security não configurado
- **Impacto:** Admins não veem convites, usuários não aceitam

### 4. ❌ Emails de convite não são enviados
- **Sintoma:** Convite criado mas usuário não recebe email
- **Causa:** Edge Function não existe
- **Impacto:** Processo manual e desorganizado

---

## ✅ SOLUÇÃO PASSO A PASSO

### PASSO 1: Executar Migration no Banco de Dados

#### Opção A - Via Supabase Dashboard (RECOMENDADO)

1. Acesse: https://eaphfgwyiaqelppopcrt.supabase.co
2. Faça login
3. Vá em **SQL Editor**
4. Clique em **New Query**
5. Abra o arquivo: `supabase/migrations/20260219_team_invites.sql`
6. Copie TODO o conteúdo
7. Cole no SQL Editor
8. Clique em **Run** (ou Ctrl+Enter)
9. Aguarde a mensagem de sucesso

#### Opção B - Via CLI (requer configuração)

```bash
supabase db push
```

### PASSO 2: Verificar se funcionou

Execute estas queries no SQL Editor:

```sql
-- 1. Verificar se tabela existe
SELECT COUNT(*) FROM team_invites;
-- Deve retornar 0 (tabela vazia mas existente)

-- 2. Verificar função RPC
SELECT proname FROM pg_proc WHERE proname = 'accept_team_invite';
-- Deve retornar 'accept_team_invite'

-- 3. Verificar políticas RLS
SELECT policyname FROM pg_policies WHERE tablename = 'team_invites';
-- Deve retornar 6 políticas
```

✅ **Se tudo retornar corretamente, a migration foi aplicada com sucesso!**

---

### PASSO 3: Testar Sistema de Convites (SEM email por enquanto)

1. **Faça login como Admin ou Gerente**
2. Vá em **Dashboard → Gestão de Equipe**
3. Clique em **"Convidar Membro"**
4. Preencha os dados:
   - Nome: João Silva
   - Email: joao@teste.com
   - Nível: Colaborador
   - Cargo: Desenvolvedor
5. Clique em **"Convidar Membro"**
6. Verifique se aparece em **"Aguardando primeiro acesso"**

#### Aceitar o convite (teste):

**Opção A - Via Primeiro Acesso (mais comum):**
1. Abra uma aba anônima
2. Acesse: `https://seu-dominio.com/primeiro-acesso`
3. Digite: `joao@teste.com`
4. Clique em Continuar
5. Crie uma senha
6. Confirme a senha
7. Clique em "Criar Conta"
8. Faça login com as credenciais

**Opção B - Via Link Direto (quando emails funcionarem):**
1. No SQL Editor, execute:
   ```sql
   SELECT invite_token FROM team_invites WHERE email = 'joao@teste.com';
   ```
2. Copie o token
3. Acesse: `https://seu-dominio.com/convite/[TOKEN]`
4. Siga os passos para criar senha

✅ **Se conseguir criar a conta e fazer login, o sistema base está funcionando!**

---

### PASSO 4: Configurar Envio de Emails (OPCIONAL mas RECOMENDADO)

#### 4.1 - Criar conta no Resend

1. Acesse: https://resend.com
2. Crie uma conta gratuita
3. Verifique seu email
4. Vá em **API Keys**
5. Clique em **Create API Key**
6. Nome: "Sarke Production"
7. Copie a chave (começa com `re_`)

#### 4.2 - Configurar domínio (IMPORTANTE)

**Opção A - Usar domínio próprio (recomendado):**
1. No Resend, vá em **Domains**
2. Clique em **Add Domain**
3. Digite: `sarke.com.br` (ou seu domínio)
4. Adicione os registros DNS mostrados
5. Aguarde verificação

**Opção B - Usar domínio do Resend (teste):**
- Por enquanto, pode usar o domínio padrão
- Limite: 100 emails/dia

#### 4.3 - Deploy da Edge Function

```bash
# 1. Instalar Supabase CLI (se não tiver)
brew install supabase/tap/supabase

# 2. Fazer login
supabase login

# 3. Linkar projeto
supabase link --project-ref eaphfgwyiaqelppopcrt

# 4. Deploy
supabase functions deploy enviar-convite-equipe
```

#### 4.4 - Configurar variáveis de ambiente

No Supabase Dashboard:
1. Vá em **Edge Functions**
2. Clique em **enviar-convite-equipe**
3. Vá em **Settings**
4. Adicione as variáveis:

```env
RESEND_API_KEY=re_suachaveaqui
APP_URL=https://seu-dominio.com.br
```

5. Clique em **Save**

#### 4.5 - Testar envio de email

1. Crie um novo convite
2. Verifique se o email chegou (confira spam)
3. Clique no link do email
4. Aceite o convite

✅ **Se o email chegar, o sistema está 100% funcional!**

---

## 📊 VERIFICAÇÃO FINAL

Use este checklist para confirmar que tudo está funcionando:

### Banco de Dados
- [ ] Tabela `team_invites` criada
- [ ] Função `accept_team_invite` existe
- [ ] 6 políticas RLS aplicadas

### Fluxo de Convites
- [ ] Admin/Gerente consegue criar convites
- [ ] Convite aparece em "Aguardando primeiro acesso"
- [ ] Usuário consegue aceitar via "Primeiro Acesso"
- [ ] Conta é criada com sucesso
- [ ] Login funciona após criar conta

### Sistema de Emails (opcional)
- [ ] Conta Resend criada
- [ ] API Key configurada
- [ ] Edge Function deployada
- [ ] Variáveis de ambiente configuradas
- [ ] Email de convite recebido
- [ ] Link do email funciona

---

## 🐛 RESOLUÇÃO DE PROBLEMAS

### Erro: "relation team_invites does not exist"
❌ **Problema:** Migration não foi executada
✅ **Solução:** Execute o PASSO 1 acima

### Erro: "function accept_team_invite does not exist"
❌ **Problema:** Função RPC não foi criada
✅ **Solução:** Execute novamente a migration completa (PASSO 1)

### Erro: "permission denied for table team_invites"
❌ **Problema:** Políticas RLS não aplicadas
✅ **Solução:** Execute a migration completa (PASSO 1)

### Convite criado mas não aparece na lista
❌ **Problema:** Usuário não é admin/gerente
✅ **Solução:** Apenas admin e gerente veem convites pendentes

### Email não está sendo enviado
❌ **Possíveis causas:**
- Edge Function não deployada
- API Key do Resend inválida
- Variáveis de ambiente não configuradas

✅ **Soluções:**
1. Confira os logs: `supabase functions logs enviar-convite-equipe`
2. Verifique variáveis de ambiente no Supabase Dashboard
3. Teste a API Key do Resend diretamente
4. Por enquanto, use "Primeiro Acesso" manualmente

### Email vai para spam
✅ **Soluções:**
1. Configure SPF, DKIM e DMARC no domínio
2. Use domínio próprio verificado
3. Instrua usuários a verificarem spam na primeira vez

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Novos arquivos:
- ✅ `supabase/migrations/20260219_team_invites.sql` - Migration do banco
- ✅ `supabase/functions/enviar-convite-equipe/index.ts` - Edge Function
- ✅ `supabase/functions/enviar-convite-equipe/README.md` - Docs da função
- ✅ `EXECUTAR_MIGRATION_CONVITES.md` - Guia rápido
- ✅ `SOLUCAO_CONVITES_COMPLETA.md` - Este arquivo

### Arquivos modificados:
- ✅ `hooks/useTeam.ts` - Adicionada chamada para enviar email

---

## 🎯 PRÓXIMOS PASSOS

Após tudo funcionando:

1. **Monitorar logs** para identificar problemas
2. **Configurar domínio próprio** no Resend para evitar spam
3. **Criar cron job** para limpar convites expirados:
   ```sql
   SELECT cleanup_expired_invites();
   ```
4. **Adicionar analytics** para acompanhar taxa de aceitação
5. **Criar página de reenvio** de convite expirado

---

## 💡 MELHORIAS FUTURAS

- [ ] Permitir reenviar convite expirado
- [ ] Adicionar preview do email antes de enviar
- [ ] Criar template customizável de email
- [ ] Adicionar notificação quando convite é aceito
- [ ] Dashboard de analytics de convites
- [ ] Integração com WhatsApp para avisar sobre convite

---

## 📞 SUPORTE

Se após seguir todos os passos ainda houver problemas:

1. Verifique os logs do Supabase
2. Execute as queries de verificação
3. Confira se usuário tem permissões corretas
4. Teste em uma aba anônima

**Tudo pronto! 🚀**
