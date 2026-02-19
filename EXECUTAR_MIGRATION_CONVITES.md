# 🔧 EXECUTAR MIGRATION - Sistema de Convites

## ⚠️ PROBLEMA IDENTIFICADO

O sistema de convites **NÃO ESTÁ FUNCIONANDO** porque:
1. ❌ Tabela `team_invites` não existe no banco de dados
2. ❌ Função `accept_team_invite` não está criada
3. ❌ Políticas de RLS não estão aplicadas
4. ❌ Não há sistema de envio de emails de convite

## ✅ SOLUÇÃO

### PASSO 1: Executar Migration no Supabase

1. Acesse o **Supabase Dashboard**: https://eaphfgwyiaqelppopcrt.supabase.co
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo do arquivo: `supabase/migrations/20260219_team_invites.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)

**OU** copie e execute este comando SQL:

```sql
-- Cole aqui o conteúdo completo do arquivo:
-- supabase/migrations/20260219_team_invites.sql
```

### PASSO 2: Verificar se funcionou

Execute esta query para verificar:

```sql
-- Verificar se a tabela foi criada
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'team_invites';
-- Deve retornar 1

-- Verificar se a função existe
SELECT COUNT(*) FROM pg_proc
WHERE proname = 'accept_team_invite';
-- Deve retornar 1

-- Listar políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'team_invites';
-- Deve retornar 6 políticas
```

### PASSO 3: Testar o sistema de convites

1. Faça login como **admin** ou **gerente**
2. Vá em **Gestão de Equipe**
3. Clique em **Convidar Membro**
4. Preencha os dados e envie
5. Verifique se o convite aparece na lista "Aguardando primeiro acesso"

### PASSO 4: Aceitar o convite (teste)

**Opção A - Via Primeiro Acesso:**
1. Abra uma aba anônima
2. Acesse: `https://seu-dominio.com/primeiro-acesso`
3. Digite o email cadastrado
4. Crie uma senha

**Opção B - Via Token (quando emails estiverem funcionando):**
1. Copie o `invite_token` da tabela team_invites
2. Acesse: `https://seu-dominio.com/convite/[TOKEN]`
3. Crie uma senha

---

## 📧 PRÓXIMO PASSO: Sistema de Emails

Após a migration funcionar, vamos criar uma Edge Function para enviar emails automáticos de convite.

**Benefícios:**
- ✅ Usuário recebe email com link direto
- ✅ Processo mais profissional
- ✅ Não precisa lembrar o email cadastrado

---

## 🆘 Problemas Comuns

### Erro: "relation team_invites does not exist"
**Solução:** A migration não foi executada. Execute o PASSO 1 acima.

### Erro: "function accept_team_invite does not exist"
**Solução:** Execute novamente a migration completa.

### Erro: "permission denied for table team_invites"
**Solução:** As políticas RLS não foram criadas. Execute a migration.

### Convite criado mas não aparece na lista
**Solução:** Verifique se o usuário logado é admin ou gerente (apenas eles veem convites).

---

## 📝 Checklist de Verificação

- [ ] Migration executada com sucesso
- [ ] Tabela `team_invites` criada
- [ ] Função `accept_team_invite` criada
- [ ] 6 políticas RLS aplicadas
- [ ] Convite de teste criado
- [ ] Convite aparece na lista "Aguardando primeiro acesso"
- [ ] Processo de "Primeiro Acesso" funcionando
- [ ] Conta criada com sucesso
