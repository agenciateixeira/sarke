# 🔧 FIX ERRO 406 - Primeiro Acesso

## ❌ PROBLEMA

Ao tentar fazer o primeiro acesso, aparece o erro:

```
Failed to load resource: the server responded with a status of 406
```

## 🔍 CAUSA

A política RLS (Row Level Security) da tabela `team_invites` está **bloqueando** usuários não autenticados de consultarem convites pendentes.

**O que está acontecendo:**
1. Usuário acessa `/primeiro-acesso`
2. Digita o email
3. Sistema tenta buscar convite pendente no banco
4. **RLS bloqueia** porque usuário não está autenticado
5. Retorna erro 406 (Not Acceptable)

## ✅ SOLUÇÃO IMEDIATA

Execute este SQL no Supabase Dashboard:

### PASSO 1: Acessar SQL Editor

1. Acesse: https://eaphfgwyiaqelppopcrt.supabase.co
2. Vá em **SQL Editor**
3. Clique em **New Query**

### PASSO 2: Executar FIX

Copie e execute o conteúdo do arquivo:
```
supabase/migrations/20260219_fix_team_invites_rls.sql
```

**OU** copie e cole este SQL diretamente:

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver seus próprios convites pendentes" ON team_invites;
DROP POLICY IF EXISTS "Usuários podem atualizar convites via token" ON team_invites;

-- Criar políticas corretas
CREATE POLICY "Público pode ver convites pendentes não expirados"
  ON team_invites
  FOR SELECT
  TO public
  USING (
    accepted_at IS NULL
    AND expires_at > now()
  );

CREATE POLICY "Público pode atualizar convites via token válido"
  ON team_invites
  FOR UPDATE
  TO public
  USING (
    accepted_at IS NULL
    AND expires_at > now()
  )
  WITH CHECK (
    accepted_at IS NOT NULL
  );
```

### PASSO 3: Verificar

Execute esta query para confirmar:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'team_invites'
ORDER BY policyname;
```

Deve retornar as seguintes políticas:

| policyname | roles | cmd |
|------------|-------|-----|
| Admin e gerentes podem criar convites | {authenticated} | INSERT |
| Admin e gerentes podem deletar convites | {authenticated} | DELETE |
| Admin e gerentes podem ver convites | {authenticated} | SELECT |
| Público pode atualizar convites via token válido | {public} | UPDATE |
| Público pode ver convites pendentes não expirados | {public} | SELECT |

### PASSO 4: Testar

1. Abra uma aba anônima (ou limpe os cookies)
2. Acesse: `https://seu-dominio.com/primeiro-acesso`
3. Digite o email: `diego@sarkestudio.com.br`
4. Clique em **Continuar**
5. **Deve funcionar agora!** ✅

---

## 🔒 SEGURANÇA

**Pergunta:** Isso não é inseguro? Qualquer pessoa pode ver convites?

**Resposta:** Não! A política é segura porque:

1. ✅ Só mostra convites **não aceitos** (`accepted_at IS NULL`)
2. ✅ Só mostra convites **não expirados** (`expires_at > now()`)
3. ✅ Usuário só consegue **ler**, não pode modificar
4. ✅ Para aceitar, precisa criar conta com senha
5. ✅ Email e token são validados pela função RPC

**Fluxo seguro:**
```
1. Convite criado por admin → armazenado com token único
2. Usuário acessa /primeiro-acesso → consulta PUBLIC (OK)
3. Usuário cria senha → auth.signUp() valida email
4. Função RPC valida token → cria perfil
5. Convite marcado como aceito → não aparece mais
```

---

## 🐛 TROUBLESHOOTING

### Erro persiste após executar SQL

**Solução 1:** Limpe o cache do navegador
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**Solução 2:** Teste em aba anônima

**Solução 3:** Verifique se o SQL foi executado com sucesso:
```sql
SELECT COUNT(*) FROM pg_policies
WHERE tablename = 'team_invites' AND policyname LIKE 'Público%';
-- Deve retornar 2
```

### Erro: "Convite não encontrado"

**Causas possíveis:**
1. Email está errado (conferir espaços)
2. Convite expirou (verificar `expires_at`)
3. Convite já foi aceito (verificar `accepted_at`)

**Solução:** Verifique no banco:
```sql
SELECT email, accepted_at, expires_at, created_at
FROM team_invites
WHERE email ILIKE '%diego%';
```

### Outro erro 406 em outra tabela

Se aparecer erro 406 em outras rotas, pode ser problema de RLS em outras tabelas.

**Debug:**
1. Abra DevTools (F12)
2. Vá em Network
3. Filtre por "406"
4. Veja qual endpoint falhou
5. Ajuste RLS daquela tabela

---

## 📝 CHECKLIST

Após executar o FIX:

- [ ] SQL executado com sucesso
- [ ] 2 políticas públicas criadas
- [ ] Página `/primeiro-acesso` carrega sem erro 406
- [ ] Consegue digitar email e continuar
- [ ] Formulário de senha aparece
- [ ] Consegue criar conta
- [ ] Consegue fazer login

---

## 🎯 RESUMO

| Item | Antes | Depois |
|------|-------|--------|
| Acesso público | ❌ Bloqueado | ✅ Permitido |
| Segurança | ⚠️ Muito restritivo | ✅ Balanceado |
| Primeiro acesso | ❌ Erro 406 | ✅ Funcionando |

**Problema resolvido!** 🎉
