# Credenciais e Acessos Necessários para o Sistema Sarke

Este documento lista todas as credenciais, chaves de API e variáveis de ambiente que você precisará configurar para que o sistema funcione corretamente, incluindo o banco de dados e as integrações.

## 1. Supabase (Banco de Dados, Autenticação e Storage)
O Supabase é o coração do backend (PostgreSQL + Auth). Você precisará criar um projeto no [Supabase](https://supabase.com/).

**Credenciais necessárias:**
- **URL do Projeto (`NEXT_PUBLIC_SUPABASE_URL`)**: URL base da API do projeto.
- **Chave Pública/Anônima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)**: Usada no frontend para acesso público e autenticação.
- **Chave de Serviço/Admin (`SUPABASE_SERVICE_ROLE_KEY`)**: Usada no backend para ignorar políticas de segurança (ex: importação em massa e migrations).
- **Senha do Banco de Dados**: Necessária se for conectar diretamente ao banco ou rodar migrations complexas (geralmente inserida ao criar o projeto).

## 2. Google Cloud / Google Workspace (Integração Google Meet e Agenda)
O sistema possui integração com o Google Calendar e permissão para gerar links do Google Meet. Você precisará criar um projeto no [Google Cloud Console](https://console.cloud.google.com/) e configurar a tela de consentimento OAuth.

**Credenciais necessárias:**
- **ID do Cliente (`GOOGLE_CLIENT_ID`)**: Identificador público do app no Google.
- **Segredo do Cliente (`GOOGLE_CLIENT_SECRET`)**: Chave secreta de acesso para o app.
- **APIs a habilitar no Google Cloud Project**:
  - Google Calendar API
  - (Opcional, dependendo do uso exato) Google Drive API

## 3. NextAuth (Gestão de Sessão BFC)
O projeto usa `next-auth` para gerenciar as permissões e sessão junto ao Google ou credenciais locais.

**Credenciais necessárias:**
- **Secret do NextAuth (`NEXTAUTH_SECRET`)**: Uma chave aleatória gerada para assinar e criptografar os tokens de sessão (JWT).
  - *Como gerar*: Você pode rodar no terminal `openssl rand -base64 32` ou acessar [generate-secret.vercel.app](https://generate-secret.vercel.app/32) para obter uma.
- **URL Base (`NEXTAUTH_URL`)**: A URL base da aplicação (ex: `http://localhost:3000` em desenvolvimento).

## 4. Cron Jobs (Tarefas agendadas - Supabase Functions)
Pelo código, existe scripts para rotinas automatizadas (como `DEPLOY_INSTRUCOES.md`).

**Credenciais necessárias:**
- **Cron Secret (`CRON_SECRET`)**: Um token ou senha aleatória que o sistema exige ao disparar rotinas via backend (para evitar que terceiros disparem o script).


---

🚨 **Próximo Passo:**
Assim que você providenciar pelo menos as credenciais do **Supabase**, você poderá preencher o arquivo `.env.example` que deixei nesta mesma pasta, renomeá-lo para `.env.local` e colocá-lo na raiz do projeto (`Sistema Sarke/`) para rodar tudo sem erros!
