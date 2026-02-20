'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Subtask } from '@/types/tasks'
import { format, parseISO, differenceInDays, isAfter, isBefore, isWithinInterval, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClipboardCheck, Layers, Box, Building2, Calendar, Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface ProjectTimelineProps {
  subtasks: Subtask[]
  startDate?: string
  endDate?: string
}

const stageConfig = {
  planejamento: {
    name: 'Planejamento',
    icon: ClipboardCheck,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  planta_baixa: {
    name: 'Planta Baixa',
    icon: Layers,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  '3d': {
    name: 'Modelo 3D',
    icon: Box,
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  executivo: {
    name: 'Executivo',
    icon: Building2,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
}

export function ProjectTimeline({ subtasks, startDate, endDate }: ProjectTimelineProps) {
  // Agrupar subtasks por etapa
  const groupedSubtasks = useMemo(() => {
    return {
      planejamento: subtasks.filter((s) => s.projeto_etapa === 'planejamento'),
      planta_baixa: subtasks.filter((s) => s.projeto_etapa === 'planta_baixa'),
      '3d': subtasks.filter((s) => s.projeto_etapa === '3d'),
      executivo: subtasks.filter((s) => s.projeto_etapa === 'executivo'),
    }
  }, [subtasks])

  // Calcular datas mínimas e máximas
  const { minDate, maxDate } = useMemo(() => {
    const allDates = subtasks
      .map((s) => s.due_date)
      .filter(Boolean)
      .map((d) => parseISO(d!))

    if (allDates.length === 0) {
      const today = startOfDay(new Date())
      return {
        minDate: today,
        maxDate: addDays(today, 90), // 3 meses padrão
      }
    }

    const min = startDate ? parseISO(startDate) : new Date(Math.min(...allDates.map(d => d.getTime())))
    const max = endDate ? parseISO(endDate) : new Date(Math.max(...allDates.map(d => d.getTime())))

    return {
      minDate: startOfDay(min),
      maxDate: startOfDay(max),
    }
  }, [subtasks, startDate, endDate])

  const totalDays = differenceInDays(maxDate, minDate) || 90

  // Calcular estatísticas por etapa
  const getStageStats = (stageSubtasks: Subtask[]) => {
    const total = stageSubtasks.length
    const completed = stageSubtasks.filter((s) => s.is_completed).length
    const overdue = stageSubtasks.filter(
      (s) => !s.is_completed && s.due_date && isBefore(parseISO(s.due_date), new Date())
    ).length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    const datesWithDueDates = stageSubtasks.filter((s) => s.due_date).map((s) => parseISO(s.due_date!))
    const stageStart = datesWithDueDates.length > 0 ? new Date(Math.min(...datesWithDueDates.map(d => d.getTime()))) : null
    const stageEnd = datesWithDueDates.length > 0 ? new Date(Math.max(...datesWithDueDates.map(d => d.getTime()))) : null

    return { total, completed, overdue, progress, stageStart, stageEnd }
  }

  // Calcular posição e largura da barra no timeline
  const getBarPosition = (stageStart: Date | null, stageEnd: Date | null) => {
    if (!stageStart || !stageEnd) return { left: 0, width: 0, visible: false }

    const daysFromStart = differenceInDays(stageStart, minDate)
    const stageDuration = differenceInDays(stageEnd, stageStart) + 1

    const left = (daysFromStart / totalDays) * 100
    const width = (stageDuration / totalDays) * 100

    return {
      left: Math.max(0, Math.min(left, 100)),
      width: Math.max(2, Math.min(width, 100 - left)),
      visible: true,
    }
  }

  const today = startOfDay(new Date())
  const todayPosition = isWithinInterval(today, { start: minDate, end: maxDate })
    ? (differenceInDays(today, minDate) / totalDays) * 100
    : null

  return (
    <div className="space-y-6">
      {/* Header com Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Início</p>
              <p className="font-semibold">{format(minDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Término Previsto</p>
              <p className="font-semibold">{format(maxDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Duração Total</p>
              <p className="font-semibold">{totalDays} dias ({Math.round(totalDays / 30)} meses)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Gantt Chart - Etapas do Projeto</CardTitle>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="text-muted-foreground">Concluída</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600" />
                <span className="text-muted-foreground">Em andamento</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-600" />
                <span className="text-muted-foreground">Atrasada</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeline Grid */}
          <div className="relative">
            {/* Meses no topo */}
            <div className="flex text-xs text-muted-foreground mb-2 ml-48">
              {Array.from({ length: Math.ceil(totalDays / 30) }).map((_, i) => {
                const monthDate = addDays(minDate, i * 30)
                return (
                  <div key={i} className="flex-1 text-center">
                    {format(monthDate, 'MMM yyyy', { locale: ptBR })}
                  </div>
                )
              })}
            </div>

            {/* Etapas */}
            {Object.entries(groupedSubtasks).map(([stageKey, stageSubtasks]) => {
              const stage = stageConfig[stageKey as keyof typeof stageConfig]
              const stats = getStageStats(stageSubtasks)
              const barPos = getBarPosition(stats.stageStart, stats.stageEnd)
              const Icon = stage.icon

              const isCompleted = stats.completed === stats.total && stats.total > 0
              const hasOverdue = stats.overdue > 0

              return (
                <div key={stageKey} className="mb-4">
                  {/* Label da Etapa */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-44 flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', stage.textColor)} />
                      <span className="font-medium text-sm">{stage.name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {stats.completed}/{stats.total}
                      </Badge>
                      {isCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {hasOverdue && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="relative h-10 ml-48">
                    {/* Grid de fundo */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: Math.ceil(totalDays / 30) }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 border-r border-border"
                        />
                      ))}
                    </div>

                    {/* Linha do hoje */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                        style={{ left: `${todayPosition}%` }}
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] text-red-600 font-semibold whitespace-nowrap">
                          Hoje
                        </div>
                      </div>
                    )}

                    {/* Barra da etapa */}
                    {barPos.visible && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-8 rounded-md shadow-sm transition-all hover:shadow-md group cursor-pointer"
                        style={{
                          left: `${barPos.left}%`,
                          width: `${barPos.width}%`,
                          background: `linear-gradient(to right, ${isCompleted ? '#10b981' : hasOverdue ? '#ef4444' : '#3b82f6'} ${stats.progress}%, #e5e7eb ${stats.progress}%)`,
                        }}
                      >
                        <div className="flex items-center justify-center h-full px-2 text-xs font-semibold text-white">
                          {stats.progress}%
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover border rounded-lg shadow-lg p-3 whitespace-nowrap z-20">
                          <p className="font-semibold text-sm mb-1">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {stats.stageStart && format(stats.stageStart, "dd/MM/yy", { locale: ptBR })} → {stats.stageEnd && format(stats.stageEnd, "dd/MM/yy", { locale: ptBR })}
                          </p>
                          <p className="text-xs">
                            Progresso: {stats.completed}/{stats.total} ({stats.progress}%)
                          </p>
                          {stats.overdue > 0 && (
                            <p className="text-xs text-red-600 mt-1">
                              {stats.overdue} tarefa(s) atrasada(s)
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {!barPos.visible && (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        Sem datas definidas
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legenda */}
          <div className="border-t pt-4 mt-4">
            <p className="text-xs text-muted-foreground">
              A linha vermelha indica a data de hoje. As barras mostram o período de cada etapa e o progresso de conclusão.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
