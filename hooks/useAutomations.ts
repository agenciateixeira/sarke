import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface AutomationRule {
  id: string
  name: string
  description?: string
  trigger_type: string
  trigger_conditions: any
  actions: any
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AutomationLog {
  id: string
  automation_name: string
  automation_type: string
  deal_id: string
  status: 'success' | 'error'
  error_message?: string
  metadata?: any
  created_at: string
}

interface AutomationStats {
  automation_name: string
  automation_type: string
  total_executions: number
  successful_executions: number
  failed_executions: number
  last_execution: string
  first_execution: string
}

export function useAutomations() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [stats, setStats] = useState<AutomationStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_automation_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error fetching automation rules:', error)
    }
  }

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_execution_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching automation logs:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const { data, error} = await supabase
        .from('automation_execution_log')
        .select('automation_name, automation_type, status, created_at')

      if (error) throw error

      // Agrupar manualmente
      const grouped = (data || []).reduce((acc, log) => {
        const key = `${log.automation_name}|${log.automation_type}`
        if (!acc[key]) {
          acc[key] = {
            automation_name: log.automation_name,
            automation_type: log.automation_type,
            total_executions: 0,
            successful_executions: 0,
            failed_executions: 0,
            last_execution: log.created_at,
            first_execution: log.created_at,
          }
        }

        acc[key].total_executions++
        if (log.status === 'success') acc[key].successful_executions++
        if (log.status === 'error') acc[key].failed_executions++

        if (new Date(log.created_at) > new Date(acc[key].last_execution)) {
          acc[key].last_execution = log.created_at
        }
        if (new Date(log.created_at) < new Date(acc[key].first_execution)) {
          acc[key].first_execution = log.created_at
        }

        return acc
      }, {} as Record<string, AutomationStats>)

      setStats(Object.values(grouped))
    } catch (error) {
      console.error('Error fetching automation stats:', error)
    }
  }

  const toggleAutomation = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('pipeline_automation_rules')
        .update({ is_active: !currentState })
        .eq('id', id)

      if (error) throw error

      toast.success(!currentState ? 'Automação ativada' : 'Automação desativada')
      await fetchRules()
    } catch (error: any) {
      console.error('Error toggling automation:', error)
      toast.error('Erro ao atualizar automação')
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchRules(), fetchLogs(), fetchStats()])
      setLoading(false)
    }

    fetchData()

    // Subscription para atualizações em tempo real
    const rulesSubscription = supabase
      .channel('automation_rules')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_automation_rules',
        },
        () => {
          fetchRules()
        }
      )
      .subscribe()

    const logsSubscription = supabase
      .channel('automation_logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automation_execution_log',
        },
        () => {
          fetchLogs()
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      rulesSubscription.unsubscribe()
      logsSubscription.unsubscribe()
    }
  }, [])

  return {
    rules,
    logs,
    stats,
    loading,
    toggleAutomation,
    refetch: async () => {
      await Promise.all([fetchRules(), fetchLogs(), fetchStats()])
    },
  }
}
