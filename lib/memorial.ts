import { supabase } from './supabase'
import { ArquivarObraParams, DesarquivarObraParams } from '@/types/memorial'

/**
 * Arquiva uma obra no memorial
 * Move todos os dados relacionados (fotos, documentos, cronograma, etc) para tabelas de memorial
 * e remove da tabela de obras ativas
 */
export async function arquivarObra({ obra_id, user_id, motivo }: ArquivarObraParams) {
  try {
    const { data, error } = await supabase.rpc('arquivar_obra_no_memorial', {
      p_obra_id: obra_id,
      p_user_id: user_id,
      p_motivo: motivo || null,
    })

    if (error) {
      // Log completo do erro
      console.error('=== ERRO SUPABASE RPC ===')
      console.error('Message:', error.message)
      console.error('Code:', error.code)
      console.error('Details:', error.details)
      console.error('Hint:', error.hint)
      console.error('JSON:', JSON.stringify(error, null, 2))
      console.error('========================')
      throw error
    }

    return { success: true, memorial_id: data }
  } catch (error: any) {
    console.error('Erro ao arquivar obra:', error)
    return { success: false, error: error.message || error.details || 'Erro desconhecido ao arquivar' }
  }
}

/**
 * Desarquiva uma obra do memorial (somente admin)
 * Restaura todos os dados para as tabelas ativas e remove do memorial
 */
export async function desarquivarObra({
  memorial_id,
  user_id,
  motivo,
}: DesarquivarObraParams) {
  try {
    const { data, error } = await supabase.rpc('desarquivar_obra_do_memorial', {
      p_memorial_id: memorial_id,
      p_user_id: user_id,
      p_motivo: motivo || null,
    })

    if (error) throw error

    return { success: true, obra_id: data }
  } catch (error: any) {
    console.error('Erro ao desarquivar obra:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Verifica se o usuário é admin
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role === 'admin'
  } catch (error) {
    console.error('Erro ao verificar se usuário é admin:', error)
    return false
  }
}
