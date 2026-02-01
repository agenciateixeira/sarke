'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, Image as ImageIcon, X, Loader2, Video, Mic } from 'lucide-react'
import { CreateMessageData } from '@/types/chat'
import { toast } from 'sonner'
import { SlashCommandMenu } from './SlashCommandMenu'
import { CreateMeetingDialog } from './CreateMeetingDialog'
import { CreateTaskDialog } from './CreateTaskDialog'

interface MessageInputProps {
  onSendMessage: (data: CreateMessageData) => Promise<void>
  onUploadFile: (file: File) => Promise<string | null>
  onTypingChange: (isTyping: boolean) => void
  groupId?: string
  recipientId?: string
  disabled?: boolean
  currentUserId?: string | null
}

export function MessageInput({
  onSendMessage,
  onUploadFile,
  onTypingChange,
  groupId,
  recipientId,
  disabled = false,
  currentUserId = null,
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachedFileUrl, setAttachedFileUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [isSubtask, setIsSubtask] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Detectar quando usuário digita "/" no início
  useEffect(() => {
    if (message === '/') {
      // Calcular posição do menu
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect()
        setSlashMenuPosition({
          top: rect.top - 200, // Acima do input
          left: rect.left,
        })
        setShowSlashMenu(true)
      }
    } else {
      setShowSlashMenu(false)
    }
  }, [message])

  const handleSlashCommand = (commandId: string) => {
    setMessage('') // Limpar input
    setShowSlashMenu(false)

    switch (commandId) {
      case 'meeting':
        setMeetingDialogOpen(true)
        break
      case 'task':
        setIsSubtask(false)
        setTaskDialogOpen(true)
        break
      case 'subtask':
        setIsSubtask(true)
        setTaskDialogOpen(true)
        break
    }
  }

  const handleTyping = () => {
    onTypingChange(true)

    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Parar de "digitar" após 2 segundos de inatividade
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false)
    }, 2000)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 10MB')
      return
    }

    setAttachedFile(file)

    // Se for imagem, criar preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAttachedFileUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeAttachment = () => {
    setAttachedFile(null)
    setAttachedFileUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
    if (audioInputRef.current) audioInputRef.current.value = ''
  }

  const handleSend = async () => {
    if ((!message.trim() && !attachedFile) || disabled || sending) return

    setSending(true)
    onTypingChange(false)

    try {
      let mediaUrl: string | null = null
      let mediaType: 'image' | 'video' | 'audio' | 'file' | undefined = undefined

      // Upload do arquivo se houver
      if (attachedFile) {
        setUploading(true)
        mediaUrl = await onUploadFile(attachedFile)
        setUploading(false)

        if (!mediaUrl) {
          toast.error('Erro ao fazer upload do arquivo')
          setSending(false)
          return
        }

        // Determinar tipo de mídia
        if (attachedFile.type.startsWith('image/')) {
          mediaType = 'image'
        } else if (attachedFile.type.startsWith('video/')) {
          mediaType = 'video'
        } else if (attachedFile.type.startsWith('audio/')) {
          mediaType = 'audio'
        } else {
          mediaType = 'file'
        }
      }

      // Enviar mensagem
      await onSendMessage({
        content: message.trim() || undefined,
        media_url: mediaUrl || undefined,
        media_type: mediaType,
        group_id: groupId,
        recipient_id: recipientId,
      })

      // Limpar campos
      setMessage('')
      removeAttachment()
      textareaRef.current?.focus()
    } catch (err) {
      console.error('Error sending message:', err)
      toast.error('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sem Shift = enviar
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }

    // Detectar digitação
    handleTyping()
  }

  return (
    <div className="border-t bg-background p-4">
      {/* File Preview */}
      {attachedFile && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border bg-muted p-3">
          {attachedFileUrl && attachedFile.type.startsWith('image/') ? (
            <img src={attachedFileUrl} alt="Preview" className="h-16 w-16 rounded object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-background">
              <Paperclip className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{attachedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(attachedFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={removeAttachment} disabled={uploading}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
        />
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="video/*"
        />
        <input
          type="file"
          ref={audioInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="audio/*"
        />

        {/* Upload Buttons */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled || uploading || sending}
          title="Enviar foto"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => videoInputRef.current?.click()}
          disabled={disabled || uploading || sending}
          title="Enviar vídeo"
        >
          <Video className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => audioInputRef.current?.click()}
          disabled={disabled || uploading || sending}
          title="Enviar áudio"
        >
          <Mic className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || sending}
          title="Enviar arquivo"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Message Textarea */}
        <Textarea
          ref={textareaRef}
          placeholder="Digite uma mensagem..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            handleTyping()
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />

        {/* Send Button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!message.trim() && !attachedFile) || disabled || uploading || sending}
        >
          {uploading || sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Helper Text */}
      <p className="mt-2 text-xs text-muted-foreground">
        Pressione Enter para enviar, Shift + Enter para quebrar linha
      </p>
    </div>
  )
}
