# Configuração do Supabase para Sarke

## 1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Crie uma conta ou faça login
3. Clique em "New Project"
4. Preencha os dados:
   - Nome do projeto: `sarke`
   - Database Password: Crie uma senha forte
   - Region: Escolha a mais próxima (ex: South America - São Paulo)
5. Aguarde a criação do projeto (pode levar alguns minutos)

## 2. Copiar Credenciais

Após a criação do projeto:

1. Vá em **Settings** > **API**
2. Copie as seguintes informações:
   - **Project URL**: Esta é sua `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: Esta é sua `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: Esta é sua `SUPABASE_SERVICE_ROLE_KEY` (use apenas no backend)

3. Cole essas informações no arquivo `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## 3. Executar Schema do Banco de Dados

### Opção 1: Via Dashboard (Recomendado)

1. Acesse o Supabase Dashboard do seu projeto
2. Vá em **SQL Editor**
3. Clique em "New Query"
4. Copie todo o conteúdo do arquivo `supabase/schema.sql`
5. Cole no editor
6. Clique em "Run" ou pressione `Ctrl/Cmd + Enter`
7. Aguarde a execução (deve aparecer "Success")

### Opção 2: Via CLI do Supabase

```bash
# Instalar CLI do Supabase (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Conectar ao projeto
supabase link --project-ref seu-project-ref

# Aplicar migrations
supabase db push
```

## 4. Verificar Tabelas Criadas

1. No Supabase Dashboard, vá em **Table Editor**
2. Você deve ver as seguintes tabelas:
   - `profiles` - Perfis de usuários
   - `tasks` - Tarefas
   - `projects` - Projetos

## 5. Configurar Row Level Security (RLS)

O schema já inclui as políticas de RLS, mas você pode verificar:

1. Vá em **Authentication** > **Policies**
2. Verifique se as políticas foram criadas para cada tabela

## 6. Configurar Autenticação

1. Vá em **Authentication** > **Providers**
2. Certifique-se de que "Email" está habilitado
3. Configure as URLs:
   - **Site URL**: `http://localhost:3000` (desenvolvimento)
   - **Redirect URLs**:
     - `http://localhost:3000/dashboard`
     - `https://seu-dominio.com/dashboard` (produção)

## 7. Testar Conexão

Execute o projeto e tente criar um usuário:

```bash
npm run dev
```

Acesse `http://localhost:3000/primeiro-acesso` e crie uma conta de teste.

## 8. Criar Primeiro Usuário Admin (Opcional)

Se quiser criar um admin manualmente:

1. Vá em **Authentication** > **Users**
2. Clique em "Add user"
3. Preencha email e senha temporária
4. Após criar, vá em **Table Editor** > **profiles**
5. Encontre o usuário criado
6. Edite o campo `role` para `admin`

## Troubleshooting

### Erro: "Missing Supabase environment variables"
- Verifique se o arquivo `.env` está na raiz do projeto
- Confirme que as variáveis começam com `NEXT_PUBLIC_`
- Reinicie o servidor de desenvolvimento

### Erro ao criar usuário
- Verifique se o schema foi executado corretamente
- Confirme que a trigger `on_auth_user_created` foi criada
- Verifique os logs no Supabase Dashboard

### RLS bloqueando operações
- Verifique se as políticas foram criadas corretamente
- Confirme que o usuário está autenticado
- Teste desabilitar RLS temporariamente para debug (não recomendado em produção)

## Comandos Úteis

```sql
-- Ver todos os usuários
SELECT * FROM auth.users;

-- Ver todos os perfis
SELECT * FROM profiles;

-- Atualizar role de um usuário
UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';

-- Ver políticas RLS
SELECT * FROM pg_policies;
```
