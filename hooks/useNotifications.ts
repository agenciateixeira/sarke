'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Notification, AccessRequest, AccessRequestWithUser } from '@/types/notifications'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequestWithUser[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [accessCache, setAccessCache] = useState<{ hasAccess: boolean; timestamp: number } | null>(null)

  const notificationsChannel = useState<RealtimeChannel | null>(null)[0]

  // =============================================
  // GET CURRENT USER
  // =============================================

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)

        // Verificar se é admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setIsAdmin(profile?.role === 'admin' || profile?.role === 'gerente')
      }
    }
    getCurrentUser()
  }, [])

  // =============================================
  // FETCH NOTIFICATIONS
  // =============================================

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        // Se a tabela não existe ainda, não fazer nada
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setNotifications([])
          setUnreadCount(0)
          return
        }
        throw error
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.read).length || 0)
    } catch (err: any) {
      // Não logar erro se a tabela não existe
      if (err.code !== '42P01' && !err.message?.includes('does not exist')) {
        console.error('Error fetching notifications:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  // =============================================
  // FETCH ACCESS REQUESTS (para admins)
  // =============================================

  const fetchAccessRequests = useCallback(async () => {
    if (!currentUserId || !isAdmin) return

    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select(`
          *,
          user:user_id(id, name, avatar_url),
          reviewer:reviewed_by(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        // Se a tabela não existe ainda, não fazer nada
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setAccessRequests([])
          return
        }
        throw error
      }

      const requests: AccessRequestWithUser[] = (data || []).map((req: any) => ({
        ...req,
        user_name: req.user?.name || 'Desconhecido',
        user_avatar: req.user?.avatar_url,
        reviewer_name: req.reviewer?.name,
      }))

      setAccessRequests(requests)
    } catch (err: any) {
      // Não logar erro se a tabela não existe
      if (err.code !== '42P01' && !err.message?.includes('does not exist')) {
        console.error('Error fetching access requests:', err)
      }
    }
  }, [currentUserId, isAdmin])

  // =============================================
  // MARK AS READ
  // =============================================

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  // =============================================
  // MARK ALL AS READ
  // =============================================

  const markAllAsRead = async () => {
    if (!currentUserId) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUserId)
        .eq('read', false)

      if (error) throw error

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  // =============================================
  // DELETE NOTIFICATION
  // =============================================

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  // =============================================
  // REQUEST ACCESS
  // =============================================

  const requestAccess = async (reason?: string) => {
    if (!currentUserId) return null

    try {
      const { data, error } = await supabase
        .from('access_requests')
        .insert({
          user_id: currentUserId,
          reason: reason,
        })
        .select()
        .single()

      if (error) {
        // Se a tabela não existe ainda (SQL não executado)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast.error('Sistema de notificações não configurado', {
            description: 'Entre em contato com o administrador do sistema.',
          })
          return null
        }
        throw error
      }

      toast.success('Solicitação enviada!', {
        description: 'Os administradores foram notificados.',
      })

      return data
    } catch (err: any) {
      console.error('Error requesting access:', err)
      toast.error('Erro ao enviar solicitação', {
        description: err.message,
      })
      return null
    }
  }

  // =============================================
  // REVIEW ACCESS REQUEST (admin)
  // =============================================

  const reviewAccessRequest = async (
    requestId: string,
    approved: boolean,
    hoursValid: number = 24
  ) => {
    if (!currentUserId || !isAdmin) return

    try {
      const { data, error } = await supabase.rpc('review_access_request', {
        p_request_id: requestId,
        p_admin_id: currentUserId,
        p_approved: approved,
        p_hours_valid: hoursValid,
      })

      if (error) {
        // Se a função não existe ainda (SQL não executado)
        if (error.code === '42883' || error.message?.includes('does not exist')) {
          toast.error('Sistema de notificações não configurado', {
            description: 'Execute o SQL de configuração no Supabase.',
          })
          return null
        }
        throw error
      }

      if (data.success) {
        toast.success(data.message)
        await fetchAccessRequests()
      } else {
        toast.error(data.message)
      }

      return data
    } catch (err: any) {
      console.error('Error reviewing access request:', err)
      toast.error('Erro ao revisar solicitação')
      return null
    }
  }

  // =============================================
  // CHECK IF USER HAS APPROVED ACCESS
  // =============================================

  const hasApprovedAccess = async (skipCache = false): Promise<boolean> => {
    if (!currentUserId) return false

    // Usar cache por 30 segundos para evitar chamadas excessivas
    const now = Date.now()
    if (!skipCache && accessCache && (now - accessCache.timestamp) < 30000) {
      return accessCache.hasAccess
    }

    try {
      const { data, error } = await supabase.rpc('has_approved_access', {
        p_user_id: currentUserId,
      })

      if (error) {
        // Se a função não existe ainda (SQL não executado), retorna false silenciosamente
        if (error.code === '42883' || error.message?.includes('does not exist')) {
          setAccessCache({ hasAccess: false, timestamp: now })
          return false
        }
        throw error
      }

      const hasAccess = data || false
      setAccessCache({ hasAccess, timestamp: now })
      return hasAccess
    } catch (err: any) {
      // Não logar erro se a função não existe
      if (err.code !== '42883' && !err.message?.includes('does not exist')) {
        console.error('Error checking approved access:', err)
      }
      setAccessCache({ hasAccess: false, timestamp: now })
      return false
    }
  }

  // =============================================
  // REALTIME - NOTIFICATIONS
  // =============================================

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)

          // Se é notificação de acesso aprovado, atualizar cache imediatamente
          if (newNotification.type === 'access_approved') {
            setAccessCache({ hasAccess: true, timestamp: Date.now() })
          }

          // Toast de notificação
          toast.info(newNotification.title, {
            description: newNotification.description,
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [currentUserId])

  // =============================================
  // REALTIME - ACCESS REQUESTS (admin)
  // =============================================

  useEffect(() => {
    if (!currentUserId || !isAdmin) return

    const channel = supabase
      .channel(`access-requests-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'access_requests',
        },
        () => {
          fetchAccessRequests()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, isAdmin])

  // =============================================
  // INITIAL LOAD
  // =============================================

  useEffect(() => {
    if (currentUserId) {
      fetchNotifications()
      if (isAdmin) {
        fetchAccessRequests()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, isAdmin])

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    notifications,
    accessRequests,
    unreadCount,
    loading,
    isAdmin,

    // Actions
    fetchNotifications,
    fetchAccessRequests,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestAccess,
    reviewAccessRequest,
    hasApprovedAccess,
  }
}
