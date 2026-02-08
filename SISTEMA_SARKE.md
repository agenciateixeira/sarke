# 🏗️ SARKE - Sistema de Gestão para Arquitetura e Construção Civil

**Versão:** 1.0
**Desenvolvido por:** Agência Teixeira
**Stack:** Next.js 15, React, TypeScript, Supabase, TailwindCSS

---

## 📋 Sobre o Sistema

**Sarke** é uma plataforma completa de CRM e gestão para empresas de arquitetura e construção civil. O sistema integra todas as etapas do processo, desde o relacionamento com clientes até o controle financeiro e administrativo de obras.

### Objetivo Principal
Centralizar e automatizar a gestão de projetos arquitetônicos, obras e relacionamento com clientes em uma única plataforma moderna e intuitiva.

---

## 🎨 Identidade Visual

### Paleta de Cores

#### Cores Primárias (Light Mode)
- **Rosa Sarke** (Primary): `#ff2697` - `rgb(255, 38, 151)` - `hsl(324, 100%, 58%)`
- **Verde Escuro Sarke** (Secondary): `#3a4a46` - `rgb(58, 74, 70)` - `hsl(162, 12%, 26%)`
- **Cinza Escuro** (Foreground): `#454445` - `rgb(69, 68, 69)` - `hsl(300, 1%, 27%)`
- **Branco** (Background): `#ffffff`

#### Cores Primárias (Dark Mode)
- **Rosa Sarke** (Primary): `#ff2697` - Mantido igual
- **Background Escuro**: `#1a1d23` - `hsl(222, 20%, 12%)`
- **Card Escuro**: `#1e2228` - `hsl(222, 20%, 15%)`
- **Texto Claro**: `#fafafa` - `hsl(0, 0%, 98%)`

#### Cores Secundárias
- **Muted**: `#f5f5f5` (light) / `#2a2e35` (dark)
- **Border**: `#e5e5e5` (light) / `#373d45` (dark)
- **Destructive**: `#ef4444` - Para ações de exclusão/erro
- **Success**: Variações do verde Sarke

### Gradientes
```css
/* Rosa Gradiente */
linear-gradient(135deg, #ff2697 0%, #ff6bb5 100%)

/* Verde Gradiente */
linear-gradient(135deg, #3a4a46 0%, #4a5f58 100%)

/* Neutro */
linear-gradient(135deg, #454445 0%, #656465 100%)
```

### Tipografia

#### Fonte Principal
**Família:** Poppins (Google Fonts)
**Pesos disponíveis:** 300, 400, 500, 600, 700, 800
**Variável CSS:** `--font-poppins`

#### Hierarquia de Tamanhos
- **Display:** 3rem (48px) - Peso 800
- **H1:** 2.25rem (36px) - Peso 700
- **H2:** 1.875rem (30px) - Peso 600
- **H3:** 1.5rem (24px) - Peso 600
- **H4:** 1.25rem (20px) - Peso 500
- **Body:** 1rem (16px) - Peso 400
- **Small:** 0.875rem (14px) - Peso 400
- **Tiny:** 0.75rem (12px) - Peso 300

### Espaçamento
Sistema baseado em **4px** (0.25rem):
- **xs:** 4px (0.25rem)
- **sm:** 8px (0.5rem)
- **md:** 16px (1rem)
- **lg:** 24px (1.5rem)
- **xl:** 32px (2rem)
- **2xl:** 48px (3rem)
- **3xl:** 64px (4rem)

### Border Radius
- **Padrão:** 8px (0.5rem)
- **Pequeno:** 4px (0.25rem)
- **Grande:** 12px (0.75rem)
- **Arredondado:** 9999px (pill/circular)

