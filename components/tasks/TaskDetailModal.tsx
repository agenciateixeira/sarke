'use client'

import { useState, useEffect } from 'react'
import { TaskWithDetails, Subtask, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@/types/tasks'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
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
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [showNewSubtask, setShowNewSubtask] = useState(false)
  const [refreshedTask, setRefreshedTask] = useState<TaskWithDetails | null>(null)

  const currentTask = refreshedTask || task

  // Carregar subtarefas
  useEffect(() => {
    if (currentTask?.id) {
      loadSubtasks()
      refreshTask()
    }
  }, [currentTask?.id])

  // Sincronizar título e descrição
  useEffect(() => {
    if (currentTask) {
      setTitle(currentTask.title)
      setDescription(currentTask.description || '')
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
      await updateTask(currentTask.id, { [field]: value })
      await refreshTask()
    }
  }

  const handleDelete = async () => {
    if (currentTask && confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(currentTask.id)
      onOpenChange(false)
    }
  }

  // Subtarefas
  const handleCreateSubtask = async () => {
    if (currentTask && newSubtaskTitle.trim()) {
      await createSubtask({
        task_id: currentTask.id,
        title: newSubtaskTitle.trim(),
      })
      setNewSubtaskTitle('')
      setShowNewSubtask(false)
      await loadSubtasks()
      await refreshTask()
    }
  }

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    await toggleSubtaskComplete(subtaskId, !isCompleted)
    await loadSubtasks()
    await refreshTask()
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (confirm('Excluir subtarefa?')) {
      await deleteSubtask(subtaskId)
      await loadSubtasks()
      await refreshTask()
    }
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
                    value={currentTask.due_date || ''}
                    onChange={(e) => handleUpdateField('due_date', e.target.value)}
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

              {/* Subtarefas (Checklist) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Subtarefas ({currentTask.completed_subtasks_count}/{currentTask.subtasks_count})
                  </Label>
                  {!showNewSubtask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewSubtask(true)}
                      className="h-8"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>

                {/* Nova subtarefa */}
                {showNewSubtask && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox checked={false} disabled />
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Nome da subtarefa..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateSubtask()
                        if (e.key === 'Escape') {
                          setShowNewSubtask(false)
                          setNewSubtaskTitle('')
                        }
                      }}
                      className="flex-1 h-8"
                    />
                    <Button size="sm" onClick={handleCreateSubtask} className="h-8">
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowNewSubtask(false)
                        setNewSubtaskTitle('')
                      }}
                      className="h-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Lista de subtarefas */}
                <div className="space-y-2">
                  {subtasks.length === 0 && !showNewSubtask && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma subtarefa ainda. Clique em "Adicionar" para criar.
                    </div>
                  )}

                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group',
                        subtask.is_completed && 'opacity-60'
                      )}
                    >
                      <Checkbox
                        checked={subtask.is_completed}
                        onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.is_completed)}
                      />
                      <span
                        className={cn(
                          'flex-1 text-sm',
                          subtask.is_completed && 'line-through text-muted-foreground'
                        )}
                      >
                        {subtask.title}
                      </span>

                      {/* Ações da subtarefa */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {currentTask.subtasks_count > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        Progresso
                      </span>
                      <span className="text-xs font-semibold">
                        {Math.round((currentTask.completed_subtasks_count / currentTask.subtasks_count) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(currentTask.completed_subtasks_count / currentTask.subtasks_count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
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
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-between bg-muted/30">
            <Button variant="destructive" onClick={handleDelete} size="sm">
              <Trash className="h-4 w-4 mr-2" />
              Excluir Tarefa
            </Button>

            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
