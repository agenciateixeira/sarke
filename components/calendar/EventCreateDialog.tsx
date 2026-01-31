'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCalendarEvents, EventType, CreateEventData } from '@/hooks/useCalendarEvents'
import { useClients } from '@/hooks/useClients'
import { Video, CheckSquare, Bell, Building, User, Calendar, Clock, MapPin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface EventCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  onSuccess?: () => void
}

const eventTypeOptions = [
  {
    value: 'meeting',
    label: 'Reunião',
    icon: Video,
    color: '#3b82f6',
    description: 'Reunião com equipe ou clientes'
  },
  {
    value: 'task',
    label: 'Tarefa',
    icon: CheckSquare,
    color: '#10b981',
    description: 'Tarefa a ser realizada'
  },
  {
    value: 'reminder',
    label: 'Lembrete',
    icon: Bell,
    color: '#f59e0b',
    description: 'Lembrete ou notificação'
  },
  {
    value: 'project_milestone',
    label: 'Marco do Projeto',
    icon: Building,
    color: '#8b5cf6',
    description: 'Entrega ou marco importante'
  },
  {
    value: 'client_appointment',
    label: 'Compromisso com Cliente',
    icon: User,
    color: '#ff2697',
    description: 'Visita ou compromisso com cliente'
  }
]

const colorOptions = [
  { value: '#ff2697', label: 'Rosa Sarke' },
  { value: '#3a4a46', label: 'Verde Sarke' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Laranja' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#6366f1', label: 'Índigo' },
]

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

export function EventCreateDialog({ open, onOpenChange, selectedDate, onSuccess }: EventCreateDialogProps) {
  const { createEvent } = useCalendarEvents()
  const { clients } = useClients()

  const [loading, setLoading] = useState(false)
  const [eventType, setEventType] = useState<EventType>('meeting')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startHour, setStartHour] = useState('09')
  const [startMinute, setStartMinute] = useState('00')
  const [endHour, setEndHour] = useState('10')
  const [endMinute, setEndMinute] = useState('00')
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [clientId, setClientId] = useState('')
  const [color, setColor] = useState('#ff2697')

  useEffect(() => {
    if (selectedDate) {
      setStartDate(format(selectedDate, 'yyyy-MM-dd'))
    }
  }, [selectedDate])

  useEffect(() => {
    const selectedType = eventTypeOptions.find(opt => opt.value === eventType)
    if (selectedType) {
      setColor(selectedType.color)
    }
  }, [eventType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !startDate) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setLoading(true)

    try {
      const startDateTime = isAllDay
        ? new Date(startDate).toISOString()
        : new Date(`${startDate}T${startHour}:${startMinute}:00`).toISOString()

      const endDateTime = isAllDay
        ? new Date(startDate).toISOString()
        : new Date(`${startDate}T${endHour}:${endMinute}:00`).toISOString()

      const eventData: CreateEventData = {
        title,
        description,
        start_time: startDateTime,
        end_time: endDateTime,
        is_all_day: isAllDay,
        event_type: eventType,
        client_id: (clientId && clientId !== 'none') ? clientId : undefined,
        location,
        color
      }

      const result = await createEvent(eventData)

      if (result) {
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (err) {
      console.error('Error creating event:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStartHour('09')
    setStartMinute('00')
    setEndHour('10')
    setEndMinute('00')
    setIsAllDay(false)
    setLocation('')
    setClientId('none')
    setEventType('meeting')
    setColor('#ff2697')
  }

  const handleClose = () => {
    if (!loading) {
      resetForm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-0">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Novo Compromisso</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <>
                  Criar compromisso para{' '}
                  <strong>{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto px-6">
            <div className="space-y-6 pb-4">
              {/* Tipo de Evento */}
              <div className="space-y-3">
                <Label>Tipo de Compromisso</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {eventTypeOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setEventType(option.value as EventType)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          eventType === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className="h-5 w-5" style={{ color: option.color }} />
                        <span className="text-xs font-medium text-center">{option.label}</span>
                      </button>
                    )
                  })}
                </div>
                {eventTypeOptions.find(opt => opt.value === eventType)?.description && (
                  <p className="text-xs text-muted-foreground">
                    {eventTypeOptions.find(opt => opt.value === eventType)?.description}
                  </p>
                )}
              </div>

              <Separator />

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Nome do compromisso"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Adicione detalhes sobre o compromisso..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={loading}
                />
              </div>

              <Separator />

              {/* Data e Hora */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Dia inteiro</Label>
                  <Switch
                    checked={isAllDay}
                    onCheckedChange={setIsAllDay}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {!isAllDay && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="startTime">Horário de Início</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Select value={startHour} onValueChange={setStartHour} disabled={loading}>
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
                          <Select value={startMinute} onValueChange={setStartMinute} disabled={loading}>
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

                      <div className="space-y-2 sm:col-start-2">
                        <Label htmlFor="endTime">Horário de Término</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Select value={endHour} onValueChange={setEndHour} disabled={loading}>
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
                          <Select value={endMinute} onValueChange={setEndMinute} disabled={loading}>
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
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="client">Cliente (Opcional)</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Select value={clientId} onValueChange={setClientId} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum cliente</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Localização */}
              <div className="space-y-2">
                <Label htmlFor="location">Localização (Opcional)</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="Endereço ou link da reunião"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <Separator />

              {/* Cor */}
              <div className="space-y-2">
                <Label>Cor do Evento</Label>
                <div className="grid grid-cols-8 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setColor(option.value)}
                      className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                        color === option.value
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                      }`}
                      style={{ backgroundColor: option.value }}
                      title={option.label}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t bg-background">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Compromisso'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
