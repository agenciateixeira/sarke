'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { TeamMember, CreateTeamMemberData, UpdateTeamMemberData } from '@/hooks/useTeam'
import { UserRole } from '@/types'
import { Loader2 } from 'lucide-react'

interface TeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: TeamMember | null
  onSubmit: (data: CreateTeamMemberData | UpdateTeamMemberData) => Promise<any>
  loading?: boolean
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'juridico', label: 'Jurídico' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
]

export function TeamMemberDialog({ open, onOpenChange, member, onSubmit, loading }: TeamMemberDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'colaborador' as UserRole,
    cargo: '',
    departamento: '',
    telefone: '',
    horario_inicio: '',
    horario_fim: '',
    dias_trabalho: [1, 2, 3, 4, 5] as number[],
  })

  useEffect(() => {
    if (member) {
      setFormData({
        email: member.email,
        name: member.name,
        role: member.role,
        cargo: member.cargo || '',
        departamento: member.departamento || '',
        telefone: member.telefone || '',
        horario_inicio: member.horario_inicio || '',
        horario_fim: member.horario_fim || '',
        dias_trabalho: member.dias_trabalho || [1, 2, 3, 4, 5],
      })
    } else {
      setFormData({
        email: '',
        name: '',
        role: 'colaborador',
        cargo: '',
        departamento: '',
        telefone: '',
        horario_inicio: '',
        horario_fim: '',
        dias_trabalho: [1, 2, 3, 4, 5],
      })
    }
  }, [member, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (member) {
      // Atualização - não envia email
      const { email, ...updateData } = formData
      await onSubmit(updateData)
    } else {
      // Criação - envia tudo
      await onSubmit(formData)
    }

    onOpenChange(false)
  }

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      dias_trabalho: prev.dias_trabalho.includes(day)
        ? prev.dias_trabalho.filter(d => d !== day)
        : [...prev.dias_trabalho, day].sort(),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {member ? 'Editar Membro da Equipe' : 'Convidar Novo Membro'}
          </DialogTitle>
          <DialogDescription>
            {member
              ? 'Atualize as informações do membro da equipe'
              : 'Preencha os dados para enviar um convite para novo membro'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Informações Básicas</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!member}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Nível de Acesso *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ex: Desenvolvedor, Designer..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento</Label>
                <Input
                  id="departamento"
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  placeholder="Ex: TI, Comercial, RH..."
                />
              </div>
            </div>
          </div>

          {/* Horário de Trabalho (apenas para colaboradores) */}
          {formData.role === 'colaborador' && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Horário de Trabalho</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horario_inicio">Horário de Início</Label>
                  <Input
                    id="horario_inicio"
                    type="time"
                    value={formData.horario_inicio}
                    onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horario_fim">Horário de Término</Label>
                  <Input
                    id="horario_fim"
                    type="time"
                    value={formData.horario_fim}
                    onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias de Trabalho</Label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day.value}
                      className="flex flex-col items-center gap-1"
                    >
                      <Checkbox
                        checked={formData.dias_trabalho.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <span className="text-xs">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : member ? (
                'Salvar Alterações'
              ) : (
                'Convidar Membro'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
