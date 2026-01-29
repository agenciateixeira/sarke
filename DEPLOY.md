# Deploy do Sistema Sarke

## Opções de Deploy

### 1. Vercel (Recomendado)

A Vercel é a plataforma recomendada para deploy de aplicações Next.js.

#### Passos:

1. **Criar conta na Vercel**
   - Acesse https://vercel.com
   - Faça login com sua conta GitHub

2. **Importar Projeto**
   - Clique em "Add New..." > "Project"
   - Selecione o repositório `agenciateixeira/sarke`
   - Clique em "Import"

3. **Configurar Variáveis de Ambiente**
   - Na seção "Environment Variables", adicione:
     ```
     NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
     SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
     ```

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build (2-3 minutos)
   - Acesse a URL fornecida

5. **Configurar Domínio (Opcional)**
   - Vá em Settings > Domains
   - Adicione seu domínio customizado

#### Deploy Automático

Após configurado, cada push para a branch `main` fará deploy automático.

### 2. Netlify

1. Acesse https://netlify.com
2. "Add new site" > "Import an existing project"
3. Conecte ao GitHub e selecione o repositório
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Adicione as variáveis de ambiente
6. Deploy

### 3. Railway

1. Acesse https://railway.app
2. "New Project" > "Deploy from GitHub repo"
3. Selecione o repositório
4. Railway detectará automaticamente que é Next.js
5. Adicione as variáveis de ambiente
6. Deploy

### 4. AWS / DigitalOcean / VPS

Para servidores próprios:

```bash
# 1. Clonar repositório
git clone https://github.com/agenciateixeira/sarke.git
cd sarke

# 2. Instalar dependências
npm install

# 3. Criar arquivo .env com suas credenciais
nano .env

# 4. Build para produção
npm run build

# 5. Iniciar servidor (com PM2)
npm install -g pm2
pm2 start npm --name "sarke" -- start

# 6. Configurar Nginx como proxy reverso
# Exemplo de configuração Nginx:
# server {
#     listen 80;
#     server_name seu-dominio.com;
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
```

## Configuração Pós-Deploy

### 1. Atualizar URLs no Supabase

No Supabase Dashboard:
1. Vá em **Authentication** > **URL Configuration**
2. Atualize:
   - **Site URL**: `https://seu-dominio.com`
   - **Redirect URLs**:
     - `https://seu-dominio.com/dashboard`
     - `https://seu-dominio.com/login`

### 2. Testar Autenticação

1. Acesse seu domínio
2. Crie uma conta em `/primeiro-acesso`
3. Faça login
4. Verifique se o redirecionamento funciona

### 3. Criar Primeiro Admin

Via Supabase Dashboard:
1. Vá em **Table Editor** > **profiles**
2. Encontre o usuário criado
3. Edite o campo `role` para `admin`

Ou via SQL:
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu@email.com';
```

## Monitoramento

### Logs (Vercel)
- Dashboard > seu-projeto > Functions
- Ver logs em tempo real

### Analytics
- Vercel Analytics (Built-in)
- Google Analytics (adicionar script no layout)

## Backup

### Banco de Dados (Supabase)

O Supabase faz backup automático, mas você pode fazer manualmente:

```bash
# Instalar CLI do Supabase
npm install -g supabase

# Fazer backup
supabase db dump -f backup.sql

# Restaurar backup
psql "sua_connection_string" < backup.sql
```

## Atualizações

Para atualizar o sistema em produção:

```bash
# 1. Fazer alterações localmente
git add .
git commit -m "feat: descrição da alteração"

# 2. Push para main (deploy automático na Vercel)
git push origin main

# 3. Verificar status do deploy
# Acesse o dashboard da Vercel
```

## Troubleshooting

### Erro: "Module not found"
- Limpar cache: `rm -rf .next && npm run build`
- Verificar se todas as dependências estão em `package.json`

### Erro: "Missing environment variables"
- Verificar se as variáveis foram adicionadas na plataforma de deploy
- Verificar se os nomes estão corretos (NEXT_PUBLIC_*)

### Erro 500 no login
- Verificar logs do Supabase
- Confirmar que o schema SQL foi executado
- Verificar se as políticas RLS estão ativas

### Build muito lento
- Considerar usar `output: 'standalone'` em `next.config.js`
- Otimizar imports dinâmicos

## Segurança

### Checklist de Segurança:

- [ ] Variáveis de ambiente configuradas corretamente
- [ ] `.env` não commitado no Git
- [ ] HTTPS configurado (automático na Vercel)
- [ ] CORS configurado no Supabase
- [ ] RLS (Row Level Security) ativo no Supabase
- [ ] Senhas fortes para usuários admin
- [ ] Backup regular do banco de dados

## Performance

### Otimizações Recomendadas:

1. **Imagens**: Usar `next/image` para otimização automática
2. **Fonts**: Usar `next/font` (já configurado)
3. **Caching**: Configurar headers de cache
4. **CDN**: Vercel já inclui CDN global
5. **Compression**: Gzip/Brotli habilitado automaticamente

## Suporte

Para problemas de deploy:
- Vercel: https://vercel.com/docs
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs

## URLs Úteis

- **Repositório**: https://github.com/agenciateixeira/sarke
- **Documentação Next.js**: https://nextjs.org/docs
- **Documentação Supabase**: https://supabase.com/docs
- **Documentação Vercel**: https://vercel.com/docs
