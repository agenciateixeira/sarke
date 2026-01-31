'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, XCircle, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    fetchInvite()
  }, [token])

  const fetchInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('team_invites')
        .select('*')
        .eq('invite_token', token)
        .is('accepted_at', null)
        .single()

      if (error) throw error

      // Verificar se não expirou
      if (new Date(data.expires_at) < new Date()) {
        toast.error('Este convite expirou')
        setInvite(null)
      } else {
        setInvite(data)
      }
    } catch (err: any) {
      console.error('Error fetching invite:', err)

      if (err.message?.includes('team_invites') && err.message?.includes('does not exist')) {
        toast.error('Sistema de convites não configurado', {
          description: 'A tabela de convites ainda não foi criada no banco de dados.',
          duration: 10000,
        })
      } else {
        toast.error('Convite inválido ou expirado')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast.error('Preencha todos os campos')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não conferem')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setAccepting(true)

    try {
      // Criar conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password: password,
        options: {
          data: {
            name: invite.name,
            role: invite.role,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Falha ao criar conta')
      }

      // Aceitar convite (cria perfil automaticamente via função)
      const { data: result, error: acceptError } = await supabase.rpc('accept_team_invite', {
        p_token: token,
        p_user_id: authData.user.id,
      })

      if (acceptError) throw acceptError

      if (!result.success) {
        throw new Error(result.message)
      }

      toast.success('Conta criada com sucesso!', {
        description: 'Você será redirecionado para fazer login...',
      })

      // Fazer logout e redirecionar para login
      await supabase.auth.signOut()

      setTimeout(() => {
        router.push('/login?message=Conta criada! Faça login para continuar.')
      }, 2000)
    } catch (err: any) {
      console.error('Error accepting invite:', err)
      toast.error(err.message || 'Erro ao aceitar convite')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Verificando convite...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Convite Inválido</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Este convite não existe, já foi aceito ou expirou.
            </p>
            <Button onClick={() => router.push('/login')}>Ir para Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Sarke" width={120} height={40} className="h-10 w-auto" />
          </div>
          <UserPlus className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-2xl">Você foi convidado!</CardTitle>
          <CardDescription>
            Complete o cadastro para se juntar à equipe Sarke
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="bg-muted rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Nome:</span>
                <span>{invite.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Email:</span>
                <span>{invite.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Cargo:</span>
                <span className="capitalize">{invite.cargo || invite.role}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Crie sua senha (mín. 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={accepting}>
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aceitar Convite e Criar Conta
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Ao aceitar, você concorda em fazer parte da equipe Sarke
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
