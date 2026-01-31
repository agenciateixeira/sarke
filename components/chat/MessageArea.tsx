'use client'

import { useEffect, useRef } from 'react'
import { MessageWithSender, TypingUser } from '@/types/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { File, Image, Video, Music, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageAreaProps {
  messages: MessageWithSender[]
  currentUserId: string | null
  typingUsers: TypingUser[]
  loading?: boolean
}

export function MessageArea({ messages, currentUserId, typingUsers, loading = false }: MessageAreaProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.sender_avatar} />
                    <AvatarFallback className="text-xs">{getInitials(message.sender_name)}</AvatarFallback>
                  </Avatar>
                )}

                {/* Message Content */}
                <div className={cn('flex flex-col gap-1 max-w-[70%]', isOwn && 'items-end')}>
                  {/* Sender Name - só mostra se não for própria mensagem */}
                  {!isOwn && <span className="text-xs font-medium text-muted-foreground">{message.sender_name}</span>}

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

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground">{formatMessageDate(message.created_at)}</span>
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
    </ScrollArea>
  )
}
