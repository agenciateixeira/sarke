import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Deal, PipelineStage, DealFormData } from '@/types/pipeline'

export function usePipeline() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [wonDeals, setWonDeals] = useState<Deal[]>([])
  const [lostDeals, setLostDeals] = useState<Deal[]>([])
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  // Buscar estágios do pipeline
  const fetchStages = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error

      setStages(data || [])
    } catch (error) {
      console.error('Error fetching stages:', error)
      toast.error('Erro ao carregar estágios do pipeline')
    }
  }

  // Buscar deals ativos
  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          client:clients (id, name, email),
          owner:profiles!owner_id (id, name, avatar_url)
        `)
        .eq('status', 'open')
        .eq('archived', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      setDeals(data || [])
    } catch (error) {
      console.error('Error fetching deals:', error)
      toast.error('Erro ao carregar negócios')
    }
  }

  // Buscar deals ganhos
  const fetchWonDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          client:clients (id, name, email),
          owner:profiles!owner_id (id, name, avatar_url)
        `)
        .eq('status', 'won')
        .eq('archived', false)
        .order('actual_close_date', { ascending: false })

      if (error) throw error

      setWonDeals(data || [])
    } catch (error) {
      console.error('Error fetching won deals:', error)
    }
  }

  // Buscar deals perdidos
  const fetchLostDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          client:clients (id, name, email),
          owner:profiles!owner_id (id, name, avatar_url)
        `)
        .eq('status', 'lost')
        .eq('archived', false)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setLostDeals(data || [])
    } catch (error) {
      console.error('Error fetching lost deals:', error)
    }
  }

  // Buscar deals arquivados
  const fetchArchivedDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          client:clients (id, name, email),
          owner:profiles!owner_id (id, name, avatar_url)
        `)
        .eq('archived', true)
        .order('archived_at', { ascending: false })

      if (error) throw error

      setArchivedDeals(data || [])
    } catch (error) {
      console.error('Error fetching archived deals:', error)
    }
  }

  // Criar deal
  const createDeal = async (dealData: DealFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Sanitiza campos opcionais: converte strings vazias em null
      const sanitized: Record<string, any> = {
        ...dealData,
        owner_id: user.id,
        client_id: dealData.client_id || null,
        expected_close_date: dealData.expected_close_date || null,
        next_follow_up_date: dealData.next_follow_up_date || null,
        decision_deadline: dealData.decision_deadline || null,
        lead_source_detail: dealData.lead_source_detail || null,
        competitors: dealData.competitors || null,
        description: dealData.description || null,
        notes: dealData.notes || null,
      }

      // Remove campos undefined para não poluir o insert
      Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k])

      console.log('📤 Criando deal:', JSON.stringify(sanitized))

      const { data, error } = await supabase
        .from('deals')
        .insert(sanitized)
        .select()
        .single()

      if (error) {
        const errStr = JSON.stringify(error, Object.getOwnPropertyNames(error))
        console.error('❌ Erro Supabase ao criar deal:', errStr)
        throw new Error(error.message || errStr)
      }

      toast.success('Negócio criado com sucesso!')
      await fetchDeals()
      return data
    } catch (error: any) {
      const msg = error?.message || JSON.stringify(error, Object.getOwnPropertyNames(error)) || String(error)
      console.error('❌ createDeal falhou:', msg)
      toast.error(`Erro ao criar negócio: ${msg}`)
      throw new Error(msg)
    }
  }

  // Atualizar deal
  const updateDeal = async (dealId: string, updates: Partial<DealFormData>) => {
    try {
      const sanitized: Record<string, any> = {
        ...updates,
        client_id: updates.client_id || null,
        expected_close_date: updates.expected_close_date || null,
        next_follow_up_date: updates.next_follow_up_date || null,
        decision_deadline: updates.decision_deadline || null,
        lead_source_detail: updates.lead_source_detail || null,
        competitors: updates.competitors || null,
        description: updates.description || null,
        notes: updates.notes || null,
        updated_at: new Date().toISOString(),
      }

      Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k])

      // Backward-compat: renomeações de enum conhecidas
      if (sanitized.business_type === 'industrial') sanitized.business_type = 'corporativo'

      // Nulifica enums com valores inválidos para evitar violação de constraint no banco
      const VALID_BUSINESS_TYPES = ['residencial', 'comercial', 'corporativo', 'publico']
      const VALID_SERVICE_TYPES = ['projeto_arquitetonico', 'projeto_arquitetonico_completo', 'projeto_interiores', 'gestao_obra', 'consultoria', 'regularizacao', 'reformas', 'acompanhamento', 'outros']
      const VALID_LEAD_SOURCES = ['website', 'indicacao', 'instagram', 'facebook', 'linkedin', 'google_ads', 'facebook_ads', 'evento', 'cold_call', 'email_marketing', 'parceria', 'retorno', 'outros']
      const VALID_TEMPERATURES = ['quente', 'morno', 'frio']
      const VALID_URGENCIES = ['alta', 'media', 'baixa']

      if (sanitized.business_type && !VALID_BUSINESS_TYPES.includes(sanitized.business_type)) sanitized.business_type = null
      if (sanitized.service_type && !VALID_SERVICE_TYPES.includes(sanitized.service_type)) sanitized.service_type = null
      if (sanitized.lead_source && !VALID_LEAD_SOURCES.includes(sanitized.lead_source)) sanitized.lead_source = null
      if (sanitized.temperature && !VALID_TEMPERATURES.includes(sanitized.temperature)) sanitized.temperature = null
      if (sanitized.urgency && !VALID_URGENCIES.includes(sanitized.urgency)) sanitized.urgency = null

      const { error } = await supabase
        .from('deals')
        .update(sanitized)
        .eq('id', dealId)

      if (error) throw error

      toast.success('Negócio atualizado!')
      await fetchDeals()
    } catch (error: any) {
      console.error('Error updating deal:', error)
      toast.error('Erro ao atualizar negócio')
      throw error
    }
  }

  // Mover deal para outro estágio (drag & drop)
  const moveDeal = async (dealId: string, newStageId: string) => {
    try {
      // Atualização otimista
      setDeals(prev =>
        prev.map(deal =>
          deal.id === dealId ? { ...deal, stage_id: newStageId } : deal
        )
      )

      const { error } = await supabase
        .from('deals')
        .update({
          stage_id: newStageId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId)

      if (error) throw error

      // Não mostrar toast em toda movimentação para não poluir
    } catch (error: any) {
      console.error('Error moving deal:', error)
      toast.error('Erro ao mover negócio')
      // Reverter otimismo
      await fetchDeals()
      throw error
    }
  }

  // Marcar deal como ganho/perdido
  const updateDealStatus = async (dealId: string, status: 'won' | 'lost', lostReason?: string) => {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (status === 'won') {
        updates.actual_close_date = new Date().toISOString()
      }

      if (status === 'lost' && lostReason) {
        updates.lost_reason = lostReason
      }

      const { error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', dealId)

      if (error) throw error

      toast.success(status === 'won' ? 'Negócio ganho!' : 'Negócio perdido')
      await fetchDeals()
      await fetchWonDeals()
      await fetchLostDeals()
    } catch (error: any) {
      console.error('Error updating deal status:', error)
      toast.error('Erro ao atualizar status')
      throw error
    }
  }

  // Arquivar deal
  const archiveDeal = async (dealId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase
        .from('deals')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId)

      if (error) throw error

      toast.success('Negócio arquivado!')
      await fetchDeals()
      await fetchWonDeals()
      await fetchLostDeals()
      await fetchArchivedDeals()
    } catch (error: any) {
      console.error('Error archiving deal:', error)
      toast.error('Erro ao arquivar negócio')
      throw error
    }
  }

  // Desarquivar deal
  const unarchiveDeal = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({
          archived: false,
          archived_at: null,
          archived_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId)

      if (error) throw error

      toast.success('Negócio desarquivado!')
      await fetchDeals()
      await fetchWonDeals()
      await fetchLostDeals()
      await fetchArchivedDeals()
    } catch (error: any) {
      console.error('Error unarchiving deal:', error)
      toast.error('Erro ao desarquivar negócio')
      throw error
    }
  }

  // Reabrir deal (Won/Lost -> Open)
  const reopenDeal = async (dealId: string) => {
    try {
      // Buscar o deal para pegar o primeiro stage
      const { data: firstStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .order('order_index', { ascending: true })
        .limit(1)
        .single()

      if (!firstStage) {
        toast.error('Nenhum estágio encontrado no pipeline')
        return
      }

      const { error } = await supabase
        .from('deals')
        .update({
          status: 'open',
          stage_id: firstStage.id,
          lost_reason: null,
          actual_close_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId)

      if (error) throw error

      toast.success('Negócio reaberto e movido para o início do pipeline!')
      await fetchDeals()
      await fetchWonDeals()
      await fetchLostDeals()
      await fetchArchivedDeals()
    } catch (error: any) {
      console.error('Error reopening deal:', error)
      toast.error('Erro ao reabrir negócio')
      throw error
    }
  }

  // Deletar deal
  const deleteDeal = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId)

      if (error) throw error

      toast.success('Negócio excluído!')
      await fetchDeals()
    } catch (error: any) {
      console.error('Error deleting deal:', error)
      toast.error('Erro ao excluir negócio')
      throw error
    }
  }

  // Criar estágio
  const createStage = async (stageData: { name: string; description?: string; color: string }) => {
    try {
      // Buscar o maior order_index
      const { data: existingStages } = await supabase
        .from('pipeline_stages')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)

      const maxOrder = existingStages?.[0]?.order_index || 0

      const { error } = await supabase
        .from('pipeline_stages')
        .insert({
          ...stageData,
          order_index: maxOrder + 1,
        })

      if (error) throw error

      toast.success('Estágio criado com sucesso!')
      await fetchStages()
    } catch (error: any) {
      console.error('Error creating stage:', error)
      toast.error('Erro ao criar estágio')
      throw error
    }
  }

  // Atualizar estágio
  const updateStage = async (stageId: string, updates: { name?: string; description?: string; color?: string }) => {
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update(updates)
        .eq('id', stageId)

      if (error) throw error

      toast.success('Estágio atualizado!')
      await fetchStages()
    } catch (error: any) {
      console.error('Error updating stage:', error)
      toast.error('Erro ao atualizar estágio')
      throw error
    }
  }

  // Deletar estágio
  const deleteStage = async (stageId: string) => {
    try {
      // Verificar se tem deals neste estágio
      const { data: dealsInStage } = await supabase
        .from('deals')
        .select('id')
        .eq('stage_id', stageId)
        .limit(1)

      if (dealsInStage && dealsInStage.length > 0) {
        toast.error('Não é possível excluir um estágio que contém negócios')
        return
      }

      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId)

      if (error) throw error

      toast.success('Estágio excluído!')
      await fetchStages()
    } catch (error: any) {
      console.error('Error deleting stage:', error)
      toast.error('Erro ao excluir estágio')
      throw error
    }
  }

  // Reordenar estágios
  const reorderStages = async (stageIds: string[]) => {
    try {
      const updates = stageIds.map((id, index) => ({
        id,
        order_index: index + 1,
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('pipeline_stages')
          .update({ order_index: update.order_index })
          .eq('id', update.id)

        if (error) throw error
      }

      await fetchStages()
    } catch (error: any) {
      console.error('Error reordering stages:', error)
      toast.error('Erro ao reordenar estágios')
      throw error
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        await Promise.all([
          fetchStages(),
          fetchDeals(),
          fetchWonDeals(),
          fetchLostDeals(),
          fetchArchivedDeals(),
        ])
      } catch (error) {
        console.error('Error loading pipeline data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Subscribe to real-time changes
    const dealsChannel = supabase
      .channel('deals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
        },
        () => {
          fetchDeals()
          fetchWonDeals()
          fetchLostDeals()
          fetchArchivedDeals()
        }
      )
      .subscribe()

    const stagesChannel = supabase
      .channel('stages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_stages',
        },
        () => {
          fetchStages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(dealsChannel)
      supabase.removeChannel(stagesChannel)
    }
  }, [])

  return {
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
    archiveDeal,
    unarchiveDeal,
    reopenDeal,
    deleteDeal,
    refreshDeals: fetchDeals,
    refreshWonDeals: fetchWonDeals,
    refreshLostDeals: fetchLostDeals,
    refreshArchivedDeals: fetchArchivedDeals,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  }
}
