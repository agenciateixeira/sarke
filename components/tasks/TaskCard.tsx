'use client'

import { TaskWithDetails, TASK_PRIORITY_ICONS, TASK_PRIORITY_COLORS } from '@/types/tasks'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle2, Circle, MessageSquare, Paperclip, Clock, Calendar } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: TaskWithDetails
  onClick: () => void
  isDragging?: boolean
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const priorityIcon = TASK_PRIORITY_ICONS[task.priority]
  const priorityColor = TASK_PRIORITY_COLORS[task.priority]

  const subtasksProgress = task.subtasks_count > 0
    ? (task.completed_subtasks_count / task.subtasks_count) * 100
    : 0

  const isOverdue = task.due_date && !task.is_completed && isPast(new Date(task.due_date))
  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 cursor-pointer hover:shadow-md transition-all group',
        isDragging && 'opacity-50 rotate-2',
        task.is_completed && 'opacity-60 bg-muted/50'
      )}
    >
      {/* Header - Prioridade e Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Ícone de prioridade */}
          <span
            className="text-lg font-bold"
            style={{ color: priorityColor }}
            title={task.priority}
          >
            {priorityIcon}
          </span>

          {/* Status de conclusão */}
          {task.is_completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Título */}
      <h4
        className={cn(
          'font-semibold text-sm mb-2 line-clamp-2',
          task.is_completed && 'line-through text-muted-foreground'
        )}
      >
        {task.title}
      </h4>

      {/* Descrição (preview) */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Data de vencimento */}
      {task.due_date && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs mb-3',
            isOverdue && 'text-red-600 font-semibold',
            isDueToday && !isOverdue && 'text-amber-600 font-semibold',
            !isOverdue && !isDueToday && 'text-muted-foreground'
          )}
        >
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
            {isOverdue && ' - Atrasado'}
            {isDueToday && ' - Hoje'}
          </span>
        </div>
      )}

      {/* Progress bar de subtarefas */}
      {task.subtasks_count > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              Subtarefas: {task.completed_subtasks_count}/{task.subtasks_count}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {Math.round(subtasksProgress)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${subtasksProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer - Comentários, Anexos */}
      <div className="flex items-center justify-between">
        {/* Placeholder */}
        <div className="flex items-center gap-2">
          {/* Avatar removido temporariamente até ter join com profiles */}
        </div>

        {/* Contadores */}
        <div className="flex items-center gap-3 text-muted-foreground">
          {/* Tempo rastreado */}
          {task.tracked_time_minutes > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{Math.round(task.tracked_time_minutes / 60)}h</span>
            </div>
          )}

          {/* Comentários */}
          {task.comments_count > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <MessageSquare className="h-3 w-3" />
              <span>{task.comments_count}</span>
            </div>
          )}

          {/* Anexos */}
          {task.attachments_count > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Paperclip className="h-3 w-3" />
              <span>{task.attachments_count}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
