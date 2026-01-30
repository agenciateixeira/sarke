'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string
  userName: string
  onUploadComplete: (url: string) => void
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
  onUploadComplete,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido', {
        description: 'Apenas imagens JPG, PNG, WEBP e GIF são permitidas',
      })
      return
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo é 5MB',
      })
      return
    }

    setUploading(true)

    try {
      // Criar preview local
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Fazer upload para o Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(data.path)

      // Atualizar perfil com nova URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      onUploadComplete(publicUrl)
      toast.success('Foto atualizada com sucesso!')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      toast.error('Erro ao fazer upload', { description: error.message })
      setPreviewUrl(currentAvatarUrl || null)
    } finally {
      setUploading(false)
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return

    setUploading(true)

    try {
      // Extrair path do URL
      const urlParts = currentAvatarUrl.split('/')
      const pathIndex = urlParts.indexOf('avatars')
      const filePath = urlParts.slice(pathIndex + 1).join('/')

      // Deletar do storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath])

      if (deleteError) throw deleteError

      // Atualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId)

      if (updateError) throw updateError

      setPreviewUrl(null)
      onUploadComplete('')
      toast.success('Foto removida com sucesso!')
    } catch (error: any) {
      console.error('Error removing avatar:', error)
      toast.error('Erro ao remover foto', { description: error.message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-32 w-32 ring-4 ring-primary/20">
        {previewUrl ? (
          <AvatarImage src={previewUrl} alt={userName} />
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
            {getInitials(userName)}
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Escolher Foto
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading}
          >
            <X className="mr-2 h-4 w-4" />
            Remover
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Formatos aceitos: JPG, PNG, WEBP, GIF. Tamanho máximo: 5MB
      </p>
    </div>
  )
}
