# Correção do Erro de Recursão Infinita no Supabase

## Problema

O erro "infinite recursion detected in policy for relation 'profiles'" ocorre porque as políticas RLS estão fazendo consultas circulares.

## Solução

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - Vá para https://supabase.com/dashboard
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New Query"

3. **Execute o Script Corrigido**
   - Copie TODO o conteúdo do arquivo `supabase/schema-fixed.sql`
   - Cole no editor
   - Clique em "Run" ou pressione `Ctrl/Cmd + Enter`
   - Aguarde a execução

4. **Verifique se funcionou**
   - Vá em "Table Editor"
   - Você deve ver as tabelas: `profiles`, `tasks`, `projects`
   - Vá em "Authentication" > "Policies"
   - Verifique se as novas políticas foram criadas

### Opção 2: Via CLI do Supabase

```bash
# Se você tem o CLI instalado
supabase db push --file supabase/schema-fixed.sql
```

## O que foi corrigido?

### Problema Original

As políticas antigas tinham recursão:

```sql
-- ERRADO: Esta política causa recursão infinita
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles  -- RECURSÃO: consulta a própria tabela!
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Solução

Criamos uma função auxiliar que quebra a recursão:

```sql
-- CORRETO: Função auxiliar sem recursão
CREATE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agora a política usa a função
CREATE POLICY "Enable all for admins"
  ON profiles FOR ALL
  USING (is_admin());
```

## Após Executar o Script

1. **Recarregue a página do navegador** (http://localhost:3001)
2. O erro deve desaparecer
3. Você pode criar uma conta em `/primeiro-acesso`

## Criar Primeiro Admin

Após criar sua primeira conta, transforme-a em admin:

### Via Dashboard

1. Vá em **Table Editor** > **profiles**
2. Encontre seu usuário (pelo email)
3. Clique para editar
4. Mude o campo `role` de `colaborador` para `admin`
5. Salve

### Via SQL

```sql
-- Substitua 'seu@email.com' pelo seu email
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu@email.com';
```

## Testar

1. Faça logout se estiver logado
2. Faça login novamente
3. Você deve ter acesso total ao sistema como admin

## Se o erro persistir

1. **Limpe o cache do navegador**
   - Chrome: Ctrl/Cmd + Shift + Delete
   - Limpe "Cookies e dados do site"

2. **Verifique as credenciais do Supabase**
   - Confirme que o arquivo `.env` tem as credenciais corretas
   - Confirme que as credenciais são do projeto que você está editando

3. **Verifique se o RLS está ativo**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

   Todas as tabelas devem ter `rowsecurity = true`

4. **Verifique as políticas**
   ```sql
   SELECT * FROM pg_policies
   WHERE schemaname = 'public';
   ```

## Suporte

Se o erro continuar:
1. Copie a mensagem de erro completa
2. Verifique os logs do Supabase (Dashboard > Logs)
3. Entre em contato com o suporte do Supabase
