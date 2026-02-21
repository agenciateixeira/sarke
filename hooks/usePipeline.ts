import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Deal, PipelineStage, DealFormData } from '@/types/pipeline'

export function usePipeline() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
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

  // Buscar deals
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
        .order('created_at', { ascending: false })

      if (error) throw error

      setDeals(data || [])
    } catch (error) {
      console.error('Error fetching deals:', error)
      toast.error('Erro ao carregar negócios')
    } finally {
      setLoading(false)
    }
  }

  // Criar deal
  const createDeal = async (dealData: DealFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('deals')
        .insert({
          ...dealData,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Negócio criado com sucesso!')
      await fetchDeals()
      return data
    } catch (error: any) {
      console.error('Error creating deal:', error)
      toast.error('Erro ao criar negócio')
      throw error
    }
  }

  // Atualizar deal
  const updateDeal = async (dealId: string, updates: Partial<DealFormData>) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
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
    } catch (error: any) {
      console.error('Error updating deal status:', error)
      toast.error('Erro ao atualizar status')
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

  useEffect(() => {
    fetchStages()
    fetchDeals()

    // Subscribe to real-time changes
    const channel = supabase
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    stages,
    deals,
    loading,
    createDeal,
    updateDeal,
    moveDeal,
    updateDealStatus,
    deleteDeal,
    refreshDeals: fetchDeals,
  }
}
