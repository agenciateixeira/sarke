# 📋 Sistema de Comprovantes do Caixa de Obra

## ✅ O que foi implementado

### 1. **Database (SQL)**
Arquivo: `/supabase/migrations/20260206_comprovantes_caixa.sql`

**Novos campos na tabela `obra_caixa`:**
- `is_marketplace` - Se a compra foi em marketplace (Mercado Livre, etc.)
- `prazo_comprovante` - Data limite para envio (calculado automaticamente)
- `tem_comprovante` - Se o comprovante foi enviado
- `justificativa_sem_comprovante` - Justificativa caso não envie
- `comprovante_aprovado` - Se foi aprovado pelo responsável

**Novas tabelas:**
- `obra_caixa_comprovantes_pendentes` - Controle de pendências
- `obra_caixa_notificacoes_log` - Log de notificações enviadas

**Views:**
- `obra_comprovantes_pendentes_resumo` - Resumo por obra
- `obra_comprovantes_pendentes_detalhes` - Listagem detalhada

**Triggers automáticos:**
- Cálculo automático de prazo (5 dias para marketplace, 2 dias para normal)
- Criação automática de pendências quando não tem comprovante
- Atualização de status quando comprovante é enviado

**Função para executar diariamente (cronjob):**
```sql
SELECT * FROM atualizar_comprovantes_pendentes();
```

---

### 2. **TypeScript Types**
Arquivo: `/types/obra-adm-financeiro.ts`

**Novos tipos:**
- `StatusComprovanteEnum`
- `TipoNotificacaoEnum`
- `ObraCaixaComprovantePendente`
- `ObraCaixaNotificacaoLog`
- `ObraComprovantesPendentesResumo`
- `ObraComprovantesPendentesDetalhes`

**Funções auxiliares:**
- `isComprovantePendente()` - Verifica se comprovante está pendente
- `isPrazoVencido()` - Verifica se prazo venceu
- `calcularDiasRestantes()` - Calcula dias até vencimento
- `getStatusComprovanteCor()` - Retorna cor do indicador

---

## 🎯 Regras de Negócio

### **Prazos:**
- **Marketplace** (Mercado Livre, etc.): **5 dias corridos**
- **Compras normais**: **2 dias corridos**

### **Status do Comprovante:**
- 🔵 **PENDENTE** - Aguardando envio (dentro do prazo)
- 🔴 **VENCIDO** - Prazo expirou sem comprovante
- 🟡 **JUSTIFICADO** - Não enviou mas justificou o motivo
- 🟢 **ENVIADO** - Comprovante enviado
- ✅ **APROVADO** - Comprovante aprovado pelo gestor

### **Cores dos Indicadores:**
- 🟢 **Verde** - Tem comprovante
- 🟡 **Amarelo** - Tem justificativa
- 🔴 **Vermelho** - Prazo vencido sem comprovante/justificativa
- 🟠 **Laranja** - Prazo vencendo (menos de 2 dias)
- 🔵 **Azul** - Pendente normal

---

## 🔔 Sistema de Notificações

### **Notificações Diárias:**
1. **Usuário responsável** - Recebe lembrete diário até enviar
2. **Administradores** - Recebem resumo de pendências

### **Tipos de Notificação:**
- `LEMBRETE_COMPROVANTE` - Lembrete padrão
- `PRAZO_VENCENDO` - Quando falta 1 dia ou menos
- `PRAZO_VENCIDO` - Quando prazo já passou

### **Como implementar as notificações:**

Opção 1: **Cronjob no servidor**
```bash
# Adicionar ao crontab para rodar todo dia às 9h
0 9 * * * psql $DATABASE_URL -c "SELECT * FROM atualizar_comprovantes_pendentes();"
```

Opção 2: **Supabase Edge Function** (Recomendado)
```typescript
// supabase/functions/notificar-comprovantes/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(...)

  // Executar função de atualização
  const { data, error } = await supabase.rpc('atualizar_comprovantes_pendentes')

  // Buscar notificações criadas
  const { data: notificacoes } = await supabase
    .from('obra_caixa_notificacoes_log')
    .select('*')
    .is('enviada', false)

  // Enviar notificações (email, push, etc.)
  for (const notif of notificacoes) {
    await enviarNotificacao(notif)

    // Marcar como enviada
    await supabase
      .from('obra_caixa_notificacoes_log')
      .update({ enviada: true })
      .eq('id', notif.id)
  }

  return new Response(JSON.stringify({ success: true }))
})
```

