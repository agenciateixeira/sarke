'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarEvent, useCalendarEvents, EventType } from '@/hooks/useCalendarEvents'
import { CalendarEvent as CalendarEventComponent } from './CalendarEvent'
import { X, Plus, Clock, Mail, Users, Palette } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface QuickEventSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

// Gerar horários (horas)
const generateHours = () => {
  const hours = []
  for (let hour = 0; hour < 24; hour++) {
    hours.push(hour.toString().padStart(2, '0'))
  }
  return hours
}

// Gerar minutos
const generateMinutes = () => {
  const minutes = []
  for (let minute = 0; minute < 60; minute++) {
    minutes.push(minute.toString().padStart(2, '0'))
  }
  return minutes
}

const hours = generateHours()
const minutes = generateMinutes()

const eventTypeOptions = [
  { value: 'meeting', label: 'Reunião', color: '#3b82f6' },
  { value: 'task', label: 'Tarefa', color: '#10b981' },
  { value: 'reminder', label: 'Lembrete', color: '#f59e0b' },
  { value: 'project_milestone', label: 'Marco do Projeto', color: '#8b5cf6' },
  { value: 'client_appointment', label: 'Compromisso', color: '#ff2697' },
]

const colorOptions = [
  { name: 'Azul', color: '#3b82f6' },
  { name: 'Verde', color: '#10b981' },
  { name: 'Amarelo', color: '#f59e0b' },
  { name: 'Roxo', color: '#8b5cf6' },
  { name: 'Rosa Sarke', color: '#ff2697' },
  { name: 'Vermelho', color: '#ef4444' },
  { name: 'Ciano', color: '#06b6d4' },
  { name: 'Laranja', color: '#f97316' },
]

export function QuickEventSheet({ open, onOpenChange, date, events, onEventClick }: QuickEventSheetProps) {
  const { createEvent } = useCalendarEvents()

  const [title, setTitle] = useState('')
  const [startHour, setStartHour] = useState('09')
  const [startMinute, setStartMinute] = useState('00')
  const [eventType, setEventType] = useState<EventType>('meeting')
  const [selectedColor, setSelectedColor] = useState('#ff2697')
  const [participantEmail, setParticipantEmail] = useState('')
  const [participants, setParticipants] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleAddParticipant = () => {
    if (!participantEmail) return

    // Validação simples de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(participantEmail)) {
      alert('Por favor, insira um email válido')
      return
    }

    if (participants.includes(participantEmail)) {
      alert('Este email já foi adicionado')
      return
    }

    setParticipants([...participants, participantEmail])
    setParticipantEmail('')
  }

  const handleRemoveParticipant = (email: string) => {
    setParticipants(participants.filter(p => p !== email))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !date) return

    setLoading(true)

    try {
      const startDateTime = new Date(date)
      startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)

      const endDateTime = new Date(startDateTime)
      endDateTime.setHours(endDateTime.getHours() + 1) // +1 hora por padrão

      await createEvent({
        title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        event_type: eventType,
        color: selectedColor
      })

      // Reset form
      setTitle('')
      setStartHour('09')
      setStartMinute('00')
      setEventType('meeting')
      setSelectedColor('#ff2697')
      setParticipants([])
      setParticipantEmail('')
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating event:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!date) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl">
            {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Eventos do Dia */}
          {events.length > 0 && (
            <div className="px-6">
              <h3 className="text-sm font-semibold mb-3">Eventos do dia</h3>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {events.map((event) => (
                    <CalendarEventComponent
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                      showDate={false}
                    />
                  ))}
                </div>
              </ScrollArea>
              <Separator className="my-4" />
            </div>
          )}

          {/* Formulário Rápido */}
          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <h3 className="text-sm font-semibold mb-4">Criar novo evento</h3>

            <div className="space-y-4">
              {/* Horário */}
              <div className="space-y-2">
                <Label htmlFor="time">Horário</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Select value={startHour} onValueChange={setStartHour}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {hours.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-semibold">:</span>
                  <Select value={startMinute} onValueChange={setStartMinute}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {minutes.map((minute) => (
                          <SelectItem key={minute} value={minute}>
                            {minute}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Nome do evento"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={eventType} onValueChange={(value) => setEventType(value as EventType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Participantes */}
              <div className="space-y-2">
                <Label htmlFor="participants">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participantes (opcional)
                  </div>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="participants"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={participantEmail}
                    onChange={(e) => setParticipantEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddParticipant()
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddParticipant}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {participants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {participants.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1">
                        <Mail className="h-3 w-3" />
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(email)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Cor do Evento */}
              <div className="space-y-2">
                <Label htmlFor="color">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor do evento
                  </div>
                </Label>
                <div className="grid grid-cols-8 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.color}
                      type="button"
                      onClick={() => setSelectedColor(option.color)}
                      className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                        selectedColor === option.color
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                      }`}
                      style={{ backgroundColor: option.color }}
                      title={option.name}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Evento
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
