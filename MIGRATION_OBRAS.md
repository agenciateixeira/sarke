# Migration - Gestão de Obras

## Como aplicar a migration no Supabase

### Método 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **+ New query**
5. Abra o arquivo `supabase/migrations/20260203_obras.sql`
6. Copie todo o conteúdo do arquivo
7. Cole no editor SQL do Supabase
8. Clique em **Run** (ou pressione Ctrl/Cmd + Enter)
9. Aguarde a execução (pode levar alguns segundos)
10. Verifique se não há erros na saída

### Método 2: Via CLI do Supabase

Se você tem o Supabase CLI instalado:

```bash
# Fazer login no Supabase
supabase login

# Linkar o projeto (se ainda não estiver linkado)
supabase link --project-ref hukbilmyblqlomoaiszm

# Aplicar a migration
supabase db push
```

## Tabelas Criadas

A migration cria as seguintes tabelas:

### 1. `obras`
Tabela principal com informações das obras:
- Dados básicos (nome, descrição, endereço)
- Informações do projeto (área, tipo, valor)
- Datas e prazos
- Status e progresso
- Responsáveis (engenheiro, arquiteto, fiscal)
- Documentação (alvará, ART/RRT)

### 2. `obra_fotos`
Fotos da obra com geolocalização:
- Tipos: progresso, antes, durante, depois, problema, solução
- Suporte a latitude/longitude

### 3. `obra_documentos`
Documentos relacionados à obra:
- Tipos: projeto, memorial, orçamento, contrato, alvará, ART/RRT, medição

### 4. `obra_medicoes`
Medições da obra:
- Numeração sequencial
- Período de medição
- Percentual e valor
- Status de aprovação

### 5. `obra_etapas`
Etapas/fases da obra:
- Ordenação
- Datas previstas e reais
- Progresso individual
- Responsável por etapa

### 6. `obra_rdo`
Relatório Diário de Obra (RDO):
- Clima e temperatura
- Mão de obra (operários, serventes, mestres, encarregados)
- Atividades executadas
- Equipamentos e materiais
- Ocorrências e problemas
- Fotos do dia

## Recursos Implementados

✅ **Row Level Security (RLS)** habilitado em todas as tabelas
✅ **Policies** para controle de acesso
✅ **Índices** para otimização de queries
✅ **Triggers** para atualização automática de `updated_at`
✅ **Constraints** para validação de dados
✅ **Foreign Keys** com relacionamentos corretos

## Próximos Passos

Após aplicar a migration:

1. ✅ Acesse http://localhost:3002/dashboard/obra
2. A página já está pronta e funcional!
3. Como ainda não há dados, você verá o estado vazio
4. Use o botão "Nova Obra" para começar a cadastrar (quando implementarmos o modal)

## Funcionalidades da Página Implementadas

✅ **Dashboard com estatísticas**
- Total de obras
- Progresso médio
- Obras pausadas
- Obras atrasadas

✅ **Listagem de obras em cards**
- Visual moderno com informações principais
- Badge de status colorido
- Barra de progresso
- Informações do cliente, localização, tipo e valor

✅ **Filtros e busca**
- Busca por nome, descrição ou cidade
- Filtro por status
- Interface responsiva

✅ **Estados vazios inteligentes**
- Mensagem diferente quando não há obras
- Mensagem diferente quando a busca não encontra resultados
- CTA para criar primeira obra

## Desenvolvimento Futuro

Próximas funcionalidades a implementar:

- [ ] Modal de cadastro/edição de obra
- [ ] Página de detalhes da obra
- [ ] Upload de fotos
- [ ] Upload de documentos
- [ ] Sistema de medições
- [ ] Gerenciamento de etapas
- [ ] RDO (Relatório Diário de Obra)
- [ ] Dashboard com gráficos de progresso
- [ ] Relatórios e exportações

---

**Criado em:** 03/02/2026
**Desenvolvedor:** Claude + Guilherme
