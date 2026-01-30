# Scripts SQL do Sarke - Ordem de Execução

Execute os scripts SQL no Supabase SQL Editor **EXATAMENTE nesta ordem**:

## 1. Primeiro: Corrigir tabela de clientes (se necessário)

**Arquivo:** `fix-clients-table.sql`

Este script adiciona a coluna `status` na tabela `clients` caso ela não exista.

```sql
-- Execute este primeiro se você receber erro "column status does not exist"
```

## 2. Segundo: Schema CRM completo

**Arquivo:** `crm-schema-safe.sql`

Este script cria todas as tabelas do CRM:
- `clients` - Clientes
- `architecture_projects` - Projetos de arquitetura
- `pipeline_stages` - Etapas do pipeline
- `deals` - Negociações
- `activities` - Atividades
- `documents` - Documentos

```sql
-- Cria toda a estrutura do CRM
-- Pode ser executado múltiplas vezes sem erro (IF NOT EXISTS)
```

## 3. Terceiro: Schema do Calendário

**Arquivo:** `calendar-schema.sql`

Este script cria as tabelas do calendário profissional:
- `calendar_events` - Eventos do calendário
- `calendar_participants` - Participantes dos eventos
- `calendar_attachments` - Anexos dos eventos

**IMPORTANTE:** Este script depende das tabelas criadas no passo 2!

```sql
-- Cria o sistema de calendário corporativo
-- DEPENDE das tabelas: clients, architecture_projects, profiles, activities
```

## Verificação Rápida

Após executar todos os scripts, verifique se as tabelas foram criadas:

```sql
-- Listar todas as tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deve retornar:
-- activities
-- architecture_projects
-- calendar_attachments
-- calendar_events
-- calendar_participants
-- clients
-- deals
-- documents
-- pipeline_stages
-- profiles
```

## Erros Comuns

### "column status does not exist"
**Solução:** Execute `fix-clients-table.sql` primeiro

### "relation clients does not exist"
**Solução:** Execute `crm-schema-safe.sql` antes de `calendar-schema.sql`

### "relation profiles does not exist"
**Solução:** A tabela `profiles` deve ter sido criada no setup inicial de autenticação

## Próximos Passos

Após executar os scripts com sucesso:

1. ✅ Banco de dados configurado
2. ✅ Todos os componentes criados
3. ✅ Sistema pronto para testar

Acesse: **http://localhost:3000/dashboard/calendario**

## Funcionalidades Disponíveis

- ✅ Visualização mensal estilo Apple
- ✅ Painel lateral com detalhes do dia
- ✅ 5 tipos de eventos: Reunião, Tarefa, Lembrete, Marco de Projeto, Compromisso com Cliente
- ✅ Integração com clientes e projetos
- ✅ Cores personalizadas
- ✅ Horários e localização
- ⏳ Google Meet (preparado, aguardando implementação futura)

## Estrutura Preparada para Futuro

O banco já está preparado para:
- Eventos recorrentes
- Participantes múltiplos
- Anexos de arquivos
- Sincronização com Google Calendar
- Notificações automáticas
