'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { MessageWithSender, TypingUser } from '@/types/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { File, Image, Video, Music, Download, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserProfileDialog } from './UserProfileDialog'
import { useMessageReads } from '@/hooks/useMessageReads'
import { supabase } from '@/lib/supabase'
import type { UserTag } from '@/types/chat-enhancements'

interface MessageAreaProps {
  messages: MessageWithSender[]
  currentUserId: string | null
  typingUsers: TypingUser[]
  loading?: boolean
  onStartAudioCall?: (userId: string) => void
  onStartVideoCall?: (userId: string) => void
}

export function MessageArea({ messages, currentUserId, typingUsers, loading = false, onStartAudioCall, onStartVideoCall }: MessageAreaProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [userTags, setUserTags] = useState<Map<string, UserTag>>(new Map())

  // IDs das mensagens para buscar status de leitura
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages])

  // Hook para buscar status de leitura
  const messageReads = useMessageReads(messageIds)

  // Buscar tags dos usuários que aparecem nas mensagens
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return

    const fetchUserTags = async () => {
      // IDs únicos dos senders (exceto eu mesmo)
      const senderIds = [...new Set(messages.map(m => m.sender_id))].filter(id => id !== currentUserId)

      if (senderIds.length === 0) return

      const { data } = await supabase
        .from('user_tags')
        .select('*')
        .eq('user_id', currentUserId)
        .in('tagged_user_id', senderIds)

      if (data) {
        const tagsMap = new Map<string, UserTag>()
        data.forEach(tag => {
          tagsMap.set(tag.tagged_user_id, tag)
        })
        setUserTags(tagsMap)
      }
    }

    fetchUserTags()
  }, [messages, currentUserId])

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listener para abrir perfil do header
  useEffect(() => {
    const handleOpenProfile = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId: string }>
      if (customEvent.detail?.userId) {
        handleUserClick(customEvent.detail.userId)
      }
    }

    window.addEventListener('openUserProfile', handleOpenProfile)
    return () => window.removeEventListener('openUserProfile', handleOpenProfile)
  }, [])

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId)
    setProfileDialogOpen(true)
  }

  // Verificar se mensagem foi lida
  const isMessageRead = (messageId: string) => {
    const reads = messageReads.get(messageId)
    return reads && reads.length > 0
  }

  // Função para calcular luminância e escolher cor de texto
  const getTextColor = (hexColor: string) => {
    // Remove # se existir
    const hex = hexColor.replace('#', '')

    // Converte para RGB
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // Calcula luminância
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Se luminância > 0.5, usa texto escuro, senão usa texto claro
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date)
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm')
    } else if (isYesterday(messageDate)) {
      return `Ontem às ${format(messageDate, 'HH:mm')}`
    } else {
      return format(messageDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    }
  }

  const formatDateDivider = (date: string) => {
    const messageDate = new Date(date)
    if (isToday(messageDate)) {
      return 'Hoje'
    } else if (isYesterday(messageDate)) {
      return 'Ontem'
    } else {
      return format(messageDate, "dd 'de' MMMM", { locale: ptBR })
    }
  }

  const shouldShowDateDivider = (currentMsg: MessageWithSender, previousMsg?: MessageWithSender) => {
    if (!previousMsg) return true
    return !isSameDay(new Date(currentMsg.created_at), new Date(previousMsg.created_at))
  }

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image':
        return <Image className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'audio':
        return <Music className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getFileName = (url: string) => {
    return url.split('/').pop() || 'arquivo'
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
      </div>
    )
  }

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Nenhuma mensagem ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a enviar uma mensagem!</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      <div className="space-y-4">
        {messages.map((message, index) => {
          const isOwn = message.sender_id === currentUserId
          const showDateDivider = shouldShowDateDivider(message, messages[index - 1])

          return (
            <div key={message.id}>
              {/* Date Divider */}
              {showDateDivider && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                    {formatDateDivider(message.created_at)}
                  </div>
                </div>
              )}

              {/* Message */}
              <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                {/* Avatar - só mostra se não for própria mensagem */}
                {!isOwn && (
                  <Avatar
                    className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleUserClick(message.sender_id)}
                  >
                    <AvatarImage src={message.sender_avatar} />
                    <AvatarFallback className="text-xs">{getInitials(message.sender_name)}</AvatarFallback>
                  </Avatar>
                )}

                {/* Message Content */}
                <div className={cn('flex flex-col gap-1 max-w-[70%]', isOwn && 'items-end')}>
                  {/* Sender Name com Tag - só mostra se não for própria mensagem */}
                  {!isOwn && (
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-medium text-muted-foreground cursor-pointer hover:underline"
                        onClick={() => handleUserClick(message.sender_id)}
                      >
                        {message.sender_name}
                      </span>
                      {userTags.has(message.sender_id) && (
                        <Badge
                          className="text-[10px] px-1.5 py-0 h-4"
                          style={{
                            backgroundColor: userTags.get(message.sender_id)!.tag_color,
                            color: getTextColor(userTags.get(message.sender_id)!.tag_color),
                          }}
                        >
                          {userTags.get(message.sender_id)!.tag_name}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      'rounded-lg px-4 py-2',
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {/* Text Content */}
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}

                    {/* Media Content */}
                    {message.media_url && (
                      <div className="mt-2">
                        {message.media_type === 'image' ? (
                          <img
                            src={message.media_url}
                            alt="Imagem"
                            className="max-w-full rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(message.media_url, '_blank')}
                          />
                        ) : message.media_type === 'video' ? (
                          <video
                            src={message.media_url}
                            controls
                            className="max-w-full rounded-md"
                          />
                        ) : message.media_type === 'audio' ? (
                          <audio src={message.media_url} controls className="w-full" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.open(message.media_url, '_blank')}
                          >
                            {getMediaIcon(message.media_type || 'file')}
                            <span className="truncate max-w-[200px]">{getFileName(message.media_url)}</span>
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timestamp e Status de Leitura */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{formatMessageDate(message.created_at)}</span>
                    {/* Check marks - só mostra em mensagens próprias */}
                    {isOwn && (
                      <span className="flex-shrink-0">
                        {isMessageRead(message.id) ? (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Check className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Spacer para alinhar mensagens próprias */}
                {isOwn && <div className="w-8 flex-shrink-0" />}
              </div>
            </div>
          )
        })}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {getInitials(typingUsers[0].user_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{typingUsers[0].user_name}</span>
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* User Profile Dialog */}
      {selectedUserId && (
        <UserProfileDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          userId={selectedUserId}
          onStartAudioCall={onStartAudioCall ? () => onStartAudioCall(selectedUserId) : undefined}
          onStartVideoCall={onStartVideoCall ? () => onStartVideoCall(selectedUserId) : undefined}
        />
      )}
    </ScrollArea>
  )
}
