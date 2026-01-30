'use client'

import { useState } from 'react'
import { format, isToday, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarView } from '@/components/calendar/CalendarView'
import { DayDetailPanel } from '@/components/calendar/DayDetailPanel'
import { EventCreateDialog } from '@/components/calendar/EventCreateDialog'
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog'
import { Button } from '@/components/ui/button'
import { Plus, CalendarDays, CalendarRange, CalendarClock, Database } from 'lucide-react'
import { useCalendarEvents, CalendarEvent as CalendarEventType } from '@/hooks/useCalendarEvents'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type ViewMode = 'month' | '7days' | '30days'

export default function CalendarioPage() {
  const { events, getEventsByDay, loading } = useCalendarEvents()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventType | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    // Não abrir nada ao clicar no card, apenas ao clicar no botão Adicionar
  }

  const handleEventClick = (event: CalendarEventType) => {
    setSelectedEvent(event)
    setDetailDialogOpen(true)
  }

  const handleNewEvent = () => {
    setSelectedDate(new Date())
    setDialogOpen(true)
  }

  const handleCreateFromPanel = () => {
    setDialogOpen(true)
  }

  const handleClosePanel = () => {
    setSelectedDate(null)
  }

  const getDaysToShow = () => {
    const now = new Date()

    switch (viewMode) {
      case '7days':
        const days7 = []
        for (let i = 6; i >= 0; i--) {
          days7.push(subDays(now, i))
        }
        return days7
      case '30days':
        const days30 = []
        for (let i = 29; i >= 0; i--) {
          days30.push(subDays(now, i))
        }
        return days30
      default:
        return []
    }
  }

  const daysToShow = getDaysToShow()
  const selectedDayEvents = selectedDate ? getEventsByDay(selectedDate) : []

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time)
      return format(eventDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Calendar Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Calendário</h1>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie seus eventos e compromissos
              </p>
            </div>
            <Button onClick={handleNewEvent}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Evento
            </Button>
          </div>

          {/* Filtros de Visualização */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Mês
            </Button>
            <Button
              variant={viewMode === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('7days')}
            >
              <CalendarRange className="mr-2 h-4 w-4" />
              Últimos 7 dias
            </Button>
            <Button
              variant={viewMode === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('30days')}
            >
              <CalendarRange className="mr-2 h-4 w-4" />
              Últimos 30 dias
            </Button>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-full mx-auto space-y-4 px-4">
            {/* Warning: Database not configured */}
            {events.length === 0 && !loading && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                <Database className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-900 dark:text-amber-100">
                  Banco de dados configurado - Aguardando eventos
                </AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <p className="mb-2">O banco está pronto! Comece criando seu primeiro evento clicando em "Novo Evento".</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Calendário ou Lista */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {viewMode === 'month' ? (
                <CalendarView
                  events={events}
                  onDateClick={handleDateClick}
                  onEventClick={handleEventClick}
                />
              ) : (
                <div className="p-6 h-full overflow-auto">
                  <h2 className="text-lg font-semibold mb-6">
                    {viewMode === '7days' && 'Últimos 7 Dias'}
                    {viewMode === '30days' && 'Últimos 30 Dias'}
                  </h2>

                  <div className={`grid ${
                    viewMode === '7days' ? 'grid-cols-7 gap-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3'
                  }`}>
                    {daysToShow.map((day, index) => {
                      const dayEvents = getEventsForDay(day)
                      const isDayToday = isToday(day)

                      return (
                        <div
                          key={index}
                          onClick={() => handleDateClick(day)}
                          className={`bg-card border-2 rounded-xl cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg flex flex-col ${
                            isDayToday ? 'border-primary' : 'border-border'
                          } ${viewMode === '7days' ? 'min-h-[500px]' : 'min-h-[200px]'}`}
                        >
                          {/* Header do Card */}
                          <div className={`p-4 border-b text-center ${
                            isDayToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                          }`}>
                            <p className="text-xs font-semibold uppercase tracking-wider">
                              {format(day, 'EEEE', { locale: ptBR })}
                            </p>
                            <p className="text-3xl font-bold my-1">
                              {format(day, 'd')}
                            </p>
                            <p className="text-xs opacity-90">
                              {format(day, 'MMMM yyyy', { locale: ptBR })}
                            </p>
                          </div>

                          {/* Lista de Eventos */}
                          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                            {dayEvents.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <CalendarClock className="h-8 w-8 mb-2 opacity-30" />
                                <p className="text-xs">Sem eventos</p>
                              </div>
                            ) : (
                              dayEvents.map((event) => (
                                <div
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEventClick(event)
                                  }}
                                  className="p-3 rounded-lg cursor-pointer transition-all hover:shadow-md border-l-4"
                                  style={{
                                    backgroundColor: `${event.color}10`,
                                    borderLeftColor: event.color,
                                  }}
                                >
                                  {!event.is_all_day && (
                                    <p className="text-xs font-bold mb-1" style={{ color: event.color }}>
                                      {format(new Date(event.start_time), 'HH:mm')}
                                    </p>
                                  )}
                                  <p className="text-sm font-semibold line-clamp-2">
                                    {event.title}
                                  </p>
                                  {event.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>

                          {/* Footer - Botão Add */}
                          <div className="p-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDate(day)
                                setDialogOpen(true)
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Day Detail Panel (Sidebar) - Only on Month View */}
      {selectedDate && viewMode === 'month' && (
        <div className="w-[400px] flex-shrink-0 hidden lg:block">
          <DayDetailPanel
            date={selectedDate}
            events={selectedDayEvents}
            onClose={handleClosePanel}
            onCreateEvent={handleCreateFromPanel}
            onEventClick={handleEventClick}
          />
        </div>
      )}

      {/* Create Event Dialog (para todos os modos) */}
      <EventCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        onSuccess={() => {
          // Event created successfully
        }}
      />

      {/* Event Detail Dialog (para visualizar detalhes do evento) */}
      <EventDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        event={selectedEvent}
      />
    </div>
  )
}
