// Edge Function para verificar e enviar notificações diárias
// Deve ser agendada para executar diariamente via Supabase Cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase com credenciais de serviço
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Executar função para verificar tarefas que vencem em breve
    const { error: dueSoonError } = await supabase.rpc('check_due_soon_tasks')

    if (dueSoonError) {
      console.error('Erro ao verificar tarefas próximas:', dueSoonError)
    }

    // Executar função para verificar tarefas atrasadas
    const { error: overdueError } = await supabase.rpc('check_overdue_tasks')

    if (overdueError) {
      console.error('Erro ao verificar tarefas atrasadas:', overdueError)
    }

    // Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificações diárias processadas com sucesso',
        errors: {
          dueSoon: dueSoonError ? dueSoonError.message : null,
          overdue: overdueError ? overdueError.message : null,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
