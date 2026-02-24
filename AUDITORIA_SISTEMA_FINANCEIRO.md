# 🔍 AUDITORIA COMPLETA - SISTEMA ERP FINANCEIRO

## ❌ **PROBLEMAS CRÍTICOS ENCONTRADOS**

### **1. CONCILIAÇÃO SEM DADOS** 🚨 ALTA PRIORIDADE
**Problema:**
- Usuário acessa "Conciliação Bancária" mas não tem transações
- Não existe forma de importar extratos bancários
- Conciliação automática retorna "0/0" pois não há o que conciliar

**Causa Raiz:**
- Falta página de importação de extratos (OFX/CSV)
- Falta criação manual de transações bancárias

**Solução:**
```
✅ Criar página "Importação de Extratos"
✅ Parser de OFX
✅ Parser de CSV (configurável)
✅ Ou permitir criar transações manualmente para teste
```

---

### **2. RELATÓRIOS EXECUTAM AUTOMATICAMENTE** 🚨 ALTA PRIORIDADE
**Problema:**
- Ao acessar página de Relatórios, já executa consultas
- Toast "Relatórios gerados com sucesso!" aparece sem usuário clicar
- Performance ruim (consultas pesadas rodando sem necessidade)

**Causa Raiz:**
- useEffect roda gerarRelatorios() automaticamente
- Toast de sucesso sempre aparece mesmo sem dados

**Solução:**
```
✅ Remover useEffect automático
✅ Só gerar ao clicar no botão
✅ Toast condicional baseado em dados
```
**Status:** ✅ CORRIGIDO AGORA

---

### **3. PARTIDAS DOBRADAS NÃO VALIDADAS** ⚠️ MÉDIA PRIORIDADE
**Problema:**
- Sistema permite criar lançamento sem itens contábeis
- Não valida se débito = crédito
- Pode quebrar contabilidade

**Causa Raiz:**
- Falta validação na função `criar_lancamento()`
- Frontend não obriga criação de itens

**Solução:**
```sql
-- Adicionar validação na function
CREATE OR REPLACE FUNCTION validar_partidas_dobradas(p_lancamento_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_debito DECIMAL;
  v_total_credito DECIMAL;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'debito' THEN valor ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE 0 END), 0)
  INTO v_total_debito, v_total_credito
  FROM lancamentos_itens
  WHERE lancamento_id = p_lancamento_id;

  IF v_total_debito != v_total_credito THEN
    RAISE EXCEPTION 'Partidas dobradas inválidas: Débito (%) != Crédito (%)',
      v_total_debito, v_total_credito;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

### **4. SALDO DE CONTAS BANCÁRIAS NÃO ATUALIZA** ⚠️ MÉDIA PRIORIDADE
**Problema:**
- Campo `saldo_atual` em `contas_bancarias` não é atualizado automaticamente
- Precisa de trigger ou atualização manual

**Causa Raiz:**
- Falta trigger ao criar/editar/deletar lançamentos
- Ou função para recalcular saldo

**Solução:**
```sql
-- Criar função de atualização de saldo
CREATE OR REPLACE FUNCTION atualizar_saldo_conta_bancaria(p_conta_id UUID)
RETURNS VOID AS $$
DECLARE
  v_saldo_inicial DECIMAL;
  v_total_creditos DECIMAL;
  v_total_debitos DECIMAL;
