import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verify token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { clients } = await request.json()

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ error: 'Nenhum cliente para importar' }, { status: 400 })
    }

    // Validate each client has at least a name
    const validClients = clients.filter(client => client.name && client.name.trim() !== '')

    if (validClients.length === 0) {
      return NextResponse.json({ error: 'Nenhum cliente válido encontrado' }, { status: 400 })
    }

    // Add user_id to each client
    const clientsWithUser = validClients.map(client => ({
      ...client,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    // Insert all clients
    const { data, error } = await supabase
      .from('clients')
      .insert(clientsWithUser)
      .select()

    if (error) {
      console.error('Error inserting clients:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      clients: data,
    })
  } catch (error: any) {
    console.error('Error in bulk import:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
