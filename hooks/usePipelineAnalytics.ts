import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  PipelineStageMetrics,
  StageConversionRate,
  StageAverageDuration,
  PipelinePerformance,
  OwnerPerformance,
  ChurnAnalysis,
  LostReasonAnalysis,
  RevenueForecast,
} from '@/types/pipeline'

export function usePipelineAnalytics() {
  const [stageMetrics, setStageMetrics] = useState<PipelineStageMetrics[]>([])
  const [conversionRates, setConversionRates] = useState<StageConversionRate[]>([])
  const [stageDurations, setStageDurations] = useState<StageAverageDuration[]>([])
  const [performance, setPerformance] = useState<PipelinePerformance | null>(null)
  const [ownerPerformance, setOwnerPerformance] = useState<OwnerPerformance[]>([])
  const [churnAnalysis, setChurnAnalysis] = useState<ChurnAnalysis[]>([])
  const [lostReasons, setLostReasons] = useState<LostReasonAnalysis[]>([])
  const [revenueForecast, setRevenueForecast] = useState<RevenueForecast[]>([])
  const [loading, setLoading] = useState(true)

  // Buscar métricas por estágio
  const fetchStageMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_stage_metrics')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setStageMetrics(data || [])
    } catch (error) {
      console.error('Error fetching stage metrics:', error)
      toast.error('Erro ao carregar métricas por estágio')
    }
  }

  // Buscar taxas de conversão
  const fetchConversionRates = async () => {
    try {
      const { data, error } = await supabase
        .from('stage_conversion_rates')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setConversionRates(data || [])
    } catch (error) {
      console.error('Error fetching conversion rates:', error)
      toast.error('Erro ao carregar taxas de conversão')
    }
  }

  // Buscar duração média por estágio
  const fetchStageDurations = async () => {
    try {
      const { data, error } = await supabase
        .from('stage_average_duration')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setStageDurations(data || [])
    } catch (error) {
      console.error('Error fetching stage durations:', error)
      toast.error('Erro ao carregar duração por estágio')
    }
  }

  // Buscar performance geral
  const fetchPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_performance')
        .select('*')
        .single()

      if (error) throw error
      setPerformance(data)
    } catch (error) {
      console.error('Error fetching performance:', error)
      toast.error('Erro ao carregar performance do pipeline')
    }
  }

  // Buscar performance por responsável
  const fetchOwnerPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from('owner_performance')
        .select('*')
        .order('won_value_30d', { ascending: false })

      if (error) throw error
      setOwnerPerformance(data || [])
    } catch (error) {
      console.error('Error fetching owner performance:', error)
      toast.error('Erro ao carregar performance por responsável')
    }
  }

  // Buscar análise de churn
  const fetchChurnAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('churn_analysis')
        .select('*')
        .order('month', { ascending: false })
        .limit(12)

      if (error) throw error
      setChurnAnalysis(data || [])
    } catch (error) {
      console.error('Error fetching churn analysis:', error)
      toast.error('Erro ao carregar análise de churn')
    }
  }

  // Buscar motivos de perda
  const fetchLostReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('lost_reasons_analysis')
        .select('*')
        .order('count', { ascending: false })
        .limit(10)

      if (error) throw error
      setLostReasons(data || [])
    } catch (error) {
      console.error('Error fetching lost reasons:', error)
      toast.error('Erro ao carregar motivos de perda')
    }
  }

  // Buscar previsão de receita
  const fetchRevenueForecast = async (months: number = 3) => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_revenue_forecast', { months })

      if (error) throw error
      setRevenueForecast(data || [])
    } catch (error) {
      console.error('Error fetching revenue forecast:', error)
      toast.error('Erro ao carregar previsão de receita')
    }
  }

  // Atualizar todos os dados
  const refreshAll = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchStageMetrics(),
        fetchConversionRates(),
        fetchStageDurations(),
        fetchPerformance(),
        fetchOwnerPerformance(),
        fetchChurnAnalysis(),
        fetchLostReasons(),
        fetchRevenueForecast(),
      ])
    } catch (error) {
      console.error('Error refreshing analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()

    // Subscribe to changes in deals table to refresh analytics
    const dealsChannel = supabase
      .channel('analytics_deals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
        },
        () => {
          // Debounce refresh to avoid too many calls
          setTimeout(refreshAll, 1000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(dealsChannel)
    }
  }, [])

  return {
    // Data
    stageMetrics,
    conversionRates,
    stageDurations,
    performance,
    ownerPerformance,
    churnAnalysis,
    lostReasons,
    revenueForecast,
    loading,

    // Actions
    refreshAll,
    fetchRevenueForecast,
  }
}
