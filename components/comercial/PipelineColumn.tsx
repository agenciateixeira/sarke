'use client'

import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Deal, PipelineStage } from '@/types/pipeline'
import { DealCard } from './DealCard'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface PipelineColumnProps {
  stage: PipelineStage
  deals: Deal[]
  totalValue: number
  onDealClick: (deal: Deal) => void
}

function SortableDealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
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
      <DealCard deal={deal} onClick={onClick} isDragging={isDragging} />
    </div>
  )
}

export function PipelineColumn({ stage, deals, totalValue, onDealClick }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

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
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold">{stage.name}</h3>
          </div>
          <Badge variant="secondary">{deals.length}</Badge>
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
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
