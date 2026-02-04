'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Timeout de segurança - se após 10s ainda estiver loading, forçar false
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ [AuthContext] Timeout de segurança atingido (10s), forçando loading = false')
      setLoading(false)
    }, 10000)

    // Verificar sessão atual
    console.log('🔍 [AuthContext] Iniciando verificação de sessão...')
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('✅ [AuthContext] Sessão obtida:', session ? 'Usuário logado' : 'Sem sessão')
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        console.log('👤 [AuthContext] Carregando perfil do usuário:', session.user.id)
        loadUserProfile(session.user.id)
      } else {
        console.log('⚠️ [AuthContext] Sem sessão ativa, finalizando loading')
        setLoading(false)
      }
    }).catch((error) => {
      console.error('❌ [AuthContext] Erro ao obter sessão:', error)
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔄 [AuthContext] Buscando perfil na tabela profiles...')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('❌ [AuthContext] Erro ao carregar perfil:', error)
        // Se o perfil não existe, tentar criar
        await createMissingProfile(userId)
        return
      }

      if (!data) {
        console.log('⚠️ [AuthContext] Perfil não encontrado, criando...')
        // Perfil não existe, criar
        await createMissingProfile(userId)
        return
      }

      console.log('✅ [AuthContext] Perfil carregado com sucesso:', data.name)
      setUser(data as User)
    } catch (error) {
      console.error('❌ [AuthContext] Exceção ao carregar perfil:', error)
    } finally {
      console.log('🏁 [AuthContext] Finalizando loading')
      setLoading(false)
    }
  }

  const createMissingProfile = async (userId: string) => {
    try {
      // Buscar dados do usuário auth
      const { data: authUser } = await supabase.auth.getUser()

      if (!authUser?.user) {
        throw new Error('User not found')
      }

      // Criar perfil
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: authUser.user.email!,
          name: authUser.user.user_metadata?.name || authUser.user.email!.split('@')[0],
          role: authUser.user.user_metadata?.role || 'colaborador',
        })
        .select()
        .single()

      if (error) throw error

      setUser(newProfile as User)
    } catch (error) {
      console.error('Error creating profile:', error)
      // Fazer logout se não conseguir criar perfil
      await signOut()
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const signUp = async (email: string, password: string, name: string, role: UserRole) => {
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Criar perfil do usuário
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        name,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (profileError) throw profileError
      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSupabaseUser(null)
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) throw error
      setUser({ ...user, ...updates })
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const refreshUser = async () => {
    if (!user) return
    await loadUserProfile(user.id)
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
