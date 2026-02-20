'use client'

import { useState, useEffect } from 'react'
import { TaskWithDetails, Subtask, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@/types/tasks'
import { SubtaskGroupedList } from './SubtaskGroupedList'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  User,
  Flag,
  Plus,
  X,
  Edit,
  Trash,
  MessageSquare,
  Paperclip,
} from 'lucide-react'
import { useTaskPipeline } from '@/hooks/useTaskPipeline'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TaskTimeTracking } from './TaskTimeTracking'
import { TaskAttachmentsTab } from './TaskAttachmentsTab'
import { TaskComments } from './TaskComments'
import { supabase } from '@/lib/supabase'

interface TeamMemberSimple {
  id: string
  name: string
  avatar_url?: string
}

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: TaskWithDetails | null
}

export function TaskDetailModal({ open, onOpenChange, task }: TaskDetailModalProps) {
  const {
    updateTask,
    toggleTaskComplete,
    deleteTask,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskComplete,
    fetchSubtasks,
    fetchTaskById,
  } = useTaskPipeline()

  const [editMode, setEditMode] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDateInput, setDueDateInput] = useState('')
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false)
  const [deleteSubtaskId, setDeleteSubtaskId] = useState<string | null>(null)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [refreshedTask, setRefreshedTask] = useState<TaskWithDetails | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMemberSimple[]>([])

  const currentTask = refreshedTask || task

  // Carregar membros da equipe
  useEffect(() => {
    if (!open) return
    supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .order('name')
      .then(({ data }) => {
        if (data) setTeamMembers(data as TeamMemberSimple[])
      })
  }, [open])

  // Carregar subtarefas
  useEffect(() => {
    if (currentTask?.id) {
      loadSubtasks()
      refreshTask()
    }
  }, [currentTask?.id])

  // Sincronizar título, descrição e data
  useEffect(() => {
    if (currentTask) {
      setTitle(currentTask.title)
      setDescription(currentTask.description || '')
      // Garante formato YYYY-MM-DD para o input[type=date]
      const raw = currentTask.due_date || ''
      if (raw) {
        // due_date pode vir como '2026-03-02' ou '2026-03-02T00:00:00...'
        setDueDateInput(raw.substring(0, 10))
      } else {
        setDueDateInput('')
      }
    }
  }, [currentTask])

  const refreshTask = async () => {
    if (currentTask?.id) {
      const updated = await fetchTaskById(currentTask.id)
      if (updated) {
        setRefreshedTask(updated)
      }
    }
  }

  const loadSubtasks = async () => {
    if (currentTask?.id) {
      const data = await fetchSubtasks(currentTask.id)
      setSubtasks(data)
    }
  }

  // Atualizar tarefa
  const handleSaveTitle = async () => {
    if (currentTask && title.trim()) {
      await updateTask(currentTask.id, { title: title.trim() })
      setEditMode(false)
      await refreshTask()
    }
  }

  const handleSaveDescription = async () => {
    if (currentTask) {
      await updateTask(currentTask.id, { description })
      await refreshTask()
    }
  }

  const handleToggleComplete = async () => {
    if (currentTask) {
      await toggleTaskComplete(currentTask.id, !currentTask.is_completed)
      await refreshTask()
    }
  }

  const handleUpdateField = async (field: string, value: any) => {
    if (currentTask) {
      // Campos de data: string vazia → null, e valida o ano (>= 1000)
      let sanitized = value
      if (field === 'due_date') {
        if (!value) {
          sanitized = null
        } else {
          const year = parseInt(value.split('-')[0], 10)
          if (isNaN(year) || year < 1000 || year > 9999) return // ano incompleto, ignora
        }
      }
      await updateTask(currentTask.id, { [field]: sanitized })
      await refreshTask()
    }
  }

  const handleDelete = async () => {
    if (!currentTask) return
    await deleteTask(currentTask.id)
    setDeleteTaskOpen(false)
    onOpenChange(false)
  }

  // Subtarefas
  const handleCreateSubtask = async (data: { title: string; projeto_etapa: string; assigned_to?: string; priority?: string; due_date?: string }) => {
    if (currentTask) {
      await createSubtask({
        task_id: currentTask.id,
        ...data,
      })
      await loadSubtasks()
      await refreshTask()
    }
  }

  const handleUpdateSubtask = async (subtaskId: string, data: Partial<Subtask>) => {
    await updateSubtask(subtaskId, data)
    await loadSubtasks()
    await refreshTask()
  }

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    await toggleSubtaskComplete(subtaskId, !isCompleted)
    await loadSubtasks()
    await refreshTask()
  }

  const handleDeleteSubtask = async () => {
    if (!deleteSubtaskId) return
    await deleteSubtask(deleteSubtaskId)
    setDeleteSubtaskId(null)
    await loadSubtasks()
    await refreshTask()
  }

  if (!currentTask) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="flex flex-col h-[90vh]">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              {/* Título editável */}
              <div className="flex-1">
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-xl font-semibold"
                      autoFocus
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle()
                        if (e.key === 'Escape') setEditMode(false)
                      }}
                    />
                  </div>
                ) : (
                  <h2
                    className={cn(
                      'text-xl font-semibold cursor-pointer hover:text-primary transition-colors',
                      currentTask.is_completed && 'line-through text-muted-foreground'
                    )}
                    onClick={() => setEditMode(true)}
                  >
                    {currentTask.title}
                  </h2>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  em {currentTask.column_name || 'Sem coluna'}
                </p>
              </div>

              {/* Botão concluir */}
              <Button
                variant={currentTask.is_completed ? 'secondary' : 'default'}
                onClick={handleToggleComplete}
                className="flex items-center gap-2"
              >
                {currentTask.is_completed ? (
                  <>
                    <Circle className="h-4 w-4" />
                    Reabrir
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Concluir
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>

          {/* Body com scroll */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-6">
              {/* Tabs para organizar conteúdo */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="time">
                    <Clock className="h-4 w-4 mr-2" />
                    Tempo
                  </TabsTrigger>
                  <TabsTrigger value="attachments">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Anexos ({currentTask.attachments_count || 0})
                  </TabsTrigger>
                  <TabsTrigger value="comments">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comentários ({currentTask.comments_count || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Detalhes */}
                <TabsContent value="details" className="space-y-6 mt-6">
              {/* Metadados rápidos (inline) */}
              <div className="grid grid-cols-4 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Status
                  </Label>
                  <Select
                    value={currentTask.status}
                    onValueChange={(value) => handleUpdateField('status', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prioridade */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Prioridade
                  </Label>
                  <Select
                    value={currentTask.priority}
                    onValueChange={(value) => handleUpdateField('priority', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: TASK_PRIORITY_COLORS[key as keyof typeof TASK_PRIORITY_COLORS] }}
                          />
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Vencimento
                  </Label>
                  <Input
                    type="date"
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    onBlur={(e) => handleUpdateField('due_date', e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Tempo rastreado */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Tempo
                  </Label>
                  <div className="flex items-center h-9 px-3 bg-muted rounded-md">
                    <span className="text-sm font-semibold">
                      {Math.round(currentTask.tracked_time_minutes / 60)}h
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Descrição */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleSaveDescription}
                  placeholder="Adicione uma descrição detalhada..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Separator />

              {/* Subtarefas Agrupadas por Etapa */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Subtarefas do Projeto ({currentTask.completed_subtasks_count}/{currentTask.subtasks_count})
                </Label>

                <SubtaskGroupedList
                  subtasks={subtasks}
                  teamMembers={teamMembers}
                  onToggleComplete={handleToggleSubtask}
                  onUpdateSubtask={handleUpdateSubtask}
                  onDeleteSubtask={(id) => setDeleteSubtaskId(id)}
                  onCreateSubtask={handleCreateSubtask}
                />
              </div>

              <Separator />

              {/* Informações extras */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Criado por:</span>
                  <span className="ml-2 font-medium">Sistema</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(currentTask.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
                </TabsContent>

                {/* Tab: Time Tracking */}
                <TabsContent value="time" className="mt-6">
                  <TaskTimeTracking taskId={currentTask.id} />
                </TabsContent>

                {/* Tab: Anexos */}
                <TabsContent value="attachments" className="mt-6">
                  <TaskAttachmentsTab taskId={currentTask.id} />
                </TabsContent>

                {/* Tab: Comentários */}
                <TabsContent value="comments" className="mt-6">
                  <TaskComments taskId={currentTask.id} teamMembers={teamMembers} />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-between bg-muted/30">
            <Button variant="destructive" onClick={() => setDeleteTaskOpen(true)} size="sm">
              <Trash className="h-4 w-4 mr-2" />
              Excluir Tarefa
            </Button>

            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* AlertDialog: excluir tarefa */}
      <AlertDialog open={deleteTaskOpen} onOpenChange={setDeleteTaskOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{currentTask?.title}"</strong>?
              Esta ação não pode ser desfeita. Subtarefas, comentários e anexos também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: excluir subtarefa */}
      <AlertDialog open={!!deleteSubtaskId} onOpenChange={(o) => { if (!o) setDeleteSubtaskId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir subtarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubtask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
