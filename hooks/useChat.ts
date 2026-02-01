'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Message,
  MessageWithSender,
  Conversation,
  CreateMessageData,
  CreateGroupData,
  ChatGroup,
  TypingUser,
  PresenceState,
} from '@/types/chat'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Channels para Realtime
  const [messagesChannel, setMessagesChannel] = useState<RealtimeChannel | null>(null)
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null)

  // =============================================
  // GET CURRENT USER
  // =============================================

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  // =============================================
  // FETCH CONVERSATIONS
  // =============================================

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return

    try {
      // Buscar conversas diretas - FIX: especificar foreign keys exatas
      const { data: directMessages, error: dmError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          media_url,
          media_type,
          sender_id,
          recipient_id,
          created_at,
          sender:sender_id(id, name, avatar_url),
          recipient:recipient_id(id, name, avatar_url)
        `)
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .is('group_id', null)
        .order('created_at', { ascending: false })

      if (dmError) throw dmError

      // Agrupar mensagens diretas por usuário
      const directConversations = new Map<string, Conversation>()

      directMessages?.forEach((msg: any) => {
        const otherUser = msg.sender_id === currentUserId ? msg.recipient : msg.sender
        if (!otherUser) return

        const conversationId = otherUser.id

        if (!directConversations.has(conversationId)) {
          directConversations.set(conversationId, {
            id: conversationId,
            type: 'direct',
            name: otherUser.name,
            avatar_url: otherUser.avatar_url,
            last_message: {
              id: msg.id,
              content: msg.content,
              created_at: msg.created_at,
            },
            last_message_at: msg.created_at,
            unread_count: 0,
          })
        }
      })

      // Buscar grupos onde o usuário é membro
      const { data: userGroups, error: userGroupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUserId)

      if (userGroupsError) throw userGroupsError

      const groupIds = userGroups?.map((g) => g.group_id) || []

      let groupConversations: Conversation[] = []

      if (groupIds.length > 0) {
        // Buscar detalhes dos grupos
        const { data: groups, error: groupsError } = await supabase
          .from('chat_groups')
          .select('*')
          .in('id', groupIds)

        if (groupsError) throw groupsError

        // Para cada grupo, buscar última mensagem
        const groupsWithMessages = await Promise.all(
          (groups || []).map(async (group) => {
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('id, content, created_at')
              .eq('group_id', group.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            return {
              id: group.id,
              type: 'group' as const,
              name: group.name,
              avatar_url: group.avatar_url,
              last_message: lastMsg || undefined,
              last_message_at: lastMsg?.created_at,
              unread_count: 0,
              created_by: group.created_by,
            }
          })
        )

        groupConversations = groupsWithMessages
      }

      // Combinar e ordenar conversas
      const allConversations = [
        ...Array.from(directConversations.values()),
        ...groupConversations,
      ].sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
        return dateB - dateA
      })

      setConversations(allConversations)
    } catch (err: any) {
      console.error('Error fetching conversations:', err)
      // Não mostrar erro se as tabelas ainda não existem
      if (!err.message?.includes('does not exist')) {
        toast.error('Erro ao carregar conversas')
      }
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  // =============================================
  // FETCH MESSAGES
  // =============================================

  const fetchMessages = useCallback(async (conversationId: string, conversationType: 'direct' | 'group') => {
    if (!currentUserId) return

    try {
      setLoading(true)

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, name, avatar_url)
        `)
        .order('created_at', { ascending: true })

      if (conversationType === 'group') {
        query = query.eq('group_id', conversationId)
      } else {
        query = query
          .is('group_id', null)
          .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${currentUserId})`)
      }

      const { data, error } = await query

      if (error) throw error

      // Transformar para MessageWithSender
      const messagesWithSender: MessageWithSender[] = data?.map((msg: any) => ({
        ...msg,
        sender_name: msg.sender?.name || 'Desconhecido',
        sender_avatar: msg.sender?.avatar_url,
      })) || []

      setMessages(messagesWithSender)

      // Marcar mensagens como lidas
      await markMessagesAsRead(conversationId, conversationType)
    } catch (err) {
      console.error('Error fetching messages:', err)
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  // =============================================
  // SEND MESSAGE
  // =============================================

  const sendMessage = async (data: CreateMessageData): Promise<Message | null> => {
    if (!currentUserId) return null

    try {
      // Optimistic update - adicionar mensagem imediatamente na UI
      const optimisticMessage: MessageWithSender = {
        id: `temp-${Date.now()}`,
        sender_id: currentUserId,
        sender_name: 'Você',
        sender_avatar: undefined,
        content: data.content,
        media_url: data.media_url,
        media_type: data.media_type,
        group_id: data.group_id,
        recipient_id: data.recipient_id,
        thread_id: data.thread_id,
        is_thread_reply: data.is_thread_reply || false,
        thread_reply_count: 0,
        mentioned_users: data.mentioned_users || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, optimisticMessage])

      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          ...data,
          sender_id: currentUserId,
        })
        .select()
        .single()

      if (error) {
        // Remover mensagem otimista se falhar
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
        throw error
      }

      // Substituir mensagem otimista pela real
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? { ...newMessage, sender_name: 'Você' } : m))
      )

      // CRIAR NOTIFICAÇÃO PARA O DESTINATÁRIO (mensagem direta)
      if (data.recipient_id && data.recipient_id !== currentUserId) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', currentUserId)
          .single()

        const senderName = senderProfile?.name || 'Alguém'

        await supabase.from('notifications').insert({
          user_id: data.recipient_id,
          type: 'message',
          title: `Nova mensagem de ${senderName}`,
          description: data.content.length > 100
            ? data.content.substring(0, 100) + '...'
            : data.content,
          reference_type: 'message',
          reference_id: newMessage.id,
        })
      }

      // CRIAR NOTIFICAÇÃO PARA MEMBROS DO GRUPO (exceto o sender)
      if (data.group_id) {
        const { data: groupMembers } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', data.group_id)
          .neq('user_id', currentUserId)

        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', currentUserId)
          .single()

        const { data: groupInfo } = await supabase
          .from('chat_groups')
          .select('name')
          .eq('id', data.group_id)
          .single()

        const senderName = senderProfile?.name || 'Alguém'
        const groupName = groupInfo?.name || 'Grupo'

        if (groupMembers && groupMembers.length > 0) {
          await supabase.from('notifications').insert(
            groupMembers.map((member) => ({
              user_id: member.user_id,
              type: 'message',
              title: `${senderName} em ${groupName}`,
              description: data.content.length > 100
                ? data.content.substring(0, 100) + '...'
                : data.content,
              reference_type: 'message',
              reference_id: newMessage.id,
            }))
          )
        }
      }

      // Atualizar lista de conversas
      await fetchConversations()

      return newMessage
    } catch (err) {
      console.error('Error sending message:', err)
      toast.error('Erro ao enviar mensagem')
      return null
    }
  }

  // =============================================
  // CREATE GROUP
  // =============================================

  const createGroup = async (data: CreateGroupData): Promise<ChatGroup | null> => {
    if (!currentUserId) return null

    try {
      // Criar grupo
      const { data: newGroup, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: data.name,
          description: data.description,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Adicionar membros (incluindo o criador)
      const memberIds = [...data.member_ids, currentUserId]
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(
          memberIds.map((userId) => ({
            group_id: newGroup.id,
            user_id: userId,
            role: userId === currentUserId ? 'admin' : 'member',
          }))
        )

      if (membersError) throw membersError

      toast.success('Grupo criado com sucesso!')
      await fetchConversations()

      return newGroup
    } catch (err) {
      console.error('Error creating group:', err)
      toast.error('Erro ao criar grupo')
      return null
    }
  }

  // =============================================
  // DELETE CONVERSATION
  // =============================================

  const deleteConversation = async (conversationId: string, conversationType: 'direct' | 'group'): Promise<boolean> => {
    if (!currentUserId) return false

    try {
      const { data, error } = await supabase.rpc('delete_conversation', {
        p_conversation_id: conversationId,
        p_conversation_type: conversationType,
        p_user_id: currentUserId,
      })

      if (error) throw error

      toast.success(data.message)
      await fetchConversations()

      // Limpar mensagens se era a conversa ativa
      if (activeConversation?.id === conversationId) {
        setMessages([])
        setActiveConversation(null)
      }

      return true
    } catch (err) {
      console.error('Error deleting conversation:', err)
      toast.error('Erro ao deletar conversa')
      return false
    }
  }

  // =============================================
  // MARK MESSAGES AS READ
  // =============================================

  const markMessagesAsRead = async (conversationId: string, conversationType: 'direct' | 'group') => {
    if (!currentUserId) return

    try {
      // Buscar IDs de mensagens não lidas
      let query = supabase
        .from('messages')
        .select('id')
        .neq('sender_id', currentUserId)

      if (conversationType === 'group') {
        query = query.eq('group_id', conversationId)
      } else {
        query = query.eq('sender_id', conversationId).eq('recipient_id', currentUserId)
      }

      const { data: unreadMessages, error: fetchError } = await query

      if (fetchError) throw fetchError

      if (unreadMessages && unreadMessages.length > 0) {
        const { error: insertError } = await supabase
          .from('message_reads')
          .upsert(
            unreadMessages.map((msg) => ({
              message_id: msg.id,
              user_id: currentUserId,
            })),
            { onConflict: 'message_id,user_id' }
          )

        if (insertError) throw insertError
      }
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  // =============================================
  // UPLOAD FILE
  // =============================================

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${currentUserId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('chat-media').getPublicUrl(filePath)

      return data.publicUrl
    } catch (err) {
      console.error('Error uploading file:', err)
      toast.error('Erro ao fazer upload do arquivo')
      return null
    }
  }

  // =============================================
  // TYPING INDICATOR
  // =============================================

  const updateTypingStatus = useCallback(
    (isTyping: boolean, isRecording: boolean = false) => {
      if (!presenceChannel || !currentUserId || !activeConversation) return

      presenceChannel.track({
        user_id: currentUserId,
        typing: isTyping,
        recording: isRecording,
      } as PresenceState)
    },
    [presenceChannel, currentUserId, activeConversation]
  )

  // =============================================
  // REALTIME - MESSAGES
  // =============================================

  useEffect(() => {
    if (!activeConversation || !currentUserId) return

    // Limpar canal anterior
    if (messagesChannel) {
      supabase.removeChannel(messagesChannel)
    }

    const channelName = `messages-${activeConversation.id}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter:
            activeConversation.type === 'group'
              ? `group_id=eq.${activeConversation.id}`
              : undefined,
        },
        async (payload) => {
          // Buscar dados do sender
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()

          const newMessage: MessageWithSender = {
            ...(payload.new as Message),
            sender_name: sender?.name || 'Desconhecido',
            sender_avatar: sender?.avatar_url,
          }

          // Adicionar mensagem se não for duplicada (otimista)
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMessage.id)
            if (exists) return prev
            return [...prev, newMessage]
          })

          // Marcar como lida se não for do usuário atual
          if (newMessage.sender_id !== currentUserId) {
            await markMessagesAsRead(activeConversation.id, activeConversation.type)
          }
        }
      )
      .subscribe()

    setMessagesChannel(channel)

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversation, currentUserId])

  // =============================================
  // REALTIME - PRESENCE (TYPING)
  // =============================================

  useEffect(() => {
    if (!activeConversation || !currentUserId) return

    // Limpar canal anterior
    if (presenceChannel) {
      supabase.removeChannel(presenceChannel)
    }

    const channelName = `presence-${activeConversation.id}`
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: TypingUser[] = []

        Object.keys(state).forEach((key) => {
          const presences = state[key] as PresenceState[]
          presences.forEach((presence) => {
            if (presence.user_id !== currentUserId && (presence.typing || presence.recording)) {
              // Buscar nome do usuário (em produção, cachear isso)
              supabase
                .from('profiles')
                .select('name')
                .eq('id', presence.user_id)
                .single()
                .then(({ data }) => {
                  users.push({
                    user_id: presence.user_id,
                    user_name: data?.name || 'Usuário',
                    typing: presence.typing,
                    recording: presence.recording,
                  })
                  setTypingUsers(users)
                })
            }
          })
        })

        if (users.length === 0) {
          setTypingUsers([])
        }
      })
      .subscribe()

    setPresenceChannel(channel)

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversation, currentUserId])

  // =============================================
  // REALTIME - CONVERSATIONS LIST
  // =============================================

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_groups',
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchConversations])

  // =============================================
  // INITIAL LOAD
  // =============================================

  useEffect(() => {
    if (currentUserId) {
      fetchConversations()
    }
  }, [currentUserId, fetchConversations])

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    conversations,
    messages,
    activeConversation,
    loading,
    typingUsers,
    currentUserId,

    // Actions
    setActiveConversation,
    fetchMessages,
    sendMessage,
    createGroup,
    deleteConversation,
    uploadFile,
    updateTypingStatus,
    fetchConversations,
  }
}