Opção 3: **Supabase pg_cron** (Mais simples)
```sql
-- Instalar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar execução diária às 9h
SELECT cron.schedule(
  'notificar-comprovantes-pendentes',
  '0 9 * * *',
  $$SELECT * FROM atualizar_comprovantes_pendentes();$$
);
```

---

## 📤 Upload de Comprovantes

### **Storage Bucket:**
Nome: `comprovantes-caixa`
- **Acesso**: Privado
- **Tipo de arquivos**: PDF, JPG, PNG
- **Tamanho máximo**: 5MB

### **Criar bucket no Supabase Dashboard:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-caixa', 'comprovantes-caixa', false)
ON CONFLICT (id) DO NOTHING;
```

### **Políticas de acesso:**
```sql
-- Permitir upload para usuários autenticados
CREATE POLICY "Usuários podem fazer upload de comprovantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprovantes-caixa');

-- Permitir leitura para usuários autenticados
CREATE POLICY "Usuários podem ver comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comprovantes-caixa');

-- Permitir delete apenas do próprio arquivo
CREATE POLICY "Usuários podem deletar próprios comprovantes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comprovantes-caixa' AND owner = auth.uid());
```

---

## 🔄 Próximos Passos

### **Para finalizar a implementação:**

1. ✅ Executar a migration no Supabase Dashboard
   ```sql
   -- Copiar e executar:
   supabase/migrations/20260206_comprovantes_caixa.sql
   ```

2. ⏳ Atualizar componente `CaixaObraView.tsx`:
   - Adicionar campo de upload de arquivo
   - Adicionar checkbox "É marketplace?"
   - Adicionar campo de justificativa
   - Adicionar indicadores visuais de status
   - Mostrar prazo e dias restantes

3. ⏳ Criar componente de listagem de pendências:
   - Dashboard com todas as pendências
   - Filtros por obra, status, urgência
   - Ações: aprovar, solicitar correção

4. ⏳ Implementar notificações:
   - Escolher método (cronjob, edge function ou pg_cron)
   - Integrar com sistema de email
   - Adicionar notificações no app

5. ⏳ Testes:
   - Testar upload de arquivo
   - Testar cálculo de prazos
   - Testar triggers automáticos
   - Testar notificações

---

## 📊 Queries Úteis

### Ver pendências de uma obra:
```sql
SELECT * FROM obra_comprovantes_pendentes_detalhes
WHERE obra_id = 'uuid-da-obra'
ORDER BY esta_vencido DESC, dias_urgencia ASC;
```

### Ver resumo geral:
```sql
SELECT * FROM obra_comprovantes_pendentes_resumo;
```

### Forçar atualização de pendências:
```sql
SELECT * FROM atualizar_comprovantes_pendentes();
```

### Ver notificações não enviadas:
```sql
SELECT * FROM obra_caixa_notificacoes_log
WHERE enviada = FALSE
ORDER BY created_at DESC;
```

---

## 🎨 Componentes React (A Implementar)

### **No formulário de movimentação:**
```tsx
// Checkbox marketplace
<label>
  <input type="checkbox" checked={isMarketplace} onChange={...} />
  É compra em marketplace? (prazo de 5 dias)
</label>

// Upload de comprovante
<input
  type="file"
  accept=".pdf,.jpg,.jpeg,.png"
  onChange={handleUpload}
/>

// OU justificativa
<textarea
  placeholder="Justifique por que não enviará o comprovante..."
  value={justificativa}
  onChange={...}
/>
```

### **Na tabela de movimentações:**
```tsx
<td>
  {mov.tem_comprovante ? (
    <span className="text-green-600">✓ Enviado</span>
  ) : mov.justificativa_sem_comprovante ? (
    <span className="text-yellow-600">⚠ Justificado</span>
  ) : isPrazoVencido(mov.prazo_comprovante) ? (
    <span className="text-red-600">⚠ VENCIDO</span>
  ) : (
    <span className="text-orange-600">
      ⏰ {calcularDiasRestantes(mov.prazo_comprovante)} dias restantes
    </span>
  )}
</td>
```

---

## ✨ Benefícios

- ✅ **Controle total** de comprovantes
- ✅ **Notificações automáticas** diárias
- ✅ **Prazos diferenciados** para marketplace
- ✅ **Justificativas** quando não pode enviar
- ✅ **Indicadores visuais** para facilitar gestão
- ✅ **Histórico completo** de notificações
- ✅ **Aprovação de comprovantes** pelos gestores
- ✅ **Auditoria** completa de todas as ações
