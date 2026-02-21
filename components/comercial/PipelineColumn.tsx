'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Deal, PipelineStage } from '@/types/pipeline'
import { DealCard } from './DealCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PipelineColumnProps {
  stage: PipelineStage
  deals: Deal[]
  totalValue: number
  onDealClick: (deal: Deal) => void
  onEditStage: (stage: PipelineStage) => void
  onDeleteStage: (stage: PipelineStage) => void
  onArchiveDeal: (dealId: string) => void
  onDeleteDeal: (dealId: string) => void
  onMarkAsWonLost: (deal: Deal) => void
}

function SortableDealCard({
  deal,
  onClick,
  onArchive,
  onDelete,
  onMarkAsWonLost,
}: {
  deal: Deal
  onClick: () => void
  onArchive: (dealId: string) => void
  onDelete: (dealId: string) => void
  onMarkAsWonLost: (deal: Deal) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard
        deal={deal}
        onClick={onClick}
        isDragging={isDragging}
        onArchive={onArchive}
        onDelete={onDelete}
        onMarkAsWonLost={onMarkAsWonLost}
      />
    </div>
  )
}

export function PipelineColumn({
  stage,
  deals,
  totalValue,
  onDealClick,
  onEditStage,
  onDeleteStage,
  onArchiveDeal,
  onDeleteDeal,
  onMarkAsWonLost,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(stage.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditedName(stage.name)
  }, [stage.name])

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingName])

  const handleDoubleClick = () => {
    setIsEditingName(true)
  }

  const handleNameSave = async () => {
    if (editedName.trim() && editedName !== stage.name) {
      await onEditStage({ ...stage, name: editedName.trim() })
    }
    setIsEditingName(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      setEditedName(stage.name)
      setIsEditingName(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-80 bg-muted/30 rounded-lg border-2 transition-all',
        isOver && 'border-primary bg-primary/5'
      )}
    >
      {/* Header da coluna */}
      <div className="p-4 border-b" style={{ borderColor: stage.color }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            {isEditingName ? (
              <Input
                ref={inputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm font-semibold px-2 py-0"
              />
            ) : (
              <h3
                className="font-semibold cursor-pointer hover:text-primary transition-colors truncate"
                onDoubleClick={handleDoubleClick}
                title="Duplo clique para editar"
              >
                {stage.name}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary">{deals.length}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditStage(stage)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Completo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeleteStage(stage)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {stage.description && (
          <p className="text-xs text-muted-foreground mb-2">
            {stage.description}
          </p>
        )}

        <div className="flex items-baseline gap-1">
          <span className="text-xs text-muted-foreground">Valor ponderado:</span>
          <span className="text-sm font-bold">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      {/* Lista de deals */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 min-h-[200px]">
          {deals.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhum negócio
            </div>
          ) : (
            deals.map(deal => (
              <SortableDealCard
                key={deal.id}
                deal={deal}
                onClick={() => onDealClick(deal)}
                onArchive={onArchiveDeal}
                onDelete={onDeleteDeal}
                onMarkAsWonLost={onMarkAsWonLost}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
