'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, SetorType, hasPermission, isWithinWorkingHours } from '@/types'
import { useNotifications } from '@/hooks/useNotifications'

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
  const { hasApprovedAccess } = useNotifications()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    let isMounted = true

    const checkAccessPermission = async () => {
      if (!isMounted) return

      if (!user || user.role === 'admin') {
        if (isMounted) {
          setHasAccess(true)
          setCheckingAccess(false)
        }
        return
      }

      // Se está dentro do horário, tem acesso
      if (isWithinWorkingHours(user)) {
        if (isMounted) {
          setHasAccess(true)
          setCheckingAccess(false)
        }
        return
      }

      // Se está fora do horário, verifica se tem acesso aprovado
      const approved = await hasApprovedAccess()
      if (isMounted) {
        setHasAccess(approved)
        setCheckingAccess(false)
      }
    }

    if (!loading && user) {
      // Apenas verificar uma vez no mount
      checkAccessPermission()
    }

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  useEffect(() => {
    if (!loading && !checkingAccess) {
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

      // Verifica horário de trabalho e acesso aprovado (exceto admin)
      if (user.role !== 'admin' && !hasAccess) {
        router.push('/fora-horario')
        return
      }
    }
  }, [user, loading, checkingAccess, hasAccess, requiredRole, requiredSetor, router])

  if (loading || checkingAccess) {
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

  // Verifica se tem acesso (dentro do horário OU acesso aprovado)
  if (user.role !== 'admin' && !hasAccess) {
    return null
  }

  return <>{children}</>
}
