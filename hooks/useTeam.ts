'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { UserRole } from '@/types'

export interface TeamMember {
  id: string
  email: string
  name: string
  role: UserRole
  setor?: string
  avatar_url?: string
  telefone?: string
  cargo?: string
  departamento?: string
  horario_inicio?: string
  horario_fim?: string
  dias_trabalho?: number[]
  created_at: string
  updated_at: string
}

export interface CreateTeamMemberData {
  email: string
  name: string
  role: UserRole
  setor?: string
  cargo?: string
  departamento?: string
  telefone?: string
  horario_inicio?: string
  horario_fim?: string
  dias_trabalho?: number[]
}

export interface UpdateTeamMemberData {
  name?: string
  role?: UserRole
  setor?: string
  cargo?: string
  departamento?: string
  telefone?: string
  horario_inicio?: string
  horario_fim?: string
  dias_trabalho?: number[]
}

export interface PendingInvite {
  id: string
  email: string
  name: string
  role: UserRole
  cargo?: string
  departamento?: string
  telefone?: string
  created_at: string
  expires_at: string
}

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Buscar todos os membros da equipe
  const fetchMembers = async () => {
    try {
      setLoading(true)
      const [profilesRes, invitesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase
          .from('team_invites')
          .select('id, email, name, role, cargo, departamento, telefone, created_at, expires_at')
          .is('accepted_at', null)
          // Removido filtro de expiração para mostrar todos os convites pendentes
          .order('created_at', { ascending: false }),
      ])

      if (profilesRes.error) throw profilesRes.error

      setMembers(profilesRes.data || [])
      setPendingInvites(invitesRes.data || [])
      return profilesRes.data || []
    } catch (err) {
      console.error('Error fetching team members:', err)
      setError(err as Error)
      toast.error('Erro ao carregar equipe')
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()

    // Realtime em profiles e team_invites
    const channel = supabase
      .channel('team-members-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => { fetchMembers() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_invites' },
        () => { fetchMembers() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Cadastrar novo membro (usar tabela team_invites)
  const inviteMember = async (data: CreateTeamMemberData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Verificar se email já existe nos perfis ativos
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', data.email)
        .single()

      if (existingProfile) {
        toast.error('Este email já está cadastrado na equipe')
        return null
      }

      // Verificar se já existe convite pendente
      const { data: existingInvite } = await supabase
        .from('team_invites')
        .select('email, accepted_at')
        .eq('email', data.email)
        .single()

      if (existingInvite) {
        if (existingInvite.accepted_at) {
          toast.error('Este convite já foi aceito')
        } else {
          toast.error('Este email já possui um convite pendente')
        }
        return null
      }

      // Criar convite na tabela team_invites
      const { data: inviteData, error: inviteError } = await supabase
        .from('team_invites')
        .insert({
          email: data.email,
          name: data.name,
          role: data.role,
          setor: data.setor || null,
          cargo: data.cargo || null,
          departamento: data.departamento || null,
          telefone: data.telefone || null,
          horario_inicio: data.horario_inicio || null,
          horario_fim: data.horario_fim || null,
          dias_trabalho: data.dias_trabalho || [1, 2, 3, 4, 5],
          invited_by: user?.id,
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // Enviar email de convite via Edge Function
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/enviar-convite-equipe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ inviteId: inviteData.id }),
        })

        if (response.ok) {
          toast.success(`${data.name} cadastrado com sucesso!`, {
            description: `Um email de convite foi enviado para ${data.email}`,
            duration: 8000,
          })
        } else {
          // Email falhou, mas convite foi criado
          toast.success(`${data.name} cadastrado com sucesso!`, {
            description: `Instrua ${data.name} a acessar "Primeiro Acesso" com o email ${data.email}`,
            duration: 8000,
          })
        }
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError)
        // Email falhou, mas convite foi criado
        toast.success(`${data.name} cadastrado com sucesso!`, {
          description: `Instrua ${data.name} a acessar "Primeiro Acesso" com o email ${data.email}`,
          duration: 8000,
        })
      }

      await fetchMembers()
      return inviteData
    } catch (err: any) {
      console.error('Error inviting member:', err)

      if (err.code === '23505') {
        toast.error('Este email já está cadastrado')
      } else if (err.message?.includes('team_invites') && err.message?.includes('does not exist')) {
        toast.error('Tabela de convites não encontrada', {
          description: 'Execute o SQL: team-invites.sql no Supabase Dashboard',
        })
      } else {
        toast.error('Erro ao cadastrar membro', {
          description: err.message || 'Erro desconhecido',
        })
      }
      return null
    }
  }

  // Atualizar membro
  const updateMember = async (id: string, updates: UpdateTeamMemberData) => {
    try {
      const sanitized = {
        ...updates,
        horario_inicio: updates.horario_inicio || null,
        horario_fim: updates.horario_fim || null,
      }
      const { data, error } = await supabase
        .from('profiles')
        .update(sanitized)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      toast.success('Membro atualizado com sucesso')
      await fetchMembers()
      return data
    } catch (err) {
      console.error('Error updating member:', err)
      toast.error('Erro ao atualizar membro')
      return null
    }
  }

  // Deletar membro (na verdade, só pode deletar do auth se for service role)
  // Por enquanto, vamos apenas remover da tabela profiles
  const removeMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Membro removido da equipe')
      await fetchMembers()
      return true
    } catch (err) {
      console.error('Error removing member:', err)
      toast.error('Erro ao remover membro')
      return false
    }
  }

  // Buscar membro por ID
  const getMemberById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('Error fetching member:', err)
      return null
    }
  }

  // Filtrar por role
  const getMembersByRole = (role: UserRole) => {
    return members.filter(m => m.role === role)
  }

  // Filtrar por departamento
  const getMembersByDepartment = (departamento: string) => {
    return members.filter(m => m.departamento === departamento)
  }

  // Estatísticas
  const getStats = () => {
    return {
      total: members.length,
      admins: members.filter(m => m.role === 'admin').length,
      gerentes: members.filter(m => m.role === 'gerente').length,
      colaboradores: members.filter(m => m.role === 'colaborador').length,
      juridico: members.filter(m => m.role === 'juridico').length,
    }
  }

  return {
    members,
    pendingInvites,
    loading,
    error,
    fetchMembers,
    inviteMember,
    updateMember,
    removeMember,
    getMemberById,
    getMembersByRole,
    getMembersByDepartment,
    getStats,
  }
}
