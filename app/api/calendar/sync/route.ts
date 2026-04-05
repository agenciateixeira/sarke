import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getGoogleCalendarEvents } from '@/lib/google-calendar'
import { logAuthEvent, serializeError } from '@/lib/auth-logger'

// Service role client para operar server-side sem depender de auth.uid()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      await logAuthEvent({
        event:   'calendar_sync',
        status:  'error',
        message: `Integração não encontrada: ${integrationId}`,
        metadata: serializeError(integrationError),
      })
      return NextResponse.json(
        { error: 'Integração não encontrada' },
        { status: 404 }
      )
    }

    if (!integration.access_token || !integration.refresh_token) {
      await logAuthEvent({
        event:      'calendar_sync',
        status:     'error',
        message:    'Tokens OAuth ausentes na integração',
        user_id:    integration.user_id,
        user_email: integration.provider_email,
        metadata:   { integration_id: integrationId },
      })
      return NextResponse.json(
        { error: 'Tokens OAuth não encontrados' },
        { status: 400 }
      )
    }

    // Buscar eventos do Google Calendar (últimos 30 dias + próximos 90 dias)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 90)

    let googleEvents
    try {
      googleEvents = await getGoogleCalendarEvents(
        integration.access_token,
        integration.refresh_token,
        'primary',
        startDate,
        endDate
      )
    } catch (fetchError: any) {
      await logAuthEvent({
        event:      'calendar_sync',
        status:     'error',
        message:    `Falha ao buscar eventos do Google Calendar: ${fetchError?.message}`,
        user_id:    integration.user_id,
        user_email: integration.provider_email,
        metadata:   serializeError(fetchError),
      })
      throw fetchError
    }

    // Deletar eventos antigos e inserir os novos
    await supabase
      .from('calendar_events')
      .delete()
      .eq('integration_id', integrationId)

    const eventsToInsert = googleEvents.map(event => ({
      integration_id: integrationId,
      external_id:    event.id,
      summary:        event.summary,
      description:    event.description,
      location:       event.location,
      start_date:     event.startDate.toISOString(),
      end_date:       event.endDate.toISOString(),
      all_day:        event.allDay,
      attendees:      event.attendees?.map(a => a.email) || [],
      synced_at:      new Date().toISOString(),
      sync_status:    'synced',
    }))

    if (eventsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert(eventsToInsert)

      if (insertError) throw insertError
    }

    await supabase
      .from('calendar_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integrationId)

    await logAuthEvent({
      event:      'calendar_sync',
      status:     'success',
      message:    `Sincronização concluída: ${eventsToInsert.length} evento(s)`,
      user_id:    integration.user_id,
      user_email: integration.provider_email,
      metadata: {
        integration_id: integrationId,
        events_count:   eventsToInsert.length,
        range_start:    startDate.toISOString(),
        range_end:      endDate.toISOString(),
      },
    })

    return NextResponse.json({
      success:     true,
      message:     'Eventos sincronizados com sucesso',
      eventsCount: eventsToInsert.length,
    })
  } catch (error: any) {
    await logAuthEvent({
      event:   'calendar_sync',
      status:  'error',
      message: `Erro inesperado na sincronização: ${error?.message}`,
      metadata: serializeError(error),
    })
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao sincronizar eventos' },
      { status: 500 }
    )
  }
}
