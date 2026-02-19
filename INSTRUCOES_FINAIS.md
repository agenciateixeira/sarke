# ⚡ INSTRUÇÕES FINAIS - Sistema de Convites

## 🎯 O QUE FAZER AGORA (PASSO A PASSO)

### 1️⃣ EXECUTAR SQL NO SUPABASE (5 minutos)

1. Acesse: **https://eaphfgwyiaqelppopcrt.supabase.co**
2. Faça login
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Abra o arquivo: **`EXECUTAR_AGORA_COMPLETO.sql`**
6. **Copie TUDO** (Ctrl+A, Ctrl+C)
7. **Cole** no SQL Editor (Ctrl+V)
8. Clique em **RUN** (ou Ctrl+Enter)
9. Aguarde a mensagem: ✅ **"Instalação concluída com sucesso!"**

---

### 2️⃣ TESTAR SISTEMA DE CONVITES (10 minutos)

#### A. Criar um convite de teste:

1. Faça login no sistema como **admin** ou **gerente**
2. Vá em **Dashboard → Gestão de Equipe**
3. Clique em **"Convidar Membro"**
4. Preencha:
   - Nome: `Diego Teste`
   - Email: `diego@sarkestudio.com.br`
   - Nível: `Colaborador`
   - Cargo: `Desenvolvedor` (opcional)
5. Clique em **"Convidar Membro"**

**Esperado:**
- ✅ Mensagem de sucesso
- ✅ Convite aparece em **"Aguardando primeiro acesso (1)"**
- ✅ Card do Diego com status "Pendente"

#### B. Aceitar o convite (Primeiro Acesso):

1. **Abra uma aba anônima** (Ctrl+Shift+N)
2. Acesse: `https://seu-dominio.com/primeiro-acesso`
3. Digite o email: `diego@sarkestudio.com.br`
4. Clique em **"Continuar"**
5. **Não deve dar erro 406 agora!**
6. Crie uma senha: `123456` (ou outra)
7. Confirme a senha
8. Clique em **"Criar Conta"**
9. Aguarde redirecionamento para `/login`
10. Faça login com `diego@sarkestudio.com.br` e a senha criada

**Esperado:**
- ✅ Login funciona
- ✅ Diego acessa o dashboard
- ✅ Na Gestão de Equipe, Diego sai de "Pendente" e vira membro ativo

---

### 3️⃣ VERIFICAR SE ESTÁ TUDO OK

Execute estas queries no SQL Editor:

```sql
-- Ver todos os convites
SELECT email, name, role, accepted_at, expires_at
FROM team_invites
ORDER BY created_at DESC;

-- Ver políticas RLS
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'team_invites'
ORDER BY policyname;
-- Deve retornar 5 políticas

-- Ver membros ativos
SELECT email, name, role
FROM profiles
ORDER BY created_at DESC;
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Marque conforme for testando:

### Banco de Dados
- [ ] SQL executado sem erros
- [ ] Tabela `team_invites` existe
- [ ] 5 políticas RLS criadas
- [ ] Função `accept_team_invite` existe

### Fluxo de Convite
- [ ] Admin consegue criar convite
- [ ] Convite aparece em "Aguardando primeiro acesso"
- [ ] Card mostra nome, email e cargo corretos

### Primeiro Acesso
- [ ] Página `/primeiro-acesso` carrega
- [ ] Consegue digitar email e continuar
- [ ] **NÃO dá erro 406**
- [ ] Formulário de senha aparece
- [ ] Consegue criar conta
- [ ] É redirecionado para login
- [ ] Login funciona

### Gestão de Equipe
- [ ] Convite aceito sai de "Pendente"
- [ ] Membro aparece como ativo
- [ ] Pode editar membro
- [ ] Pode remover membro

---

## 🐛 SE ALGO DER ERRADO

### Erro 406 ainda persiste
1. Limpe cache do navegador (Ctrl+Shift+Delete)
2. Teste em aba anônima
3. Verifique no SQL Editor:
   ```sql
   SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'team_invites' AND roles @> ARRAY['public'];
   -- Deve retornar 2
   ```

### Convite não aparece na lista
1. Verifique se você está logado como admin/gerente
2. Atualize a página (F5)
3. Verifique no banco:
   ```sql
   SELECT * FROM team_invites WHERE accepted_at IS NULL;
   ```

### "Convite não encontrado" no primeiro acesso
1. Confira se digitou o email correto
2. Verifique se o convite existe:
   ```sql
   SELECT email, expires_at FROM team_invites
   WHERE email = 'diego@sarkestudio.com.br';
   ```
3. Se expirou, delete e crie novo:
   ```sql
   DELETE FROM team_invites WHERE email = 'diego@sarkestudio.com.br';
   ```

---

## 📧 PRÓXIMO PASSO: Emails Automáticos (OPCIONAL)

Após o sistema básico funcionar, você pode:

1. Criar conta no Resend (https://resend.com)
2. Obter API Key
3. Deploy da Edge Function:
   ```bash
   supabase functions deploy enviar-convite-equipe
   ```
4. Configurar variáveis de ambiente

**Com emails:**
- ✅ Convite criado → email enviado automaticamente
- ✅ Usuário clica no link do email
- ✅ Já vai direto para criar senha
- ✅ Processo 100% automático

---

## 📊 RESUMO DA SOLUÇÃO

| Problema Original | Solução Aplicada |
|-------------------|------------------|
| ❌ Tabela não existe | ✅ `EXECUTAR_AGORA_COMPLETO.sql` cria tudo |
| ❌ Erro 406 | ✅ Políticas RLS públicas adicionadas |
| ❌ Função RPC não existe | ✅ `accept_team_invite` criada |
| ❌ Convites não aparecem | ✅ Políticas para admin/gerente |
| ❌ Sem emails | ✅ Edge Function criada (deploy opcional) |

---

## 🎉 RESULTADO FINAL

Após executar tudo:

1. **Admin cria convite** → Sistema salva no banco
2. **Convite aparece** → Na lista "Aguardando primeiro acesso"
3. **Usuário acessa** → `/primeiro-acesso`
4. **Digita email** → Sistema encontra convite (sem erro 406!)
5. **Cria senha** → Conta criada via Supabase Auth
6. **Faz login** → Acessa o sistema
7. **Convite aceito** → Sai da lista de pendentes

**Sistema 100% funcional!** 🚀

---

## 📞 SUPORTE

Se após seguir todos os passos ainda houver problemas:

1. Verifique os logs do navegador (F12 → Console)
2. Execute as queries de verificação acima
3. Confira se está usando conta admin/gerente
4. Teste sempre em aba anônima

**Boa sorte!** 🍀
