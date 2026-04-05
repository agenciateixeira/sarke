import { createClient } from '@supabase/supabase-js'

type LogStatus = 'success' | 'error' | 'warning'

interface LogEntry {
  event: string
  status: LogStatus
  message: string
  user_id?: string | null
  user_email?: string | null
  metadata?: Record<string, any>
}

// Service role — logs sempre chegam independente de RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Registra um evento do fluxo OAuth/Calendar no banco.
 * Fire-and-forget: não lança erro para não quebrar o fluxo principal.
 */
export async function logAuthEvent(entry: LogEntry): Promise<void> {
  try {
    await supabase.from('auth_logs').insert({
      user_id:    entry.user_id    ?? null,
      user_email: entry.user_email ?? null,
      event:      entry.event,
      status:     entry.status,
      message:    entry.message,
      metadata:   entry.metadata  ?? {},
    })
  } catch (err) {
    // Nunca deixa o log quebrar o fluxo principal
    console.error('[auth-logger] falha ao gravar log:', err)
  }
}

/**
 * Extrai campos úteis de um erro para salvar no metadata.
 */
export function serializeError(error: any): Record<string, any> {
  return {
    message: error?.message,
    code:    error?.code,
    details: error?.details,
    hint:    error?.hint,
    stack:   error?.stack?.split('\n').slice(0, 5).join('\n'), // primeiras 5 linhas
  }
}
