# 🚀 Guia de Setup Completo - Sistema Sarke

Este guia contém todos os passos para configurar completamente o sistema.

## 📋 Ordem de Execução

Execute os scripts SQL nesta ordem exata:

### 1️⃣ Adicionar Campos no Perfil

**Arquivo**: `supabase/add-profile-fields.sql`

Este script adiciona os campos necessários na tabela `profiles`:
- `avatar_url` - Para armazenar foto de perfil
- `notification_settings` - Para configurações de notificações (JSONB)

**Como executar:**
1. Acesse: https://supabase.com/dashboard
2. SQL Editor → New Query
3. Cole o conteúdo de `add-profile-fields.sql`
4. Clique em **Run**

✅ **Deve executar sem erros**

---

### 2️⃣ Configurar Storage (Criar Bucket)

**Não use SQL para isso!** Siga o guia: `supabase/STORAGE-SETUP-GUIDE.md`

**Passos Rápidos:**
1. Dashboard → **Storage** → **New bucket**
2. Nome: `avatars`
3. **Public bucket**: ✅ ATIVAR
4. File size limit: `5MB`
5. Criar as 4 políticas (SELECT, INSERT, UPDATE, DELETE)

✅ **Verifique se o bucket "avatars" aparece na lista**

---

### 3️⃣ Criar Tabelas do CRM

**Arquivo**: `supabase/crm-schema-safe.sql`

Este script cria todas as tabelas do CRM:
- `clients` - Clientes e prospects
- `architecture_projects` - Projetos de arquitetura
- `pipeline_stages` - Etapas do funil de vendas
- `deals` - Negociações comerciais
- `activities` - Atividades e tarefas
- `documents` - Documentos anexados

**Como executar:**
1. SQL Editor → New Query
2. Cole o conteúdo de `crm-schema-safe.sql`
3. Clique em **Run**

✅ **Pode executar múltiplas vezes sem erro** (usa DROP IF EXISTS)

---

## 🧪 Testar Tudo

Após executar os 3 scripts acima, teste cada funcionalidade:

### ✅ Teste 1: Upload de Avatar
1. Acesse: http://localhost:3001/dashboard/perfil
2. Clique em "Escolher Foto"
3. Selecione uma imagem (JPG, PNG, WEBP, GIF)
4. A foto deve aparecer instantaneamente
5. Clique em "Remover" para testar remoção

**Possíveis Problemas:**
- ❌ "Storage object not found" → Bucket não criado ou não público
- ❌ "403 Forbidden" → Políticas de acesso não configuradas
- ❌ "Column avatar_url does not exist" → Script `add-profile-fields.sql` não executado

---

### ✅ Teste 2: Atualizar Nome
1. Na mesma página de perfil
2. Altere seu nome
3. Clique em "Salvar Alterações"
4. Deve aparecer toast de sucesso
5. Recarregue a página - nome deve estar atualizado

**Possíveis Problemas:**
- ❌ Erro ao salvar → Verifique permissões RLS na tabela profiles

---

### ✅ Teste 3: Configurações de Notificações
1. Acesse: http://localhost:3001/dashboard/configuracoes
2. Ative/desative switches
3. Clique em "Salvar Configurações"
4. Deve aparecer toast de sucesso

**Possíveis Problemas:**
- ❌ "Column notification_settings does not exist" → Script `add-profile-fields.sql` não executado

---

### ✅ Teste 4: Gerenciar Clientes
1. Acesse: http://localhost:3001/dashboard/comercial
2. Clique em "Novo Cliente"
3. Preencha o formulário
4. Salve
5. Cliente deve aparecer na listagem

**Possíveis Problemas:**
- ❌ "Relation clients does not exist" → Script `crm-schema-safe.sql` não executado
- ❌ Erro de permissão → Verifique se as políticas RLS foram criadas

---

## 🎨 Identidade Visual Aplicada

✅ **Cores da Sarke:**
- Rosa: `#ff2697` (primária)
- Verde Escuro: `#3a4a46` (secundária)
- Cinza: `#454445`
- Branco: `#ffffff`

✅ **Tipografia:**
- Poppins (300, 400, 500, 600, 700, 800)

✅ **Logos:**
- Header (centralizada)
- Telas de login e cadastro

---

## 📁 Estrutura Criada

```
supabase/
├── schema-fixed.sql              # ✅ Profiles com RLS (já executado)
├── add-profile-fields.sql        # 🔄 EXECUTAR AGORA
├── crm-schema-safe.sql          # 🔄 EXECUTAR DEPOIS
├── setup-storage.sql            # ❌ NÃO USAR (erro de permissão)
└── STORAGE-SETUP-GUIDE.md       # 📖 Guia para criar bucket

components/
├── dashboard/
│   ├── Header.tsx               # ✅ Header com logo e menu
│   └── Sidebar.tsx              # ✅ Sidebar simplificado
└── profile/
    └── AvatarUpload.tsx         # ✅ Upload de avatar

app/dashboard/
├── perfil/page.tsx              # ✅ Página de perfil
└── configuracoes/page.tsx       # ✅ Página de configurações
```

---

## 🐛 Troubleshooting

### Erro: "relation idx_clients_status already exists"
✅ **Resolvido!** Use `crm-schema-safe.sql` que tem `DROP INDEX IF EXISTS`

### Erro: "must be owner of table buckets"
✅ **Resolvido!** Crie o bucket via interface (veja STORAGE-SETUP-GUIDE.md)

### Nome do usuário não atualiza
✅ **Resolvido!** Código corrigido - agora atualiza corretamente

### Avatar não carrega
🔍 **Verifique:**
1. Bucket "avatars" existe?
2. Bucket está público?
3. Políticas de acesso criadas?
4. Campo `avatar_url` existe na tabela profiles?

---

## 🎯 Próximos Passos

Depois que tudo estiver funcionando:

1. ✅ Testar criação de clientes
2. ✅ Criar projetos vinculados a clientes
3. ✅ Implementar pipeline de vendas
4. ✅ Sistema de atividades/tarefas
5. ✅ Upload de documentos

---

## 📞 Suporte

Se encontrar problemas, verifique:
- Console do navegador (F12)
- Logs do Supabase Dashboard
- Permissões RLS
- Se todos os scripts foram executados na ordem correta
