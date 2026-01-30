'use client'

import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarEvent as CalendarEventType } from '@/hooks/useCalendarEvents'
import { CalendarEvent } from './CalendarEvent'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Plus,
  Calendar,
  Video,
  CheckSquare,
  Bell,
  Building,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DayDetailPanelProps {
  date: Date | null
  events: CalendarEventType[]
  onClose: () => void
  onCreateEvent: () => void
  onEventClick: (event: CalendarEventType) => void
}

export function DayDetailPanel({
  date,
  events,
  onClose,
  onCreateEvent,
  onEventClick
}: DayDetailPanelProps) {
  if (!date) return null

  const isDayToday = isToday(date)

  // Agrupar eventos por tipo
  const eventsByType = events.reduce((acc, event) => {
    if (!acc[event.event_type]) {
      acc[event.event_type] = []
    }
    acc[event.event_type].push(event)
    return acc
  }, {} as Record<string, CalendarEventType[]>)

  const meetings = eventsByType.meeting || []
  const tasks = eventsByType.task || []
  const reminders = eventsByType.reminder || []
  const projectMilestones = eventsByType.project_milestone || []
  const clientAppointments = eventsByType.client_appointment || []

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="p-6 border-b space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl p-3 min-w-[70px]',
                  isDayToday
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <span className="text-xs font-medium uppercase">
                  {format(date, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-3xl font-bold">
                  {format(date, 'd')}
                </span>
                <span className="text-xs">
                  {format(date, 'MMM', { locale: ptBR })}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isDayToday && 'Hoje • '}
                  {events.length} {events.length === 1 ? 'compromisso' : 'compromissos'}
                </p>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-2 flex-wrap">
          {meetings.length > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <Video className="h-3 w-3" />
              {meetings.length} {meetings.length === 1 ? 'reunião' : 'reuniões'}
            </Badge>
          )}
          {tasks.length > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <CheckSquare className="h-3 w-3" />
              {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
            </Badge>
          )}
          {reminders.length > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <Bell className="h-3 w-3" />
              {reminders.length} {reminders.length === 1 ? 'lembrete' : 'lembretes'}
            </Badge>
          )}
          {projectMilestones.length > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <Building className="h-3 w-3" />
              {projectMilestones.length} {projectMilestones.length === 1 ? 'marco' : 'marcos'}
            </Badge>
          )}
          {clientAppointments.length > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <User className="h-3 w-3" />
              {clientAppointments.length} compromisso{clientAppointments.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <Button onClick={onCreateEvent} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Novo Compromisso
        </Button>
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum compromisso neste dia
              </p>
              <Button onClick={onCreateEvent} variant="outline" size="sm">
                <Plus className="mr-2 h-3 w-3" />
                Criar primeiro compromisso
              </Button>
            </div>
          ) : (
            <>
              {/* Reuniões */}
              {meetings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Reuniões</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {meetings.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {meetings.map((event) => (
                      <CalendarEvent
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tarefas */}
              {tasks.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">Tarefas</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {tasks.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {tasks.map((event) => (
                        <CalendarEvent
                          key={event.id}
                          event={event}
                          onClick={() => onEventClick(event)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Lembretes */}
              {reminders.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">Lembretes</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {reminders.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {reminders.map((event) => (
                        <CalendarEvent
                          key={event.id}
                          event={event}
                          onClick={() => onEventClick(event)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Marcos de Projeto */}
              {projectMilestones.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">Marcos de Projeto</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {projectMilestones.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {projectMilestones.map((event) => (
                        <CalendarEvent
                          key={event.id}
                          event={event}
                          onClick={() => onEventClick(event)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Compromissos com Clientes */}
              {clientAppointments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">Compromissos com Clientes</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {clientAppointments.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {clientAppointments.map((event) => (
                        <CalendarEvent
                          key={event.id}
                          event={event}
                          onClick={() => onEventClick(event)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
