# Como Executar a Migration para Criar o Trigger

## Passo 1: Verificar se precisa executar

1. Abra o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole e execute o arquivo `diagnostico_trigger.sql`
4. Verifique os resultados:
   - Se NÃO aparecer a função `criar_tarefa_projeto`, você precisa executar a migration
   - Se NÃO aparecer o trigger `trigger_criar_tarefa_projeto`, você precisa executar a migration

## Passo 2: Executar a Migration

1. No **SQL Editor** do Supabase
2. Abra o arquivo `supabase/migrations/20260220_tasks_projetos_integration.sql`
3. Cole TODO o conteúdo no SQL Editor
4. Clique em **RUN** para executar
5. Aguarde a confirmação de sucesso

## Passo 3: Verificar se funcionou

1. Execute novamente o `diagnostico_trigger.sql`
2. Você deve ver:
   - ✅ Função `criar_tarefa_projeto` criada
   - ✅ Função `sync_projeto_from_subtask` criada  
   - ✅ Trigger `trigger_criar_tarefa_projeto` criado
   - ✅ Trigger `trigger_sync_projeto_subtask_insert` criado
   - ✅ Campos `is_project_task`, `projeto_area`, `project_id` na tabela tasks
   - ✅ Campo `projeto_etapa` na tabela subtasks

## Passo 4: Testar

1. Crie um novo projeto no sistema
2. Vá em **Tarefas**
3. Você deve ver uma nova tarefa criada automaticamente
4. A tarefa deve ter 4 subtarefas:
   - 1. Planejamento
   - 2. Planta Baixa
   - 3. Modelo 3D
   - 4. Executivo

## Troubleshooting

Se ainda não funcionar, verifique:

1. **Erro de permissão**: Certifique-se de que o RLS está configurado corretamente
2. **Campo created_by**: Certifique-se de que o usuário está logado
3. **Logs do Supabase**: Vá em **Logs** > **Postgres Logs** para ver erros detalhados

## Contato

Se precisar de ajuda, compartilhe os resultados do `diagnostico_trigger.sql`.
