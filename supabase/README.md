# 🗄️ Scripts SQL do Sarke

Execute estes scripts no **Supabase Dashboard → SQL Editor** na ordem indicada.

## 📋 Ordem de Execução

### ✅ Scripts Já Executados (você confirmou):
1. ✅ `chat-schema.sql` - Tabelas de chat (mensagens, grupos, etc)
2. ✅ `chat-storage.sql` - Bucket de mídia para chat

### ⏳ Scripts Pendentes:

#### 3. **team-invites.sql** ⚠️ **EXECUTE ESTE AGORA**

**O que faz:**
- Cria tabela `team_invites` para convites de equipe
- Cria função `accept_team_invite()` para aceitar convites
- Cria função `cleanup_expired_invites()` para limpar convites expirados
- Configura RLS (Row Level Security) para segurança

**Quando executar:**
- AGORA! Sem isso, o sistema de convites não funciona

**Como executar:**
1. Abra Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole TODO o conteúdo do arquivo `team-invites.sql`
5. Clique em **Run** (ou F5)
6. Aguarde a mensagem de sucesso

---

## 🚨 Erros Comuns

### "relation 'team_invites' does not exist"
**Solução:** Execute o `team-invites.sql`

### "function accept_team_invite() does not exist"
**Solução:** Execute o `team-invites.sql` completo

---

## 🎯 Depois de Executar

Teste o sistema:

1. **Criar Convite:**
   /dashboard/equipe → Convidar Membro

2. **Aceitar Convite:**
   Abra o link do convite em aba anônima

3. **Testar Chat:**
   /dashboard/chat → + → Nova Conversa
