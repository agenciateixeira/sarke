-- Script para Corrigir Usuários Existentes no Supabase
-- Execute este script APÓS executar o schema-fixed.sql

-- 1. Criar perfis para usuários que já existem mas não têm perfil
INSERT INTO profiles (id, email, name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'colaborador') as role
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 2. Verificar se funcionou
SELECT
  au.email,
  p.name,
  p.role,
  CASE
    WHEN p.id IS NULL THEN 'SEM PERFIL'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- 3. Se você quiser fazer o primeiro usuário virar admin:
-- Descomente e substitua 'seu@email.com' pelo seu email
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE email = 'seu@email.com';
