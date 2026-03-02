import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getGoogleCalendarEvents } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar integração
    const { data: integration, error: integrationError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('id', integrationId)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Integração não encontrada' },
        { status: 404 }
      )
    }

    if (!integration.access_token || !integration.refresh_token) {
      return NextResponse.json(
        { error: 'Tokens OAuth não encontrados' },
        { status: 400 }
      )
    }

    // Buscar eventos do Google Calendar (últimos 30 dias e próximos 90 dias)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 90)

    const googleEvents = await getGoogleCalendarEvents(
      integration.access_token,
      integration.refresh_token,
      'primary',
      startDate,
      endDate
    )

    // Deletar eventos antigos desta integração
    await supabase
      .from('calendar_events')
      .delete()
      .eq('integration_id', integrationId)

    // Inserir novos eventos
    const eventsToInsert = googleEvents.map(event => ({
      integration_id: integrationId,
      external_id: event.id,
      summary: event.summary,
      description: event.description,
      location: event.location,
      start_date: event.startDate.toISOString(),
      end_date: event.endDate.toISOString(),
      all_day: event.allDay,
      attendees: event.attendees?.map(a => a.email) || [],
      synced_at: new Date().toISOString(),
      sync_status: 'synced',
    }))

    if (eventsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert(eventsToInsert)

      if (insertError) throw insertError
    }

    // Atualizar last_sync_at
    await supabase
      .from('calendar_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId)

    return NextResponse.json({
      success: true,
      message: 'Eventos sincronizados com sucesso',
      eventsCount: eventsToInsert.length,
    })
  } catch (error: any) {
    console.error('Erro ao sincronizar eventos:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erro ao sincronizar eventos' 
      },
      { status: 500 }
    )
  }
}
