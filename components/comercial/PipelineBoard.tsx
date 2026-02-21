'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Deal, PipelineStage } from '@/types/pipeline'
import { PipelineColumn } from './PipelineColumn'
import { DealCard } from './DealCard'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface PipelineBoardProps {
  stages: PipelineStage[]
  deals: Deal[]
  onMoveDeal: (dealId: string, newStageId: string) => Promise<void>
  onDealClick: (deal: Deal) => void
  onEditStage: (stage: PipelineStage) => void
  onDeleteStage: (stage: PipelineStage) => void
}

export function PipelineBoard({ stages, deals, onMoveDeal, onDealClick, onEditStage, onDeleteStage }: PipelineBoardProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id)
    setActiveDeal(deal || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveDeal(null)

    if (!over) return

    const dealId = active.id as string
    const newStageId = over.id as string

    // Se soltou sobre um card, pega o stage_id do card
    const targetDeal = deals.find(d => d.id === newStageId)
    const finalStageId = targetDeal ? targetDeal.stage_id : newStageId

    // Buscar o deal para comparar
    const deal = deals.find(d => d.id === dealId)
    if (!deal || deal.stage_id === finalStageId) return

    await onMoveDeal(dealId, finalStageId)
  }

  // Agrupar deals por estágio
  const getDealsByStage = (stageId: string) => {
    return deals.filter(deal => deal.stage_id === stageId)
  }

  // Calcular valor total por estágio
  const getTotalValueByStage = (stageId: string) => {
    const stageDeals = getDealsByStage(stageId)
    return stageDeals.reduce((sum, deal) => {
      const value = deal.value || 0
      const probability = deal.probability / 100
      return sum + (value * probability)
    }, 0)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 p-4 min-w-max">
          {stages.map(stage => {
            const stageDeals = getDealsByStage(stage.id)
            const totalValue = getTotalValueByStage(stage.id)

            return (
              <SortableContext
                key={stage.id}
                items={stageDeals.map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <PipelineColumn
                  stage={stage}
                  deals={stageDeals}
                  totalValue={totalValue}
                  onDealClick={onDealClick}
                  onEditStage={onEditStage}
                  onDeleteStage={onDeleteStage}
                />
              </SortableContext>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
