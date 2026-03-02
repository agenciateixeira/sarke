import { google } from 'googleapis'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  startDate: Date
  endDate: Date
  allDay?: boolean
  attendees?: Array<{
    email: string
    name?: string
    responseStatus?: 'needsAction' | 'accepted' | 'declined' | 'tentative'
  }>
  color?: string
  created?: Date
  updated?: Date
  htmlLink?: string
  organizer?: {
    email: string
    name?: string
  }
}

/**
 * Cria um cliente OAuth2 do Google
 */
export function createGoogleOAuth2Client(accessToken: string, refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return oauth2Client
}

/**
 * Busca todos os calendários do usuário
 */
export async function getGoogleCalendars(accessToken: string, refreshToken?: string) {
  const auth = createGoogleOAuth2Client(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.calendarList.list()

  return (response.data.items || []).map(cal => ({
    id: cal.id!,
    summary: cal.summary || 'Sem nome',
    description: cal.description,
    primary: cal.primary,
    backgroundColor: cal.backgroundColor,
    foregroundColor: cal.foregroundColor,
  }))
}

/**
 * Busca eventos de um calendário
 */
export async function getGoogleCalendarEvents(
  accessToken: string,
  refreshToken: string,
  calendarId: string = 'primary',
  startDate?: Date,
  endDate?: Date
): Promise<GoogleCalendarEvent[]> {
  const auth = createGoogleOAuth2Client(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.list({
    calendarId,
    timeMin: startDate?.toISOString() || new Date().toISOString(),
    timeMax: endDate?.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500,
  })

  const events: GoogleCalendarEvent[] = []

  for (const event of response.data.items || []) {
    if (!event.start || !event.id) continue

    const startDateTime = event.start.dateTime || event.start.date
    const endDateTime = event.end?.dateTime || event.end?.date

    if (!startDateTime || !endDateTime) continue

    events.push({
      id: event.id,
      summary: event.summary || 'Sem título',
      description: event.description,
      location: event.location,
      startDate: new Date(startDateTime),
      endDate: new Date(endDateTime),
      allDay: !event.start.dateTime, // Se não tem hora, é dia inteiro
      attendees: (event.attendees || []).map(att => ({
        email: att.email!,
        name: att.displayName,
        responseStatus: att.responseStatus as any,
      })),
      color: event.colorId,
      created: event.created ? new Date(event.created) : undefined,
      updated: event.updated ? new Date(event.updated) : undefined,
      htmlLink: event.htmlLink,
      organizer: event.organizer ? {
        email: event.organizer.email!,
        name: event.organizer.displayName,
      } : undefined,
    })
  }

  return events
}

/**
 * Cria um novo evento no Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  refreshToken: string,
  event: Omit<GoogleCalendarEvent, 'id' | 'created' | 'updated' | 'htmlLink'>,
  calendarId: string = 'primary'
): Promise<string> {
  const auth = createGoogleOAuth2Client(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.allDay
        ? { date: event.startDate.toISOString().split('T')[0] }
        : { dateTime: event.startDate.toISOString() },
      end: event.allDay
        ? { date: event.endDate.toISOString().split('T')[0] }
        : { dateTime: event.endDate.toISOString() },
      attendees: event.attendees?.map(att => ({
        email: att.email,
        displayName: att.name,
      })),
      colorId: event.color,
    },
  })

  return response.data.id!
}

/**
 * Atualiza um evento existente
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  refreshToken: string,
  eventId: string,
  updates: Partial<Omit<GoogleCalendarEvent, 'id' | 'created' | 'updated'>>,
  calendarId: string = 'primary'
): Promise<void> {
  const auth = createGoogleOAuth2Client(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const updateData: any = {}

  if (updates.summary !== undefined) updateData.summary = updates.summary
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.location !== undefined) updateData.location = updates.location
  if (updates.startDate) {
    updateData.start = updates.allDay
      ? { date: updates.startDate.toISOString().split('T')[0] }
      : { dateTime: updates.startDate.toISOString() }
  }
  if (updates.endDate) {
    updateData.end = updates.allDay
      ? { date: updates.endDate.toISOString().split('T')[0] }
      : { dateTime: updates.endDate.toISOString() }
  }
  if (updates.attendees) {
    updateData.attendees = updates.attendees.map(att => ({
      email: att.email,
      displayName: att.name,
    }))
  }
  if (updates.color !== undefined) updateData.colorId = updates.color

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: updateData,
  })
}

/**
 * Deleta um evento
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  refreshToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  const auth = createGoogleOAuth2Client(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  await calendar.events.delete({
    calendarId,
    eventId,
  })
}

/**
 * Testa a conexão com Google Calendar
 */
export async function testGoogleCalendarConnection(
  accessToken: string,
  refreshToken?: string
): Promise<{
  success: boolean
  message: string
  calendars?: number
  userEmail?: string
}> {
  try {
    const auth = createGoogleOAuth2Client(accessToken, refreshToken)
    const calendar = google.calendar({ version: 'v3', auth })

    // Buscar informações do usuário
    const oauth2 = google.oauth2({ version: 'v2', auth })
    const userInfo = await oauth2.userinfo.get()

    // Buscar calendários
    const calendars = await getGoogleCalendars(accessToken, refreshToken)

    return {
      success: true,
      message: `Conexão bem-sucedida! ${calendars.length} calendário(s) encontrado(s).`,
      calendars: calendars.length,
      userEmail: userInfo.data.email || undefined,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Erro ao testar conexão',
    }
  }
}
