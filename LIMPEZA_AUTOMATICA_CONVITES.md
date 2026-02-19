# 🧹 Limpeza Automática de Convites Expirados

## 🎯 Objetivo

Deletar automaticamente convites que expiraram e não foram aceitos, mantendo a base de dados limpa.

---

## ✅ Sistema de Limpeza (3 Métodos)

### MÉTODO 1: Trigger Automático ⚡ (RECOMENDADO)

**Como funciona:**
- Executa automaticamente após cada INSERT ou UPDATE na tabela `team_invites`
- Deleta todos os convites expirados naquele momento
- **Não requer configuração adicional**

**Vantagens:**
- ✅ Totalmente automático
- ✅ Não requer pg_cron
- ✅ Funciona em qualquer plano do Supabase
- ✅ Limpeza em tempo real

**Desvantagens:**
- ⚠️ Só executa quando há INSERT/UPDATE
- ⚠️ Não limpa se ninguém criar novos convites

---

### MÉTODO 2: Cron Job Diário 🕐 (IDEAL)

**Como funciona:**
- Executa diariamente às 3h da manhã (horário de Brasília)
- Usa extensão `pg_cron` do PostgreSQL
- Deleta todos os convites expirados automaticamente

**Vantagens:**
- ✅ Executa mesmo sem atividade
- ✅ Horário fixo e previsível
- ✅ Totalmente automático
- ✅ Limpa regularmente

**Desvantagens:**
- ⚠️ Requer pg_cron (pode não estar disponível em todos os planos)
- ⚠️ Precisa de permissões especiais

**Verificar se está funcionando:**
```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-invites';
```

---

### MÉTODO 3: Limpeza Manual 🔧 (BACKUP)

**Como funciona:**
- Você executa manualmente quando quiser
- Retorna quantos convites foram deletados

**Como usar:**
```sql
SELECT * FROM manual_cleanup_expired_invites();
```

**Resultado:**
```
deleted_count
-------------
5
```

**Quando usar:**
- Quando os métodos automáticos não funcionarem
- Para fazer limpeza imediata
- Para testar o sistema

---

## 🚀 INSTALAÇÃO

### PASSO 1: Executar Migration

1. Acesse: https://eaphfgwyiaqelppopcrt.supabase.co
2. Vá em **SQL Editor**
3. Abra o arquivo: `supabase/migrations/20260219_auto_cleanup_expired_invites.sql`
4. Copie TODO o conteúdo
5. Cole e execute (Ctrl+Enter)

### PASSO 2: Verificar Instalação

Execute estas queries para confirmar:

```sql
-- 1. Verificar se trigger foi criado
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_cleanup_expired_invites';
-- Deve retornar: trigger_cleanup_expired_invites | O

-- 2. Verificar se cron job foi criado
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'cleanup-expired-invites';
-- Deve retornar: [id] | cleanup-expired-invites | 0 3 * * * | DELETE...

-- 3. Verificar se função manual existe
SELECT proname FROM pg_proc
WHERE proname = 'manual_cleanup_expired_invites';
-- Deve retornar: manual_cleanup_expired_invites
```

### PASSO 3: Testar Sistema

**Teste 1: Limpeza Manual**
```sql
-- Ver convites expirados antes de limpar
SELECT COUNT(*) FROM team_invites
WHERE accepted_at IS NULL AND expires_at < now();

-- Executar limpeza
SELECT * FROM manual_cleanup_expired_invites();

-- Verificar se limpou
SELECT COUNT(*) FROM team_invites
WHERE accepted_at IS NULL AND expires_at < now();
-- Deve retornar: 0
```

**Teste 2: Trigger Automático**
```sql
-- Criar um convite de teste (já expirado)
INSERT INTO team_invites (email, name, role, expires_at)
VALUES ('teste-trigger@exemplo.com', 'Teste Trigger', 'colaborador', now() - interval '1 day');

-- Criar outro convite qualquer (isso dispara o trigger)
INSERT INTO team_invites (email, name, role, expires_at)
VALUES ('teste@exemplo.com', 'Teste', 'colaborador', now() + interval '7 days');

-- Verificar se o convite expirado foi deletado automaticamente
SELECT * FROM team_invites WHERE email = 'teste-trigger@exemplo.com';
-- Não deve retornar nada (foi deletado pelo trigger)

-- Limpar teste
DELETE FROM team_invites WHERE email = 'teste@exemplo.com';
```

---

## 📊 MONITORAMENTO

### Ver histórico de execuções do Cron

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-invites')
ORDER BY start_time DESC
LIMIT 10;
```

### Ver quantos convites estão expirados agora

```sql
SELECT
  COUNT(*) as total_expirados,
  MIN(expires_at) as mais_antigo,
  MAX(expires_at) as mais_recente
