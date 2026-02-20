'use client'

import { useState } from 'react'
import { Subtask } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Trash,
  Plus,
  User,
  Flag,
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  avatar_url?: string
  email: string
}

interface SubtaskGroupedListProps {
  subtasks: Subtask[]
  teamMembers: TeamMember[]
  onToggleComplete: (subtaskId: string, isCompleted: boolean) => void
  onUpdateSubtask: (subtaskId: string, data: Partial<Subtask>) => void
  onDeleteSubtask: (subtaskId: string) => void
  onCreateSubtask: (data: { title: string; projeto_etapa: string; assigned_to?: string; priority?: string; due_date?: string }) => void
}

const ETAPA_CONFIG = {
  planejamento: {
    label: 'PLANEJAMENTO',
    color: 'bg-blue-500',
    icon: '📋',
  },
  planta_baixa: {
    label: 'PLANTA BAIXA',
    color: 'bg-purple-500',
    icon: '📐',
  },
  '3d': {
    label: 'MODELO 3D',
    color: 'bg-pink-500',
    icon: '🎨',
  },
  executivo: {
    label: 'EXECUTIVO',
    color: 'bg-green-500',
    icon: '📄',
  },
}

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-slate-500' },
  medium: { label: 'Média', color: 'bg-blue-500' },
  high: { label: 'Alta', color: 'bg-orange-500' },
  urgent: { label: 'Urgente', color: 'bg-red-500' },
}

