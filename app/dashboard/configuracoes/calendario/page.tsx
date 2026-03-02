'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  Chrome,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface CalendarIntegration {
  id: string
  provider: string
  provider_email: string
  is_active: boolean
  last_sync_at: string | null
}

export default function CalendarioConfigPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [conectando, setConectando] = useState(false)
  const [desconectando, setDesconectando] = useState(false)
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null)

  useEffect(() => {
    if (user) {
      carregarIntegracao()
    }
  }, [user])

  async function carregarIntegracao() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('provider', 'google')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setIntegration(data)
      }
    } catch (error: any) {
      console.error('Erro ao carregar integração:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  async function conectarGoogle() {
    try {
      setConectando(true)
      await signIn('google', {
        callbackUrl: '/api/calendar/callback',
      })
    } catch (error: any) {
      console.error('Erro ao conectar Google:', error)
      toast.error('Erro ao conectar com Google')
      setConectando(false)
    }
  }

  async function desconectarCalendario() {
    if (!integration) return

    try {
      setDesconectando(true)

      // Deletar eventos
      await supabase
        .from('calendar_events')
        .delete()
        .eq('integration_id', integration.id)

      // Deletar integração
      const { error } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', integration.id)

      if (error) throw error

      toast.success('Calendário desconectado')
      setIntegration(null)
    } catch (error: any) {
      console.error('Erro ao desconectar:', error)
      toast.error('Erro ao desconectar')
    } finally {
      setDesconectando(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Integração de Calendário"
          description="Conecte seu Google Calendar para sincronizar eventos"
        />

        {/* Status da Integração */}
        {integration && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Status da Conexão
                </span>
                {integration.is_active ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Desconectado
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Conta Google</p>
                <p className="font-medium">{integration.provider_email}</p>
              </div>
              {integration.last_sync_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Última sincronização</p>
                  <p className="font-medium">
                    {new Date(integration.last_sync_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
              <Button
                onClick={desconectarCalendario}
                variant="destructive"
                disabled={desconectando}
              >
                {desconectando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Desconectar Calendário
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Conectar Calendário */}
        {!integration && (
          <Card>
            <CardHeader>
              <CardTitle>Conectar Google Calendar</CardTitle>
              <CardDescription>
                Faça login com sua conta Google para sincronizar automaticamente seus eventos de calendário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={conectarGoogle}
                disabled={conectando}
                className="w-full"
                size="lg"
              >
                {conectando ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Chrome className="mr-2 h-5 w-5" />
                )}
                Conectar com Google Calendar
              </Button>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">O que acontece quando você conecta:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Você será redirecionado para fazer login na sua conta Google</li>
                  <li>Seus eventos serão sincronizados automaticamente</li>
                  <li>Você poderá visualizar e gerenciar eventos diretamente no Sarke</li>
                  <li>A sincronização acontece a cada 15 minutos</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Sobre a Integração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Recursos Disponíveis</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Visualização completa do calendário (mês, semana, dia, agenda)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Sincronização automática de eventos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Detalhes completos: título, descrição, local, participantes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Status de confirmação dos participantes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Link direto para abrir evento no Google Calendar</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Segurança e Privacidade</h4>
              <p className="text-sm text-muted-foreground">
                A integração usa OAuth 2.0, o método mais seguro de autenticação.
                Suas credenciais do Google nunca são armazenadas no Sarke. Você pode
                revogar o acesso a qualquer momento através das configurações da sua conta Google
                ou clicando em "Desconectar Calendário" acima.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