FROM team_invites
WHERE accepted_at IS NULL
AND expires_at < now();
```

### Ver próxima execução do Cron

```sql
SELECT
  jobname,
  schedule,
  -- Próxima execução aproximada
  CASE
    WHEN EXTRACT(HOUR FROM now()) < 3
    THEN CURRENT_DATE + interval '3 hours'
    ELSE CURRENT_DATE + interval '1 day' + interval '3 hours'
  END as proxima_execucao
FROM cron.job
WHERE jobname = 'cleanup-expired-invites';
```

---

## 🛠️ MANUTENÇÃO

### Alterar horário do Cron

Se quiser mudar o horário de execução:

```sql
-- Remover job atual
SELECT cron.unschedule('cleanup-expired-invites');

-- Criar novo com horário diferente (exemplo: 2h da manhã)
SELECT cron.schedule(
  'cleanup-expired-invites',
  '0 2 * * *',  -- 2h da manhã
  $$DELETE FROM team_invites
    WHERE accepted_at IS NULL
    AND expires_at < now()$$
);
```

**Exemplos de horários:**
- `0 3 * * *` - Todo dia às 3h
- `0 */6 * * *` - A cada 6 horas
- `0 0 * * 0` - Todo domingo à meia-noite
- `30 2 * * *` - Todo dia às 2h30

### Desabilitar limpeza automática

```sql
-- Desabilitar trigger
ALTER TABLE team_invites DISABLE TRIGGER trigger_cleanup_expired_invites;

-- Desabilitar cron job
SELECT cron.unschedule('cleanup-expired-invites');
```

### Reabilitar limpeza automática

```sql
-- Reabilitar trigger
ALTER TABLE team_invites ENABLE TRIGGER trigger_cleanup_expired_invites;

-- Reabilitar cron job (executar migration novamente)
-- Ver arquivo: 20260219_auto_cleanup_expired_invites.sql
```

---

## ⚠️ TROUBLESHOOTING

### Erro: "extension pg_cron does not exist"

**Problema:** Seu plano do Supabase não tem pg_cron ativado

**Solução 1:** Use apenas o Método 1 (Trigger) + Método 3 (Manual)

**Solução 2:** Peça suporte do Supabase para ativar pg_cron

**Solução 3:** Upgrade para plano que inclui pg_cron

### Convites expirados não são deletados

**Verificações:**

1. **Trigger está ativo?**
   ```sql
   SELECT tgenabled FROM pg_trigger
   WHERE tgname = 'trigger_cleanup_expired_invites';
   -- Deve retornar: O (enabled)
   ```

2. **Cron está rodando?**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-invites';
   -- Deve retornar 1 linha
   ```

3. **Executar limpeza manual:**
   ```sql
   SELECT * FROM manual_cleanup_expired_invites();
   ```

### Cron não executa no horário esperado

**Possíveis causas:**
- Fuso horário do servidor diferente
- Job foi desabilitado
- Erro na cron expression

**Solução:**
```sql
-- Ver última execução
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-invites')
ORDER BY start_time DESC LIMIT 1;

-- Se status = 'failed', ver erro
```

---

## 📈 ESTATÍSTICAS

### Relatório de Convites

```sql
SELECT
  COUNT(*) FILTER (WHERE accepted_at IS NOT NULL) as aceitos,
  COUNT(*) FILTER (WHERE accepted_at IS NULL AND expires_at > now()) as pendentes,
  COUNT(*) FILTER (WHERE accepted_at IS NULL AND expires_at < now()) as expirados,
  COUNT(*) as total
FROM team_invites;
```

### Taxa de Conversão

```sql
SELECT
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE accepted_at IS NOT NULL) /
    NULLIF(COUNT(*), 0),
    2
  ) as taxa_aceitacao_percent
FROM team_invites;
```

---

## ✅ CHECKLIST DE INSTALAÇÃO

- [ ] Migration executada com sucesso
- [ ] Trigger criado e ativo
- [ ] Cron job agendado (ou usar apenas trigger)
- [ ] Função manual testada
- [ ] Limpeza manual executada para limpar base atual
- [ ] Monitoramento configurado

---

## 🎯 RESUMO

| Método | Quando Executa | Vantagem | Desvantagem |
|--------|---------------|----------|-------------|
| **Trigger** | Após INSERT/UPDATE | Automático, funciona sempre | Depende de atividade |
| **Cron** | Diariamente às 3h | Executa independente | Requer pg_cron |
| **Manual** | Quando você chamar | Controle total | Requer intervenção |

**Recomendação:** Use os 3 métodos juntos para máxima confiabilidade! 🚀
