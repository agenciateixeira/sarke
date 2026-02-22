import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Client, Deal, ArchitectureProject, Contract, ClientActivity } from '@/types/crm'

interface ClientDetailsData {
  client: Client | null
  deals: Deal[]
  projects: ArchitectureProject[]
  contracts: Contract[]
  activities: ClientActivity[]
  loading: boolean
  updateClient: (data: Partial<Client>) => Promise<{ error: string | null }>
  refetch: () => Promise<void>
}

export function useClientDetails(clientId: string): ClientDetailsData {
  const [client, setClient] = useState<Client | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [projects, setProjects] = useState<ArchitectureProject[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [activities, setActivities] = useState<ClientActivity[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (error) throw error
      setClient(data)
    } catch (error) {
      console.error('Error fetching client:', error)
      setClient(null)
    }
  }

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeals(data || [])
    } catch (error) {
      console.error('Error fetching deals:', error)
      setDeals([])
    }
  }

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('architecture_projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      setProjects([])
    }
  }

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContracts(data || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
      setContracts([])
    }
  }

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('client_activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([])
    }
  }

  const updateClient = async (data: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', clientId)

      if (error) throw error

      await fetchClient()
      return { error: null }
    } catch (error: any) {
      console.error('Error updating client:', error)
      return { error: error.message || 'Erro ao atualizar cliente' }
    }
  }

  const refetch = async () => {
    setLoading(true)
    await Promise.all([
      fetchClient(),
      fetchDeals(),
      fetchProjects(),
      fetchContracts(),
      fetchActivities(),
    ])
    setLoading(false)
  }

  useEffect(() => {
    refetch()

    // Real-time subscriptions
    const clientSubscription = supabase
      .channel(`client_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `id=eq.${clientId}`,
        },
        () => {
          fetchClient()
        }
      )
      .subscribe()

    const dealsSubscription = supabase
      .channel(`client_deals_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchDeals()
        }
      )
      .subscribe()

    const projectsSubscription = supabase
      .channel(`client_projects_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'architecture_projects',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchProjects()
        }
      )
      .subscribe()

    const contractsSubscription = supabase
      .channel(`client_contracts_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchContracts()
        }
      )
      .subscribe()

    const activitiesSubscription = supabase
      .channel(`client_activities_${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_activities',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchActivities()
        }
      )
      .subscribe()

    return () => {
      clientSubscription.unsubscribe()
      dealsSubscription.unsubscribe()
      projectsSubscription.unsubscribe()
      contractsSubscription.unsubscribe()
      activitiesSubscription.unsubscribe()
    }
  }, [clientId])

  return {
    client,
    deals,
    projects,
    contracts,
    activities,
    loading,
    updateClient,
    refetch,
  }
}
