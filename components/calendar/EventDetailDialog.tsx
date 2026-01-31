'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CalendarEvent, useCalendarEvents } from '@/hooks/useCalendarEvents'
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  Trash2,
  Edit,
  Video,
  User
} from 'lucide-react'
import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EventDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  onEdit?: (event: CalendarEvent) => void
}

const eventTypeLabels = {
  meeting: 'Reunião',
  task: 'Tarefa',
  reminder: 'Lembrete',
  project_milestone: 'Marco do Projeto',
  client_appointment: 'Compromisso'
}

const statusLabels = {
  scheduled: 'Agendado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  in_progress: 'Em Andamento'
}

export function EventDetailDialog({ open, onOpenChange, event, onEdit }: EventDetailDialogProps) {
  const { deleteEvent } = useCalendarEvents()
  const [deleting, setDeleting] = useState(false)

  if (!event) return null

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return

    setDeleting(true)
    try {
      await deleteEvent(event.id)
      onOpenChange(false)
    } catch (err) {
      console.error('Error deleting event:', err)
      alert('Erro ao excluir evento')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = () => {
    onEdit?.(event)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
        {/* Header with color bar */}
        <div
          className="h-2 w-full rounded-t-lg"
          style={{ backgroundColor: event.color }}
        />

        <DialogHeader className="px-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{event.title}</DialogTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {eventTypeLabels[event.event_type]}
                </Badge>
                <Badge
                  variant={event.status === 'completed' ? 'default' : 'outline'}
                  className={
                    event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    event.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : ''
                  }
                >
                  {statusLabels[event.status]}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-4 py-4">
            {/* Data e Hora */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {format(new Date(event.start_time), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {event.is_all_day ? (
                      'Dia inteiro'
                    ) : (
                      <>
                        {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Localização */}
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{event.location}</p>
                </div>
              )}

              {/* Link do Meet */}
              {event.meet_link && (
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <a
                    href={event.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Entrar na reunião
                  </a>
                </div>
              )}

              {/* Organizador */}
              {event.organizer_name && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Organizador</p>
                    <p className="text-sm text-muted-foreground">
                      {event.organizer_name}
                      {event.organizer_email && ` (${event.organizer_email})`}
                    </p>
                  </div>
                </div>
              )}

              {/* Participantes */}
              {event.participants && event.participants.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">Participantes</p>
                    <p className="text-sm text-muted-foreground">
                      {event.participants.length} {event.participants.length === 1 ? 'participante' : 'participantes'}
                    </p>
                  </div>
                </div>
              )}

              {/* Cliente */}
              {event.client_name && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Cliente</p>
                    <p className="text-sm text-muted-foreground">
                      {event.client_name}
                      {event.client_email && ` (${event.client_email})`}
                    </p>
                  </div>
                </div>
              )}

              {/* Projeto */}
              {event.project_name && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Projeto</p>
                    <p className="text-sm text-muted-foreground">{event.project_name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Descrição */}
            {event.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Descrição</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              </>
            )}

            {/* Lembretes */}
            {event.reminder_minutes && event.reminder_minutes.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Lembretes</p>
                  <div className="flex flex-wrap gap-2">
                    {event.reminder_minutes.map((minutes, index) => (
                      <Badge key={index} variant="outline">
                        {minutes < 60
                          ? `${minutes} minutos antes`
                          : `${Math.floor(minutes / 60)} hora${Math.floor(minutes / 60) > 1 ? 's' : ''} antes`
                        }
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Metadados */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Criado em: {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              {event.updated_at !== event.created_at && (
                <p>Última atualização: {format(new Date(event.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 flex gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {onEdit && (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
