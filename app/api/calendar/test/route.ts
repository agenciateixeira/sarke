import { NextRequest, NextResponse } from 'next/server'
import { testCalDAVConnection } from '@/lib/caldav'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serverUrl, username, password } = body

    if (!serverUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Parâmetros incompletos' },
        { status: 400 }
      )
    }

    const result = await testCalDAVConnection({
      serverUrl,
      username,
      password,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Erro ao testar conexão CalDAV:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao testar conexão' },
      { status: 500 }
    )
  }
}
