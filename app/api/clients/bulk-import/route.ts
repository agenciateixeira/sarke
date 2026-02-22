import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
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
      user_id: session.user.id,
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
