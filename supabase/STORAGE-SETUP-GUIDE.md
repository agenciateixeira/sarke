# Guia de Configuração do Storage para Avatares

Como o bucket não pode ser criado via SQL (requer permissões de owner), siga os passos abaixo:

## Opção 1: Via Interface do Supabase (Recomendado)

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Criar Bucket**
   - No menu lateral, clique em **Storage**
   - Clique em **New bucket**
   - Configure o bucket:
     - **Name**: `avatars`
     - **Public bucket**: ✅ **ATIVAR** (permite acesso público às imagens)
     - **File size limit**: `5MB`
     - **Allowed MIME types**: Deixe vazio (será controlado pela aplicação)
   - Clique em **Create bucket**

3. **Configurar Políticas (RLS)**
   - Após criar o bucket, vá em **Policies**
   - Clique em **New policy**
   - Crie 4 políticas:

   **a) Leitura Pública (SELECT)**
   ```
   Nome: Avatars are publicly accessible
   Allowed operation: SELECT
   Policy definition: true
   ```

   **b) Upload de Avatar (INSERT)**
   ```
   Nome: Users can upload their own avatar
   Allowed operation: INSERT
   Target roles: authenticated
   USING expression: (bucket_id = 'avatars')
   WITH CHECK expression: ((storage.foldername(name))[1] = (auth.uid())::text)
   ```

   **c) Atualizar Avatar (UPDATE)**
   ```
   Nome: Users can update their own avatar
   Allowed operation: UPDATE
   Target roles: authenticated
   USING expression: (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text)
   ```

   **d) Deletar Avatar (DELETE)**
   ```
   Nome: Users can delete their own avatar
   Allowed operation: DELETE
   Target roles: authenticated
   USING expression: (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text)
   ```

## Opção 2: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
# Fazer login
supabase login

# Link com o projeto
supabase link --project-ref hukbilmyblqlomoaiszm

# Criar bucket
supabase storage create avatars --public

# As policies podem ser criadas via SQL depois
```

## Estrutura de Pastas

Os avatares serão organizados assim:
```
avatars/
  └── {user-id}/
      └── {timestamp}.{ext}
```

Exemplo:
```
avatars/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── 1706543210000.jpg
```

## Após Configurar

Depois de criar o bucket, execute os scripts SQL na seguinte ordem:

1. `add-profile-fields.sql` - Adiciona campos avatar_url e notification_settings
2. `crm-schema-safe.sql` - Cria tabelas do CRM
3. Teste o upload de avatar na página de perfil!

## Verificar se Funcionou

1. Acesse http://localhost:3001/dashboard/perfil
2. Clique em "Escolher Foto"
3. Selecione uma imagem
4. A foto deve aparecer no avatar imediatamente
