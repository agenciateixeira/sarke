// =====================================================
// EDGE FUNCTION: Notificar Comprovantes Pendentes
// Executa diariamente para enviar notificações sobre comprovantes pendentes
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔔 Iniciando verificação de comprovantes pendentes...')

    // ===== ETAPA 1: Executar função de atualização de pendências =====
    const { data: resultadoAtualizacao, error: erroAtualizacao } = await supabase
      .rpc('atualizar_comprovantes_pendentes')

    if (erroAtualizacao) {
      console.error('❌ Erro ao atualizar pendências:', erroAtualizacao)
      throw erroAtualizacao
    }

    console.log('✅ Pendências atualizadas:', resultadoAtualizacao)

    // ===== ETAPA 2: Buscar notificações não enviadas =====
    const { data: notificacoesPendentes, error: erroNotificacoes } = await supabase
      .from('obra_caixa_notificacoes_log')
      .select(`
        *,
        usuario:profiles!obra_caixa_notificacoes_log_usuario_notificado_fkey(id, name, email),
        caixa:obra_caixa!obra_caixa_notificacoes_log_caixa_id_fkey(
          descricao,
          valor,
          prazo_comprovante,
          obra:obras(nome)
        )
      `)
      .eq('enviada', false)
      .order('created_at', { ascending: true })

    if (erroNotificacoes) {
      console.error('❌ Erro ao buscar notificações:', erroNotificacoes)
      throw erroNotificacoes
    }

    console.log(`📨 Encontradas ${notificacoesPendentes?.length || 0} notificações para enviar`)

    // ===== ETAPA 3: Enviar notificações =====
    let notificacoesEnviadas = 0
    let notificacoesFalhadas = 0

    for (const notificacao of notificacoesPendentes || []) {
      try {
        // Dados do usuário
        const usuario = notificacao.usuario
        const caixa = notificacao.caixa

        if (!usuario || !usuario.email) {
          console.warn(`⚠️ Usuário sem email para notificação ${notificacao.id}`)
          continue
        }

        // ===== ENVIAR NOTIFICAÇÃO =====
        // OPÇÃO 1: Email via Resend
        await enviarEmailResend(notificacao, usuario, caixa)

        // OPÇÃO 2: Notificação in-app
        await criarNotificacaoInApp(supabase, notificacao, usuario)

        // Marcar como enviada
        const { error: erroUpdate } = await supabase
          .from('obra_caixa_notificacoes_log')
          .update({ enviada: true })
          .eq('id', notificacao.id)

        if (erroUpdate) {
          console.error(`❌ Erro ao marcar notificação ${notificacao.id} como enviada:`, erroUpdate)
          notificacoesFalhadas++
        } else {
          console.log(`✅ Notificação enviada para ${usuario.email}`)
          notificacoesEnviadas++
        }

      } catch (error) {
        console.error(`❌ Erro ao enviar notificação ${notificacao.id}:`, error)

        // Registrar erro no log
        await supabase
          .from('obra_caixa_notificacoes_log')
          .update({
            erro: error.message,
            enviada: false
          })
          .eq('id', notificacao.id)

        notificacoesFalhadas++
      }
    }

    // ===== ETAPA 4: Retornar resultado =====
    const resultado = {
      success: true,
      timestamp: new Date().toISOString(),
      resultado_atualizacao: resultadoAtualizacao,
      notificacoes_enviadas: notificacoesEnviadas,
      notificacoes_falhadas: notificacoesFalhadas,
      total_notificacoes: notificacoesPendentes?.length || 0,
    }

    console.log('🎉 Processamento concluído:', resultado)

    return new Response(
      JSON.stringify(resultado),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Erro fatal:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// =====================================================
// FUNÇÃO: Enviar Email via Resend
// =====================================================
async function enviarEmailResend(notificacao: any, usuario: any, caixa: any) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY não configurada, pulando envio de email')
    return
  }

  const tipoIcon = {
    LEMBRETE_COMPROVANTE: '🔔',
    PRAZO_VENCENDO: '⚠️',
    PRAZO_VENCIDO: '🚨',
  }

  const tipoTitulo = {
    LEMBRETE_COMPROVANTE: 'Lembrete: Comprovante Pendente',
    PRAZO_VENCENDO: 'Atenção: Prazo Vencendo',
    PRAZO_VENCIDO: 'URGENTE: Prazo Vencido',
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        .info { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        .footer { color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tipoIcon[notificacao.tipo]} ${tipoTitulo[notificacao.tipo]}</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${usuario.name}</strong>,</p>

          <div class="${notificacao.tipo === 'PRAZO_VENCIDO' ? 'alert' : notificacao.tipo === 'PRAZO_VENCENDO' ? 'warning' : 'info'}">
            <p><strong>Obra:</strong> ${caixa?.obra?.nome || 'N/A'}</p>
            <p><strong>Despesa:</strong> ${caixa?.descricao || 'N/A'}</p>
            <p><strong>Valor:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixa?.valor || 0)}</p>
            <p><strong>Prazo:</strong> ${caixa?.prazo_comprovante ? new Date(caixa.prazo_comprovante).toLocaleDateString('pt-BR') : 'N/A'}</p>
          </div>

          ${notificacao.tipo === 'PRAZO_VENCIDO' ? `
            <p style="color: #dc2626; font-weight: bold;">
              ⚠️ O prazo para envio do comprovante já expirou! Por favor, regularize esta pendência o quanto antes.
            </p>
          ` : ''}

          <p>Para regularizar esta pendência, você pode:</p>
          <ul>
            <li>📤 Enviar o comprovante de pagamento (NF, cupom fiscal, etc.)</li>
            <li>✍️ Justificar o motivo caso não seja possível enviar</li>
          </ul>

          <a href="${Deno.env.get('SUPABASE_URL')}/dashboard/obra" class="button">
            Acessar Sistema
          </a>

          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
            Esta notificação será enviada diariamente até que a pendência seja resolvida.
          </p>
        </div>
        <div class="footer">
          <p>Sarke Studio - Sistema de Gestão de Obras</p>
          <p>Esta é uma notificação automática, não responda este email.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'Sarke Studio <noreply@sarke.com.br>',
      to: [usuario.email],
      subject: `${tipoIcon[notificacao.tipo]} ${tipoTitulo[notificacao.tipo]} - ${caixa?.obra?.nome || 'Obra'}`,
      html: emailHtml,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Erro ao enviar email: ${error}`)
  }

  console.log(`📧 Email enviado para ${usuario.email}`)
}

// =====================================================
// FUNÇÃO: Criar notificação in-app
// =====================================================
async function criarNotificacaoInApp(supabase: any, notificacao: any, usuario: any) {
  // Verificar se existe tabela de notificações in-app
  // Se existir, inserir notificação
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: usuario.id,
        title: getTituloNotificacao(notificacao.tipo),
        message: notificacao.mensagem,
        type: 'comprovante_pendente',
        reference_type: 'caixa',
        reference_id: notificacao.caixa_id,
        read: false,
      })

    console.log(`🔔 Notificação in-app criada para ${usuario.name}`)
  } catch (error) {
    console.warn('⚠️ Não foi possível criar notificação in-app:', error.message)
  }
}

function getTituloNotificacao(tipo: string): string {
  const titulos = {
    LEMBRETE_COMPROVANTE: 'Comprovante Pendente',
    PRAZO_VENCENDO: 'Prazo Vencendo',
    PRAZO_VENCIDO: 'Prazo Vencido',
  }
  return titulos[tipo] || 'Notificação'
}