BEGIN
  -- Buscar saldo inicial
  SELECT saldo_inicial INTO v_saldo_inicial
  FROM contas_bancarias WHERE id = p_conta_id;

  -- Calcular créditos (receitas pagas)
  SELECT COALESCE(SUM(valor_pago), 0) INTO v_total_creditos
  FROM lancamentos
  WHERE conta_bancaria_id = p_conta_id
    AND tipo = 'receita'
    AND status IN ('pago', 'parcial');

  -- Calcular débitos (despesas pagas)
  SELECT COALESCE(SUM(valor_pago), 0) INTO v_total_debitos
  FROM lancamentos
  WHERE conta_bancaria_id = p_conta_id
    AND tipo = 'despesa'
    AND status IN ('pago', 'parcial');

  -- Atualizar saldo atual
  UPDATE contas_bancarias
  SET saldo_atual = v_saldo_inicial + v_total_creditos - v_total_debitos
  WHERE id = p_conta_id;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE OR REPLACE FUNCTION trigger_atualizar_saldo_conta()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.conta_bancaria_id IS NOT NULL THEN
      PERFORM atualizar_saldo_conta_bancaria(NEW.conta_bancaria_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.conta_bancaria_id IS NOT NULL THEN
      PERFORM atualizar_saldo_conta_bancaria(OLD.conta_bancaria_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lancamento_atualiza_saldo
AFTER INSERT OR UPDATE OR DELETE ON lancamentos
FOR EACH ROW EXECUTE FUNCTION trigger_atualizar_saldo_conta();
```

---

### **5. FALTA AUDITORIA/LOG DE ALTERAÇÕES** ⚠️ MÉDIA PRIORIDADE
**Problema:**
- Não há log de quem alterou lançamentos
- Não é possível rastrear mudanças em valores
- Risco de fraude ou erro sem rastreio

**Causa Raiz:**
- Falta tabela de auditoria
- Falta trigger de log

**Solução:**
```sql
CREATE TABLE auditoria_lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lancamento_id UUID REFERENCES lancamentos(id),
  acao VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
  usuario_id UUID REFERENCES auth.users(id),
  dados_antes JSONB,
  dados_depois JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger de auditoria
CREATE OR REPLACE FUNCTION audit_lancamentos()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_lancamentos (lancamento_id, acao, usuario_id, dados_antes, dados_depois)
    VALUES (NEW.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria_lancamentos (lancamento_id, acao, usuario_id, dados_antes)
    VALUES (OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### **6. FALTA VALIDAÇÃO DE DATAS** ⚠️ BAIXA PRIORIDADE
**Problema:**
- Usuário pode criar lançamento com data no futuro distante
- Pode criar lançamento com data muito antiga
- Data de pagamento pode ser antes da data de vencimento

**Solução:**
```sql
-- Adicionar constraints
ALTER TABLE lancamentos
ADD CONSTRAINT check_data_vencimento
CHECK (data_vencimento >= '2000-01-01' AND data_vencimento <= CURRENT_DATE + INTERVAL '10 years');

ALTER TABLE lancamentos
ADD CONSTRAINT check_data_pagamento_valida
CHECK (data_pagamento IS NULL OR data_pagamento >= data_vencimento - INTERVAL '90 days');
```

---

### **7. PERFORMANCE - FALTA ÍNDICES** 🚨 ALTA PRIORIDADE
**Problema:**
- Consultas podem ficar lentas com muitos dados
- Falta índices em colunas frequentemente consultadas

**Solução:**
```sql
-- Índices adicionais importantes
CREATE INDEX CONCURRENTLY idx_lancamentos_cliente_data
ON lancamentos(cliente_id, data_competencia DESC);

CREATE INDEX CONCURRENTLY idx_lancamentos_projeto_data
ON lancamentos(projeto_id, data_competencia DESC);

CREATE INDEX CONCURRENTLY idx_lancamentos_obra_data
ON lancamentos(obra_id, data_competencia DESC);

CREATE INDEX CONCURRENTLY idx_lancamentos_status_tipo
ON lancamentos(status, tipo);

CREATE INDEX CONCURRENTLY idx_lancamentos_data_vencimento_status
ON lancamentos(data_vencimento, status) WHERE status IN ('pendente', 'parcial', 'atrasado');

-- Índices parciais para otimizar queries específicas
CREATE INDEX CONCURRENTLY idx_lancamentos_pendentes
ON lancamentos(data_vencimento) WHERE status IN ('pendente', 'parcial');

CREATE INDEX CONCURRENTLY idx_lancamentos_atrasados
ON lancamentos(data_vencimento) WHERE status = 'atrasado';
```

---

## ⚠️ **PROBLEMAS DE UX/UI**

### **8. FALTA FEEDBACK VISUAL**
- Loading states incompletos
- Botões não desabilitam durante ações
- Confirmações de exclusão sem detalhes

### **9. FALTA FILTROS AVANÇADOS**
- Lançamentos: não filtra por cliente/projeto/obra
- Relatórios: não permite período customizado além do default
- Falta pesquisa por descrição

### **10. FALTA EXPORTAÇÃO**
- Relatórios não podem ser exportados (PDF/Excel)
- Extratos não podem ser salvos
- Falta botões de impressão

---

## 💡 **MELHORIAS SUGERIDAS**

### **11. CATEGORIAS DE DESPESAS/RECEITAS** ⭐⭐⭐
Adicionar categorização além do plano de contas:
```sql
CREATE TABLE categorias (
  id UUID PRIMARY KEY,
  nome VARCHAR(100),
  tipo VARCHAR(20), -- receita, despesa
  icone VARCHAR(50),
  cor VARCHAR(20)
);

-- Exemplos:
-- Despesas: Salários, Aluguel, Marketing, Viagens
-- Receitas: Vendas, Serviços, Investimentos
```

### **12. CENTRO DE CUSTOS** ⭐⭐⭐
Para empresas com múltiplos departamentos:
```sql
CREATE TABLE centros_custo (
  id UUID PRIMARY KEY,
  codigo VARCHAR(20),
  nome VARCHAR(100),
  responsavel_id UUID,
  orcamento_mensal DECIMAL
);

ALTER TABLE lancamentos ADD COLUMN centro_custo_id UUID;
```

### **13. ORÇAMENTO vs REALIZADO** ⭐⭐
Comparar orçado vs realizado:
```sql
CREATE TABLE orcamentos (
  id UUID PRIMARY KEY,
  ano INTEGER,
  mes INTEGER,
  conta_id UUID REFERENCES plano_contas(id),
  valor_planejado DECIMAL,
  observacoes TEXT
);

-- View de comparação
CREATE VIEW vw_orcamento_vs_realizado AS
SELECT
  o.ano,
  o.mes,
  o.conta_id,
  o.valor_planejado,
  COALESCE(SUM(li.valor), 0) AS valor_realizado,
  o.valor_planejado - COALESCE(SUM(li.valor), 0) AS diferenca
FROM orcamentos o
LEFT JOIN lancamentos l ON EXTRACT(YEAR FROM l.data_competencia) = o.ano
  AND EXTRACT(MONTH FROM l.data_competencia) = o.mes
LEFT JOIN lancamentos_itens li ON li.lancamento_id = l.id AND li.conta_id = o.conta_id
GROUP BY o.id, o.ano, o.mes, o.conta_id, o.valor_planejado;
```

### **14. ANEXOS EM LANÇAMENTOS** ⭐⭐
Permitir upload de comprovantes:
```sql
CREATE TABLE lancamentos_anexos (
  id UUID PRIMARY KEY,
  lancamento_id UUID REFERENCES lancamentos(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255),
  tipo_arquivo VARCHAR(50),
  tamanho INTEGER,
  url_storage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **15. NOTIFICAÇÕES AUTOMÁTICAS** ⭐⭐
- Email/Push quando título vence em 3 dias
- Alerta quando saldo fica abaixo do mínimo
- Resumo semanal/mensal

### **16. MULTI-MOEDA** ⭐
Para empresas que operam internacional:
```sql
ALTER TABLE lancamentos ADD COLUMN moeda VARCHAR(3) DEFAULT 'BRL';
ALTER TABLE lancamentos ADD COLUMN taxa_cambio DECIMAL(10, 4) DEFAULT 1;
ALTER TABLE lancamentos ADD COLUMN valor_moeda_original DECIMAL(15, 2);
```

---

## 🎯 **PRIORIZAÇÃO DE CORREÇÕES**

### **SPRINT 1 - URGENTE (Esta semana)**
1. ✅ Corrigir relatórios (auto-execução)
2. ⏳ Criar página de importação de extratos (OFX/CSV)
3. ⏳ Adicionar índices de performance
4. ⏳ Implementar atualização de saldo bancário

### **SPRINT 2 - IMPORTANTE (Próxima semana)**
5. ⏳ Validação de partidas dobradas
6. ⏳ Filtros avançados em lançamentos
7. ⏳ Exportação de relatórios (PDF)
8. ⏳ Auditoria de alterações

### **SPRINT 3 - MELHORIAS (Próximas 2 semanas)**
9. ⏳ Categorias de despesas/receitas
10. ⏳ Anexos em lançamentos
11. ⏳ Orçamento vs Realizado
12. ⏳ Centro de custos

### **BACKLOG - FUTURO**
- Multi-moeda
- Notificações automáticas
- Integração Open Banking
- Mobile app

---

## 📊 **RESUMO EXECUTIVO**

| Categoria | Crítico | Alto | Médio | Baixo | Total |
|-----------|---------|------|-------|-------|-------|
| **Bugs** | 2 | 1 | 3 | 1 | 7 |
| **Performance** | 1 | 0 | 0 | 0 | 1 |
| **UX/UI** | 0 | 0 | 3 | 0 | 3 |
| **Melhorias** | 0 | 3 | 3 | 0 | 6 |
| **TOTAL** | 3 | 4 | 9 | 1 | **17** |

---

## ✅ **PRÓXIMOS PASSOS RECOMENDADOS:**

1. **Implementar importação de extratos** (resolver problema da conciliação)
2. **Adicionar índices de performance** (prevenir lentidão futura)
3. **Criar validações de partidas dobradas** (garantir integridade contábil)
4. **Implementar auditoria** (rastreabilidade e segurança)
5. **Adicionar filtros e exportações** (melhorar usabilidade)
