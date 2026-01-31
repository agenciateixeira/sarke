'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

interface TaskAttachmentsTabProps {
  taskId: string
}

export function TaskAttachmentsTab({ taskId }: TaskAttachmentsTabProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Buscar anexos
  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
      toast.error('Erro ao carregar anexos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttachments()
  }, [taskId])

  // Upload de arquivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `task-attachments/${fileName}`

        // Upload para o Supabase Storage
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

      toast.success(`${files.length} arquivo(s) enviado(s)!`)
      await fetchAttachments()
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

  // Deletar arquivo
  const handleDelete = async (attachment: TaskAttachment) => {
    if (!confirm(`Excluir "${attachment.file_name}"?`)) return

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

      toast.success('Arquivo excluído')
      await fetchAttachments()
    } catch (err) {
      console.error('Error deleting file:', err)
      toast.error('Erro ao excluir arquivo')
    }
  }

  // Preview
  const handlePreview = async (attachment: TaskAttachment) => {
    try {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(attachment.file_path, 60)

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl)
        if (attachment.file_type.startsWith('image/')) {
          setPreviewType('image')
        } else if (attachment.file_type === 'application/pdf') {
          setPreviewType('pdf')
        } else {
          toast.info('Preview não disponível para este tipo de arquivo')
        }
      }
    } catch (err) {
      console.error('Error previewing file:', err)
      toast.error('Erro ao visualizar arquivo')
    }
  }

  // Download
  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(attachment.file_path, 60)

      if (data?.signedUrl) {
        const a = document.createElement('a')
        a.href = data.signedUrl
        a.download = attachment.file_name
        a.click()
        toast.success('Download iniciado')
      }
    } catch (err) {
      console.error('Error downloading file:', err)
      toast.error('Erro ao fazer download')
    }
  }

  // Ícone do arquivo
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />
    }
    if (fileType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />
    }
    return <File className="h-8 w-8 text-gray-500" />
  }

  // Formatar tamanho
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com botão de upload */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Anexos ({attachments.length})</h3>
        <div>
          <input
            type="file"
            ref={fileInputRef}
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
        <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum anexo ainda</p>
          <p className="text-xs mt-1">Clique em "Adicionar Arquivo" para fazer upload</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-shrink-0">
                  {getFileIcon(attachment.file_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

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
                    className="h-8 w-8 text-destructive hover:text-destructive"
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
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
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
