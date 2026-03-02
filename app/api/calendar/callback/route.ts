import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'
import { testGoogleCalendarConnection } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!session.accessToken || !session.refreshToken) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracoes/calendario?error=no_tokens', request.url)
      )
    }

    // Testar conexão
    const testResult = await testGoogleCalendarConnection(
      session.accessToken,
      session.refreshToken
    )

    if (!testResult.success) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracoes/calendario?error=connection_failed', request.url)
      )
    }

    // Buscar user_id do Supabase pelo email
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (profileError || !profileData) {
      console.error('Erro ao buscar perfil:', profileError)
      return NextResponse.redirect(
        new URL('/dashboard/configuracoes/calendario?error=profile_not_found', request.url)
      )
    }

    // Verificar se já existe integração
    const { data: existingIntegration } = await supabase
      .from('calendar_integrations')
      .select('id')
      .eq('user_id', profileData.id)
      .eq('provider', 'google')
      .single()

    const integrationData = {
      user_id: profileData.id,
      provider: 'google',
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      token_expires_at: session.expiresAt 
        ? new Date(session.expiresAt * 1000).toISOString() 
        : null,
      provider_user_id: session.providerAccountId,
      provider_email: testResult.userEmail || session.user.email,
      is_active: true,
      sync_enabled: true,
    }

    if (existingIntegration) {
      // Atualizar existente
      const { error: updateError } = await supabase
        .from('calendar_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)

      if (updateError) throw updateError
    } else {
      // Criar nova
      const { error: insertError } = await supabase
        .from('calendar_integrations')
        .insert(integrationData)

      if (insertError) throw insertError
    }

    // Redirecionar para sincronizar eventos
    return NextResponse.redirect(
      new URL('/dashboard/configuracoes/calendario?success=connected', request.url)
    )
  } catch (error: any) {
    console.error('Erro no callback OAuth:', error)
    return NextResponse.redirect(
      new URL('/dashboard/configuracoes/calendario?error=unknown', request.url)
    )
  }
}
