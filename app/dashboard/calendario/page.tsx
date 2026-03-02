'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { CalendarView, CalendarEventData } from '@/components/calendar/CalendarView'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, RefreshCw, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'

interface CalendarIntegration {
  id: string
  provider: string
  provider_email: string
  is_active: boolean
  last_sync_at: string | null
}

export default function CalendarioPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null)
  const [events, setEvents] = useState<CalendarEventData[]>([])

  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user])

  async function carregarDados() {
    try {
      setLoading(true)

      // Buscar integração
      const { data: integrationData, error: integrationError } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('provider', 'google')
        .single()

      if (integrationError && integrationError.code !== 'PGRST116') {
        throw integrationError
      }

      setIntegration(integrationData)

      // Se tem integração, buscar eventos
      if (integrationData) {
        await carregarEventos(integrationData.id)
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar calendário')
    } finally {
      setLoading(false)
    }
  }

  async function carregarEventos(integrationId: string) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('integration_id', integrationId)
        .order('start_date', { ascending: true })

      if (error) throw error

      const calendarEvents: CalendarEventData[] = (data || []).map(event => ({
        id: event.id,
        title: event.summary,
        start: new Date(event.start_date),
        end: new Date(event.end_date),
        allDay: event.all_day,
        description: event.description,
        location: event.location,
        attendees: event.attendees?.map((email: string) => ({ email })) || [],
      }))

      setEvents(calendarEvents)
    } catch (error: any) {
      console.error('Erro ao carregar eventos:', error)
    }
  }

  async function sincronizarAgora() {
    if (!integration) return

    try {
      setSyncing(true)

      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: integration.id }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`${result.eventsCount} eventos sincronizados!`)
        await carregarDados()
      } else {
        toast.error(result.message || 'Erro ao sincronizar')
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error)
      toast.error('Erro ao sincronizar calendário')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!integration) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader
            title="Calendário"
            description="Conecte seu Google Calendar para visualizar seus eventos"
          />

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Conectar Calendário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Você ainda não conectou nenhum calendário. Conecte seu Google Calendar
                para visualizar e gerenciar seus eventos diretamente no Sarke.
              </p>

              <div className="flex flex-col gap-2">
                <Link href="/dashboard/configuracoes/calendario">
                  <Button className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Conectar Google Calendar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Calendário"
            description={`Conectado com ${integration.provider_email}`}
          />

          <div className="flex items-center gap-2">
            {integration.last_sync_at && (
              <p className="text-sm text-muted-foreground">
                Última sincronização: {new Date(integration.last_sync_at).toLocaleString('pt-BR')}
              </p>
            )}

            <Button
              onClick={sincronizarAgora}
              variant="outline"
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sincronizar
            </Button>

            <Link href="/dashboard/configuracoes/calendario">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>

        <CalendarView
          events={events}
          onSelectEvent={(event) => {
            console.log('Evento selecionado:', event)
          }}
        />
      </div>
    </ProtectedRoute>
  )
}
