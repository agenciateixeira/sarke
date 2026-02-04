# Sistema de Cronograma Integrado

## Visão Geral

O sistema de cronograma do Sarke é uma solução completa e integrada para gestão de cronogramas de obras e projetos. Desenvolvido com foco em flexibilidade e automação, permite criar cronogramas 100% personalizáveis no estilo planilha, com análise automática de caminho crítico e integração total com obras, projetos e tarefas.

## Características Principais

### ✅ Funcionalidades Implementadas no Banco de Dados

1. **Cronogramas Integrados**
   - Vinculação a obras, projetos ou cronogramas gerais
   - Configurações personalizáveis por cronograma
   - Status e progresso automático
   - Controle de equipe e permissões

2. **Atividades Hierárquicas**
   - Estrutura em árvore (fases, atividades, marcos)
   - Código WBS automático
   - Categorização customizável
   - Campos customizados em JSON para flexibilidade total

3. **Análise de Caminho Crítico**
   - Cálculo automático de atividades críticas
   - Cálculo de folgas (total e livre)
   - Datas Early/Late Start/Finish
   - Identificação automática de atrasos

4. **Dependências entre Atividades**
   - 4 tipos: Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish
   - Lag time (positivo ou negativo)
   - Prevenção de dependências circulares

5. **Gestão de Recursos**
   - Mão de obra, equipamentos e materiais
   - Alocação por atividade
   - Controle de custos (planejado vs real)
   - Disponibilidade e sobrecarga

6. **Baselines e Versionamento**
   - Snapshots do cronograma em qualquer momento
   - Comparação com baseline ativa
   - Análise de variações

7. **Histórico Completo**
   - Registro automático de todas alterações
   - Rastreabilidade total
   - Auditoria e compliance

8. **Row Level Security (RLS)**
   - Acesso baseado em equipe
   - Permissões granulares
   - Segurança nativa do Supabase

## Estrutura do Banco de Dados

### Tabelas Criadas

```
cronogramas                      - Cronogramas principais
├── cronograma_atividades       - Atividades do cronograma
│   ├── cronograma_dependencias - Dependências entre atividades
│   └── cronograma_alocacao_recursos - Recursos alocados
├── cronograma_recursos         - Recursos disponíveis
├── cronograma_baselines        - Versões salvas
└── cronograma_historico        - Histórico de alterações
```

### Relacionamentos e Integrações

```
CRONOGRAMA
├── → obras (via obra_id)
├── → projects (via project_id)
└── → profiles (responsável, equipe)

ATIVIDADE
├── → cronograma
├── → parent_atividade (hierarquia)
├── → obra_etapas (via obra_etapa_id)
├── → tasks (via task_id)
├── → profiles (responsável, equipe)
├── → dependencias (predecessoras/sucessoras)
└── → alocacao_recursos
```

## Como Aplicar a Migration

### Método 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **+ New query**
5. Abra o arquivo `supabase/migrations/20260204_cronograma.sql`
6. Copie todo o conteúdo do arquivo
7. Cole no editor SQL do Supabase
8. Clique em **Run** (ou pressione Ctrl/Cmd + Enter)
9. Aguarde a execução (pode levar alguns segundos)
10. Verifique se não há erros na saída

### Método 2: Via CLI do Supabase

```bash
# Fazer login no Supabase
supabase login

# Linkar o projeto (se ainda não estiver linkado)
supabase link --project-ref hukbilmyblqlomoaiszm

# Aplicar a migration
supabase db push
```

## Funcionalidades Automáticas

### Triggers Implementados

1. **updated_at automático** - Atualiza `updated_at` em todas as tabelas
2. **Status automático de atividades** - Baseado no progresso e datas
3. **Histórico automático** - Registra todas as alterações
4. **Progresso do cronograma** - Calculado pela média das atividades

### Functions Disponíveis

```sql
-- Calcular progresso total do cronograma
SELECT calcular_progresso_cronograma('uuid-do-cronograma');
```

## Tipos de Dependências

### Finish-to-Start (FS) - Padrão
A atividade sucessora só pode iniciar após a predecessora terminar.
```
Predecessora: ████████
Sucessora:            ████████
```

