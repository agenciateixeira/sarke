'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Clock, LogOut, Send, CheckCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ForaHorarioPage() {
  const { user, signOut } = useAuth()
  const { requestAccess, hasApprovedAccess } = useNotifications()
  const router = useRouter()

  const [reason, setReason] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [checking, setChecking] = useState(true)

  // Verificar se já tem acesso aprovado
  useEffect(() => {
    let mounted = true

    const checkAccess = async () => {
      if (!mounted) return

      try {
        const hasAccess = await hasApprovedAccess()
        if (hasAccess && mounted) {
          // Força reload da página para atualizar o ProtectedRoute
          window.location.href = '/dashboard'
        }
      } catch (error) {
        console.error('Error checking access:', error)
      } finally {
        if (mounted) {
          setChecking(false)
        }
      }
    }

    // Verificar inicialmente
    setChecking(true)
    checkAccess()

    // Se solicitou acesso, verificar a cada 3 segundos
    let interval: NodeJS.Timeout | null = null
    if (requested) {
      interval = setInterval(checkAccess, 3000)
    }

    return () => {
      mounted = false
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleRequestAccess = async () => {
    setRequesting(true)
    const result = await requestAccess(reason)
    if (result) {
      setRequested(true)
    }
    setRequesting(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Fora do Horário</CardTitle>
          <CardDescription className="text-center">
            Você está tentando acessar o sistema fora do seu horário de trabalho permitido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="space-y-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p>
                <strong>Usuário:</strong> {user.name}
              </p>
              {user.horario_inicio && user.horario_fim && (
                <p>
                  <strong>Horário permitido:</strong> {user.horario_inicio} às {user.horario_fim}
                </p>
              )}
            </div>
          )}

          {!requested ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Precisa acessar o sistema agora? Solicite permissão ao administrador.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Ex: Preciso finalizar um relatório urgente..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  disabled={requesting}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3 py-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Solicitação Enviada!</h3>
                <p className="text-sm text-muted-foreground">
                  Os administradores foram notificados. Aguarde a aprovação.
                </p>
                <p className="text-xs text-muted-foreground">
                  Você será redirecionado automaticamente quando o acesso for aprovado.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={handleSignOut} className="flex-1" variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
          {!requested && (
            <Button
              onClick={handleRequestAccess}
              className="flex-1"
              disabled={requesting}
            >
              {requesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Solicitar Acesso
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
