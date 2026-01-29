'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, SetorType, hasPermission, isWithinWorkingHours } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole[]
  requiredSetor?: SetorType
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  requiredSetor,
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Se não está autenticado, redireciona para login
      if (!user) {
        router.push('/login')
        return
      }

      // Verifica role necessária
      if (requiredRole && !requiredRole.includes(user.role)) {
        router.push('/dashboard')
        return
      }

      // Verifica permissão de setor
      if (requiredSetor && !hasPermission(user.role, requiredSetor)) {
        router.push('/dashboard')
        return
      }

      // Verifica horário de trabalho (exceto admin)
      if (user.role !== 'admin' && !isWithinWorkingHours(user)) {
        router.push('/fora-horario')
        return
      }
    }
  }, [user, loading, requiredRole, requiredSetor, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Verifica permissões finais antes de renderizar
  if (requiredRole && !requiredRole.includes(user.role)) {
    return null
  }

  if (requiredSetor && !hasPermission(user.role, requiredSetor)) {
    return null
  }

  return <>{children}</>
}
