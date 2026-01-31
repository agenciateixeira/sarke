'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { Loader2, Search, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  name: string
  email: string
  avatar_url?: string
  cargo?: string
}

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectUser: (userId: string, userName: string, userAvatar?: string) => void
}

export function NewConversationDialog({ open, onOpenChange, onSelectUser }: NewConversationDialogProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchMembers()
    } else {
      setSearchTerm('')
    }
  }, [open])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, cargo')
        .neq('id', user?.id) // Não incluir o próprio usuário
        .order('name', { ascending: true })

      if (error) throw error

      setMembers(data || [])
    } catch (err) {
      console.error('Error fetching members:', err)
      toast.error('Erro ao carregar membros da equipe')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectUser = (member: TeamMember) => {
    onSelectUser(member.id, member.name, member.avatar_url)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogDescription>
            Selecione um membro da equipe para iniciar uma conversa privada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de Membros */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] rounded-md border">
              <div className="p-2 space-y-1">
                {filteredMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {searchTerm ? 'Nenhum membro encontrado' : 'Nenhum membro disponível'}
                    </p>
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSelectUser(member)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.cargo || member.email}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
