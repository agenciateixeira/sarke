# CHANGE 02 — Integração Google Calendar

**Data:** 2026-04-04
**Responsável:** T3X Software
**Status:** ✅ Implementado / 🔄 Em teste

---

## Objetivo

Integrar o Google Calendar de cada usuário com a plataforma Sarke via OAuth 2.0, permitindo:

- Conectar conta Google individual (multi-tenant — cada usuário tem sua própria integração)
- Sincronizar eventos do Google Calendar para o banco
- Visualizar eventos dentro da plataforma

---

## Banco de dados

### Migration executada

| Arquivo | Descrição |
|---|---|
| `T3X/06_calendario.sql` | Cria `calendar_integrations` e `calendar_events` com RLS, índices e triggers |

### Tabelas criadas

#### `calendar_integrations`

Armazena as credenciais OAuth e configurações por usuário.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `profiles` (CASCADE) |
| `provider` | TEXT | `google` ou `hostgator` (default: `google`) |
| `server_url` | TEXT | URL CalDAV — apenas Hostgator, nullable |
| `username` | TEXT | Usuário CalDAV — apenas Hostgator, nullable |
| `password_encrypted` | TEXT | Senha CalDAV — apenas Hostgator, nullable |
| `access_token` | TEXT | OAuth access token (Google) |
| `refresh_token` | TEXT | OAuth refresh token (Google) |
| `token_expires_at` | TIMESTAMPTZ | Expiração do access token |
| `provider_user_id` | TEXT | ID do usuário no Google |
| `provider_email` | TEXT | E-mail da conta Google conectada |
| `sync_enabled` | BOOLEAN | Sincronização ativa (default: true) |
| `last_sync_at` | TIMESTAMPTZ | Última sincronização |
| `is_active` | BOOLEAN | Integração ativa (default: true) |

#### `calendar_events`

Eventos sincronizados do Google Calendar.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | PK |
| `integration_id` | UUID | FK → `calendar_integrations` (CASCADE) |
| `external_id` | TEXT | ID do evento no Google Calendar |
| `summary` | TEXT | Título do evento |
| `description` | TEXT | Descrição |
| `location` | TEXT | Local |
| `start_date` | TIMESTAMPTZ | Início |
| `end_date` | TIMESTAMPTZ | Fim |
| `all_day` | BOOLEAN | Evento de dia inteiro |
| `attendees` | TEXT[] | Array de e-mails dos participantes |
| `obra_id` | UUID | FK para obras — **pendente** (tabela não existe ainda) |

> ⚠️ **Lembrete futuro:** quando o módulo de obras for criado, adicionar a FK:
> ```sql
> ALTER TABLE calendar_events
>   ADD CONSTRAINT fk_calendar_events_obra
>   FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL;
> ```

---

## Arquivos criados/alterados

### Novos arquivos

| Arquivo | Descrição |
|---|---|
| `lib/google-calendar.ts` | Utilitário Google Calendar API — OAuth2 client, buscar/criar/editar/deletar eventos, testar conexão |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth com Google Provider — escopos `calendar` e `calendar.events`, `access_type: offline` para refresh token |
| `app/api/calendar/callback/route.ts` | Callback OAuth — recebe sessão NextAuth, testa conexão, salva tokens no banco |
| `app/api/calendar/sync/route.ts` | Sincronização — busca últimos 30 dias + próximos 90 dias do Google e salva em `calendar_events` |
| `app/api/calendar/test/route.ts` | Teste de conexão CalDAV (Hostgator) |
| `app/dashboard/configuracoes/calendario/page.tsx` | UI de configuração — tabs Google e Hostgator, botão conectar, status da integração, desconectar |
| `app/dashboard/calendario/page.tsx` | Visualização do calendário com eventos sincronizados e botão de sync manual |
| `components/calendar/CalendarView.tsx` | Componente visual do calendário (`react-big-calendar`) |
| `types/next-auth.d.ts` | Extensão dos tipos NextAuth — `accessToken`, `refreshToken`, `expiresAt`, `providerAccountId` na sessão |

### Correções aplicadas

| Arquivo | Problema | Correção |
|---|---|---|
| `app/api/calendar/callback/route.ts` | Usava `supabase` (browser/anon key) — RLS bloqueava operações server-side | Substituído por `createClient` com `SUPABASE_SERVICE_ROLE_KEY` |
| `app/api/calendar/sync/route.ts` | Mesmo problema acima | Substituído por `createClient` com `SUPABASE_SERVICE_ROLE_KEY` |

---

## Fluxo implementado

```
1. Usuário acessa /dashboard/configuracoes/calendario
2. Clica em "Conectar com Google Calendar"
   → signIn('google', { callbackUrl: '/api/calendar/callback' })
3. NextAuth redireciona para Google OAuth consent screen
   → Escopos: email, profile, calendar, calendar.events
   → access_type: offline (garante refresh_token)
4. Google redireciona para /api/auth/callback/google (NextAuth)
   → NextAuth armazena tokens na sessão (JWT)
5. NextAuth redireciona para /api/calendar/callback (nosso handler)
   → Testa conexão com Google Calendar API
   → Busca user_id no Supabase pelo e-mail da sessão
   → Salva/atualiza tokens em calendar_integrations
6. Usuário redirecionado para /dashboard/configuracoes/calendario?success=connected
7. Usuário acessa /dashboard/calendario
   → Eventos são carregados do banco (calendar_events)
   → Botão "Sincronizar" chama /api/calendar/sync manualmente
```

---

## Configuração necessária no Google Cloud Console

Para o OAuth funcionar, as seguintes URIs devem estar cadastradas como **Authorized redirect URIs** nas credenciais OAuth 2.0:

| Ambiente | URI |
|---|---|
| Desenvolvimento | `http://localhost:3000/api/auth/callback/google` |
| Produção | `https://seudominio.com/api/auth/callback/google` |

**Escopos OAuth configurados:**
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

---

## Variáveis de ambiente necessárias

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...   ← necessário para as rotas server-side
```

---

## Pendências / Próximos passos

- [ ] Testar fluxo completo de conexão → sincronização → exibição
- [ ] Implementar refresh automático do access_token quando expirar
- [ ] Sincronização automática a cada 15 minutos (cron job ou Supabase Edge Function)
- [ ] Adicionar FK `obra_id` → `obras` quando o módulo de obras for criado
