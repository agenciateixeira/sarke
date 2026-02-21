'use client'

import { useState } from 'react'
import { usePipeline } from '@/hooks/usePipeline'
import { PipelineBoard } from '@/components/comercial/PipelineBoard'
import { DealsListView } from '@/components/comercial/DealsListView'
import { DealDialog } from '@/components/comercial/DealDialog'
import { StageDialog } from '@/components/comercial/StageDialog'
import { DealStatusDialog } from '@/components/comercial/DealStatusDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, TrendingUp, Columns3, Search, X, Trophy, XCircle, Archive } from 'lucide-react'
import { Deal, DealFormData, PipelineStage } from '@/types/pipeline'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function PipelinePage() {
  const {
    stages,
    deals,
    wonDeals,
    lostDeals,
    archivedDeals,
    loading,
    createDeal,
    updateDeal,
    moveDeal,
    updateDealStatus,
    createStage,
    updateStage,
    deleteStage,
    archiveDeal,
    unarchiveDeal,
    reopenDeal,
    deleteDeal,
  } = usePipeline()
  const [activeTab, setActiveTab] = useState('pipeline')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | undefined>(undefined)
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | undefined>(undefined)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | undefined>(undefined)
  const [dealDeleteAlertOpen, setDealDeleteAlertOpen] = useState(false)
  const [dealToDelete, setDealToDelete] = useState<string | undefined>(undefined)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [dealForStatus, setDealForStatus] = useState<Deal | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')

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

  const handleNewStage = () => {
    setSelectedStage(undefined)
    setStageDialogOpen(true)
  }

  const handleEditStage = async (stage: PipelineStage) => {
    // Se apenas o nome foi alterado (edição rápida por duplo clique)
    if (stage.name !== stages.find(s => s.id === stage.id)?.name) {
      await updateStage(stage.id, { name: stage.name })
    } else {
      // Abre o dialog para edição completa
      setSelectedStage(stage)
      setStageDialogOpen(true)
    }
  }

  const handleDeleteStage = (stage: PipelineStage) => {
    setStageToDelete(stage)
    setDeleteAlertOpen(true)
  }

  const confirmDeleteStage = async () => {
    if (stageToDelete) {
      await deleteStage(stageToDelete.id)
      setDeleteAlertOpen(false)
      setStageToDelete(undefined)
    }
  }

  const handleSaveStage = async (data: { name: string; description?: string; color: string }) => {
    if (selectedStage) {
      await updateStage(selectedStage.id, data)
    } else {
      await createStage(data)
    }
  }

  const handleArchiveDeal = async (dealId: string) => {
    await archiveDeal(dealId)
  }

  const handleDeleteDeal = (dealId: string) => {
    setDealToDelete(dealId)
    setDealDeleteAlertOpen(true)
  }

  const confirmDeleteDeal = async () => {
    if (dealToDelete) {
      await deleteDeal(dealToDelete)
      setDealDeleteAlertOpen(false)
      setDealToDelete(undefined)
    }
  }

  const handleMarkAsWonLost = (deal: Deal) => {
    setDealForStatus(deal)
    setStatusDialogOpen(true)
  }

  // Filtrar deals baseado na busca
  const filteredDeals = deals.filter(deal => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()

    // Busca por título
    if (deal.title.toLowerCase().includes(search)) return true

    // Busca por cliente
    if (deal.client?.name.toLowerCase().includes(search)) return true

    // Busca por valor
    if (deal.value && deal.value.toString().includes(search)) return true

    // Busca por tags
    if (deal.tags && deal.tags.some(tag => tag.toLowerCase().includes(search))) return true

    return false
  })

  // Calcular métricas totais (usando deals filtrados)
  const totalValue = filteredDeals.reduce((sum, deal) => sum + (deal.value || 0), 0)
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
          <div className="flex gap-2">
            {activeTab === 'pipeline' && (
              <Button variant="outline" onClick={handleNewStage}>
                <Columns3 className="h-4 w-4 mr-2" />
                Nova Coluna
              </Button>
            )}
            <Button onClick={handleNewDeal}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Negócio
            </Button>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título, cliente, valor ou tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredDeals.length} {filteredDeals.length === 1 ? 'negócio encontrado' : 'negócios encontrados'}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4 border-b">
          <TabsList>
            <TabsTrigger value="pipeline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Ativos
              <Badge variant="secondary">{deals.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="won" className="gap-2">
              <Trophy className="h-4 w-4 text-green-600" />
              Ganhos
              <Badge variant="secondary" className="bg-green-100 text-green-700">{wonDeals.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="lost" className="gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Perdidos
              <Badge variant="secondary" className="bg-red-100 text-red-700">{lostDeals.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <Archive className="h-4 w-4 text-gray-600" />
              Arquivados
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">{archivedDeals.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Pipeline (Ativos) */}
        <TabsContent value="pipeline" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
          {/* Métricas */}
          <div className="px-6 pt-4 pb-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Total de negócios
                </div>
                <p className="text-2xl font-bold">{filteredDeals.length}</p>
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
              deals={filteredDeals}
              onMoveDeal={moveDeal}
              onDealClick={handleDealClick}
              onEditStage={handleEditStage}
              onDeleteStage={handleDeleteStage}
              onArchiveDeal={handleArchiveDeal}
              onDeleteDeal={handleDeleteDeal}
              onMarkAsWonLost={handleMarkAsWonLost}
            />
          </div>
        </TabsContent>

        {/* Tab: Ganhos */}
        <TabsContent value="won" className="flex-1 overflow-auto m-0 p-6">
          <DealsListView
            deals={wonDeals}
            type="won"
            onDealClick={handleDealClick}
            onDelete={handleDeleteDeal}
            onReopen={reopenDeal}
          />
        </TabsContent>

        {/* Tab: Perdidos */}
        <TabsContent value="lost" className="flex-1 overflow-auto m-0 p-6">
          <DealsListView
            deals={lostDeals}
            type="lost"
            onDealClick={handleDealClick}
            onDelete={handleDeleteDeal}
            onReopen={reopenDeal}
          />
        </TabsContent>

        {/* Tab: Arquivados */}
        <TabsContent value="archived" className="flex-1 overflow-auto m-0 p-6">
          <DealsListView
            deals={archivedDeals}
            type="archived"
            onDealClick={handleDealClick}
            onDelete={handleDeleteDeal}
            onUnarchive={unarchiveDeal}
            onReopen={reopenDeal}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog para criar/editar negócio */}
      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deal={selectedDeal}
        stages={stages}
        onSave={handleSaveDeal}
      />

      {/* Dialog para criar/editar estágio */}
      <StageDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        stage={selectedStage}
        onSave={handleSaveStage}
      />

      {/* Confirmação de exclusão de estágio */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o estágio "{stageToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de status Won/Lost */}
      <DealStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        deal={dealForStatus}
        onUpdateStatus={updateDealStatus}
      />

      {/* Confirmação de exclusão de negócio */}
      <AlertDialog open={dealDeleteAlertOpen} onOpenChange={setDealDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este negócio permanentemente?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDeal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
