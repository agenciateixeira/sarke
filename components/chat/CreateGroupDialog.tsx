'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CreateGroupData } from '@/types/chat'
import { supabase } from '@/lib/supabase'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  name: string
  email: string
  avatar_url?: string
}

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateGroup: (data: CreateGroupData) => Promise<void>
}

export function CreateGroupDialog({ open, onOpenChange, onCreateGroup }: CreateGroupDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      fetchMembers()
    } else {
      // Limpar ao fechar
      setName('')
      setDescription('')
      setSelectedMembers([])
      setSearchTerm('')
    }
  }, [open])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
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

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Digite um nome para o grupo')
      return
    }

    if (selectedMembers.length === 0) {
      toast.error('Selecione pelo menos um membro')
      return
    }

    setSubmitting(true)
    try {
      await onCreateGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        member_ids: selectedMembers,
      })

      onOpenChange(false)
    } catch (err) {
      console.error('Error creating group:', err)
    } finally {
      setSubmitting(false)
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
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Grupo</DialogTitle>
          <DialogDescription>
            Crie um grupo para conversar com múltiplos membros da equipe
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Grupo */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Nome do Grupo *</Label>
            <Input
              id="group-name"
              placeholder="Ex: Equipe de Marketing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="group-description">Descrição (opcional)</Label>
            <Textarea
              id="group-description"
              placeholder="Descreva o propósito deste grupo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Busca de Membros */}
          <div className="space-y-2">
            <Label>Adicionar Membros *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de Membros */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {selectedMembers.length} {selectedMembers.length === 1 ? 'membro selecionado' : 'membros selecionados'}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-4 space-y-2">
                  {filteredMembers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {searchTerm ? 'Nenhum membro encontrado' : 'Nenhum membro disponível'}
                    </p>
                  ) : (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => toggleMember(member.id)}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={() => toggleMember(member.id)}
                        />

                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !name.trim() || selectedMembers.length === 0}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Grupo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
