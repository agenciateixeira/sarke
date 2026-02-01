'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
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
import { Calendar, Clock, Loader2 } from 'lucide-react'

interface CreateMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId?: string
  conversationType?: 'direct' | 'group'
  currentUserId: string | null
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
  conversationId,
  conversationType,
  currentUserId,
}: CreateMeetingDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [duration, setDuration] = useState('60')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUserId) {
      toast.error('Usuário não autenticado')
      return
    }

    if (!title.trim()) {
      toast.error('Digite um título para a reunião')
      return
    }

    if (!scheduledFor) {
      toast.error('Selecione data e hora para a reunião')
      return
    }

    setLoading(true)
    try {
      // Criar reunião
      const { data: meeting, error: meetingError } = await supabase
        .from('scheduled_meetings')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          scheduled_for: new Date(scheduledFor).toISOString(),
          duration_minutes: parseInt(duration),
          created_by: currentUserId,
          conversation_id: conversationId,
          conversation_type: conversationType,
          status: 'scheduled',
        })
        .select()
        .single()

      if (meetingError) throw meetingError

      // Se for conversa direta, adicionar o outro usuário como participante
      if (conversationType === 'direct' && conversationId) {
        await supabase.from('meeting_participants').insert({
          meeting_id: meeting.id,
          user_id: conversationId,
          status: 'pending',
        })
      }

      // Se for grupo, adicionar todos os membros como participantes
      if (conversationType === 'group' && conversationId) {
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', conversationId)
          .neq('user_id', currentUserId)

        if (members && members.length > 0) {
          await supabase.from('meeting_participants').insert(
            members.map((member) => ({
              meeting_id: meeting.id,
              user_id: member.user_id,
              status: 'pending',
            }))
          )
        }
      }

      toast.success('Reunião agendada com sucesso!')
      handleClose()
    } catch (err) {
      console.error('Error creating meeting:', err)
      toast.error('Erro ao agendar reunião')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setScheduledFor('')
    setDuration('60')
    onOpenChange(false)
  }

  // Função para gerar datetime-local mínimo (agora)
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Agendar Reunião</DialogTitle>
            <DialogDescription>
              Crie uma nova reunião e convide os participantes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Reunião de planejamento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo da reunião..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled-for">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Data e Hora *
                </Label>
                <Input
                  id="scheduled-for"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={getMinDateTime()}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Duração (min) *
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                'Agendar Reunião'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
