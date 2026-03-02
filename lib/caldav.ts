import { createDAVClient } from 'tsdav'
import ICAL from 'ical.js'

export interface CalDAVConfig {
  serverUrl: string
  username: string
  password: string
  calendarUrl?: string
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  startDate: Date
  endDate: Date
  allDay?: boolean
  attendees?: string[]
  created?: Date
  updated?: Date
}

/**
 * Conecta ao servidor CalDAV da Hostgator
 */
export async function connectCalDAV(config: CalDAVConfig) {
  try {
    const client = await createDAVClient({
      serverUrl: config.serverUrl,
      credentials: {
        username: config.username,
        password: config.password,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    })

    return client
  } catch (error: any) {
    console.error('Erro ao conectar CalDAV:', error)
    throw new Error(`Falha na conexão: ${error.message}`)
  }
}

/**
 * Busca todos os calendários do usuário
 */
export async function getCalendars(config: CalDAVConfig) {
  const client = await connectCalDAV(config)
  const calendars = await client.fetchCalendars()

  return calendars.map(cal => ({
    url: cal.url,
    displayName: cal.displayName,
    description: cal.description,
    components: cal.components,
  }))
}

/**
 * Busca eventos de um calendário
 */
export async function getCalendarEvents(
  config: CalDAVConfig,
  startDate?: Date,
  endDate?: Date
): Promise<CalendarEvent[]> {
  const client = await connectCalDAV(config)

  const calendars = await client.fetchCalendars()
  if (calendars.length === 0) {
    throw new Error('Nenhum calendário encontrado')
  }

  const calendarUrl = config.calendarUrl || calendars[0].url

  const calendarObjects = await client.fetchCalendarObjects({
    calendar: calendars.find(c => c.url === calendarUrl) || calendars[0],
    timeRange: startDate && endDate ? {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    } : undefined,
  })

  const events: CalendarEvent[] = []

  for (const obj of calendarObjects) {
    try {
      const jcalData = ICAL.parse(obj.data)
      const comp = new ICAL.Component(jcalData)
      const vevent = comp.getFirstSubcomponent('vevent')

      if (!vevent) continue

      const event = new ICAL.Event(vevent)

      events.push({
        id: obj.url,
        summary: event.summary || 'Sem título',
        description: event.description || '',
        location: event.location || '',
        startDate: event.startDate.toJSDate(),
        endDate: event.endDate.toJSDate(),
        allDay: event.startDate.isDate,
        attendees: event.attendees.map(a => a.getParameter('cn') || a.getFirstValue()),
        created: event.component.getFirstPropertyValue('created')?.toJSDate(),
        updated: event.component.getFirstPropertyValue('last-modified')?.toJSDate(),
      })
    } catch (error) {
      console.error('Erro ao parsear evento:', error)
    }
  }

  return events
}

/**
 * Cria um novo evento no calendário
 */
export async function createCalendarEvent(
  config: CalDAVConfig,
  event: Omit<CalendarEvent, 'id' | 'created' | 'updated'>
): Promise<string> {
  const client = await connectCalDAV(config)

  const calendars = await client.fetchCalendars()
  if (calendars.length === 0) {
    throw new Error('Nenhum calendário encontrado')
  }

  const calendar = calendars.find(c => c.url === config.calendarUrl) || calendars[0]

  // Criar iCalendar
  const comp = new ICAL.Component(['vcalendar', [], []])
  comp.updatePropertyWithValue('prodid', '-//Sarke//Calendar//PT')
  comp.updatePropertyWithValue('version', '2.0')

  const vevent = new ICAL.Component('vevent')
  const eventComp = new ICAL.Event(vevent)

  // Gerar UID único
  const uid = `${Date.now()}@sarke.app`
  eventComp.uid = uid
  eventComp.summary = event.summary
  eventComp.description = event.description || ''
  eventComp.location = event.location || ''

  // Datas
  const startTime = ICAL.Time.fromJSDate(event.startDate, false)
  const endTime = ICAL.Time.fromJSDate(event.endDate, false)

  if (event.allDay) {
    startTime.isDate = true
    endTime.isDate = true
  }

  eventComp.startDate = startTime
  eventComp.endDate = endTime

  // Adicionar participantes
  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach(attendee => {
      const attendeeProp = new ICAL.Property('attendee')
      attendeeProp.setParameter('cn', attendee)
      attendeeProp.setValue(`mailto:${attendee}`)
      vevent.addProperty(attendeeProp)
    })
  }

  comp.addSubcomponent(vevent)

  const iCalString = comp.toString()

  const result = await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString,
  })

  return result.url || uid
}

/**
 * Atualiza um evento existente
 */
export async function updateCalendarEvent(
  config: CalDAVConfig,
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id'>>
): Promise<void> {
  const client = await connectCalDAV(config)

  const calendars = await client.fetchCalendars()
  const calendar = calendars.find(c => c.url === config.calendarUrl) || calendars[0]

  // Buscar evento existente
  const calendarObjects = await client.fetchCalendarObjects({
    calendar,
  })

  const existingObject = calendarObjects.find(obj => obj.url === eventId)
  if (!existingObject) {
    throw new Error('Evento não encontrado')
  }

  // Parsear e atualizar
  const jcalData = ICAL.parse(existingObject.data)
  const comp = new ICAL.Component(jcalData)
  const vevent = comp.getFirstSubcomponent('vevent')

  if (!vevent) {
    throw new Error('Evento inválido')
  }

  const event = new ICAL.Event(vevent)

  // Aplicar atualizações
  if (updates.summary !== undefined) event.summary = updates.summary
  if (updates.description !== undefined) event.description = updates.description
  if (updates.location !== undefined) event.location = updates.location
  if (updates.startDate) {
    const startTime = ICAL.Time.fromJSDate(updates.startDate, false)
    if (updates.allDay) startTime.isDate = true
    event.startDate = startTime
  }
  if (updates.endDate) {
    const endTime = ICAL.Time.fromJSDate(updates.endDate, false)
    if (updates.allDay) endTime.isDate = true
    event.endDate = endTime
  }

  // Atualizar timestamp
  vevent.updatePropertyWithValue('last-modified', ICAL.Time.now())

  const iCalString = comp.toString()

  await client.updateCalendarObject({
    calendarObject: {
      url: eventId,
      data: iCalString,
      etag: existingObject.etag,
    },
  })
}

/**
 * Deleta um evento
 */
export async function deleteCalendarEvent(
  config: CalDAVConfig,
  eventId: string
): Promise<void> {
  const client = await connectCalDAV(config)

  await client.deleteCalendarObject({
    calendarObject: {
      url: eventId,
      etag: '',
    },
  })
}

/**
 * Testa a conexão CalDAV
 */
export async function testCalDAVConnection(config: CalDAVConfig): Promise<{
  success: boolean
  message: string
  calendars?: number
}> {
  try {
    const calendars = await getCalendars(config)
    return {
      success: true,
      message: `Conexão bem-sucedida! ${calendars.length} calendário(s) encontrado(s).`,
      calendars: calendars.length,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Erro ao testar conexão',
    }
  }
}
