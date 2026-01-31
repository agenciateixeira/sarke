'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, CheckCircle2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function PrimeiroAcessoPage() {
  const router = useRouter()

  const [step, setStep] = useState<'email' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [profileData, setProfileData] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Verificar se email existe e está pendente
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('team_invites')
        .select('*')
        .eq('email', email.trim())
        .is('accepted_at', null)
        .single()

      if (error || !data) {
        toast.error('Email não encontrado', {
          description: 'Este email não está cadastrado ou já foi ativado. Entre em contato com o administrador.',
        })
        return
      }

      // Verificar se não expirou
      if (new Date(data.expires_at) < new Date()) {
        toast.error('Convite expirado', {
          description: 'Solicite um novo cadastro ao administrador.',
        })
        return
      }

      setProfileData(data)
      setStep('password')
      toast.success(`Bem-vindo, ${data.name}!`, {
        description: 'Agora crie sua senha de acesso',
      })
    } catch (err) {
      toast.error('Erro ao verificar email')
    } finally {
      setLoading(false)
    }
  }

  // Criar conta e senha
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: profileData.name,
            role: profileData.role,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Falha ao criar conta')
      }

      // Aceitar convite (cria perfil automaticamente via função RPC)
      const { data: result, error: acceptError } = await supabase.rpc('accept_team_invite', {
        p_token: profileData.invite_token,
        p_user_id: authData.user.id,
      })

      if (acceptError) throw acceptError

      if (!result.success) {
        throw new Error(result.message)
      }

      toast.success('Conta criada com sucesso!', {
        description: 'Você será redirecionado para fazer login...',
      })

      // Fazer logout
      await supabase.auth.signOut()

      setTimeout(() => {
        router.push('/login?message=Conta criada! Faça login para continuar.')
      }, 2000)
    } catch (err: any) {
      console.error('Error creating account:', err)

      if (err.message?.includes('already registered')) {
        toast.error('Este email já possui uma conta', {
          description: 'Tente fazer login ou recuperar sua senha',
        })
      } else {
        toast.error('Erro ao criar conta', {
          description: err.message || 'Tente novamente',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-center pt-8 pb-4">
          <Image
            src="/logo.png"
            alt="Sarke"
            width={180}
            height={60}
            className="object-contain"
            priority
          />
        </div>

        <CardHeader className="space-y-1 pt-0">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Primeiro Acesso
          </CardTitle>
          <CardDescription className="text-center">
            {step === 'email'
              ? 'Digite seu email cadastrado pelo administrador'
              : 'Crie uma senha para acessar o sistema'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Cadastrado</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Use o email que o administrador cadastrou para você
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Continuar
                  </>
                )}
              </Button>

              <div className="text-sm text-center text-muted-foreground">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-primary hover:underline"
                  disabled={loading}
                >
                  Já tenho conta? Fazer login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium">Bem-vindo, {profileData?.name}!</p>
                <p className="text-xs text-muted-foreground">{email}</p>
                <p className="text-xs text-muted-foreground capitalize">{profileData?.cargo || profileData?.role}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Criar Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('email')}
                  disabled={loading}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Criar Conta
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
