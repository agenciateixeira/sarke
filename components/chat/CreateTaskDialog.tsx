'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Loader2 } from 'lucide-react'

interface Profile {
  id: string
  name: string
  avatar_url?: string
}

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId?: string
  conversationType?: 'direct' | 'group'
  currentUserId: string | null
  parentTaskId?: string
  isSubtask?: boolean
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  conversationId,
  conversationType,
  currentUserId,
  parentTaskId,
  isSubtask = false,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [loading, setLoading] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])

  useEffect(() => {
    if (!open || !conversationId) return

    const fetchAvailableUsers = async () => {
      try {
        if (conversationType === 'direct') {
          // Para conversa direta, buscar apenas o outro usuário
          const { data: user } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', conversationId)
            .single()

          if (user) {
            setAvailableUsers([user])
          }
        } else if (conversationType === 'group') {
          // Para grupo, buscar todos os membros
          const { data: members } = await supabase
            .from('group_members')
            .select('user_id, profiles:user_id(id, name, avatar_url)')
            .eq('group_id', conversationId)

          if (members) {
            const users = members
              .map((m: any) => m.profiles)
              .filter((p: any) => p !== null)
            setAvailableUsers(users)
          }
        }
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }

    fetchAvailableUsers()
  }, [open, conversationId, conversationType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUserId) {
      toast.error('Usuário não autenticado')
      return
    }

    if (!title.trim()) {
      toast.error('Digite um título para a tarefa')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('chat_tasks').insert({
        title: title.trim(),
        description: description.trim() || null,
        assigned_to: assignedTo || null,
        created_by: currentUserId,
        conversation_id: conversationId,
        conversation_type: conversationType,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        status: 'pending',
        parent_task_id: parentTaskId || null,
      })

      if (error) throw error

      toast.success(
        isSubtask ? 'Subtarefa criada com sucesso!' : 'Tarefa criada com sucesso!'
      )
      handleClose()
    } catch (err) {
      console.error('Error creating task:', err)
      toast.error('Erro ao criar tarefa')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setAssignedTo('')
    setDueDate('')
    setPriority('medium')
    onOpenChange(false)
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isSubtask ? 'Criar Subtarefa' : 'Criar Tarefa'}
            </DialogTitle>
            <DialogDescription>
              {isSubtask
                ? 'Crie uma subtarefa vinculada à tarefa principal'
                : 'Crie uma nova tarefa e atribua a um membro da equipe'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Revisar documento"
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
                placeholder="Descreva a tarefa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assigned-to">Atribuir a</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger id="assigned-to">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={priority}
                  onValueChange={(value: any) => setPriority(value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Baixa
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        Média
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Alta
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due-date">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data de Vencimento
              </Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={getMinDate()}
              />
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
                  Criando...
                </>
              ) : isSubtask ? (
                'Criar Subtarefa'
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
