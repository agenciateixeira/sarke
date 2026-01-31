'use client'

import { Phone, Video, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CallType } from '@/types/webrtc'

interface CallButtonProps {
  recipientId: string
  recipientName: string
  onStartCall: (type: CallType) => void
  disabled?: boolean
}

export function CallButton({ recipientId, recipientName, onStartCall, disabled }: CallButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <Phone className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onStartCall('audio')}>
          <Phone className="mr-2 h-4 w-4" />
          Chamada de Áudio
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStartCall('video')}>
          <Video className="mr-2 h-4 w-4" />
          Chamada de Vídeo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStartCall('screen')}>
          <Monitor className="mr-2 h-4 w-4" />
          Compartilhar Tela
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
