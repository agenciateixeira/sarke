'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ForaHorarioPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
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
            <div className="space-y-2 text-sm text-muted-foreground">
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
          <p className="text-sm text-muted-foreground text-center">
            Se você precisa acessar o sistema fora do horário, entre em contato com o administrador.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSignOut} className="w-full" variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
