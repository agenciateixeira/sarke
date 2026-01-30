'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarEvent as CalendarEventType } from '@/hooks/useCalendarEvents'
import { cn } from '@/lib/utils'
import {
  Video,
  Users,
  CheckSquare,
  Bell,
  MapPin,
  Building,
  User,
  Calendar as CalendarIcon,
  Clock
} from 'lucide-react'

interface CalendarEventProps {
  event: CalendarEventType
  onClick?: () => void
  compact?: boolean
  showDate?: boolean
}

const eventTypeConfig = {
  meeting: {
    icon: Video,
    label: 'Reunião',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-700 dark:text-blue-400'
  },
  task: {
    icon: CheckSquare,
    label: 'Tarefa',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-500',
    textColor: 'text-green-700 dark:text-green-400'
  },
  reminder: {
    icon: Bell,
    label: 'Lembrete',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-700 dark:text-amber-400'
  },
  project_milestone: {
    icon: Building,
    label: 'Marco do Projeto',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-700 dark:text-purple-400'
  },
  client_appointment: {
    icon: User,
    label: 'Compromisso',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-500',
    textColor: 'text-pink-700 dark:text-pink-400'
  }
}

export function CalendarEvent({ event, onClick, compact = false, showDate = false }: CalendarEventProps) {
  const config = eventTypeConfig[event.event_type]
  const Icon = config.icon

  const startTime = new Date(event.start_time)
  const endTime = new Date(event.end_time)

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'group px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all hover:shadow-md',
          'border-l-3',
          config.bgColor
        )}
        style={{
          borderLeft: `3px solid ${event.color}`,
        }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: event.color }}
          />
          <span className="truncate" style={{ color: event.color }}>
            {event.title}
          </span>
        </div>
        {event.start_time && !event.is_all_day && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-3">
            {format(startTime, 'HH:mm')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-lg',
        config.bgColor,
        'hover:scale-[1.01]'
      )}
      style={{
        borderLeftColor: event.color
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${event.color}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: event.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1 mb-1">
              {event.title}
            </h3>
            {event.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {event.status !== 'scheduled' && (
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0',
            event.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
            event.status === 'cancelled' && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
            event.status === 'in_progress' && 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
          )}>
            {event.status === 'completed' && 'Concluído'}
            {event.status === 'cancelled' && 'Cancelado'}
            {event.status === 'in_progress' && 'Em andamento'}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2">
        {/* Data/Hora */}
        {showDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {format(startTime, "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
        )}

        {!event.is_all_day && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
            </span>
          </div>
        )}

        {/* Cliente */}
        {event.client_name && (
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium truncate">{event.client_name}</span>
          </div>
        )}

        {/* Projeto */}
        {event.project_name && (
          <div className="flex items-center gap-2 text-xs">
            <Building className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium truncate">{event.project_name}</span>
          </div>
        )}

        {/* Localização */}
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Google Meet */}
        {event.meet_link && (
          <div className="flex items-center gap-2 text-xs">
            <Video className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
            <a
              href={event.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              Entrar na reunião
            </a>
          </div>
        )}

        {/* Participantes */}
        {event.participants && event.participants.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{event.participants.length} participante{event.participants.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
