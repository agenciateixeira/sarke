import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export type EventType = 'meeting' | 'task' | 'reminder' | 'project_milestone' | 'client_appointment'
export type EventStatus = 'scheduled' | 'completed' | 'cancelled' | 'in_progress'
export type ParticipantStatus = 'pending' | 'accepted' | 'declined' | 'tentative'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  is_all_day: boolean
  event_type: EventType
  client_id?: string
  project_id?: string
  task_id?: string
  meet_link?: string
  meet_id?: string
  organizer_id: string
  participants: string[]
  location?: string
  color: string
  status: EventStatus
  is_recurring: boolean
  recurrence_rule?: string
  parent_event_id?: string
  reminder_minutes: number[]
  created_at: string
  updated_at: string
  created_by: string

  // Dados joinados da view
  organizer_name?: string
  organizer_email?: string
  client_name?: string
  client_email?: string
  project_name?: string
}

export interface CreateEventData {
  title: string
  description?: string
  start_time: string
  end_time: string
  is_all_day?: boolean
  event_type: EventType
  client_id?: string
  project_id?: string
  task_id?: string
  participants?: string[]
  location?: string
  color?: string
  reminder_minutes?: number[]
}

export interface UpdateEventData extends Partial<CreateEventData> {
  status?: EventStatus
}

export function useCalendarEvents(startDate?: Date, endDate?: Date) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('calendar_events_with_details')
        .select('*')
        .order('start_time', { ascending: true })

      // Filtrar por data se fornecido
      if (startDate) {
        query = query.gte('start_time', startDate.toISOString())
      }
      if (endDate) {
        query = query.lte('start_time', endDate.toISOString())
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        // Se a tabela não existe, apenas retornar array vazio (banco não configurado ainda)
        if (fetchError.code === 'PGRST205') {
          console.warn('Tabela calendar_events_with_details não existe. Execute os scripts SQL do Supabase.')
          setEvents([])
          return
        }
        throw fetchError
      }

      setEvents(data || [])
    } catch (err: any) {
      console.error('Error fetching events:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()

    // Subscrever a mudanças em tempo real
    const channel = supabase
      .channel('calendar_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events'
        },
        () => {
          fetchEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, startDate, endDate])

  const createEvent = async (eventData: CreateEventData) => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([
          {
            ...eventData,
            organizer_id: user.id,
            created_by: user.id,
            color: eventData.color || '#ff2697',
            is_all_day: eventData.is_all_day || false,
            reminder_minutes: eventData.reminder_minutes || [15, 60],
            participants: eventData.participants || []
          }
        ])
        .select()
        .single()

      if (error) {
        // Se a tabela não existe
        if (error.code === 'PGRST204' || error.code === '42P01') {
          toast.error('Configure o banco de dados primeiro! Execute os scripts SQL no Supabase.')
          return null
        }
        throw error
      }

      toast.success('Evento criado com sucesso!')
      await fetchEvents()
      return data
    } catch (err: any) {
      console.error('Error creating event:', err)
      const errorMessage = err.message || 'Erro desconhecido ao criar evento'
      toast.error('Erro ao criar evento: ' + errorMessage)
      return null
    }
  }

  const updateEvent = async (eventId: string, updates: UpdateEventData) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single()

      if (error) throw error

      toast.success('Evento atualizado com sucesso!')
      await fetchEvents()
      return data
    } catch (err: any) {
      console.error('Error updating event:', err)
      toast.error('Erro ao atualizar evento: ' + err.message)
      return null
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      toast.success('Evento excluído com sucesso!')
      await fetchEvents()
      return true
    } catch (err: any) {
      console.error('Error deleting event:', err)
      toast.error('Erro ao excluir evento: ' + err.message)
      return false
    }
  }

  const getEventsByDay = (date: Date) => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return events.filter(event => {
      const eventStart = new Date(event.start_time)
      return eventStart >= dayStart && eventStart <= dayEnd
    })
  }

  const getEventsByType = (type: EventType) => {
    return events.filter(event => event.event_type === type)
  }

  const getEventsByClient = (clientId: string) => {
    return events.filter(event => event.client_id === clientId)
  }

  const getEventsByProject = (projectId: string) => {
    return events.filter(event => event.project_id === projectId)
  }

  const getTodayEvents = () => {
    return getEventsByDay(new Date())
  }

  const getUpcomingEvents = (days: number = 7) => {
    const now = new Date()
    const future = new Date()
    future.setDate(future.getDate() + days)

    return events.filter(event => {
      const eventStart = new Date(event.start_time)
      return eventStart >= now && eventStart <= future && event.status === 'scheduled'
    })
  }

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: fetchEvents,
    getEventsByDay,
    getEventsByType,
    getEventsByClient,
    getEventsByProject,
    getTodayEvents,
    getUpcomingEvents
  }
}
