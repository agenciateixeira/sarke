# ALERTA DE SEGURANÇA - Credenciais Expostas

## ⚠️ AÇÃO IMEDIATA NECESSÁRIA

As credenciais do Supabase foram expostas nos commits anteriores do Git. Embora o arquivo `.env` tenha sido removido, **as credenciais ainda estão no histórico do Git**.

## Passos Urgentes

### 1. Gerar Novas Chaves no Supabase (URGENTE)

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Clique em "Regenerate API Keys"
5. Copie as novas chaves:
   - Project URL
   - anon public key
   - service_role key (use apenas no backend)

### 2. Atualizar .env Local

Atualize o arquivo `.env` local com as novas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-novo-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_nova_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_nova_chave_service_role
```

### 3. Verificar Banco de Dados

Verifique se não houve acesso não autorizado:

1. No Supabase Dashboard, vá em **Database** > **Logs**
2. Procure por atividades suspeitas
3. Verifique se há usuários não autorizados em **Authentication** > **Users**

### 4. Limpar Histórico do Git (Opcional mas Recomendado)

#### Opção A: Usar BFG Repo-Cleaner (Mais Fácil)

```bash
# Instalar BFG
brew install bfg

# Clonar repositório
git clone --mirror https://github.com/agenciateixeira/sarke.git

# Remover arquivo .env do histórico
cd sarke.git
bfg --delete-files .env

# Fazer garbage collection
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push
git push --force
```

#### Opção B: Usar git filter-branch

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

git push --force --all
```

## Credenciais Antigas Expostas

As seguintes credenciais foram expostas e **DEVEM SER REVOGADAS**:

```
NEXT_PUBLIC_SUPABASE_URL=https://eaphfgwyiaqelppopcrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Medidas de Segurança Adicionais

### 1. Configurar Row Level Security (RLS)

Certifique-se de que o RLS está ativo:

```sql
-- Verificar RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Ativar RLS se necessário
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
```

### 2. Monitorar Logs

Configure alertas no Supabase:
- Dashboard > Project Settings > Integrations
- Configure webhook para notificações

### 3. Limitar IPs (Se Possível)

Se você tem um IP fixo:
- Dashboard > Project Settings > Database
- Configure IP allow list

## Checklist de Segurança

- [ ] Novas chaves geradas no Supabase
- [ ] Arquivo .env local atualizado
- [ ] Verificado logs do Supabase por acessos suspeitos
- [ ] Verificado lista de usuários no banco
- [ ] RLS verificado e ativo
- [ ] Histórico do Git limpo (opcional)
- [ ] Equipe notificada sobre o incidente

## Prevenção Futura

### 1. Use Hooks de Pre-commit

Instale um hook para prevenir commits de arquivos sensíveis:

```bash
# Instalar git-secrets
brew install git-secrets

# Configurar
git secrets --install
git secrets --register-aws

# Adicionar padrões
git secrets --add 'SUPABASE.*KEY'
git secrets --add 'supabase.co'
```

### 2. Use .env.example

Sempre mantenha um `.env.example` sem credenciais reais.

### 3. Configure .gitignore Antes

Sempre configure `.gitignore` ANTES do primeiro commit.

## Contato de Emergência

Em caso de acesso malicioso confirmado:
1. Contate o suporte do Supabase: support@supabase.com
2. Considere pausar o projeto temporariamente
3. Notifique todos os usuários se houver risco

## Última Atualização

Data: 2026-01-29
Status: Aguardando regeneração de chaves

---

**IMPORTANTE**: Este arquivo deve ser deletado após resolver o problema de segurança.
