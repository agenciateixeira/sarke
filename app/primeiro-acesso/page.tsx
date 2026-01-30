'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

export default function PrimeiroAcessoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!email) {
      router.push('/login')
    }
  }, [email, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (!email) {
      setError('Email não encontrado')
      return
    }

    setLoading(true)

    try {
      // Fazer login com link mágico e então atualizar a senha
      const { data: signInData, error: signInError } = await supabase.auth.signInWithOtp({
        email: email,
      })

      if (signInError) throw signInError

      // Aguardar um pouco para o usuário verificar o email
      setSuccess(true)
      setError('Enviamos um link de verificação para seu email. Clique no link e então defina sua senha.')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
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
          <CardTitle className="text-2xl font-bold text-center">
            Criar Senha
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Crie uma senha para acessar o sistema
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950 rounded-md">
                <CheckCircle2 className="h-4 w-4" />
                <p>Verifique seu email para continuar!</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || success}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || success}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || success}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Criar Senha'
              )}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-primary hover:underline"
                disabled={loading || success}
              >
                Voltar para o login
              </button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
