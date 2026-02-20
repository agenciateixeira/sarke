'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Subtask, TeamMember } from '@/types/tasks'
import { format, parseISO, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubtaskStageViewProps {
  subtasks: Subtask[]
  stageName: string
  stageIcon?: React.ReactNode
  teamMembers: TeamMember[]
  onToggleComplete: (subtaskId: string, isCompleted: boolean) => void
  onUpdateSubtask: (subtaskId: string, data: Partial<Subtask>) => void
  onDeleteSubtask: (subtaskId: string) => void
  onCreateSubtask: (data: {
    title: string
    projeto_etapa: string
    assigned_to?: string
    priority?: string
    due_date?: string
  }) => void
  projeto_etapa: 'planejamento' | 'planta_baixa' | '3d' | 'executivo'
}

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

export function SubtaskStageView({
  subtasks,
  stageName,
  stageIcon,
  teamMembers,
  onToggleComplete,
  onUpdateSubtask,
  onDeleteSubtask,
  onCreateSubtask,
  projeto_etapa,
}: SubtaskStageViewProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Calcular progresso
  const completed = subtasks.filter((s) => s.is_completed).length
  const total = subtasks.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  // Próximo prazo mais urgente
  const upcomingDeadline = subtasks
    .filter((s) => !s.is_completed && s.due_date)
    .sort((a, b) => {
      if (!a.due_date || !b.due_date) return 0
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })[0]

  // Tarefas atrasadas
  const overdueTasks = subtasks.filter(
    (s) => !s.is_completed && s.due_date && isPast(parseISO(s.due_date))
  ).length

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onCreateSubtask({
        title: newSubtaskTitle.trim(),
        projeto_etapa,
        priority: 'medium',
      })
      setNewSubtaskTitle('')
      setShowAddForm(false)
    }
  }

  const handleUpdateTitle = (subtaskId: string, title: string) => {
    if (title.trim()) {
      onUpdateSubtask(subtaskId, { title: title.trim() })
    }
  }

  return (
    <div className="space-y-4">
      {/* Card de Progresso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {stageIcon}
            {stageName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold">
                {completed}/{total} ({progress}%)
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {upcomingDeadline && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-muted-foreground text-xs">Próximo prazo</p>
                  <p className="font-medium">
                    {format(parseISO(upcomingDeadline.due_date!), 'dd/MM', { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
            {overdueTasks > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-muted-foreground text-xs">Atrasadas</p>
                  <p className="font-medium text-red-500">{overdueTasks}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Subtasks */}
      <div className="space-y-2">
        {subtasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Circle className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma subtarefa nesta etapa</p>
            </CardContent>
          </Card>
        ) : (
          subtasks.map((subtask) => {
            const isOverdue = subtask.due_date && !subtask.is_completed && isPast(parseISO(subtask.due_date))
            const assignedMember = teamMembers.find((m) => m.id === subtask.assigned_to)

            return (
              <Card
                key={subtask.id}
                className={cn(
                  'transition-all hover:shadow-md',
                  subtask.is_completed && 'opacity-60 bg-secondary/30'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={subtask.is_completed}
                      onCheckedChange={(checked) =>
                        onToggleComplete(subtask.id, checked as boolean)
                      }
                      className="mt-1"
                    />

                    {/* Conteúdo */}
                    <div className="flex-1 space-y-3">
                      {/* Título */}
                      <Input
                        value={subtask.title}
                        onChange={(e) => handleUpdateTitle(subtask.id, e.target.value)}
                        className={cn(
                          'font-medium border-none shadow-none px-0 h-auto',
                          subtask.is_completed && 'line-through'
                        )}
                      />

                      {/* Metadados */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Responsável */}
                        <Select
                          value={subtask.assigned_to || 'unassigned'}
                          onValueChange={(value) =>
                            onUpdateSubtask(subtask.id, {
                              assigned_to: value === 'unassigned' ? undefined : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span className="text-xs">
                                  {assignedMember?.name || 'Não atribuído'}
                                </span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Não atribuído</SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Prioridade */}
                        <Select
                          value={subtask.priority}
                          onValueChange={(value) =>
                            onUpdateSubtask(subtask.id, {
                              priority: value as 'low' | 'medium' | 'high',
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[100px]">
                            <SelectValue>
                              <Badge
                                variant="outline"
                                className={cn('text-xs', priorityColors[subtask.priority])}
                              >
                                {priorityLabels[subtask.priority]}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Data */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                'h-8 gap-1.5 text-xs',
                                isOverdue && 'border-red-500 text-red-500'
                              )}
                            >
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {subtask.due_date
                                ? format(parseISO(subtask.due_date), 'dd/MM/yy', { locale: ptBR })
                                : 'Sem prazo'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={subtask.due_date ? parseISO(subtask.due_date) : undefined}
                              onSelect={(date) =>
                                onUpdateSubtask(subtask.id, {
                                  due_date: date ? format(date, 'yyyy-MM-dd') : undefined,
                                })
                              }
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>

                        {/* Botão Deletar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 ml-auto text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => onDeleteSubtask(subtask.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}

        {/* Formulário Adicionar Subtask */}
        {showAddForm ? (
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Digite o título da subtarefa..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubtask()
                    if (e.key === 'Escape') {
                      setShowAddForm(false)
                      setNewSubtaskTitle('')
                    }
                  }}
                  autoFocus
                />
                <Button onClick={handleAddSubtask} size="sm">
                  Adicionar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewSubtaskTitle('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar subtarefa
          </Button>
        )}
      </div>
    </div>
  )
}
