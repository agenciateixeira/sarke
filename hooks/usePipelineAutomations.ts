import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  AutomationRule,
  AutomationLog,
  AutomationAction,
  AutomationStats,
  AutomationRuleFormData,
} from '@/types/pipeline'

export function usePipelineAutomations() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [actions, setActions] = useState<AutomationAction[]>([])
  const [stats, setStats] = useState<AutomationStats[]>([])
  const [loading, setLoading] = useState(true)

  // =============================================
  // FETCH: Buscar regras de automação
  // =============================================
  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_automation_rules')
        .select('*')
        .order('priority', { ascending: true })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error fetching automation rules:', error)
      toast.error('Erro ao carregar regras de automação')
    }
  }

  // =============================================
  // FETCH: Buscar logs de execução
  // =============================================
  const fetchLogs = async (dealId?: string, limit = 50) => {
    try {
      let query = supabase
        .from('pipeline_automation_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (dealId) {
        query = query.eq('deal_id', dealId)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching automation logs:', error)
      toast.error('Erro ao carregar histórico de automações')
    }
  }

  // =============================================
  // FETCH: Buscar ações executadas
  // =============================================
  const fetchActions = async (dealId?: string) => {
    try {
      let query = supabase
        .from('pipeline_automation_actions')
        .select('*')
        .order('created_at', { ascending: false })

      if (dealId) {
        query = query.eq('deal_id', dealId)
      }

      const { data, error } = await query

      if (error) throw error
      setActions(data || [])
    } catch (error) {
      console.error('Error fetching automation actions:', error)
      toast.error('Erro ao carregar ações de automação')
    }
  }

  // =============================================
  // FETCH: Buscar estatísticas
  // =============================================
  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_stats')
        .select('*')

      if (error) throw error
      setStats(data || [])
    } catch (error) {
      console.error('Error fetching automation stats:', error)
    }
  }

  // =============================================
  // CREATE: Criar nova regra de automação
  // =============================================
  const createRule = async (ruleData: AutomationRuleFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('Profile não encontrado')

      const { data, error } = await supabase
        .from('pipeline_automation_rules')
        .insert({
          ...ruleData,
          created_by: profile.id,
          execution_count: 0,
          priority: ruleData.priority || 100,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Regra de automação criada!')
      await fetchRules()
      await fetchStats()
      return data
    } catch (error: any) {
      console.error('Error creating automation rule:', error)
      toast.error('Erro ao criar regra de automação')
      throw error
    }
  }

  // =============================================
  // UPDATE: Atualizar regra existente
  // =============================================
  const updateRule = async (ruleId: string, updates: Partial<AutomationRuleFormData>) => {
    try {
      const { error } = await supabase
        .from('pipeline_automation_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)

      if (error) throw error

      toast.success('Regra atualizada!')
      await fetchRules()
      await fetchStats()
    } catch (error: any) {
      console.error('Error updating automation rule:', error)
      toast.error('Erro ao atualizar regra')
      throw error
    }
  }

  // =============================================
  // TOGGLE: Ativar/desativar regra
  // =============================================
  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('pipeline_automation_rules')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)

      if (error) throw error

      toast.success(isActive ? 'Regra ativada!' : 'Regra desativada!')
      await fetchRules()
    } catch (error: any) {
      console.error('Error toggling automation rule:', error)
      toast.error('Erro ao alterar status da regra')
      throw error
    }
  }

  // =============================================
  // DELETE: Deletar regra
  // =============================================
  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('pipeline_automation_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      toast.success('Regra excluída!')
      await fetchRules()
      await fetchStats()
    } catch (error: any) {
      console.error('Error deleting automation rule:', error)
      toast.error('Erro ao excluir regra')
      throw error
    }
  }

  // =============================================
  // EXECUTE: Processar automações para um deal
  // =============================================
  const processAutomations = async (dealId: string, triggerType?: string) => {
    try {
      const { data, error } = await supabase.rpc('process_deal_automations', {
        p_deal_id: dealId,
        p_trigger_type: triggerType || null,
      })

      if (error) throw error

      if (data && data.processed > 0) {
        toast.success(`${data.processed} automação(ões) executada(s)!`)
        await fetchLogs(dealId)
        await fetchActions(dealId)
      }

      return data
    } catch (error: any) {
      console.error('Error processing automations:', error)
      toast.error('Erro ao processar automações')
      throw error
    }
  }

  // =============================================
  // UNDO: Desfazer ação de automação
  // =============================================
  const undoAction = async (actionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('Profile não encontrado')

      const { data, error } = await supabase.rpc('undo_automation_action', {
        p_action_id: actionId,
        p_user_id: profile.id,
      })

      if (error) throw error

      if (data && data.status === 'success') {
        toast.success('Ação desfeita!')
        await fetchActions()
        await fetchLogs()
      } else {
        toast.error(data?.error || 'Não foi possível desfazer a ação')
      }

      return data
    } catch (error: any) {
      console.error('Error undoing automation action:', error)
      toast.error('Erro ao desfazer ação')
      throw error
    }
  }

  // =============================================
  // HOOK: Carregar dados iniciais
  // =============================================
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        await Promise.all([
          fetchRules(),
          fetchLogs(),
          fetchStats(),
        ])
      } catch (error) {
        console.error('Error loading automation data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Real-time subscriptions
    const rulesChannel = supabase
      .channel('automation_rules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_automation_rules',
        },
        () => {
          fetchRules()
          fetchStats()
        }
      )
      .subscribe()

    const logsChannel = supabase
      .channel('automation_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pipeline_automation_logs',
        },
        () => {
          fetchLogs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(rulesChannel)
      supabase.removeChannel(logsChannel)
    }
  }, [])

  return {
    // Data
    rules,
    logs,
    actions,
    stats,
    loading,

    // Actions
    createRule,
    updateRule,
    toggleRule,
    deleteRule,
    processAutomations,
    undoAction,

    // Refresh
    refresh: async () => {
      await Promise.all([fetchRules(), fetchLogs(), fetchStats(), fetchActions()])
    },
    fetchLogs,
    fetchActions,
  }
}
