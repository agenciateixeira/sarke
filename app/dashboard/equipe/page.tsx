'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TeamMemberCard } from '@/components/team/TeamMemberCard'
import { TeamMemberDialog } from '@/components/team/TeamMemberDialog'
import { useTeam, TeamMember } from '@/hooks/useTeam'
import { UserRole } from '@/types'
import { Plus, Users, UserCheck, Search, Filter, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function EquipePage() {
  const {
    members,
    loading,
    inviteMember,
    updateMember,
    removeMember,
    getStats,
  } = useTeam()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

  const stats = getStats()

  const handleInvite = () => {
    setSelectedMember(null)
    setDialogOpen(true)
  }

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member)
    setDialogOpen(true)
  }

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Tem certeza que deseja remover ${member.name} da equipe?`)) return

    const success = await removeMember(member.id)
    if (success) {
      toast.success(`${member.name} foi removido da equipe`)
    }
  }

  const handleSubmit = async (data: any) => {
    setDialogLoading(true)
    try {
      if (selectedMember) {
        await updateMember(selectedMember.id, data)
      } else {
        await inviteMember(data)
      }
    } finally {
      setDialogLoading(false)
    }
  }

  // Filtrar membros
  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  return (
    <ProtectedRoute requiredSetor="gestao_equipe">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Gestão de Equipe"
          description="Gerencie colaboradores, permissões e horários"
          actions={
            <Button onClick={handleInvite}>
              <Plus className="mr-2 h-4 w-4" />
              Convidar Membro
            </Button>
          }
        />

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Membros da equipe</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <UserCheck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground">Acesso total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.gerentes}</div>
              <p className="text-xs text-muted-foreground">Gestão de projetos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.colaboradores}</div>
              <p className="text-xs text-muted-foreground">Equipe operacional</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="gerente">Gerentes</SelectItem>
                  <SelectItem value="colaborador">Colaboradores</SelectItem>
                  <SelectItem value="juridico">Jurídico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Membros */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum membro encontrado</p>
              <p className="text-sm mt-1">
                {searchTerm || roleFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Clique em "Convidar Membro" para adicionar alguém à equipe'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Dialog para Convidar/Editar */}
        <TeamMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          member={selectedMember}
          onSubmit={handleSubmit}
          loading={dialogLoading}
        />
      </div>
    </ProtectedRoute>
  )
}