### Start-to-Start (SS)
A atividade sucessora só pode iniciar junto com a predecessora.
```
Predecessora: ████████████
Sucessora:    ████████
```

### Finish-to-Finish (FF)
A atividade sucessora só pode terminar junto com a predecessora.
```
Predecessora: ████████
Sucessora:        ████████
```

### Start-to-Finish (SF) - Raro
A atividade sucessora só pode terminar após a predecessora iniciar.
```
Predecessora:     ████████
Sucessora:    ████████
```

## Lag Time (Atraso/Antecipação)

- **Lag Positivo**: Atraso entre atividades
  - Exemplo: FS com lag +3 dias = sucessora inicia 3 dias APÓS predecessora terminar

- **Lag Negativo**: Antecipação (fast tracking)
  - Exemplo: FS com lag -2 dias = sucessora inicia 2 dias ANTES de predecessora terminar

## Campos Customizados

As atividades possuem um campo `campos_customizados` (JSONB) que permite adicionar quaisquer campos extras sem alterar o schema.

Exemplos de uso:
```json
{
  "peso": 15,
  "complexidade": "alta",
  "requisitos_especiais": ["grua", "equipe_especializada"],
  "clima_ideal": "seco",
  "tags": ["critico", "urgente"]
}
```

## Próximos Passos de Implementação

### 1. Interface de Listagem (Sprint 1)
- [ ] Página de listagem de cronogramas
- [ ] Cards com estatísticas
- [ ] Filtros e busca
- [ ] Modal de criação/edição

### 2. Interface de Edição em Planilha (Sprint 2)
- [ ] Tabela editável com células inline
- [ ] Drag and drop para reordenar
- [ ] Adicionar/remover atividades
- [ ] Indentação para hierarquia
- [ ] Copy/paste entre células

### 3. Gestão de Dependências (Sprint 3)
- [ ] Modal para adicionar dependências
- [ ] Visualização gráfica de predecessoras
- [ ] Validação de dependências circulares
- [ ] Cálculo automático de datas baseado em dependências

### 4. Visualização Gantt (Sprint 4)
- [ ] Gráfico de Gantt interativo
- [ ] Barras coloridas por status/categoria
- [ ] Destaque de caminho crítico
- [ ] Zoom e navegação temporal
- [ ] Drag para ajustar datas

### 5. Gestão de Recursos (Sprint 5)
- [ ] Cadastro de recursos
- [ ] Alocação de recursos por atividade
- [ ] Gráfico de utilização de recursos
- [ ] Alerta de sobrecarga
- [ ] Nivelamento de recursos

### 6. Análise e Relatórios (Sprint 6)
- [ ] Dashboard com KPIs do cronograma
- [ ] Comparação com baseline
- [ ] Análise de variações
- [ ] Curva S (planejado vs real)
- [ ] Exportação (PDF, Excel, MS Project)

### 7. Integrações (Sprint 7)
- [ ] Sincronização com obra_etapas
- [ ] Vincular tasks existentes
- [ ] Atualização bidirecional de progresso
- [ ] Notificações de marcos e atrasos

## Exemplos de Uso

### Criar um Cronograma de Obra

```typescript
const cronograma = await supabase
  .from('cronogramas')
  .insert({
    nome: 'Cronograma - Residência João Silva',
    tipo: 'obra',
    obra_id: '123-456-789',
    data_inicio: '2026-03-01',
    data_fim: '2026-12-31',
    status: 'planejamento',
    responsavel_id: user.id,
  })
  .select()
  .single()
```

### Adicionar Atividades com Hierarquia

```typescript
// Fase 1
const fase1 = await supabase
  .from('cronograma_atividades')
  .insert({
    cronograma_id: cronograma.id,
    nome: 'Fundação',
    tipo: 'fase',
    codigo: '1',
    nivel: 0,
    ordem: 1,
    data_inicio_planejada: '2026-03-01',
    data_fim_planejada: '2026-04-15',
    duracao_planejada: 45,
  })
  .select()
  .single()

// Atividade 1.1 (filha da fase 1)
const atividade = await supabase
  .from('cronograma_atividades')
  .insert({
    cronograma_id: cronograma.id,
    parent_id: fase1.id,
    nome: 'Escavação',
    tipo: 'atividade',
    codigo: '1.1',
    nivel: 1,
    ordem: 1,
    data_inicio_planejada: '2026-03-01',
    data_fim_planejada: '2026-03-10',
    duracao_planejada: 10,
    responsavel_id: user.id,
  })
  .select()
  .single()
```

