import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { TypingIndicator } from '@/types/chat-enhancements'

interface UseTypingIndicatorProps {
  conversationId: string
  conversationType: 'direct' | 'group'
  currentUserId: string | null
}

export function useTypingIndicator({
  conversationId,
  conversationType,
  currentUserId,
}: UseTypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // =============================================
  // LISTEN TO TYPING INDICATORS
  // =============================================

  useEffect(() => {
    if (!conversationId || !currentUserId) return

    // Buscar indicadores existentes
    const fetchTypingIndicators = async () => {
      const { data } = await supabase
        .from('typing_indicators')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('conversation_type', conversationType)
        .eq('is_typing', true)
        .neq('user_id', currentUserId)

      if (data) {
        setTypingUsers(data)
      }
    }

    fetchTypingIndicators()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const indicator = payload.new as TypingIndicator

          // Ignorar próprio indicador
          if (indicator.user_id === currentUserId) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (indicator.is_typing) {
              setTypingUsers((prev) => {
                const exists = prev.find((t) => t.user_id === indicator.user_id)
                if (exists) {
                  return prev.map((t) =>
                    t.user_id === indicator.user_id ? indicator : t
                  )
                }
                return [...prev, indicator]
              })
            } else {
              setTypingUsers((prev) =>
                prev.filter((t) => t.user_id !== indicator.user_id)
              )
            }
          } else if (payload.eventType === 'DELETE') {
            const oldIndicator = payload.old as TypingIndicator
            setTypingUsers((prev) =>
              prev.filter((t) => t.user_id !== oldIndicator.user_id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, conversationType, currentUserId])

  // =============================================
  // SET TYPING STATUS
  // =============================================

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!currentUserId || !conversationId) return

      try {
        if (isTyping) {
          // Upsert (insert ou update)
          await supabase.from('typing_indicators').upsert(
            {
              user_id: currentUserId,
              conversation_id: conversationId,
              conversation_type: conversationType,
              is_typing: true,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,conversation_id,conversation_type',
            }
          )
        } else {
          // Delete
          await supabase
            .from('typing_indicators')
            .delete()
            .eq('user_id', currentUserId)
            .eq('conversation_id', conversationId)
            .eq('conversation_type', conversationType)
        }
      } catch (err) {
        console.error('Error updating typing indicator:', err)
      }
    },
    [currentUserId, conversationId, conversationType]
  )

  // =============================================
  // START TYPING (com auto-stop após 3 segundos)
  // =============================================

  const startTyping = useCallback(() => {
    setTyping(true)

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Auto-stop após 3 segundos de inatividade
    timeoutRef.current = setTimeout(() => {
      setTyping(false)
    }, 3000)
  }, [setTyping])

  // =============================================
  // STOP TYPING
  // =============================================

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setTyping(false)
  }, [setTyping])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Remover indicador ao sair
      if (currentUserId && conversationId) {
        supabase
          .from('typing_indicators')
          .delete()
          .eq('user_id', currentUserId)
          .eq('conversation_id', conversationId)
          .eq('conversation_type', conversationType)
          .then(() => {})
      }
    }
  }, [currentUserId, conversationId, conversationType])

  return {
    typingUsers,
    startTyping,
    stopTyping,
  }
}
