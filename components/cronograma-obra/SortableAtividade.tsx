'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CronogramaObraAtividade } from '@/types/cronograma-obra'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  GripVertical,
  Calendar,
  Building2,
  Edit,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SortableAtividadeProps {
  atividade: CronogramaObraAtividade
  modoEdicao: boolean
  selecionada: boolean
  onToggleSelecao: (id: string) => void
  onEdit: (atividade: CronogramaObraAtividade) => void
  onDelete: (id: string) => void
}

const statusColors = {
  pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  em_andamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  concluida: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  atrasada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  pausada: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  cancelada: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

const statusLabels = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
  pausada: 'Pausada',
  cancelada: 'Cancelada',
}

const prioridadeColors = {
  baixa: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-400',
  urgente: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
}

const prioridadeLabels = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export function SortableAtividade({
  atividade,
  modoEdicao,
  selecionada,
  onToggleSelecao,
  onEdit,
  onDelete,
}: SortableAtividadeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: atividade.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`
        ${selecionada ? 'bg-blue-50 dark:bg-blue-950/30' : ''}
        ${isDragging ? 'shadow-lg' : ''}
        hover:bg-gray-50 dark:hover:bg-gray-800
        transition-colors
      `}
    >
      {modoEdicao && (
        <>
          <td className="w-10 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-5 w-5" />
              </button>
            </div>
          </td>
          <td className="w-10 px-4 py-3">
            <Checkbox
              checked={selecionada}
              onCheckedChange={() => onToggleSelecao(atividade.id)}
            />
          </td>
        </>
      )}

      <td className="px-4 py-3 font-mono text-sm">
        {format(new Date(atividade.data_prevista + 'T00:00:00'), 'dd/MM/yyyy')}
      </td>

      <td className="px-4 py-3">{atividade.descricao_servico}</td>

      <td className="px-4 py-3">
        {atividade.empresa_nome ? (
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span className="text-sm">{atividade.empresa_nome}</span>
          </div>
        ) : atividade.empresa ? (
          <span className="text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
            ⚠️ {atividade.empresa} (não cadastrada)
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>

      <td className="px-4 py-3">
        <Badge className={statusColors[atividade.status]}>
          {statusLabels[atividade.status]}
        </Badge>
      </td>

      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={prioridadeColors[atividade.prioridade]}
        >
          {prioridadeLabels[atividade.prioridade]}
        </Badge>
      </td>

      <td className="px-4 py-3">{atividade.observacao || '-'}</td>

      {!modoEdicao && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(atividade)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(atividade.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  )
}