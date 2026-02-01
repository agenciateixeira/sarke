'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Phone, Video, Mail, Briefcase, Save, Loader2 } from 'lucide-react'
import { UserTag } from '@/types/chat-enhancements'

interface UserProfile {
  id: string
  name: string
  email: string
  avatar_url?: string
  role?: string
}

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onStartAudioCall?: () => void
  onStartVideoCall?: () => void
}

export function UserProfileDialog({
  open,
  onOpenChange,
  userId,
  onStartAudioCall,
  onStartVideoCall,
}: UserProfileDialogProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tag, setTag] = useState<UserTag | null>(null)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#3b82f6')
  const [loading, setLoading] = useState(true)
  const [savingTag, setSavingTag] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (!open || !userId) return

    const fetchUserProfile = async () => {
      setLoading(true)
      try {
        // Buscar perfil do usuário
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, role')
          .eq('id', userId)
          .single()

        if (profileError) throw profileError

        setProfile(profileData)

        // Buscar tag existente (se currentUserId estiver disponível)
        if (currentUserId) {
          const { data: tagData } = await supabase
            .from('user_tags')
            .select('*')
            .eq('user_id', currentUserId)
            .eq('tagged_user_id', userId)
            .maybeSingle()

          if (tagData) {
            setTag(tagData)
            setTagName(tagData.tag_name)
            setTagColor(tagData.tag_color)
          } else {
            setTag(null)
            setTagName('')
            setTagColor('#3b82f6')
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
        toast.error('Erro ao carregar perfil do usuário')
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [open, userId, currentUserId])

  const handleSaveTag = async () => {
    if (!currentUserId || !userId) return
    if (!tagName.trim()) {
      toast.error('Digite um nome para a tag')
      return
    }

    setSavingTag(true)
    try {
      const { error } = await supabase.from('user_tags').upsert(
        {
          user_id: currentUserId,
          tagged_user_id: userId,
          tag_name: tagName.trim(),
          tag_color: tagColor,
        },
        {
          onConflict: 'user_id,tagged_user_id',
        }
      )

      if (error) throw error

      toast.success('Tag salva com sucesso!')

      // Atualizar estado local
      const { data: newTag } = await supabase
        .from('user_tags')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('tagged_user_id', userId)
        .single()

      if (newTag) setTag(newTag)
    } catch (err) {
      console.error('Error saving tag:', err)
      toast.error('Erro ao salvar tag')
    } finally {
      setSavingTag(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Perfil do Usuário</DialogTitle>
          <DialogDescription>
            Informações e configurações do usuário
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Avatar e Nome */}
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{profile.name}</h3>
              {tag && (
                <Badge
                  className="mt-2"
                  style={{
                    backgroundColor: tag.tag_color,
                    color: '#ffffff',
                  }}
                >
                  {tag.tag_name}
                </Badge>
              )}
            </div>

            {/* Informações */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile.email}</span>
              </div>
              {profile.role && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.role}</span>
                </div>
              )}
            </div>

            {/* Ações de Chamada */}
            {onStartAudioCall && onStartVideoCall && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onStartAudioCall()
                    onOpenChange(false)
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onStartVideoCall()
                    onOpenChange(false)
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Vídeo
                </Button>
              </div>
            )}

            {/* Seção de Tags */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">Tag Personalizada</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="tag-name">Nome da Tag</Label>
                  <Input
                    id="tag-name"
                    placeholder="Ex: Cliente VIP, Gerente, etc."
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    maxLength={30}
                  />
                </div>
                <div>
                  <Label htmlFor="tag-color">Cor da Tag</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="tag-color"
                      type="color"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveTag}
                  disabled={savingTag || !tagName.trim()}
                  className="w-full"
                >
                  {savingTag ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Tag
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Usuário não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
