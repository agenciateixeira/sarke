# Sistema de RDO (Relatório Diário de Obra) - Implementação

## ✅ O Que Foi Implementado

### 1. Banco de Dados Completo

#### Migration: `20260205_rdo.sql`

**7 Tabelas Criadas:**

1. **`rdos`** - Tabela principal
   - Número do relatório, data, dia da semana
   - Condições climáticas (manhã/noite)
   - Índice pluviométrico
   - Status (rascunho, finalizado, aprovado)
   - Assinaturas digitais
   - Observações gerais

2. **`rdo_mao_obra`** - Mão de obra presente
   - Tipo de profissional
   - Quantidade
   - Própria ou terceirizada
   - Vínculo com empresa parceira

3. **`rdo_atividades`** - Atividades executadas
   - Descrição detalhada
   - Status (iniciada, em_andamento, concluida, pausada, cancelada)
   - Local na obra
   - Progresso (0-100%)
   - Ordem de exibição

4. **`rdo_fotos`** - Fotos da obra
   - URL da foto (Supabase Storage)
   - Descrição/legenda
   - Local
   - Metadados (tamanho, tipo)

5. **`rdo_equipamentos`** - Equipamentos utilizados
   - Nome/tipo
   - Quantidade
   - Horas utilizadas
   - Observações

6. **`rdo_materiais`** - Materiais recebidos/utilizados
   - Tipo (recebido ou utilizado)
   - Descrição, quantidade, unidade
   - Fornecedor

7. **`rdo_ocorrencias`** - Ocorrências e problemas
   - Tipo (acidente, problema, atraso, falta_material)
   - Gravidade (baixa, média, alta, crítica)
   - Ações tomadas
   - Status de resolução

**Views Criadas:**
- `rdos_completo` - View com todos os dados agregados e contadores

**Functions Criadas:**
- `get_proximo_numero_rdo()` - Gera próximo número sequencial de RDO
- `get_dia_semana_ptbr()` - Retorna dia da semana em português

---

### 2. TypeScript Definitions

**Arquivo:** `types/rdo.ts`

Interfaces completas para:
- `RDO` - Relatório principal
- `RDOMaoObra` - Trabalhadores
- `RDOAtividade` - Atividades
- `RDOFoto` - Fotos
- `RDOEquipamento` - Equipamentos
- `RDOMaterial` - Materiais
- `RDOOcorrencia` - Ocorrências
- `RDOCompleto` - View com dados agregados

---

### 3. Interface Web - Componentes

#### `components/rdo/RDOList.tsx`
Componente de listagem de RDOs com:
- Cards visuais para cada RDO
- Resumo: clima, trabalhadores, atividades, fotos
- Badges de status (Rascunho, Finalizado, Aprovado)
- Botões de ação: Ver Detalhes, Editar, Exportar PDF
- Estado vazio com botão para criar primeiro RDO

#### `app/dashboard/obra/[id]/rdo/novo/page.tsx`
Formulário completo para criar RDO com:
- **Informações Básicas:** Data e número do relatório
- **Condições Climáticas:** Manhã e noite (tempo, condição, pluviometria)
- **Mão de Obra:** Contadores por tipo de profissional
- **Atividades:** Lista dinâmica com status
- **Observações Gerais:** Campo de texto livre
- Botões: Salvar Rascunho / Finalizar RDO

---

### 4. Integração na Obra

**Modificação:** `app/dashboard/obra/[id]/page.tsx`

- ✅ Aba "RDO" agora funcional
- ✅ Importa componente `RDOList`
- ✅ Mostra todos os RDOs da obra
- ✅ Navegação para criar novo RDO

---

## 📋 Estrutura de Dados do RDO Padrão

Baseado no modelo fornecido (`Relatório Diário de Obra n° 48`):

### Campos Implementados:
- ✅ Número do relatório
- ✅ Data do relatório
- ✅ Dia da semana
- ✅ Obra
- ✅ Condição climática (Manhã/Noite)
  - Tempo (Claro, Nublado, Chuvoso, Tempestade)
  - Condição (Praticável, Impraticável)
  - Índice pluviométrico (mm)
- ✅ Mão de obra (contador por tipo)
- ✅ Atividades (lista com status)
- ✅ Fotos (upload múltiplo) *preparado no banco*
- ✅ Observações gerais
- ✅ Assinaturas *preparado no banco*

---

## 🎯 Funcionalidades Implementadas

### ✅ CRUD Completo
1. **Create** - Criar novo RDO com formulário completo
2. **Read** - Listar RDOs da obra
3. **Update** - Editar RDO (rascunho) *próximo passo*
4. **Delete** - Excluir RDO *próximo passo*

### ✅ Status do RDO
- **Rascunho** - RDO em edição
- **Finalizado** - RDO preenchido e finalizado
- **Aprovado** - RDO aprovado pelo fiscal/engenheiro

### ✅ Validações
- Data obrigatória
- Número sequencial automático
- Dia da semana calculado automaticamente
- RLS para segurança (apenas admins/gerentes criam)
- Clientes podem visualizar RDOs aprovados

---

## 🔜 Próximas Implementações

### 1. Página de Visualização de RDO
**Rota:** `/dashboard/obra/[id]/rdo/[rdoId]/page.tsx`

