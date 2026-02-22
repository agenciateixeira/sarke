import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [stats, setStats] = useState<AutomationStats[]>([])
  const [loading, setLoading] = useState(true)

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
      // Buscar estatísticas agrupadas manualmente (já que a view pode não existir)
      const { data, error } = await supabase
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchLogs(), fetchStats()])
      setLoading(false)
    }

    fetchData()

    // Subscription para atualizações em tempo real
    const subscription = supabase
      .channel('automation_logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automation_execution_log',
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    logs,
    stats,
    loading,
    refetch: async () => {
      await Promise.all([fetchLogs(), fetchStats()])
    },
  }
}
