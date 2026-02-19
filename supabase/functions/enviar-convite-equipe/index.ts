// =============================================
// SARKE - Edge Function: Enviar Convite de Equipe
// =============================================
// Envia email de convite para novos membros da equipe

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://sarke.com.br'

interface InviteEmailRequest {
  inviteId: string
}

serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse do body
    const { inviteId } = await req.json() as InviteEmailRequest

    if (!inviteId) {
      return new Response(JSON.stringify({ error: 'inviteId é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Buscar dados do convite
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('id', inviteId)
      .is('accepted_at', null)
      .single()

    if (inviteError || !invite) {
      console.error('Erro ao buscar convite:', inviteError)
      return new Response(JSON.stringify({ error: 'Convite não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verificar se não expirou
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Convite expirado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Buscar dados de quem convidou
    let invitedByName = 'Administrador'
    if (invite.invited_by) {
      const { data: inviter } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', invite.invited_by)
        .single()

      if (inviter) {
        invitedByName = inviter.name
      }
    }

    // Gerar link de convite
    const inviteLink = `${APP_URL}/convite/${invite.invite_token}`
    const primeiroAcessoLink = `${APP_URL}/primeiro-acesso`

    // Data de expiração formatada
    const expiresAt = new Date(invite.expires_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    // HTML do email
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite - Sarke</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🎉 Você foi convidado!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #333333;">
                Olá <strong>${invite.name}</strong>,
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #333333;">
                ${invitedByName} convidou você para fazer parte da equipe <strong>Sarke</strong>!
              </p>

              <!-- Informações do convite -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #666666; font-size: 14px;">Seu cargo:</strong>
                    <p style="margin: 4px 0 0; color: #333333; font-size: 15px; text-transform: capitalize;">
                      ${invite.cargo || invite.role}
                    </p>
                  </td>
                </tr>
                ${invite.departamento ? `
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                    <strong style="color: #666666; font-size: 14px;">Departamento:</strong>
                    <p style="margin: 4px 0 0; color: #333333; font-size: 15px;">
                      ${invite.departamento}
                    </p>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                    <strong style="color: #666666; font-size: 14px;">Email cadastrado:</strong>
                    <p style="margin: 4px 0 0; color: #333333; font-size: 15px;">
                      ${invite.email}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                    <strong style="color: #666666; font-size: 14px;">Expira em:</strong>
                    <p style="margin: 4px 0 0; color: #d32f2f; font-size: 15px;">
                      ${expiresAt}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      Aceitar Convite e Criar Conta
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0; font-size: 14px; line-height: 20px; color: #666666; text-align: center;">
                Ou acesse diretamente a página de <a href="${primeiroAcessoLink}" style="color: #667eea; text-decoration: none;">Primeiro Acesso</a> e use o email: <strong>${invite.email}</strong>
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

              <p style="margin: 0 0 10px; font-size: 14px; line-height: 20px; color: #666666;">
                <strong>O que fazer agora?</strong>
              </p>
              <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 20px; color: #666666;">
                <li>Clique no botão acima para aceitar o convite</li>
                <li>Crie uma senha segura (mínimo 6 caracteres)</li>
                <li>Faça login e comece a usar o sistema!</li>
              </ol>

              <p style="margin: 20px 0 0; font-size: 13px; line-height: 18px; color: #999999;">
                Este convite expira em <strong>${expiresAt}</strong>. Após essa data, será necessário solicitar um novo convite ao administrador.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 13px; color: #666666;">
                Este é um email automático do sistema <strong>Sarke</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                Não responda este email. Em caso de dúvidas, entre em contato com ${invitedByName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // Enviar email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Sarke <noreply@sarke.com.br>',
        to: [invite.email],
        subject: `🎉 Você foi convidado para fazer parte da equipe Sarke!`,
        html: htmlContent,
      }),
    })

    if (!resendResponse.ok) {
      const error = await resendResponse.text()
      console.error('Erro ao enviar email:', error)
      return new Response(JSON.stringify({
        error: 'Falha ao enviar email',
        details: error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const emailResult = await resendResponse.json()

    return new Response(JSON.stringify({
      success: true,
      message: 'Email de convite enviado com sucesso',
      emailId: emailResult.id,
      inviteLink,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Erro na função:', error)
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
