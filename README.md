# Sarke - Sistema de Gestão Empresarial

Sistema integrado de gestão empresarial desenvolvido com Next.js 15, React 19, TypeScript e Supabase.

## Características

### Autenticação e Segurança
- ✅ Sistema completo de login e primeiro acesso
- ✅ Autenticação via Supabase
- ✅ Tema claro/escuro (Light/Dark mode)
- ✅ Controle de horário de acesso por colaborador
- ✅ Proteção de rotas por nível de acesso

### Níveis de Acesso

#### 1. Administrador (ADMIN)
- Acesso total ao sistema
- Gerenciamento de colaboradores
- Configuração de permissões e horários
- Acesso a todas as áreas:
  - Dashboard
  - Tarefas
  - Comercial
  - Financeiro
  - Jurídico
  - Calendário
  - Gestão de Equipe
  - Chat Interno
  - Ferramentas
  - Gestão de Obra
  - Cronograma
  - Memorial

#### 2. Gerente de Equipe (GERENTE)
- Gestão de projetos e equipe
- Acesso a:
  - Dashboard
  - Tarefas
  - Calendário
  - Chat Interno
  - Ferramentas
  - Gestão de Obra
  - Cronograma
  - Memorial

#### 3. Colaborador (COLABORADOR)
- Acesso limitado por setor
- Restrição de horário de trabalho
- Acesso a:
  - Dashboard
  - Tarefas
  - Calendário
  - Chat Interno

#### 4. Jurídico (JURIDICO)
- Acesso especializado à área jurídica
- Acesso a:
  - Dashboard
  - Jurídico
  - Calendário
  - Chat Interno

## Tecnologias

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Estilização**: Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Autenticação**: Supabase Auth
- **Banco de Dados**: PostgreSQL via Supabase

## Estrutura do Projeto

```
sarke/
├── app/                          # Next.js App Router
│   ├── dashboard/               # Páginas do dashboard
│   │   ├── tarefas/
│   │   ├── comercial/
│   │   ├── financeiro/
│   │   ├── juridico/
│   │   ├── calendario/
│   │   ├── equipe/
│   │   ├── chat/
│   │   ├── ferramentas/
│   │   ├── obra/
│   │   ├── cronograma/
│   │   └── memorial/
│   ├── login/
│   ├── primeiro-acesso/
│   ├── fora-horario/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                      # Componentes de UI (importados do T3)
│   ├── auth/                    # Componentes de autenticação
│   └── dashboard/               # Componentes do dashboard
├── contexts/
│   ├── AuthContext.tsx          # Contexto de autenticação
│   └── ThemeContext.tsx         # Contexto de tema
├── lib/
│   ├── supabase.ts             # Cliente Supabase
│   └── utils.ts                # Utilitários
├── types/
│   └── index.ts                # Tipos TypeScript
├── supabase/
│   └── schema.sql              # Schema do banco de dados
└── public/
```

## Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 3. Configurar Banco de Dados

Execute o SQL contido em `supabase/schema.sql` no seu projeto Supabase:

1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole o conteúdo de `supabase/schema.sql`
4. Execute o script

Ou via CLI do Supabase:

```bash
supabase db push
```

### 4. Executar em Desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000

## Uso

### Primeiro Acesso

1. Acesse `/primeiro-acesso` ou clique em "Primeiro acesso?" na tela de login
2. Preencha os dados:
   - Nome completo
   - Email
   - Nível de acesso
   - Senha (mínimo 6 caracteres)
3. Confirme a senha
4. Após criar a conta, você será redirecionado para o login

### Login

1. Acesse `/login`
2. Entre com email e senha
3. Será redirecionado para o dashboard

### Alternância de Tema

Clique no botão de sol/lua no canto superior direito para alternar entre tema claro e escuro.

### Controle de Horário

Administradores podem configurar horários de acesso para colaboradores:
- Definir horário de início e fim
- Definir dias da semana permitidos
- Colaboradores fora do horário verão a tela "Fora do Horário"

## Funcionalidades Implementadas

- [x] Sistema de autenticação
- [x] Tela de login
- [x] Tela de primeiro acesso
- [x] Tema claro/escuro
- [x] Sistema de níveis de acesso
- [x] Controle de horário para colaboradores
- [x] Dashboard com sidebar
- [x] Rotas protegidas por permissão
- [x] Páginas principais para todos os setores
- [x] Componentes UI importados do projeto T3

## Próximos Passos

- [ ] Implementar CRUD completo de tarefas
- [ ] Implementar gestão de colaboradores (admin)
- [ ] Implementar calendário interativo
- [ ] Implementar chat interno em tempo real
- [ ] Implementar gestão de obras com planilhas
- [ ] Implementar cronograma integrado
- [ ] Implementar módulo comercial
- [ ] Implementar módulo financeiro
- [ ] Implementar módulo jurídico
- [ ] Implementar ferramentas auxiliares
- [ ] Implementar memorial descritivo

## Scripts Disponíveis

```bash
npm run dev      # Desenvolvimento
npm run build    # Build para produção
npm run start    # Iniciar produção
npm run lint     # Executar linter
```

## Suporte

Para questões e suporte, entre em contato com a equipe de desenvolvimento.

## Licença

Proprietary - Todos os direitos reservados
