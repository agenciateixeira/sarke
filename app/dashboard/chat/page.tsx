'use client'

import { useEffect, useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { useWebRTC } from '@/hooks/useWebRTC'
import { ConversationList } from '@/components/chat/ConversationList'
import { MessageArea } from '@/components/chat/MessageArea'
import { MessageInput } from '@/components/chat/MessageInput'
import { CreateGroupDialog } from '@/components/chat/CreateGroupDialog'
import { NewConversationDialog } from '@/components/chat/NewConversationDialog'
import { IncomingCallDialog } from '@/components/call/IncomingCallDialog'
import { CallScreen } from '@/components/call/CallScreen'
import { Card } from '@/components/ui/card'
import { Conversation } from '@/types/chat'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MessageSquare, Users, MoreVertical, Phone, Video } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ChatPage() {
  const {
    conversations,
    messages,
    activeConversation,
    loading,
    typingUsers,
    currentUserId,
    setActiveConversation,
    fetchMessages,
    sendMessage,
    createGroup,
    deleteConversation,
    uploadFile,
    updateTypingStatus,
  } = useChat()

  // WebRTC Hook
  const {
    activeCall,
    incomingCall,
    callStatus,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC()

  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [newConversationOpen, setNewConversationOpen] = useState(false)

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id, activeConversation.type)
    }
  }, [activeConversation, fetchMessages])

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

  const handleCreateGroup = async (data: any) => {
    await createGroup(data)
  }

  const handleDeleteConversation = async (conversationId: string, conversationType: 'direct' | 'group') => {
    await deleteConversation(conversationId, conversationType)
  }

  const handleSelectUser = async (userId: string, userName: string, userAvatar?: string) => {
    // Verificar se já existe uma conversa com esse usuário
    const existingConversation = conversations.find(
      (conv) => conv.type === 'direct' && conv.id === userId
    )

    if (existingConversation) {
      setActiveConversation(existingConversation)
    } else {
      // Criar conversa temporária para exibir
      const newConversation: Conversation = {
        id: userId,
        type: 'direct',
        name: userName,
        avatar_url: userAvatar,
        unread_count: 0,
      }
      setActiveConversation(newConversation)
    }
  }

  // Handlers de chamada
  const handleStartAudioCall = () => {
    if (activeConversation && activeConversation.type === 'direct') {
      startCall({ receiver_id: activeConversation.id, type: 'audio' })
    }
  }

  const handleStartVideoCall = () => {
    if (activeConversation && activeConversation.type === 'direct') {
      startCall({ receiver_id: activeConversation.id, type: 'video' })
    }
  }

  const handleAcceptCall = () => {
    if (incomingCall) {
      acceptCall(incomingCall)
    }
  }

  const handleRejectCall = () => {
    if (incomingCall) {
      rejectCall(incomingCall)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
        {/* Conversations Sidebar */}
        <div className="w-80 flex-shrink-0">
          <Card className="h-full overflow-hidden">
            <ConversationList
              conversations={conversations}
              activeConversation={activeConversation}
              onSelectConversation={setActiveConversation}
              onNewGroup={() => setCreateGroupOpen(true)}
              onNewConversation={() => setNewConversationOpen(true)}
              onDeleteConversation={handleDeleteConversation}
              loading={loading}
            />
          </Card>
        </div>

        {/* Chat Area */}
        <div className="flex-1">
          <Card className="h-full flex flex-col overflow-hidden">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="border-b p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={activeConversation.avatar_url} />
                      <AvatarFallback>
                        {activeConversation.type === 'group' ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          getInitials(activeConversation.name)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{activeConversation.name}</h2>
                      {typingUsers.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {typingUsers[0].typing
                            ? 'digitando...'
                            : typingUsers[0].recording
                            ? 'gravando áudio...'
                            : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {activeConversation.type === 'group'
                            ? `Grupo • ${activeConversation.members?.length || 0} membros`
                            : 'Conversa direta'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Action Buttons - Só habilita em conversas diretas */}
                    {activeConversation.type === 'direct' && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleStartAudioCall}
                          disabled={!!activeCall}
                          title="Iniciar chamada de áudio"
                        >
                          <Phone className="h-5 w-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleStartVideoCall}
                          disabled={!!activeCall}
                          title="Iniciar chamada de vídeo"
                        >
                          <Video className="h-5 w-5" />
                        </Button>
                      </>
                    )}

                    {/* More Options */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {activeConversation.type === 'group' && (
                          <>
                            <DropdownMenuItem>Ver membros</DropdownMenuItem>
                            <DropdownMenuItem>Configurações do grupo</DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            handleDeleteConversation(activeConversation.id, activeConversation.type)
                          }
                        >
                          {activeConversation.type === 'group' ? 'Sair do grupo' : 'Deletar conversa'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <MessageArea
                  messages={messages}
                  currentUserId={currentUserId}
                  typingUsers={typingUsers}
                  loading={loading}
                  onStartAudioCall={(userId) => startCall({ receiver_id: userId, type: 'audio' })}
                  onStartVideoCall={(userId) => startCall({ receiver_id: userId, type: 'video' })}
                />

                {/* Input */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onUploadFile={uploadFile}
                  onTypingChange={updateTypingStatus}
                  groupId={activeConversation.type === 'group' ? activeConversation.id : undefined}
                  recipientId={activeConversation.type === 'direct' ? activeConversation.id : undefined}
                />
              </>
            ) : (
              // Empty State
              <div className="flex h-full flex-col items-center justify-center text-center p-8">
                <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Escolha uma conversa existente ou crie um novo grupo para começar a trocar mensagens com sua equipe.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Create Group Dialog */}
        <CreateGroupDialog
          open={createGroupOpen}
          onOpenChange={setCreateGroupOpen}
          onCreateGroup={handleCreateGroup}
        />

        {/* New Conversation Dialog */}
        <NewConversationDialog
          open={newConversationOpen}
          onOpenChange={setNewConversationOpen}
          onSelectUser={handleSelectUser}
        />

        {/* Incoming Call Dialog */}
        {incomingCall && (
          <IncomingCallDialog
            call={incomingCall}
            callerName={
              conversations.find((c) => c.id === incomingCall.caller_id)?.name || 'Desconhecido'
            }
            callerAvatar={
              conversations.find((c) => c.id === incomingCall.caller_id)?.avatar_url
            }
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}

        {/* Active Call Screen */}
        {activeCall && (
          <CallScreen
            call={activeCall}
            callStatus={callStatus}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            isVideo={activeCall.type === 'video'}
            onEndCall={endCall}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
          />
        )}
      </div>
  )
}
