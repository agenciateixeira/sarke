import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { testGoogleCalendarConnection } from '@/lib/google-calendar'
import { logAuthEvent, serializeError } from '@/lib/auth-logger'

// Service role client para operar server-side sem depender de auth.uid()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const userEmail = 'desconhecido'

  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      await logAuthEvent({
        event:   'oauth_callback',
        status:  'error',
        message: 'Callback chamado sem sessão ativa',
      })
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const email = session.user.email!

    if (!session.accessToken || !session.refreshToken) {
      await logAuthEvent({
        event:      'oauth_callback',
        status:     'error',
        message:    'Sessão presente mas tokens ausentes',
        user_email: email,
        metadata: {
          has_access_token:  !!session.accessToken,
          has_refresh_token: !!session.refreshToken,
        },
      })
      return NextResponse.redirect(
        new URL('/dashboard/configuracoes/calendario?error=no_tokens', request.url)
      )
    }

    // Testar conexão com Google Calendar
    const testResult = await testGoogleCalendarConnection(
      session.accessToken,
      session.refreshToken
    )

    if (!testResult.success) {
      await logAuthEvent({
        event:      'oauth_callback',
        status:     'error',
        message:    `Teste de conexão com Google Calendar falhou: ${testResult.message}`,
        user_email: email,
        metadata:   { test_message: testResult.message },
      })
      return NextResponse.redirect(
        new URL('/dashboard/configuracoes/calendario?error=connection_failed', request.url)
      )
    }

    // Buscar user_id do Supabase pelo email
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (profileError || !profileData) {
      await logAuthEvent({
        event:      'oauth_callback',
        status:     'error',
        message:    'Perfil não encontrado no Supabase para o e-mail da sessão',
        user_email: email,
        metadata:   serializeError(profileError),
      })
      return NextResponse.redirect(
        new URL('/dashboard/configuracoes/calendario?error=profile_not_found', request.url)
      )
    }

    const userId = profileData.id

    // Verificar se já existe integração
    const { data: existingIntegration } = await supabase
      .from('calendar_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single()

    const integrationData = {
      user_id:          userId,
      provider:         'google',
      access_token:     session.accessToken,
      refresh_token:    session.refreshToken,
      token_expires_at: session.expiresAt
        ? new Date(session.expiresAt * 1000).toISOString()
        : null,
      provider_user_id: session.providerAccountId,
      provider_email:   testResult.userEmail || email,
      is_active:        true,
      sync_enabled:     true,
    }

    if (existingIntegration) {
      const { error: updateError } = await supabase
        .from('calendar_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)

      if (updateError) throw updateError

      await logAuthEvent({
        event:      'oauth_callback',
        status:     'success',
        message:    'Integração Google Calendar atualizada com sucesso',
        user_id:    userId,
        user_email: email,
        metadata: {
          action:       'update',
          integration_id: existingIntegration.id,
          calendars:    testResult.calendars,
        },
      })
    } else {
      const { error: insertError } = await supabase
        .from('calendar_integrations')
        .insert(integrationData)

      if (insertError) throw insertError

      await logAuthEvent({
        event:      'oauth_callback',
        status:     'success',
        message:    'Nova integração Google Calendar criada com sucesso',
        user_id:    userId,
        user_email: email,
        metadata: {
          action:    'insert',
          calendars: testResult.calendars,
        },
      })
    }

    return NextResponse.redirect(
      new URL('/dashboard/configuracoes/calendario?success=connected', request.url)
    )
  } catch (error: any) {
    await logAuthEvent({
      event:   'oauth_callback',
      status:  'error',
      message: `Erro inesperado no callback OAuth: ${error?.message}`,
      metadata: serializeError(error),
    })
    return NextResponse.redirect(
      new URL('/dashboard/configuracoes/calendario?error=unknown', request.url)
    )
  }
}
