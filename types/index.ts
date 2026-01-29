// Níveis de acesso do sistema Sarke
export type UserRole = 'admin' | 'gerente' | 'colaborador' | 'juridico'

// Permissões por setor
export type SetorType =
  | 'dashboard'
  | 'tarefas'
  | 'comercial'
  | 'financeiro'
  | 'juridico'
  | 'calendario'
  | 'gestao_equipe'
  | 'chat_interno'
  | 'ferramentas'
  | 'gestao_obra'
  | 'cronograma'
  | 'memorial'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  setor?: SetorType
  avatar_url?: string
  created_at: string
  updated_at: string
  // Horário de acesso permitido (apenas para colaboradores)
  horario_inicio?: string // formato HH:mm
  horario_fim?: string // formato HH:mm
  dias_trabalho?: number[] // 0-6 (domingo-sábado)
}

export interface Profile extends User {
  telefone?: string
  cargo?: string
  departamento?: string
}

// Permissões por role
export const PERMISSIONS: Record<UserRole, SetorType[]> = {
  admin: [
    'dashboard',
    'tarefas',
    'comercial',
    'financeiro',
    'juridico',
    'calendario',
    'gestao_equipe',
    'chat_interno',
    'ferramentas',
    'gestao_obra',
    'cronograma',
    'memorial'
  ],
  gerente: [
    'dashboard',
    'tarefas',
    'calendario',
    'chat_interno',
    'ferramentas',
    'gestao_obra',
    'cronograma',
    'memorial'
  ],
  colaborador: [
    'dashboard',
    'tarefas',
    'calendario',
    'chat_interno'
  ],
  juridico: [
    'dashboard',
    'juridico',
    'calendario',
    'chat_interno'
  ]
}

// Helper para verificar permissão
export const hasPermission = (userRole: UserRole, setor: SetorType): boolean => {
  return PERMISSIONS[userRole]?.includes(setor) ?? false
}

// Helper para verificar horário de acesso
export const isWithinWorkingHours = (user: User): boolean => {
  // Admin tem acesso total
  if (user.role === 'admin') return true

  // Se não tem restrição de horário, permite
  if (!user.horario_inicio || !user.horario_fim) return true

  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  // Verifica dia da semana
  if (user.dias_trabalho && !user.dias_trabalho.includes(currentDay)) {
    return false
  }

  // Verifica horário
  return currentTime >= user.horario_inicio && currentTime <= user.horario_fim
}
