'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  Chrome,
  Server,
  AlertCircle,
  Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface CalendarIntegration {
  id: string
  provider: string
  provider_email?: string
  server_url?: string
  username?: string
  is_active: boolean
  last_sync_at: string | null
  sync_enabled?: boolean
}

export default function CalendarioConfigPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [conectando, setConectando] = useState(false)
  const [desconectando, setDesconectando] = useState(false)
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null)

  // Hostgator CalDAV form state
  const [testando, setTestando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [serverUrl, setServerUrl] = useState('https://mail.seudominio.com.br:2080/caldav')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [syncEnabled, setSyncEnabled] = useState(true)

  useEffect(() => {
    if (user) {
      carregarIntegracao()
    }
  }, [user])

  async function carregarIntegracao() {
    try {
      setLoading(true)

      // Buscar qualquer integração do usuário (Google ou Hostgator)
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setIntegration(data)
        // Se for Hostgator, preencher o formulário
        if (data.provider === 'hostgator') {
          setServerUrl(data.server_url || '')
          setUsername(data.username || '')
          setSyncEnabled(data.sync_enabled || true)
        }
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

  async function testarConexaoHostgator() {
    if (!serverUrl || !username || !password) {
      toast.error('Preencha todos os campos')
      return
    }

    try {
      setTestando(true)

      const response = await fetch('/api/calendar/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl,
          username,
          password,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message || 'Falha ao conectar')
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error)
      toast.error('Erro ao testar conexão')
    } finally {
      setTestando(false)
    }
  }

  async function salvarHostgator() {
    if (!serverUrl || !username || !password) {
      toast.error('Preencha todos os campos')
      return
    }

    if (!user) return

    try {
      setSalvando(true)

      // Primeiro testar conexão
      const testResponse = await fetch('/api/calendar/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl, username, password }),
      })

      const testResult = await testResponse.json()

      if (!testResult.success) {
        toast.error('Conexão falhou: ' + testResult.message)
        return
      }

      // Se passou no teste, salvar
      const integrationData = {
        user_id: user.id,
        provider: 'hostgator',
        server_url: serverUrl,
        username: username,
        password_encrypted: password, // TODO: Criptografar no backend
        sync_enabled: syncEnabled,
        is_active: true,
      }

      let result

      if (integration && integration.provider === 'hostgator') {
        // Atualizar existente
        result = await supabase
          .from('calendar_integrations')
          .update(integrationData)
          .eq('id', integration.id)
      } else {
        // Criar nova
        result = await supabase
          .from('calendar_integrations')
          .insert(integrationData)
      }

      if (result.error) throw result.error

      toast.success('Calendário conectado com sucesso!')
      await carregarIntegracao()
      setPassword('') // Limpar senha
    } catch (error: any) {
      console.error('Erro ao salvar integração:', error)
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setSalvando(false)
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
                  Status da Conexão {integration.provider === 'google' ? '(Google)' : '(Hostgator)'}
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
              {integration.provider === 'google' ? (
                <div>
                  <p className="text-sm text-muted-foreground">Conta Google</p>
                  <p className="font-medium">{integration.provider_email}</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Servidor</p>
                    <p className="font-medium">{integration.server_url}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usuário</p>
                    <p className="font-medium">{integration.username}</p>
                  </div>
                </>
              )}
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
              <CardTitle>Conectar Calendário</CardTitle>
              <CardDescription>
                Escolha seu provedor de calendário e configure a integração
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="hostgator" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="hostgator">
                    <Server className="mr-2 h-4 w-4" />
                    Hostgator
                  </TabsTrigger>
                  <TabsTrigger value="google">
                    <Chrome className="mr-2 h-4 w-4" />
                    Google
                  </TabsTrigger>
                </TabsList>

                {/* Tab Hostgator CalDAV */}
                <TabsContent value="hostgator" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="serverUrl">URL do Servidor CalDAV</Label>
                    <Input
                      id="serverUrl"
                      placeholder="https://mail.seudominio.com.br:2080/caldav"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Geralmente: https://mail.seudominio.com.br:2080/caldav
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">E-mail / Usuário</Label>
                    <Input
                      id="username"
                      type="email"
                      placeholder="admin@empresa.com.br"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Digite a senha do e-mail"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Sincronização Automática</Label>
                      <p className="text-sm text-muted-foreground">
                        Sincronizar eventos automaticamente a cada 15 minutos
                      </p>
                    </div>
                    <Switch
                      checked={syncEnabled}
                      onCheckedChange={setSyncEnabled}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={testarConexaoHostgator}
                      variant="outline"
                      disabled={testando || salvando}
                    >
                      {testando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </Button>

                    <Button
                      onClick={salvarHostgator}
                      disabled={salvando || testando}
                    >
                      {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Check className="mr-2 h-4 w-4" />
                      Conectar
                    </Button>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Como encontrar as informações?</h4>
                    <p className="text-sm text-muted-foreground">
                      Para Hostgator, a URL geralmente é:
                    </p>
                    <code className="block mt-1 p-2 bg-muted rounded text-sm">
                      https://mail.seudominio.com.br:2080/caldav
                    </code>
                    <p className="text-sm text-muted-foreground mt-2">
                      Use o e-mail completo (ex: admin@empresa.com.br) e a senha do e-mail cadastrado no cPanel da Hostgator.
                    </p>
                  </div>
                </TabsContent>

                {/* Tab Google OAuth */}
                <TabsContent value="google" className="space-y-4 mt-4">
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
                </TabsContent>
              </Tabs>
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
