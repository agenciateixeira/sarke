# Integração Google Meet - Calendário Sarke

## Visão Geral

Este documento descreve como integrar o Google Meet ao sistema de calendário do Sarke. A integração permitirá:

- Criar reuniões automaticamente com link do Google Meet
- Sincronizar eventos com Google Calendar
- Adicionar participantes automaticamente
- Enviar convites por email

## Pré-requisitos

1. **Google Cloud Console**
   - Criar projeto no Google Cloud Console
   - Ativar Google Calendar API
   - Ativar Google Meet API (se disponível)
   - Criar credenciais OAuth 2.0

2. **Pacotes NPM necessários**
   ```bash
   npm install @googleapis/calendar
   npm install google-auth-library
   ```

## Estrutura já preparada no banco

O schema `calendar_events` já possui os campos:
- `meet_link` - Link da reunião do Google Meet
- `meet_id` - ID do evento no Google Calendar

## Passo a Passo da Integração

### 1. Configurar Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto "Sarke Calendar"
3. Vá em "APIs & Services" > "Library"
4. Ative as seguintes APIs:
   - Google Calendar API
   - Google People API (para participantes)

### 2. Criar Credenciais OAuth 2.0

1. Em "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth client ID"
3. Tipo: Web application
4. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://seu-dominio.com/api/auth/callback/google
   ```
5. Salve o `client_id` e `client_secret`

### 3. Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# Google Calendar API
GOOGLE_CALENDAR_API_KEY=sua_api_key_aqui
```

### 4. Implementar Autenticação Google

Criar arquivo `lib/google-auth.ts`:

```typescript
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
  })
}

export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)
  return tokens
}

export function setCredentials(tokens: any) {
  oauth2Client.setCredentials(tokens)
  return oauth2Client
}
```

### 5. Criar API Route para Callback

Criar `app/api/auth/callback/google/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getTokens } from '@/lib/google-auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/dashboard/calendario?error=no_code')
  }

  try {
    const tokens = await getTokens(code)

    // Salvar tokens no perfil do usuário
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase
        .from('profiles')
        .update({
          google_calendar_tokens: tokens
        })
        .eq('id', user.id)
    }

    return NextResponse.redirect('/dashboard/calendario?success=connected')
  } catch (error) {
    console.error('Error getting tokens:', error)
    return NextResponse.redirect('/dashboard/calendario?error=auth_failed')
  }
}
```

### 6. Criar Função para Criar Evento com Meet

Criar `lib/google-calendar.ts`:

```typescript
import { google } from 'googleapis'
import { setCredentials } from './google-auth'

export async function createGoogleMeetEvent(
  tokens: any,
  eventData: {
    summary: string
    description: string
    start: string
    end: string
    attendees?: string[]
  }
) {
  const auth = setCredentials(tokens)
  const calendar = google.calendar({ version: 'v3', auth })

  const event = {
    summary: eventData.summary,
    description: eventData.description,
    start: {
      dateTime: eventData.start,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: eventData.end,
      timeZone: 'America/Sao_Paulo',
    },
    attendees: eventData.attendees?.map(email => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `sarke-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: event,
  })

  return {
    meetLink: response.data.hangoutLink,
    eventId: response.data.id,
  }
}

export async function deleteGoogleMeetEvent(
  tokens: any,
  eventId: string
) {
  const auth = setCredentials(tokens)
  const calendar = google.calendar({ version: 'v3', auth })

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
  })
}
```

### 7. Atualizar Hook useCalendarEvents

Adicionar função para criar com Google Meet:

```typescript
const createEventWithMeet = async (eventData: CreateEventData) => {
  if (!user) return null

  try {
    // 1. Buscar tokens do Google do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_calendar_tokens')
      .eq('id', user.id)
      .single()

    let meetLink = undefined
    let meetId = undefined

    // 2. Se tem tokens, criar no Google Calendar
    if (profile?.google_calendar_tokens) {
      const googleEvent = await createGoogleMeetEvent(
        profile.google_calendar_tokens,
        {
          summary: eventData.title,
          description: eventData.description || '',
          start: eventData.start_time,
          end: eventData.end_time,
          attendees: [] // TODO: adicionar emails dos participantes
        }
      )

      meetLink = googleEvent.meetLink
      meetId = googleEvent.eventId
    }

    // 3. Criar evento no Supabase
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([
        {
          ...eventData,
          meet_link: meetLink,
          meet_id: meetId,
          organizer_id: user.id,
          created_by: user.id,
        }
      ])
      .select()
      .single()

    if (error) throw error

    toast.success('Evento criado com sucesso!')
    return data
  } catch (err: any) {
    console.error('Error creating event:', err)
    toast.error('Erro ao criar evento: ' + err.message)
    return null
  }
}
```

### 8. Adicionar Botão "Conectar Google" no Calendário

No componente EventCreateDialog, adicionar:

```typescript
const handleConnectGoogle = async () => {
  const authUrl = await getAuthUrl()
  window.location.href = authUrl
}

// No JSX:
{!userHasGoogleConnected && (
  <Button
    type="button"
    variant="outline"
    onClick={handleConnectGoogle}
  >
    <Video className="mr-2 h-4 w-4" />
    Conectar Google Meet
  </Button>
)}
```

## Schema do Banco - Adicionar Tokens

Adicionar coluna para armazenar tokens do Google:

```sql
ALTER TABLE profiles
ADD COLUMN google_calendar_tokens JSONB;
```

## Fluxo Completo

1. **Usuário clica em "Conectar Google"**
   → Redireciona para OAuth do Google
   → Google retorna código
   → Callback troca código por tokens
   → Salva tokens no perfil

2. **Usuário cria reunião**
   → Verifica se tem tokens
   → Se sim, cria no Google Calendar com Meet
   → Salva link do Meet no evento
   → Evento fica disponível em ambos os lugares

3. **Sincronização**
   → Pode implementar webhook do Google Calendar
   → Atualiza eventos automaticamente

## Considerações de Segurança

- Tokens são armazenados criptografados no banco
- Refresh tokens para manter acesso
- Implementar revogação de acesso
- Validar tokens antes de usar

## Próximos Passos

1. Implementar autenticação Google
2. Adicionar botão "Criar com Google Meet"
3. Mostrar status de sincronização
4. Implementar edição/exclusão sincronizada
5. Adicionar participantes automáticos
6. Notificações push antes das reuniões

## Recursos

- [Google Calendar API Docs](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Meet API](https://developers.google.com/meet)
