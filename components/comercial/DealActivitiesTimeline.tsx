'use client'

import { useDealActivities } from '@/hooks/useDealActivities'
import { DealActivity, ActivityType, DealActivityFormData } from '@/types/pipeline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AddActivityDialog } from './AddActivityDialog'
import {
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  FileText,
  GitCommit,
  Loader2,
  Plus,
  Circle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

interface DealActivitiesTimelineProps {
  dealId: string
}

const activityIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  note: FileText,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckCircle2,
  status_change: GitCommit,
}

const activityColors: Record<ActivityType, string> = {
  note: 'bg-blue-500',
  call: 'bg-green-500',
  email: 'bg-purple-500',
  meeting: 'bg-orange-500',
  task: 'bg-yellow-500',
  status_change: 'bg-gray-500',
}

const activityLabels: Record<ActivityType, string> = {
  note: 'Nota',
  call: 'Ligação',
  email: 'Email',
  meeting: 'Reunião',
  task: 'Tarefa',
  status_change: 'Status',
}

export function DealActivitiesTimeline({ dealId }: DealActivitiesTimelineProps) {
  const { activities, stats, loading, completeTask, reopenTask, deleteActivity, createActivity } = useDealActivities(dealId)
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)

  const handleCreateActivity = async (data: DealActivityFormData) => {
    await createActivity(data)
    setActivityDialogOpen(false)
  }

  const toggleExpand = (activityId: string) => {
    const newExpanded = new Set(expandedActivities)
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId)
    } else {
      newExpanded.add(activityId)
    }
    setExpandedActivities(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{stats.total_activities}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ligações</p>
            <p className="text-lg font-semibold">{stats.calls_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tarefas</p>
            <p className="text-lg font-semibold">
              {stats.completed_tasks_count}/{stats.tasks_count}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Atrasadas</p>
            <p className="text-lg font-semibold text-red-600">{stats.overdue_tasks_count}</p>
          </div>
        </div>
      )}

      {/* Botão Adicionar Atividade */}
      <Button
        type="button"
        onClick={() => setActivityDialogOpen(true)}
        className="w-full"
        variant="outline"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Atividade
      </Button>

      {/* Dialog de adicionar atividade */}
      <AddActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        onSubmit={handleCreateActivity}
      />

      {/* Timeline */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma atividade registrada</p>
            <p className="text-xs">Adicione notas, ligações ou tarefas para acompanhar o deal</p>
          </div>
        ) : (
          activities.map((activity, index) => {
            const Icon = activityIcons[activity.type]
            const isExpanded = expandedActivities.has(activity.id)
            const isTask = activity.type === 'task'
            const isCompleted = !!activity.completed_at
            const isOverdue = isTask && !isCompleted && activity.due_date && new Date(activity.due_date) < new Date()

            return (
              <div key={activity.id} className="relative">
                {/* Linha conectora */}
                {index < activities.length - 1 && (
                  <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
                )}

                <div className="flex gap-3">
                  {/* Ícone da atividade */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full ${
                      activityColors[activity.type]
                    } flex items-center justify-center text-white`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {activityLabels[activity.type]}
                          </Badge>
                          {isTask && (
                            <Badge
                              variant={isCompleted ? 'default' : isOverdue ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Concluída
                                </>
                              ) : isOverdue ? (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Atrasada
                                </>
                              ) : (
                                <>
                                  <Circle className="h-3 w-3 mr-1" />
                                  Pendente
                                </>
                              )}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium mt-1">{activity.title}</p>
                        {activity.description && (
                          <p
                            className={`text-sm text-muted-foreground mt-1 ${
                              !isExpanded && 'line-clamp-2'
                            }`}
                          >
                            {activity.description}
                          </p>
                        )}
                        {activity.description && activity.description.length > 100 && (
                          <button
                            onClick={() => toggleExpand(activity.id)}
                            className="text-xs text-primary hover:underline mt-1"
                          >
                            {isExpanded ? 'Ver menos' : 'Ver mais'}
                          </button>
                        )}

                        {/* Metadados adicionais */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {activity.creator && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                {activity.creator.avatar_url && (
                                  <AvatarImage src={activity.creator.avatar_url} />
                                )}
                                <AvatarFallback className="text-xs">
                                  {activity.creator.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{activity.creator.name}</span>
                            </div>
                          )}
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          {activity.duration_minutes && (
                            <>
                              <span>•</span>
                              <span>{activity.duration_minutes} min</span>
                            </>
                          )}
                          {activity.due_date && !isCompleted && (
                            <>
                              <span>•</span>
                              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                Vence em{' '}
                                {formatDistanceToNow(new Date(activity.due_date), {
                                  addSuffix: false,
                                  locale: ptBR,
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      {isTask && (
                        <div className="flex gap-1">
                          {!isCompleted ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => completeTask(activity.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reopenTask(activity.id)}
                            >
                              <Circle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
