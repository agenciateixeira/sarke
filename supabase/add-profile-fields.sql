-- Adicionar campos faltantes na tabela profiles
-- Este script pode ser executado múltiplas vezes sem erros

-- Adicionar avatar_url se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Adicionar notification_settings se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_settings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_settings JSONB DEFAULT '{
      "email_notifications": true,
      "push_notifications": true,
      "task_reminders": true,
      "meeting_reminders": true,
      "chat_notifications": true,
      "daily_summary": false
    }'::jsonb;
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN profiles.avatar_url IS 'URL da foto de perfil do usuário';
COMMENT ON COLUMN profiles.notification_settings IS 'Configurações de notificações do usuário em formato JSON';
