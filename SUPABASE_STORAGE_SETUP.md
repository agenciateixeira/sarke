# Configuração do Supabase Storage para RDO

## 📦 Bucket de Fotos do RDO

Para que o upload de fotos funcione, você precisa criar um bucket no Supabase Storage.

### Passo 1: Acessar o Storage

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **Storage**

### Passo 2: Criar o Bucket

1. Clique em **"Create a new bucket"** (ou "New Bucket")
2. Preencha as informações:
   - **Name:** `rdo-fotos`
   - **Public bucket:** ✅ **SIM** (marque esta opção)
   - **File size limit:** `10 MB` (ou conforme sua preferência)
   - **Allowed MIME types:** Deixe em branco para aceitar todos os tipos de imagem

3. Clique em **"Create bucket"**

### Passo 3: Configurar Políticas de Acesso (RLS)

Após criar o bucket, vá em **"Policies"** do bucket `rdo-fotos` e adicione as seguintes políticas:

#### Política 1: Permitir Upload
```sql
-- Nome: Admins e gerentes podem fazer upload
-- Operation: INSERT
-- Policy definition:
(
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'gerente')
  )
)
```

#### Política 2: Permitir Leitura Pública
```sql
-- Nome: Todos podem ver fotos de RDO
-- Operation: SELECT
-- Policy definition:
true
```

#### Política 3: Permitir Exclusão
```sql
-- Nome: Admins podem excluir fotos
-- Operation: DELETE
-- Policy definition:
(
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
```

### Passo 4: Estrutura de Arquivos

As fotos serão organizadas da seguinte forma:

```
rdo-fotos/
├── [rdo_id]/
│   ├── [timestamp]-0.jpg
│   ├── [timestamp]-1.jpg
│   ├── [timestamp]-2.png
│   └── ...
```

Cada RDO terá sua própria pasta identificada pelo `rdo_id`.

## ✅ Verificação

Para verificar se o bucket foi criado corretamente:

1. No Supabase Dashboard, vá em **Storage**
2. Você deve ver o bucket `rdo-fotos` listado
3. Clique no bucket e tente fazer upload manual de uma foto de teste
4. Se conseguir fazer upload e visualizar a imagem, está tudo certo!

## 🔧 Solução de Problemas

### Erro: "Bucket não encontrado"
- Verifique se o nome do bucket é exatamente `rdo-fotos` (com hífen, sem espaços)
- Certifique-se de que o bucket foi criado no projeto correto

### Erro: "Permissão negada ao fazer upload"
- Verifique se as políticas RLS foram aplicadas corretamente
- Certifique-se de que o usuário logado tem role `admin` ou `gerente`

### Fotos não aparecem após upload
- Verifique se a opção **"Public bucket"** está marcada
- Teste o URL público da foto diretamente no navegador

## 📝 Código Relevante

O upload é feito em:
- **Arquivo:** `app/dashboard/obra/[id]/rdo/novo/page.tsx`
- **Função:** `handleSubmit()` - linha ~227

```typescript
// Upload para Supabase Storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('rdo-fotos')  // Nome do bucket
  .upload(fileName, photo.file)

// Obter URL pública
const { data: { publicUrl } } = supabase.storage
  .from('rdo-fotos')
  .getPublicUrl(fileName)
```

## 🎯 Próximos Passos

Após configurar o Storage:

1. ✅ Testar criação de RDO com fotos
2. ✅ Verificar se as fotos aparecem na visualização do RDO
3. ✅ Testar exportação para PDF com as fotos

---

**Criado em:** 05/02/2026
**Status:** Aguardando configuração do bucket no Supabase
