'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Clock, AlarmClock, Users } from 'lucide-react'

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  onSave: (event: any) => void
}

export function EventDialog({ open, onOpenChange, selectedDate, onSave }: EventDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [time, setTime] = useState('09:00')
  const [type, setType] = useState<'event' | 'reminder' | 'meeting'>('event')
  const [color, setColor] = useState('#ff2697')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !selectedDate) return

    const newEvent = {
      id: Date.now().toString(),
      title,
      description,
      date: selectedDate,
      time,
      type,
      color,
    }

    onSave(newEvent)

    // Reset form
    setTitle('')
    setDescription('')
    setTime('09:00')
    setType('event')
    setColor('#ff2697')
    onOpenChange(false)
  }

  const typeOptions = [
    { value: 'event', label: 'Evento', icon: Calendar, color: '#ff2697' },
    { value: 'reminder', label: 'Lembrete', icon: AlarmClock, color: '#f59e0b' },
    { value: 'meeting', label: 'Reunião', icon: Users, color: '#3a4a46' },
  ]

  const colorOptions = [
    { value: '#ff2697', label: 'Rosa Sarke' },
    { value: '#3a4a46', label: 'Verde Sarke' },
    { value: '#f59e0b', label: 'Laranja' },
    { value: '#10b981', label: 'Verde' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#8b5cf6', label: 'Roxo' },
    { value: '#ef4444', label: 'Vermelho' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
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

          <div className="space-y-4 py-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setType(option.value as any)
                        setColor(option.color)
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        type === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" style={{ color: option.color }} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Nome do compromisso"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Horário */}
            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="max-w-[150px]"
                />
              </div>
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
              />
            </div>

            {/* Cor */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === option.value ? 'border-foreground scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
