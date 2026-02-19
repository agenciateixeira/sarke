# 🔧 FIX: Erro de Upload de Avatar - Bucket não encontrado

## ❌ Problema

Ao tentar fazer upload de foto de perfil, o erro aparece:
```
StorageApiError: Bucket not found
```

## ✅ Solução

Execute o script SQL no Supabase Dashboard para criar os buckets de storage.

---

## 📝 Passo a Passo

### 1. Acesse o Supabase Dashboard
```
https://eaphfgwyiaqelppopcrt.supabase.co
```

### 2. Vá em SQL Editor
- Clique em **SQL Editor** no menu lateral
- Clique em **New Query**

### 3. Execute o Script
- Abra o arquivo `EXECUTAR_STORAGE_BUCKETS.sql`
- Copie todo o conteúdo
- Cole no editor SQL
- Clique em **RUN** (ou Ctrl+Enter)

### 4. Verifique a Criação
Você deve ver no output:
```
✅ STORAGE BUCKETS CRIADOS
📦 Total de buckets: 4
✅ avatars (fotos de perfil - 5MB)
✅ rdo-fotos (fotos de RDO - 10MB)
✅ obra-fotos (fotos de obra - 10MB)
✅ obra-documentos (documentos - 50MB)
🔐 Políticas RLS configuradas
```

### 5. Teste o Upload
- Volte para a aplicação
- Recarregue a página (F5)
- Tente fazer upload da foto de perfil novamente
- ✅ Deve funcionar!

---

## 📦 Buckets Criados

| Bucket | Uso | Tamanho Máximo | Formatos |
|--------|-----|----------------|----------|
| `avatars` | Fotos de perfil | 5MB | JPG, PNG, WEBP, GIF |
| `rdo-fotos` | Fotos dos RDOs | 10MB | JPG, PNG, WEBP, GIF |
| `obra-fotos` | Fotos das obras | 10MB | JPG, PNG, WEBP, GIF |
| `obra-documentos` | Documentos | 50MB | PDF, DOC, DOCX, XLS, XLSX, JPG, PNG |

---

## 🔐 Segurança Configurada

### Avatares
- ✅ Públicos para leitura
- ✅ Usuários só podem fazer upload na sua própria pasta
- ✅ Usuários só podem deletar seus próprios avatares

### RDO/Obra Fotos e Documentos
- ✅ Públicos para leitura
- ✅ Qualquer usuário autenticado pode fazer upload
- ✅ Qualquer usuário autenticado pode deletar

---

## 🛠️ Alternativa: Via Interface do Supabase

Se preferir criar manualmente:

1. Vá em **Storage** → **Create a new bucket**
2. Crie o bucket `avatars`:
   - Name: `avatars`
   - Public: ✅ Yes
   - File size limit: `5242880` (5MB)
   - Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`
3. Configure as políticas (veja script SQL)
4. Repita para os outros buckets

---

## ✅ Verificação

Após executar o script, você pode verificar no Supabase Dashboard:
- **Storage** → Deve mostrar 4 buckets criados
- **Storage** → **Policies** → Deve mostrar as políticas RLS

---

## 🐛 Se ainda não funcionar

1. Verifique se os buckets foram criados em **Storage**
2. Verifique se as políticas foram criadas em **Storage → Policies**
3. Limpe o cache do navegador (Ctrl+Shift+Del)
4. Faça logout e login novamente
5. Tente fazer upload novamente

---

## 📌 Observação sobre Secret Key

Você mencionou ter passado uma secret key do Supabase. **IMPORTANTE:**

- ✅ A secret key deve estar APENAS no backend (Edge Functions, servidores)
- ❌ NUNCA exponha a secret key no frontend
- ✅ Use apenas a `anon` key no frontend (ela já tem RLS configurado)

Se você expôs a secret key publicamente:
1. Regenere-a no Supabase Dashboard (**Settings → API**)
2. Atualize apenas nos Edge Functions (se usar)
3. Use somente `anon` key no código frontend

---

**Pronto!** Após executar o script, o upload de avatares deve funcionar perfeitamente! 🎉