### Adicionar Dependência

```typescript
await supabase.from('cronograma_dependencias').insert({
  atividade_id: atividade2.id, // Sucessora
  atividade_predecessor_id: atividade1.id, // Predecessora
  tipo: 'finish_to_start',
  lag_dias: 2, // Inicia 2 dias após predecessora terminar
})
```

### Atualizar Progresso

```typescript
// Atualizar progresso (status é atualizado automaticamente por trigger)
await supabase
  .from('cronograma_atividades')
  .update({
    progresso_percentual: 50,
    data_inicio_real: '2026-03-01',
  })
  .eq('id', atividade.id)
```

### Criar Baseline

```typescript
// Buscar estado atual completo
const { data: atividadesAtuais } = await supabase
  .from('cronograma_atividades')
  .select('*')
  .eq('cronograma_id', cronograma.id)

// Salvar baseline
await supabase.from('cronograma_baselines').insert({
  cronograma_id: cronograma.id,
  nome: 'Baseline Aprovada v1.0',
  descricao: 'Baseline após aprovação do cliente',
  dados_cronograma: {
    cronograma,
    atividades: atividadesAtuais,
  },
  is_ativa: true,
})
```

## Referências e Conceitos

### Análise de Caminho Crítico (CPM)

O **Caminho Crítico** é a sequência de atividades que determina a duração total do projeto. Qualquer atraso em atividades do caminho crítico causa atraso no projeto inteiro.

**Conceitos:**
- **Folga Total**: Quanto uma atividade pode atrasar sem atrasar o projeto
- **Folga Livre**: Quanto uma atividade pode atrasar sem atrasar a próxima
- **Early Start/Finish**: Datas mais cedo possível
- **Late Start/Finish**: Datas mais tarde possível sem atrasar projeto

### WBS (Work Breakdown Structure)

Estrutura hierárquica que organiza o trabalho em níveis:
```
1. Fundação
  1.1 Escavação
  1.2 Armação
    1.2.1 Corte e dobra
    1.2.2 Montagem
  1.3 Concretagem
2. Estrutura
  2.1 Pilares
  2.2 Vigas
```

### Curva S

Gráfico que mostra o acumulado de progresso ao longo do tempo. Usado para comparar:
- Planejado vs Real
- Baseline vs Atual
- Valor Agregado (EVM)

## Performance e Otimização

### Índices Criados

Todos os campos críticos possuem índices para garantir queries rápidas:
- Busca por cronograma
- Busca por hierarquia (parent_id, nivel)
- Busca por status e datas
- Busca por caminho crítico
- Busca de dependências

### Recomendações

1. **Lazy Loading**: Carregar atividades sob demanda conforme usuário expande a árvore
2. **Paginação**: Para cronogramas com 1000+ atividades
3. **Virtualization**: Usar react-window ou similar para tabelas grandes
4. **Debounce**: Nas edições inline da planilha
5. **Batch Updates**: Agrupar múltiplas alterações em uma transação

## Segurança e Permissões

### Níveis de Acesso

1. **Admin/Gerente**: Acesso total a todos os cronogramas
2. **Responsável do Cronograma**: Pode editar cronograma e atividades
3. **Equipe com Acesso**: Pode visualizar e atualizar progresso
4. **Responsável da Atividade**: Pode atualizar sua atividade específica

### RLS Policies

Todas as tabelas possuem políticas RLS que garantem:
- Usuários só veem cronogramas que têm permissão
- Edição restrita a responsáveis e admins
- Histórico acessível para auditoria

---

**Criado em:** 04/02/2026
**Desenvolvedor:** Claude + Guilherme
**Status:** Database completo ✅ | UI em desenvolvimento 🚧
