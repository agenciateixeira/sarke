'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MessageSquare, Send, MoreVertical, Pencil, Trash2, Loader2, AtSign } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface TaskComment {
  id: string
  task_id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
  mentioned_users?: string[]
  author?: {
    id: string
    name: string
    avatar_url?: string
  }
}

interface TeamMember {
  id: string
  name: string
  avatar_url?: string
}

interface TaskCommentsProps {
  taskId: string
  teamMembers: TeamMember[]
}

export function TaskComments({ taskId, teamMembers }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [commentToDelete, setCommentToDelete] = useState<TaskComment | null>(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Buscar usuário atual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null)
    })
  }, [])

  // Buscar comentários
  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          author:profiles!created_by (
            id,
            name,
            avatar_url
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast.error('Erro ao carregar comentários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()

    // Subscrever a mudanças em tempo real
    const channel = supabase
      .channel(`task_comments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId])

  // Detectar @ para mostrar menu de menções
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const position = e.target.selectionStart

    setNewComment(value)
    setCursorPosition(position)

    // Detectar @
    const textBeforeCursor = value.substring(0, position)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1 && lastAtIndex === position - 1) {
      setShowMentions(true)
      setMentionSearch('')
    } else if (lastAtIndex !== -1) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1)
      if (searchText.includes(' ')) {
        setShowMentions(false)
      } else {
        setShowMentions(true)
        setMentionSearch(searchText)
      }
    } else {
      setShowMentions(false)
    }
  }

  // Adicionar menção
  const addMention = (member: TeamMember) => {
    const textBeforeCursor = newComment.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    const before = newComment.substring(0, lastAtIndex)
    const after = newComment.substring(cursorPosition)
    const newText = `${before}@${member.name} ${after}`

    setNewComment(newText)
    setShowMentions(false)
  }

  // Extrair IDs de usuários mencionados
  const extractMentionedUsers = (text: string): string[] => {
    const mentioned: string[] = []
    const regex = /@(\S+)/g
    let match

    while ((match = regex.exec(text)) !== null) {
      const name = match[1]
      const member = teamMembers.find((m) => m.name === name)
      if (member) {
        mentioned.push(member.id)
      }
    }

    return mentioned
  }

  // Renderizar texto com menções destacadas
  const renderContent = (content: string) => {
    const parts = content.split(/(@\S+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const name = part.substring(1)
        const member = teamMembers.find((m) => m.name === name)
        if (member) {
          return (
            <span key={index} className="text-primary font-medium">
              {part}
            </span>
          )
        }
      }
      return <span key={index}>{part}</span>
    })
  }

  // Enviar comentário
  const handleSendComment = async () => {
    if (!newComment.trim()) return

    setSending(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const mentionedUsers = extractMentionedUsers(newComment)

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          content: newComment,
          created_by: user.id,
          mentioned_users: mentionedUsers.length > 0 ? mentionedUsers : null,
        })

      if (error) throw error

      setNewComment('')
      toast.success('Comentário adicionado')
      await fetchComments()
    } catch (error: any) {
      console.error('Error sending comment:', error)
      toast.error('Erro ao enviar comentário')
    } finally {
      setSending(false)
    }
  }

  // Editar comentário
  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const mentionedUsers = extractMentionedUsers(editContent)

      const { error } = await supabase
        .from('task_comments')
        .update({
          content: editContent,
          mentioned_users: mentionedUsers.length > 0 ? mentionedUsers : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)

      if (error) throw error

      setEditingId(null)
      setEditContent('')
      toast.success('Comentário atualizado')
      await fetchComments()
    } catch (error: any) {
      console.error('Error editing comment:', error)
      toast.error('Erro ao editar comentário')
    }
  }

  // Deletar comentário
  const handleDelete = async () => {
    if (!commentToDelete) return

    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentToDelete.id)

      if (error) throw error

      setCommentToDelete(null)
      toast.success('Comentário excluído')
      await fetchComments()
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      toast.error('Erro ao excluir comentário')
    }
  }

  // Filtrar membros para menções
  const filteredMembers = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Lista de comentários */}
      {comments.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum comentário ainda</p>
          <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isAuthor = currentUserId === comment.created_by

            return (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author?.avatar_url} />
                  <AvatarFallback>
                    {comment.author?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.author?.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-muted-foreground">(editado)</span>
                    )}

                    {isAuthor && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 ml-auto"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingId(comment.id)
                              setEditContent(comment.content)
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setCommentToDelete(comment)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(comment.id)}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null)
                            setEditContent('')
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {renderContent(comment.content)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Novo comentário */}
      <div className="relative">
        <Textarea
          placeholder="Escreva um comentário... Use @ para mencionar alguém"
          value={newComment}
          onChange={handleInputChange}
          className="min-h-[80px] pr-12"
          disabled={sending}
        />

        {/* Menu de menções */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full mb-2 w-full bg-popover border rounded-md shadow-lg max-h-[200px] overflow-auto z-10">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left"
                onClick={() => addMention(member)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{member.name}</span>
              </button>
            ))}
          </div>
        )}

        <Button
          size="icon"
          className="absolute bottom-2 right-2"
          onClick={handleSendComment}
          disabled={!newComment.trim() || sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Dica de menções */}
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <AtSign className="h-3 w-3" />
        Digite @ seguido do nome para mencionar um membro da equipe
      </p>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!commentToDelete} onOpenChange={(o) => { if (!o) setCommentToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
