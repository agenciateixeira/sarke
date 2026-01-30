'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { TaskAttachment } from '@/types/tasks'
import { supabase } from '@/lib/supabase'
import {
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Eye,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TaskAttachmentsProps {
  taskId: string
  attachments: TaskAttachment[]
  onRefresh: () => void
}

export function TaskAttachments({ taskId, attachments, onRefresh }: TaskAttachmentsProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      for (const file of Array.from(files)) {
        // Upload para o Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `task-attachments/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Salvar registro no banco
        const { error: dbError } = await supabase
          .from('task_attachments')
          .insert({
            task_id: taskId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user?.id,
          })

        if (dbError) throw dbError
      }

      toast.success(`${files.length} arquivo(s) enviado(s) com sucesso!`)
      onRefresh()
    } catch (err) {
      console.error('Error uploading file:', err)
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (attachment: TaskAttachment) => {
    if (!confirm(`Excluir o arquivo "${attachment.file_name}"?`)) return

    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([attachment.file_path])

      if (storageError) throw storageError

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachment.id)

      if (dbError) throw dbError

      toast.success('Arquivo excluído!')
      onRefresh()
    } catch (err) {
      console.error('Error deleting file:', err)
      toast.error('Erro ao excluir arquivo')
    }
  }

  const handlePreview = async (attachment: TaskAttachment) => {
    try {
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(attachment.file_path)

      if (!data.publicUrl) {
        toast.error('Não foi possível gerar URL de visualização')
        return
      }

      const fileType = attachment.file_type || ''

      if (fileType.startsWith('image/')) {
        setPreviewType('image')
        setPreviewUrl(data.publicUrl)
      } else if (fileType === 'application/pdf') {
        setPreviewType('pdf')
        setPreviewUrl(data.publicUrl)
      } else {
        // Para outros tipos, fazer download
        window.open(data.publicUrl, '_blank')
      }
    } catch (err) {
      console.error('Error previewing file:', err)
      toast.error('Erro ao visualizar arquivo')
    }
  }

  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(attachment.file_path)

      if (!data.publicUrl) {
        toast.error('Não foi possível baixar o arquivo')
        return
      }

      const link = document.createElement('a')
      link.href = data.publicUrl
      link.download = attachment.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Download iniciado!')
    } catch (err) {
      console.error('Error downloading file:', err)
      toast.error('Erro ao baixar arquivo')
    }
  }

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-4 w-4" />

    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />

    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Anexos ({attachments.length})
        </Label>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id={`file-upload-${taskId}`}
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
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Arquivo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Lista de anexos */}
      {attachments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Nenhum anexo ainda</p>
          <p className="text-xs mt-1">Clique em "Adicionar Arquivo" para fazer upload</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
              >
                {/* Ícone do tipo de arquivo */}
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.file_type)}
                </div>

                {/* Info do arquivo */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePreview(attachment)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(attachment)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => {
            setPreviewUrl(null)
            setPreviewType(null)
          }}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => {
                setPreviewUrl(null)
                setPreviewType(null)
              }}
            >
              <X className="h-6 w-6" />
            </Button>

            {previewType === 'image' && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[90vh] mx-auto rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {previewType === 'pdf' && (
              <iframe
                src={previewUrl}
                className="w-full h-[90vh] rounded-lg bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
