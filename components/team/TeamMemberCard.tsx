'use client'

import { TeamMember } from '@/hooks/useTeam'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, Mail, Phone, Calendar, Clock } from 'lucide-react'

interface TeamMemberCardProps {
  member: TeamMember
  onEdit: (member: TeamMember) => void
  onDelete: (member: TeamMember) => void
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  colaborador: 'Colaborador',
  juridico: 'Jurídico',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500',
  gerente: 'bg-blue-500',
  colaborador: 'bg-green-500',
  juridico: 'bg-orange-500',
}

export function TeamMemberCard({ member, onEdit, onDelete }: TeamMemberCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatWorkingHours = () => {
    if (!member.horario_inicio || !member.horario_fim) return null
    return `${member.horario_inicio} - ${member.horario_fim}`
  }

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
            <AvatarFallback className={`${ROLE_COLORS[member.role]} text-white font-semibold`}>
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="font-semibold text-lg">{member.name}</h3>
            {member.cargo && (
              <p className="text-sm text-muted-foreground">{member.cargo}</p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(member)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(member)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>

        {member.departamento && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-medium">Depto:</span> {member.departamento}
          </p>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <a href={`mailto:${member.email}`} className="hover:text-primary">
            {member.email}
          </a>
        </div>

        {member.telefone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <a href={`tel:${member.telefone}`} className="hover:text-primary">
              {member.telefone}
            </a>
          </div>
        )}

        {formatWorkingHours() && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatWorkingHours()}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3" />
          Membro desde {new Date(member.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>
    </div>
  )
}
