'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Calendar,
  Check,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface CalendarIntegration {
  id: string
  provider: string
  server_url: string
  username: string
  sync_enabled: boolean
  last_sync_at: string | null
  is_active: boolean
}

export default function CalendarioConfigPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [testando, setTestando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null)

  // Form state
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

      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('provider', 'hostgator')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
        throw error
      }

      if (data) {
        setIntegration(data)
        setServerUrl(data.server_url)
        setUsername(data.username)
        setSyncEnabled(data.sync_enabled)
      }
    } catch (error: any) {
      console.error('Erro ao carregar integração:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  async function testarConexao() {
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

  async function salvarIntegracao() {
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

      if (integration) {
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
      setSalvando(true)

      const { error } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', integration.id)

      if (error) throw error

      toast.success('Calendário desconectado')
      setIntegration(null)
      setPassword('')
    } catch (error: any) {
      console.error('Erro ao desconectar:', error)
      toast.error('Erro ao desconectar')
    } finally {
      setSalvando(false)
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
          description="Conecte seu calendário da Hostgator para sincronizar eventos"
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
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Servidor</p>
                <p className="font-medium">{integration.server_url}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuário</p>
                <p className="font-medium">{integration.username}</p>
              </div>
              {integration.last_sync_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Última sincronização</p>
                  <p className="font-medium">
                    {new Date(integration.last_sync_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulário de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações do CalDAV</CardTitle>
            <CardDescription>
              Configure a conexão com o calendário da Hostgator (protocolo CalDAV)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {integration && (
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para manter a senha atual
                </p>
              )}
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
                onClick={testarConexao}
                variant="outline"
                disabled={testando || salvando}
              >
                {testando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <AlertCircle className="mr-2 h-4 w-4" />
                Testar Conexão
              </Button>

              <Button
                onClick={salvarIntegracao}
                disabled={salvando || testando}
              >
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Check className="mr-2 h-4 w-4" />
                {integration ? 'Atualizar' : 'Conectar'}
              </Button>

              {integration && (
                <Button
                  onClick={desconectarCalendario}
                  variant="destructive"
                  disabled={salvando}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Como encontrar as informações?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. URL do Servidor</h4>
              <p className="text-sm text-muted-foreground">
                Para Hostgator, a URL geralmente é:
              </p>
              <code className="block mt-1 p-2 bg-muted rounded text-sm">
                https://mail.seudominio.com.br:2080/caldav
              </code>
              <p className="text-sm text-muted-foreground mt-1">
                Substitua "seudominio.com.br" pelo seu domínio real.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Usuário e Senha</h4>
              <p className="text-sm text-muted-foreground">
                Use o e-mail completo (ex: admin@empresa.com.br) e a senha do e-mail cadastrado no cPanel da Hostgator.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Dica
              </h4>
              <p className="text-sm text-muted-foreground">
                Se não tiver certeza da URL, acesse o Webmail da Hostgator, vá em Configurações → Calendário → Configurações CalDAV e copie a URL fornecida.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