### Sombras
```css
/* Card */
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Card Hover */
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

/* Modal/Dialog */
box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

---

## 🚀 Módulos e Funcionalidades

### 1. 👥 **Comercial / CRM**
**Rota:** `/dashboard/comercial`

#### Funcionalidades:
- ✅ Gestão completa de clientes (PF e PJ)
- ✅ Cadastro com 4 abas:
  - Informações Gerais (nome, contato, status)
  - Documentos (CPF/CNPJ, RG, IE, IM)
  - Endereço completo
  - Pipeline (valor estimado, probabilidade)
- ✅ Auto-complete de CEP (ViaCEP API)
- ✅ Auto-complete de CNPJ (BrasilAPI)
- ✅ Listagem com cards responsivos
- ✅ Busca e filtros
- ✅ Estatísticas (Total, Ativos, Prospects)

#### Banco de Dados:
- Tabela: `clients`
- RLS habilitado
- Campos: name, email, phone, type, status, cpf_cnpj, address_*, estimated_value, probability

---

### 2. 🏗️ **Gestão de Obra**
**Rota:** `/dashboard/obra`

#### 2.1 Dashboard de Obras
- ✅ Cards de estatísticas (total, em andamento, pausadas, atrasadas)
- ✅ Progresso médio
- ✅ Listagem em cards com:
  - Nome, descrição, cliente
  - Status (badge colorido)
  - Barra de progresso
  - Localização, tipo, valor
  - Data de previsão de término
- ✅ Filtros (status, busca)
- ✅ Formulário completo de cadastro com:
  - Informações básicas
  - Cliente (com criação rápida via formulário completo)
  - Empresas parceiras (multi-select dropdown)
  - Localização (com auto-complete CEP)
  - Características do projeto
  - Prazos
  - Status e progresso

#### 2.2 Detalhes da Obra
**Rota:** `/dashboard/obra/[id]`

Sistema de abas:
- ✅ **Informações:** Dados gerais da obra
- ✅ **Empresas:** Empresas parceiras vinculadas
- ✅ **Fotos:** Galeria de imagens
- ✅ **Documentos:** Gestão de documentos
- ✅ **Medições:** Controle de medições
- ✅ **Etapas:** Fases da obra
- ✅ **RDO:** Relatório Diário de Obra
- ✅ **ADM:** Orçamento e caixa
- ✅ **Comprovantes:** Sistema de comprovantes financeiros

#### 2.3 RDO (Relatório Diário de Obra)
**Rota:** `/dashboard/obra/[id]/rdo`

Funcionalidades:
- ✅ Criação de RDO com:
  - Data e número automático
  - Condições climáticas (manhã/noite)
  - Mão de obra (contadores por tipo)
  - Atividades executadas
  - Observações gerais
- ✅ Listagem de RDOs com cards
- ✅ Visualização detalhada
- ✅ Edição de rascunhos
- ✅ Exportação para PDF
- ✅ Status: rascunho, finalizado, aprovado
- ✅ Upload de fotos
- ✅ Assinaturas digitais

**Banco de Dados:**
- Tabelas: `rdos`, `rdo_mao_obra`, `rdo_atividades`, `rdo_fotos`, `rdo_equipamentos`, `rdo_materiais`, `rdo_ocorrencias`

#### 2.4 ADM/Financeiro
**Rota:** `/dashboard/obra/[id]` (aba ADM)

Módulos:
- ✅ **Orçamento de Materiais:**
  - Itens orçados por local (geral, cômodos)
  - Quantidade, medida, valor
  - Controle de pagamento
  - Status de obra e pagamento
  - Empresa parceira responsável
  - Observações

- ✅ **Caixa de Obra:**
  - Controle de entradas/saídas
  - Categorias de movimentação
  - Comprovantes (upload obrigatório)
  - Fornecedores
  - Forma de pagamento
  - Saldo atual

- ✅ **Sistema de Comprovantes:**
  - Upload de imagens/PDFs
  - Visualização inline
  - Validação obrigatória
  - Storage no Supabase
  - Edge function para notificações

**Banco de Dados:**
- Tabelas: `obra_orcamento_materiais`, `obra_caixa`, `obra_caixa_comprovantes`

---

### 3. 📅 **Cronograma**
**Rota:** `/dashboard/cronograma`

#### Funcionalidades:
- ✅ Criação de cronograma por obra
- ✅ Wizard inteligente com 6 etapas:
  1. Informações básicas
  2. Tipo de cronograma (etapas ou atividades)
  3. Configuração de etapas
  4. Atividades por etapa
  5. Dependências
  6. Revisão e confirmação
- ✅ Visualização em Timeline/Gantt
- ✅ Gráfico de progresso
- ✅ Status por etapa/atividade
- ✅ Datas previstas vs. reais
- ✅ Percentual de conclusão
- ✅ Responsáveis

**Banco de Dados:**
- Tabelas: `cronogramas`, `cronograma_etapas`, `cronograma_atividades`, `cronograma_dependencias`

---

### 4. 🏢 **Empresas Parceiras**
**Rota:** `/dashboard/obra/empresas`

#### Funcionalidades:
- ✅ Cadastro completo de empresas
- ✅ Categorias de serviços (35+ tipos)
- ✅ Informações bancárias
- ✅ Contatos múltiplos
- ✅ Endereço
- ✅ Documentos (CNPJ, inscrições)
- ✅ Status (ativa, inativa, bloqueada)
- ✅ Avaliações
- ✅ Histórico de obras
- ✅ Equipamentos
- ✅ Sistema de avaliação

**Banco de Dados:**
- Tabela: `empresas_parceiras`
- Relação: `obra_empresas` (vínculo obra-empresa)

---

### 5. 💬 **Chat**
**Rota:** `/dashboard/chat`

#### Funcionalidades:
- ✅ Chat em tempo real (Supabase Realtime)
- ✅ Conversas 1-on-1
- ✅ Status online/offline
- ✅ "Digitando..."
- ✅ Mensagens lidas/não lidas
- ✅ Busca de conversas
- ✅ Upload de anexos
- ✅ Emojis
- ✅ Tags de usuários
- ✅ Personalização de plano de fundo
- ✅ Chamadas de voz/vídeo (WebRTC)
- ✅ Notificações push

**Banco de Dados:**
- Tabelas: `conversations`, `messages`, `chat_preferences`

---

### 6. ✅ **Tarefas**
**Rota:** `/dashboard/tarefas`

#### Funcionalidades:
- ✅ Sistema Kanban (estilo ClickUp)
- ✅ Colunas: Backlog, To Do, In Progress, Review, Done
- ✅ Arrastar e soltar (drag & drop)
- ✅ Prioridades (baixa, média, alta, urgente)
- ✅ Labels customizáveis
- ✅ Atribuição de responsáveis
- ✅ Datas de início e fim
- ✅ Descrição rica
- ✅ Anexos
- ✅ Comentários
- ✅ Time tracking
- ✅ Subtarefas
- ✅ Filtros e busca

**Banco de Dados:**
- Tabela: `tasks`

---

### 7. 📆 **Calendário**
**Rota:** `/dashboard/calendario`

#### Funcionalidades:
- ✅ Visualização mensal
- ✅ Criação de eventos
- ✅ Tipos: reunião, visita, entrega, prazo
- ✅ Vinculação com clientes/obras
- ✅ Notificações
- ✅ Cores por tipo
- ✅ Edição e exclusão

**Banco de Dados:**
- Tabela: `events`

---

### 8. 👥 **Equipe**
**Rota:** `/dashboard/equipe`

#### Funcionalidades:
- ✅ Gestão de membros
- ✅ Perfis e permissões
- ✅ Cargos e setores
- ✅ Status (ativo, inativo, afastado)
- ✅ Informações de contato
- ✅ Avatar

**Banco de Dados:**
- Tabela: `profiles`

---

### 9. 💰 **Financeiro**
**Rota:** `/dashboard/financeiro`

#### Funcionalidades:
- ✅ Fluxo de caixa
- ✅ Contas a pagar/receber
- ✅ Categorias
- ✅ Relatórios
- ✅ Dashboard financeiro

---

### 10. ⚙️ **Configurações**
**Rota:** `/dashboard/configuracoes`

#### Funcionalidades:
- ✅ Dados da empresa
- ✅ Logo e identidade visual
- ✅ Usuários e permissões
- ✅ Integrações
- ✅ Notificações
- ✅ Personalização

---

### 11. 👤 **Perfil**
**Rota:** `/dashboard/perfil`

#### Funcionalidades:
- ✅ Dados pessoais
- ✅ Avatar
- ✅ Senha
- ✅ Preferências
- ✅ Notificações

---

## 🗄️ Tecnologias e Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **UI Library:** React 18
- **Estilização:** TailwindCSS
- **Componentes:** shadcn/ui (Radix UI)
- **Ícones:** Lucide React
- **Formulários:** React Hook Form
- **Validação:** Zod
- **Datas:** date-fns
- **Notificações:** Sonner
- **Drag & Drop:** @dnd-kit
- **PDF:** jsPDF / react-pdf

### Backend
- **BaaS:** Supabase
- **Database:** PostgreSQL
- **Autenticação:** Supabase Auth
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime
- **Edge Functions:** Deno

### Integrações
- **CEP:** ViaCEP API
- **CNPJ:** BrasilAPI
- **WebRTC:** Chamadas de voz/vídeo
- **Push Notifications:** Service Workers

---

## 📦 Estrutura de Pastas

```
sarke/
├── app/                        # Next.js App Router
│   ├── dashboard/              # Área autenticada
│   │   ├── calendario/
│   │   ├── chat/
│   │   ├── comercial/          # CRM
│   │   ├── configuracoes/
│   │   ├── cronograma/
│   │   ├── empresa/
│   │   ├── equipe/
│   │   ├── ferramentas/
│   │   ├── financeiro/
│   │   ├── juridico/
│   │   ├── obra/               # Gestão de obras
│   │   ├── perfil/
│   │   └── tarefas/
│   ├── login/
│   ├── convite/
│   ├── globals.css
│   └── layout.tsx
├── components/                 # Componentes React
│   ├── ui/                     # shadcn/ui components
│   ├── auth/
│   ├── calendar/
│   ├── chat/
│   ├── comercial/
│   ├── dashboard/
│   ├── obra/
│   ├── obra-adm/              # ADM financeiro
│   ├── rdo/
│   └── tasks/
├── contexts/                   # React Contexts
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/                      # Custom Hooks
├── lib/                        # Bibliotecas e utils
│   ├── supabase.ts
│   ├── utils.ts
│   └── rdoPdf.ts
├── types/                      # TypeScript Types
│   ├── crm.ts
│   ├── obra.ts
│   ├── rdo.ts
│   └── obra-adm-financeiro.ts
├── supabase/                   # Supabase configs
│   ├── migrations/             # SQL migrations
│   └── functions/              # Edge functions
└── public/                     # Assets estáticos
```

---

## 🔐 Autenticação e Segurança

### Sistema de Autenticação
- **Provider:** Supabase Auth
- **Métodos:** Email/Password
- **Proteção:** Route protection com ProtectedRoute
- **Session:** Gerenciada via cookies HTTP-Only

### Row Level Security (RLS)
Todas as tabelas possuem RLS habilitado:
- **Profiles:** Usuários veem apenas seu próprio perfil
- **Clients:** Acesso baseado na empresa
- **Obras:** Acesso por permissão de setor
- **RDO:** Admin/Gerente acesso total, Cliente apenas aprovados
- **Tarefas:** Acesso por atribuição
- **Chat:** Acesso apenas para participantes

### Permissões por Setor
- **Admin:** Acesso total
- **Gestão de Obra:** Obras, RDO, ADM
- **Comercial:** Clientes, Propostas
- **Financeiro:** Fluxo de caixa, Relatórios
- **Equipe:** Tarefas, Calendário

---

## 🎯 Diferenciais do Sistema

### UX/UI
- ✅ Design moderno e clean
- ✅ Dark mode completo
- ✅ Responsivo (mobile-first)
- ✅ Transições suaves
- ✅ Feedback visual imediato
- ✅ Loading states
- ✅ Empty states informativos
- ✅ Hover rosa claro (padrão visual)

### Performance
- ✅ Server Components (Next.js 15)
- ✅ Lazy loading
- ✅ Otimização de imagens
- ✅ Cache estratégico
- ✅ Realtime otimizado

### Funcionalidades Únicas
- ✅ Auto-complete CEP/CNPJ
- ✅ Sistema RDO completo com PDF
- ✅ Cronograma inteligente com wizard
- ✅ ADM financeiro integrado
- ✅ Chat com WebRTC
- ✅ Multi-select dropdown intuitivo
- ✅ Formulário completo de cliente (4 abas)

---

## 📊 Estatísticas do Projeto

### Código
- **Linhas de código:** ~50.000+
- **Componentes React:** 150+
- **Páginas:** 30+
- **Migrations SQL:** 15+
- **Types TypeScript:** 20+ arquivos

### Banco de Dados
- **Tabelas:** 40+
- **Views:** 5+
- **Functions:** 10+
- **RLS Policies:** 100+

---

## 🚀 Deploy e Ambiente

### Produção
- **Hospedagem:** Vercel
- **Database:** Supabase (Cloud)
- **Storage:** Supabase Storage
- **Edge:** Vercel Edge Functions + Supabase Edge Functions
- **CDN:** Vercel CDN

### Desenvolvimento
- **Framework:** Next.js Dev Server
- **Port:** 3000
- **Hot Reload:** Fast Refresh
- **Database:** Supabase Local (opcional)

---

## 📝 Convenções e Padrões

### Nomenclatura
- **Componentes:** PascalCase (`ClientDialog.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useClients.ts`)
- **Types:** PascalCase (`Client`, `Obra`)
- **Variáveis:** camelCase
- **Arquivos:** kebab-case para rotas

### Estrutura de Componentes
```tsx
// 1. Imports
import { useState } from 'react'

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component
export function Component({ props }: Props) {
  // 3.1 State
  const [state, setState] = useState()

  // 3.2 Effects
  useEffect(() => {}, [])

  // 3.3 Handlers
  function handleClick() {}

  // 3.4 Render
  return <div>...</div>
}
```

### Commits
Padrão: `feat:`, `fix:`, `chore:`, `docs:`

Exemplo:
```
feat: Implementar sistema de RDO completo

- Adicionar migrations SQL
- Criar componentes de interface
- Integrar com Supabase
- Adicionar exportação PDF

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🔄 Atualizações Recentes

### v1.0 - Fevereiro 2026
- ✅ Sistema base implementado
- ✅ Autenticação e perfis
- ✅ CRM completo
- ✅ Gestão de obras
- ✅ RDO com PDF
- ✅ Cronograma inteligente
- ✅ ADM/Financeiro
- ✅ Chat realtime
- ✅ Tarefas Kanban
- ✅ Dark mode
- ✅ Auto-complete CEP/CNPJ
- ✅ Sistema de comprovantes

---

## 📞 Suporte e Contato

**Desenvolvido por:** Agência Teixeira
**GitHub:** https://github.com/agenciateixeira/sarke
**Email:** contato@agenciateixeira.com

---

**© 2026 Sarke - Todos os direitos reservados**
