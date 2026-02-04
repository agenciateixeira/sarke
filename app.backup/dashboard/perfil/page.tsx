'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { Loader2, User } from 'lucide-react'
import { toast } from 'sonner'

export default function PerfilPage() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(user?.name || '')

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id)

      if (error) throw error

      await refreshUser()
      toast.success('Perfil atualizado com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUploadComplete = async (url: string) => {
    await refreshUser()
  }

  if (!user) return null

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Meu Perfil"
        description="Gerencie suas informações pessoais"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Foto do Perfil</CardTitle>
            <CardDescription>Sua foto no sistema</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={user.avatar_url}
              userName={user.name}
              onUploadComplete={handleAvatarUploadComplete}
            />
            <div className="text-center pt-4">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize seus dados cadastrais</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Input
                  id="role"
                  value={
                    user.role === 'admin' ? 'Administrador' :
                    user.role === 'gerente' ? 'Gerente' :
                    user.role === 'colaborador' ? 'Colaborador' :
                    'Jurídico'
                  }
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Apenas administradores podem alterar cargos
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setName(user.name)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">ID do Usuário</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded mt-1">{user.id}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Data de Criação</Label>
              <p className="text-sm p-2 mt-1">
                {new Date(user.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
