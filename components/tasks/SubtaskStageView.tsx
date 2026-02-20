'use client'

import { useState } from 'react'
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
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  Flag,
  MoreHorizontal,
  X,
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

const priorityIcons = {
  low: <Flag className="h-3.5 w-3.5 text-blue-500" />,
  medium: <Flag className="h-3.5 w-3.5 text-yellow-500" />,
  high: <Flag className="h-3.5 w-3.5 text-red-500" />,
}

export function SubtaskStageView({
  subtasks,
  stageName,
  stageIcon,
  teamMembers = [],
  onToggleComplete,
  onUpdateSubtask,
  onDeleteSubtask,
  onCreateSubtask,
  projeto_etapa,
}: SubtaskStageViewProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const completed = subtasks.filter((s) => s.is_completed).length
  const total = subtasks.length

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
    if (title.trim() && title !== subtasks.find(s => s.id === subtaskId)?.title) {
      onUpdateSubtask(subtaskId, { title: title.trim() })
    }
    setEditingId(null)
  }

  return (
    <div className="space-y-2">
      {/* Header do Grupo */}
      <div className="flex items-center gap-2 py-2 px-3 hover:bg-accent/50 rounded-md cursor-pointer group"
           onClick={() => setIsExpanded(!isExpanded)}>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        <Checkbox
          checked={total > 0 && completed === total}
          className="h-4 w-4"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="flex items-center gap-2 flex-1">
          {stageIcon}
          <span className="font-semibold text-sm uppercase tracking-wide">
            {stageName}
          </span>
          <span className="text-xs text-muted-foreground">
            {completed}/{total}
          </span>
        </div>
      </div>

      {/* Tabela de Subtasks */}
      {isExpanded && (
        <div className="ml-6 space-y-0.5">
          {/* Header das Colunas */}
          <div className="grid grid-cols-[1fr_160px_120px_140px_40px] gap-2 px-3 py-2 text-xs text-muted-foreground border-b">
            <div>Nome</div>
            <div>Responsável</div>
            <div>Prioridade</div>
            <div>Data de vencimento</div>
            <div></div>
          </div>

          {/* Lista de Subtasks */}
          {subtasks.map((subtask) => {
            const isOverdue = subtask.due_date && !subtask.is_completed && isPast(parseISO(subtask.due_date))
            const assignedMember = teamMembers.find((m) => m.id === subtask.assigned_to)

            return (
              <div
                key={subtask.id}
                className={cn(
                  'grid grid-cols-[1fr_160px_120px_140px_40px] gap-2 px-3 py-2 items-center hover:bg-accent/50 rounded-md group',
                  subtask.is_completed && 'opacity-50'
                )}
              >
                {/* Nome */}
                <div className="flex items-center gap-2 min-w-0">
                  <Checkbox
                    checked={subtask.is_completed}
                    onCheckedChange={(checked) => onToggleComplete(subtask.id, checked as boolean)}
                    className="h-4 w-4 shrink-0"
                  />
                  {editingId === subtask.id ? (
                    <Input
                      defaultValue={subtask.title}
                      autoFocus
                      className="h-7 text-sm"
                      onBlur={(e) => handleUpdateTitle(subtask.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateTitle(subtask.id, e.currentTarget.value)
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingId(subtask.id)}
                      className={cn(
                        'text-sm text-left truncate hover:text-primary flex-1',
                        subtask.is_completed && 'line-through'
                      )}
                    >
                      {subtask.title}
                    </button>
                  )}
                </div>

                {/* Responsável */}
                <Select
                  value={subtask.assigned_to || 'unassigned'}
                  onValueChange={(value) =>
                    onUpdateSubtask(subtask.id, {
                      assigned_to: value === 'unassigned' ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger className="h-7 border-0 shadow-none hover:bg-accent text-xs">
                    <SelectValue>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">
                          {assignedMember?.name || 'Sem responsável'}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem responsável</SelectItem>
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
                  <SelectTrigger className="h-7 border-0 shadow-none hover:bg-accent text-xs">
                    <SelectValue>
                      <div className="flex items-center gap-1.5">
                        {priorityIcons[subtask.priority] || priorityIcons.medium}
                        <span className="capitalize">
                          {subtask.priority === 'low' ? 'Baixa' : subtask.priority === 'medium' ? 'Média' : 'Alta'}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Flag className="h-3.5 w-3.5 text-blue-500" />
                        Baixa
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Flag className="h-3.5 w-3.5 text-yellow-500" />
                        Média
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Flag className="h-3.5 w-3.5 text-red-500" />
                        Alta
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Data de vencimento */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-7 justify-start text-xs font-normal border-0 shadow-none hover:bg-accent',
                        !subtask.due_date && 'text-muted-foreground',
                        isOverdue && 'text-red-500'
                      )}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {subtask.due_date
                        ? format(parseISO(subtask.due_date), 'dd/MM/yy', { locale: ptBR })
                        : 'Sem data'}
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

                {/* Menu de ações */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteSubtask(subtask.id)}
                    >
                      Excluir tarefa
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            )
          })}

          {/* Adicionar Tarefa */}
          {showAddForm ? (
            <div className="grid grid-cols-[1fr_160px_120px_140px_40px] gap-2 px-3 py-2 items-center bg-accent/30 rounded-md">
              <div className="flex items-center gap-2">
                <Checkbox disabled className="h-4 w-4 opacity-30" />
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Nome da tarefa"
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubtask()
                    if (e.key === 'Escape') {
                      setShowAddForm(false)
                      setNewSubtaskTitle('')
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Alec Franquias</span>
              </div>
              <div></div>
              <div></div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewSubtaskTitle('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground ml-6"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar Tarefa
            </Button>
          )}

          {/* Botões de ação (Cancelar/Salvar) */}
          {showAddForm && (
            <div className="flex gap-2 ml-6 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false)
                  setNewSubtaskTitle('')
                }}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAddSubtask}>
                Salvar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
