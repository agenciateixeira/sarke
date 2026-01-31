-- =============================================
-- HABILITAR REALTIME NO SUPABASE
-- =============================================

-- Habilitar realtime para a tabela profiles
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Habilitar realtime para a tabela tasks
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Habilitar realtime para a tabela pipeline_columns
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_columns;

-- Habilitar realtime para a tabela subtasks
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;

-- Habilitar realtime para a tabela task_comments
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;

-- Habilitar realtime para a tabela task_attachments
ALTER PUBLICATION supabase_realtime ADD TABLE task_attachments;

-- Habilitar realtime para a tabela task_time_entries
ALTER PUBLICATION supabase_realtime ADD TABLE task_time_entries;

-- Habilitar realtime para a tabela clients (CRM)
ALTER PUBLICATION supabase_realtime ADD TABLE clients;

-- Habilitar realtime para a tabela calendar_events
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