Mostrará:
- Todas as informações do RDO
- Grid de fotos
- Timeline de atividades
- Assinaturas
- Botão "Exportar PDF"

### 2. Upload de Fotos
**Implementar:**
- Upload múltiplo para Supabase Storage
- Preview das fotos
- Reordenação drag-and-drop
- Legendas e localização

### 3. Exportação para PDF
**Formato:** Igual ao modelo fornecido

Incluirá:
- Cabeçalho Sarke Studio
- Todas as seções do formulário
- Grid de fotos (2x2 por página)
- Assinaturas
- Paginação automática

### 4. Assinaturas Digitais
**Implementar:**
- Canvas para assinatura
- Salvar como base64 ou imagem
- Dois campos: Responsável de Obra + Fiscal

### 5. Dashboard de RDOs
**Rota:** `/dashboard/obra/rdos`

Lista global de RDOs:
- Filtros por obra, data, status
- Busca por número
- Exportação em lote

### 6. Modo de Edição
**Rota:** `/dashboard/obra/[id]/rdo/[rdoId]/editar`

Permitir editar RDO em rascunho:
- Mesmo formulário do "novo"
- Pré-preenchido com dados existentes
- Apenas para status "rascunho"

---

## 🔐 Segurança (RLS)

### Políticas Implementadas:

**Ver RDOs:**
- Admins e gerentes: todos os RDOs
- Clientes: apenas RDOs de suas obras (com status aprovado)

**Criar RDOs:**
- Apenas admins e gerentes

**Editar RDOs:**
- Apenas admins e gerentes
- Apenas RDOs em rascunho

**Excluir RDOs:**
- Apenas admins

---

## 📊 Exemplo de Uso

### Fluxo Completo:

1. **Gestor acessa obra**
   - `/dashboard/obra/[id]`
   - Clica na aba "RDO"

2. **Cria novo RDO**
   - Clica em "Novo RDO"
   - Preenche data e condições climáticas
   - Registra mão de obra presente
   - Adiciona atividades do dia
   - Faz upload de fotos
   - Adiciona observações
   - Salva como rascunho ou finaliza

3. **Visualiza RDO**
   - Volta para aba "RDO"
   - Vê card do RDO criado
   - Clica em "Ver Detalhes"

4. **Exporta PDF**
   - Na página de detalhes
   - Clica em "Exportar PDF"
   - Download automático no formato padrão

5. **Cliente visualiza**
   - Cliente faz login
   - Acessa sua obra
   - Aba "RDO"
   - Vê apenas RDOs aprovados
   - Pode exportar PDF

---

## 🗄️ Queries Úteis

### Obter todos os RDOs de uma obra:
```sql
SELECT * FROM rdos_completo
WHERE obra_id = 'uuid-da-obra'
ORDER BY data_relatorio DESC;
```

### Obter RDO completo com todas as relações:
```sql
SELECT
  r.*,
  -- Mão de obra
  COALESCE(
    JSON_AGG(DISTINCT mo.*) FILTER (WHERE mo.id IS NOT NULL),
    '[]'
  ) as mao_obra,
  -- Atividades
  COALESCE(
    JSON_AGG(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL),
    '[]'
  ) as atividades,
  -- Fotos
  COALESCE(
    JSON_AGG(DISTINCT f.*) FILTER (WHERE f.id IS NOT NULL),
    '[]'
  ) as fotos
FROM rdos r
LEFT JOIN rdo_mao_obra mo ON mo.rdo_id = r.id
LEFT JOIN rdo_atividades a ON a.rdo_id = r.id
LEFT JOIN rdo_fotos f ON f.rdo_id = r.id
WHERE r.id = 'uuid-do-rdo'
GROUP BY r.id;
```

### Estatísticas de RDOs:
```sql
SELECT
  COUNT(*) as total_rdos,
  COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados,
  SUM((SELECT SUM(quantidade) FROM rdo_mao_obra WHERE rdo_id = rdos.id)) as total_trabalhadores,
  AVG((SELECT COUNT(*) FROM rdo_atividades WHERE rdo_id = rdos.id)) as media_atividades
FROM rdos
WHERE obra_id = 'uuid-da-obra';
```

---

## 📝 Migration Aplicar

Execute no Supabase SQL Editor:

```bash
# Na ordem:
1. supabase/migrations/20260204_obras.sql (se ainda não aplicou)
2. supabase/migrations/20260205_rdo.sql
```

---

## 🎨 Melhorias Futuras

1. **Notificações:** Avisar quando novo RDO é criado
2. **Histórico:** Log de alterações em RDOs
3. **Templates:** Templates de atividades por tipo de obra
4. **Integração:** Sincronizar atividades com cronograma
5. **Analytics:** Dashboard com gráficos de produtividade
6. **Mobile:** App mobile para preenchimento em campo
7. **Offline:** Modo offline com sincronização posterior
8. **OCR:** Reconhecimento de texto em fotos
9. **Relatórios:** Relatórios consolidados mensais
10. **Comparação:** Comparar produtividade entre obras

---

**Criado em:** 05/02/2026
**Desenvolvedor:** Claude + Guilherme
**Status:** Banco de Dados ✅ | Listagem ✅ | Formulário Criar ✅ | Visualização 🚧 | PDF Export 🚧
