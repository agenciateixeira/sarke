'use client'

import { useState } from 'react'
import { usePipeline } from '@/hooks/usePipeline'
import { PipelineBoard } from '@/components/comercial/PipelineBoard'
import { DealDialog } from '@/components/comercial/DealDialog'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, TrendingUp } from 'lucide-react'
import { Deal, DealFormData } from '@/types/pipeline'

export default function PipelinePage() {
  const { stages, deals, loading, createDeal, updateDeal, moveDeal } = usePipeline()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | undefined>(undefined)

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal)
    setDialogOpen(true)
  }

  const handleSaveDeal = async (formData: DealFormData) => {
    if (selectedDeal) {
      await updateDeal(selectedDeal.id, formData)
    } else {
      await createDeal(formData)
    }
  }

  const handleNewDeal = () => {
    setSelectedDeal(undefined)
    setDialogOpen(true)
  }

  // Calcular métricas totais
  const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0)
  const weightedValue = deals.reduce((sum, deal) => {
    const value = deal.value || 0
    const probability = deal.probability / 100
    return sum + (value * probability)
  }, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Pipeline de Vendas</h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie seu funil de vendas
            </p>
          </div>
          <Button onClick={handleNewDeal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Negócio
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Total de negócios
            </div>
            <p className="text-2xl font-bold">{deals.length}</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">
              Valor total em pipeline
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">
              Valor ponderado (probabilidade)
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(weightedValue)}</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <PipelineBoard
          stages={stages}
          deals={deals}
          onMoveDeal={moveDeal}
          onDealClick={handleDealClick}
        />
      </div>

      {/* Dialog para criar/editar */}
      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deal={selectedDeal}
        stages={stages}
        onSave={handleSaveDeal}
      />
    </div>
  )
}
