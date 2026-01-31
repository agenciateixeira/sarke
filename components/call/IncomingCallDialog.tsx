'use client'

import { Phone, PhoneOff, Video, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Call } from '@/types/webrtc'

interface IncomingCallDialogProps {
  call: Call | null
  callerName: string
  callerAvatar?: string
  onAccept: () => void
  onReject: () => void
}

export function IncomingCallDialog({
  call,
  callerName,
  callerAvatar,
  onAccept,
  onReject,
}: IncomingCallDialogProps) {
  if (!call) return null

  const getCallTypeText = () => {
    switch (call.type) {
      case 'audio':
        return 'Chamada de Áudio'
      case 'video':
        return 'Chamada de Vídeo'
      case 'screen':
        return 'Compartilhamento de Tela'
      default:
        return 'Chamada'
    }
  }

  const getCallIcon = () => {
    switch (call.type) {
      case 'audio':
        return <Mic className="h-12 w-12 text-primary" />
      case 'video':
        return <Video className="h-12 w-12 text-primary" />
      default:
        return <Phone className="h-12 w-12 text-primary" />
    }
  }

  return (
    <Dialog open={!!call} onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getCallTypeText()}</DialogTitle>
          <DialogDescription>
            {callerName} está te ligando
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Avatar */}
          <Avatar className="h-24 w-24">
            <AvatarImage src={callerAvatar} />
            <AvatarFallback className="text-2xl">
              {callerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Call Icon */}
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            {getCallIcon()}
          </div>

          {/* Caller Name */}
          <div className="text-center">
            <p className="text-lg font-semibold">{callerName}</p>
            <p className="text-sm text-muted-foreground">{getCallTypeText()}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 gap-2"
              onClick={onReject}
            >
              <PhoneOff className="h-5 w-5" />
              Recusar
            </Button>
            <Button
              variant="default"
              size="lg"
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              onClick={onAccept}
            >
              <Phone className="h-5 w-5" />
              Aceitar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
