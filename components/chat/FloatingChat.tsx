'use client'

import { useState, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { MessageArea } from './MessageArea'
import { MessageInput } from './MessageInput'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, X, Minimize2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FloatingChat() {
  const {
    messages,
    activeConversation,
    typingUsers,
    currentUserId,
    fetchMessages,
    sendMessage,
    uploadFile,
    updateTypingStatus,
  } = useChat()

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (activeConversation && isOpen) {
      fetchMessages(activeConversation.id, activeConversation.type)
    }
  }, [activeConversation, isOpen, fetchMessages])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSendMessage = async (data: any) => {
    await sendMessage(data)
  }

  // Não renderizar se não houver conversa ativa
  if (!activeConversation) {
    return null
  }

  // Botão flutuante (quando fechado)
  if (!isOpen) {
    return (
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-6 w-6" />
        {typingUsers.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
          </span>
        )}
      </Button>
    )
  }

  // Chat minimizado
  if (isMinimized) {
    return (
      <Card className="fixed bottom-6 right-6 w-80 shadow-lg z-50 overflow-hidden">
        <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(false)}>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activeConversation.avatar_url} />
              <AvatarFallback>
                {activeConversation.type === 'group' ? (
                  <Users className="h-4 w-4" />
                ) : (
                  getInitials(activeConversation.name)
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{activeConversation.name}</h3>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    )
  }

  // Chat aberto
  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-lg z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={activeConversation.avatar_url} />
            <AvatarFallback>
              {activeConversation.type === 'group' ? (
                <Users className="h-4 w-4" />
              ) : (
                getInitials(activeConversation.name)
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{activeConversation.name}</h3>
            {typingUsers.length > 0 ? (
              <p className="text-xs opacity-90">
                {typingUsers[0].typing
                  ? 'digitando...'
                  : typingUsers[0].recording
                  ? 'gravando...'
                  : ''}
              </p>
            ) : (
              <p className="text-xs opacity-90">
                {activeConversation.type === 'group' ? 'Grupo' : 'Online'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageArea
          messages={messages}
          currentUserId={currentUserId}
          typingUsers={typingUsers}
        />
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onUploadFile={uploadFile}
        onTypingChange={updateTypingStatus}
        groupId={activeConversation.type === 'group' ? activeConversation.id : undefined}
        recipientId={activeConversation.type === 'direct' ? activeConversation.id : undefined}
      />
    </Card>
  )
}
