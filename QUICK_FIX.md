# Correção Rápida - Usuário sem Perfil

## Problema

Você criou um usuário no Supabase Auth, mas não tem perfil na tabela `profiles`, causando o erro:
```
Cannot coerce the result to a single JSON object
```

## Solução Rápida

### Opção 1: Via SQL (Mais Rápido)

1. Acesse o **Supabase Dashboard** > **SQL Editor**
2. Execute este comando (substitua o email):

```sql
-- Criar perfil para seu usuário
INSERT INTO profiles (id, email, name, role)
SELECT
  id,
  email,
  split_part(email, '@', 1) as name,
  'admin' as role
FROM auth.users
WHERE email = 'SEU_EMAIL_AQUI@exemplo.com';
```

3. Recarregue a página do sistema
4. Faça login novamente

### Opção 2: Corrigir Todos os Usuários

Execute o script completo `supabase/fix-existing-users.sql`:

1. Acesse **SQL Editor**
2. Copie e cole o conteúdo de `supabase/fix-existing-users.sql`
3. Execute

### Opção 3: Deixar o Sistema Criar (Novo)

O sistema agora cria automaticamente o perfil quando você faz login!

1. Recarregue a página (Ctrl/Cmd + R)
2. Faça login novamente
3. O perfil será criado automaticamente como `colaborador`
4. Para virar admin, execute no SQL:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu@email.com';
```

## Verificar se Funcionou

No SQL Editor, execute:

```sql
SELECT
  u.email,
  u.created_at as "Criado em",
  p.name,
  p.role,
  CASE
    WHEN p.id IS NULL THEN '❌ SEM PERFIL'
    ELSE '✅ OK'
  END as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

Se aparecer "✅ OK", está funcionando!

## Criar Primeiro Admin

Depois de criar o perfil, para se tornar admin:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu@email.com';
```

## Se Ainda Não Funcionar

1. Verifique se executou o `schema-fixed.sql` primeiro
2. Limpe o cache do navegador
3. Faça logout completo e login novamente
4. Verifique os logs no console do navegador (F12)

## Prevenção

O sistema agora cria perfis automaticamente, mas se quiser garantir:

1. **Para novos usuários**: O trigger `on_auth_user_created` cria automaticamente
2. **Para usuários existentes**: Execute `fix-existing-users.sql`
3. **Fallback**: O AuthContext agora cria o perfil se detectar que está faltando
