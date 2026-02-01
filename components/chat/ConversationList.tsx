'use client'

import { Conversation } from '@/types/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Plus, Users, MessageSquare, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import type { UserTag } from '@/types/chat-enhancements'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
  onNewGroup: () => void
  onNewConversation: () => void
  onDeleteConversation: (conversationId: string, conversationType: 'direct' | 'group') => void
  loading?: boolean
}

export function ConversationList({
  conversations,
  activeConversation,
  onSelectConversation,
  onNewGroup,
  onNewConversation,
  onDeleteConversation,
  loading = false,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userTags, setUserTags] = useState<Map<string, UserTag>>(new Map())

  // Buscar usuário atual
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  // Buscar tags dos usuários nas conversas
  useEffect(() => {
    if (!currentUserId || conversations.length === 0) return

    const fetchUserTags = async () => {
      // IDs únicos das conversas diretas (exceto eu mesmo)
      const userIds = conversations
        .filter(conv => conv.type === 'direct' && conv.id !== currentUserId)
        .map(conv => conv.id)

      if (userIds.length === 0) return

      const { data } = await supabase
        .from('user_tags')
        .select('*')
        .eq('user_id', currentUserId)
        .in('tagged_user_id', userIds)

      if (data) {
        const tagsMap = new Map<string, UserTag>()
        data.forEach(tag => {
          tagsMap.set(tag.tagged_user_id, tag)
        })
        setUserTags(tagsMap)
      }
    }

    fetchUserTags()
  }, [conversations, currentUserId])

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (date: string | undefined) => {
    if (!date) return ''
    return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })
  }

  const truncateMessage = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return 'Sem mensagens ainda'
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // Função para calcular cor de texto com base no contraste
  const getTextColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  return (
    <div className="flex h-full flex-col border-r bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Conversas</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="rounded-full">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onNewConversation}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Nova Conversa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNewGroup}>
                <Users className="h-4 w-4 mr-2" />
                Novo Grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchTerm ? 'Tente outro termo de busca' : 'Comece uma nova conversa ou crie um grupo'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'group relative mb-1 flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-pink-50 dark:hover:bg-pink-950/20',
                  activeConversation?.id === conversation.id && 'bg-pink-100 dark:bg-pink-950/30 border-l-2 border-pink-500'
                )}
                onClick={() => onSelectConversation(conversation)}
              >
                {/* Avatar */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={conversation.avatar_url} />
                  <AvatarFallback>
                    {conversation.type === 'group' ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      getInitials(conversation.name)
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="truncate text-sm font-medium">{conversation.name}</h3>
                      {conversation.type === 'direct' && userTags.has(conversation.id) && (
                        <Badge
                          className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
                          style={{
                            backgroundColor: userTags.get(conversation.id)!.tag_color,
                            color: getTextColor(userTags.get(conversation.id)!.tag_color),
                          }}
                        >
                          {userTags.get(conversation.id)!.tag_name}
                        </Badge>
                      )}
                      {conversation.type === 'group' && (
                        <Users className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {truncateMessage(conversation.last_message?.content)}
                    </p>
                    {conversation.unread_count > 0 && (
                      <Badge variant="default" className="h-5 min-w-[20px] flex-shrink-0 px-1.5 text-xs">
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Delete Button (visible on hover) */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (
                      confirm(
                        `Tem certeza que deseja ${
                          conversation.type === 'group' ? 'sair do grupo' : 'deletar esta conversa'
                        }?`
                      )
                    ) {
                      onDeleteConversation(conversation.id, conversation.type)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
