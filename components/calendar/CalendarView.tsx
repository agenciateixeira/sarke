'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Clock,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const locales = {
  'pt-BR': ptBR,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales,
})

export interface CalendarEventData {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  description?: string
  location?: string
  attendees?: Array<{
    email: string
    name?: string
    responseStatus?: string
  }>
  color?: string
  htmlLink?: string
}

interface CalendarViewProps {
  events: CalendarEventData[]
  onSelectEvent?: (event: CalendarEventData) => void
  onNavigate?: (date: Date) => void
  onViewChange?: (view: View) => void
  defaultView?: View
  defaultDate?: Date
}

export function CalendarView({
  events,
  onSelectEvent,
  onNavigate,
  onViewChange,
  defaultView = 'month',
  defaultDate = new Date(),
}: CalendarViewProps) {
  const [view, setView] = useState<View>(defaultView)
  const [date, setDate] = useState(defaultDate)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null)

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate)
    onNavigate?.(newDate)
  }, [onNavigate])

  const handleViewChange = useCallback((newView: View) => {
    setView(newView)
    onViewChange?.(newView)
  }, [onViewChange])

  const handleSelectEvent = useCallback((event: CalendarEventData) => {
    setSelectedEvent(event)
    onSelectEvent?.(event)
  }, [onSelectEvent])

  const eventStyleGetter = useCallback((event: CalendarEventData) => {
    const colors: Record<string, string> = {
      '1': '#a4bdfc',
      '2': '#7ae7bf',
      '3': '#dbadff',
      '4': '#ff887c',
      '5': '#fbd75b',
      '6': '#ffb878',
      '7': '#46d6db',
      '8': '#e1e1e1',
      '9': '#5484ed',
      '10': '#51b749',
      '11': '#dc2127',
    }

    const backgroundColor = event.color ? colors[event.color] || '#3b82f6' : '#3b82f6'

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    }
  }, [])

  const messages = {
    allDay: 'Dia inteiro',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Não há eventos neste período.',
    showMore: (total: number) => `+ ${total} mais`,
  }

  return (
    <>
      <Card className="p-4">
        <div style={{ height: '700px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            allDayAccessor="allDay"
            view={view}
            onView={handleViewChange}
            date={date}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            messages={messages}
            culture="pt-BR"
            popup
            selectable
            style={{ height: '100%' }}
          />
        </div>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {selectedEvent.allDay ? (
                      format(selectedEvent.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      <>
                        {format(selectedEvent.start, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        {' - '}
                        {format(selectedEvent.end, "HH:mm", { locale: ptBR })}
                      </>
                    )}
                  </p>
                  {selectedEvent.allDay && (
                    <Badge variant="secondary" className="mt-1">Dia inteiro</Badge>
                  )}
                </div>
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Descrição</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Local</p>
                    <p className="text-sm text-muted-foreground">{selectedEvent.location}</p>
                  </div>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">
                      Participantes ({selectedEvent.attendees.length})
                    </p>
                    <div className="space-y-1">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>{attendee.name || attendee.email}</span>
                          {attendee.responseStatus && (
                            <Badge
                              variant={
                                attendee.responseStatus === 'accepted' ? 'default' :
                                attendee.responseStatus === 'declined' ? 'destructive' :
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {attendee.responseStatus === 'accepted' && 'Confirmado'}
                              {attendee.responseStatus === 'declined' && 'Recusado'}
                              {attendee.responseStatus === 'tentative' && 'Talvez'}
                              {attendee.responseStatus === 'needsAction' && 'Pendente'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedEvent.htmlLink && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(selectedEvent.htmlLink, '_blank')}
                >
                  Abrir no Google Calendar
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