export function SubtaskGroupedList({
  subtasks,
  teamMembers = [],
  onToggleComplete,
  onUpdateSubtask,
  onDeleteSubtask,
  onCreateSubtask,
}: SubtaskGroupedListProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['planejamento', 'planta_baixa', '3d', 'executivo'])
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const toggleGroup = (etapa: string) => {
    setExpandedGroups((prev) =>
      prev.includes(etapa) ? prev.filter((g) => g !== etapa) : [...prev, etapa]
    )
  }

  const groupedSubtasks = {
    planejamento: subtasks.filter((s) => s.projeto_etapa === 'planejamento'),
    planta_baixa: subtasks.filter((s) => s.projeto_etapa === 'planta_baixa'),
    '3d': subtasks.filter((s) => s.projeto_etapa === '3d'),
    executivo: subtasks.filter((s) => s.projeto_etapa === 'executivo'),
  }

  const handleAddSubtask = (etapa: string) => {
    if (newSubtaskTitle.trim()) {
      onCreateSubtask({
        title: newSubtaskTitle.trim(),
        projeto_etapa: etapa,
      })
      setNewSubtaskTitle('')
      setAddingToGroup(null)
    }
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
    <div className="space-y-4">
      {Object.entries(ETAPA_CONFIG).map(([etapa, config]) => {
        const etapaSubtasks = groupedSubtasks[etapa as keyof typeof groupedSubtasks]
        const completedCount = etapaSubtasks.filter((s) => s.is_completed).length
        const totalCount = etapaSubtasks.length
        const isExpanded = expandedGroups.includes(etapa)

        return (
          <div key={etapa} className="border rounded-lg overflow-hidden">
            {/* Header do Grupo */}
            <div
              className={cn(
                'flex items-center justify-between p-3 cursor-pointer transition-colors',
                config.color,
                'text-white hover:opacity-90'
              )}
              onClick={() => toggleGroup(etapa)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="text-lg">{config.icon}</span>
                <h3 className="font-semibold text-sm">{config.label}</h3>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {completedCount}/{totalCount}
                </Badge>
              </div>

              {totalCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all"
                      style={{ width: `${(completedCount / totalCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {Math.round((completedCount / totalCount) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Lista de Subtarefas */}
            {isExpanded && (
              <div className="p-3 space-y-2 bg-muted/30">
                {etapaSubtasks.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Nenhuma subtarefa nesta etapa
                  </div>
                ) : (
                  etapaSubtasks.map((subtask) => {
                    const assignee = subtask.assigned_to
                      ? teamMembers.find((m) => m.id === subtask.assigned_to)
                      : null

                    return (
                      <div
                        key={subtask.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg bg-background border transition-all hover:shadow-sm group',
                          subtask.is_completed && 'opacity-60'
                        )}
                      >
                        {/* Checkbox */}
                        <Checkbox
                          checked={subtask.is_completed}
                          onCheckedChange={() => onToggleComplete(subtask.id, subtask.is_completed)}
                          className="mt-1"
                        />

                        {/* Conteúdo */}
                        <div className="flex-1 space-y-2">
                          {/* Título */}
                          <div
                            className={cn(
                              'text-sm font-medium',
                              subtask.is_completed && 'line-through text-muted-foreground'
                            )}
                          >
                            {subtask.title}
                          </div>

                          {/* Metadados */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Responsável */}
                            <Select
                              value={subtask.assigned_to || 'unassigned'}
                              onValueChange={(value) =>
                                onUpdateSubtask(subtask.id, {
                                  assigned_to: value === 'unassigned' ? null : value,
                                })
                              }
                            >
                              <SelectTrigger className="h-7 w-auto text-xs border-dashed">
                                <div className="flex items-center gap-1">
                                  {assignee ? (
                                    <>
                                      <Avatar className="h-4 w-4">
                                        <AvatarImage src={assignee.avatar_url} />
                                        <AvatarFallback className="text-[8px]">
                                          {getInitials(assignee.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{assignee.name.split(' ')[0]}</span>
                                    </>
                                  ) : (
                                    <>
                                      <User className="h-3 w-3" />
                                      <span>Atribuir</span>
                                    </>
                                  )}
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Não atribuído</SelectItem>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={member.avatar_url} />
                                        <AvatarFallback className="text-[10px]">
                                          {getInitials(member.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      {member.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Prioridade */}
                            <Select
                              value={subtask.priority || 'medium'}
                              onValueChange={(value: any) =>
                                onUpdateSubtask(subtask.id, { priority: value })
                              }
                            >
                              <SelectTrigger className="h-7 w-auto text-xs border-dashed">
                                <div className="flex items-center gap-1">
                                  <Flag className="h-3 w-3" />
                                  <span>{PRIORITY_CONFIG[subtask.priority || 'medium'].label}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                                  <SelectItem key={value} value={value}>
                                    <div className="flex items-center gap-2">
                                      <div className={cn('w-2 h-2 rounded-full', config.color)} />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Data de Vencimento */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    'h-7 text-xs border-dashed',
                                    !subtask.due_date && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className="mr-1 h-3 w-3" />
                                  {subtask.due_date
                                    ? format(new Date(subtask.due_date), 'dd/MM/yyyy', { locale: ptBR })
                                    : 'Prazo'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={subtask.due_date ? new Date(subtask.due_date) : undefined}
                                  onSelect={(date) =>
                                    onUpdateSubtask(subtask.id, {
                                      due_date: date ? format(date, 'yyyy-MM-dd') : null,
                                    })
                                  }
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Botão Excluir */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => onDeleteSubtask(subtask.id)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })
                )}

                {/* Adicionar nova subtarefa */}
                {addingToGroup === etapa ? (
                  <div className="flex gap-2 p-2 bg-background rounded-lg border border-dashed">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Nome da subtarefa..."
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubtask(etapa)
                        if (e.key === 'Escape') {
                          setAddingToGroup(null)
                          setNewSubtaskTitle('')
                        }
                      }}
                    />
                    <Button size="sm" onClick={() => handleAddSubtask(etapa)} className="h-8">
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingToGroup(null)
                        setNewSubtaskTitle('')
                      }}
                      className="h-8"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddingToGroup(etapa)}
                    className="w-full h-8 border-dashed border"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar subtarefa
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
