'use client'

import { useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Call, CallStatus } from '@/types/webrtc'
import { useState } from 'react'

interface CallScreenProps {
  call: Call
  callStatus: CallStatus | null
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  isVideo: boolean
  remoteName?: string
  remoteAvatar?: string
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
}

export function CallScreen({
  call,
  callStatus,
  localVideoRef,
  remoteVideoRef,
  isVideo,
  remoteName,
  remoteAvatar,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: CallScreenProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  // Timer de duração
  useEffect(() => {
    if (callStatus === 'accepted') {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [callStatus])

  const handleToggleMute = () => {
    onToggleMute()
    setIsMuted(!isMuted)
  }

  const handleToggleVideo = () => {
    onToggleVideo()
    setIsVideoOff(!isVideoOff)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'Chamando...'
      case 'ringing':
        return 'Tocando...'
      case 'accepted':
        return formatDuration(callDuration)
      default:
        return 'Conectando...'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Vídeo remoto (tela inteira) */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Avatar/Nome — sempre visível em áudio, sobreposto em vídeo enquanto conecta */}
      {(!isVideo || callStatus !== 'accepted') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            {remoteAvatar ? (
              <img
                src={remoteAvatar}
                alt={remoteName}
                className="h-32 w-32 rounded-full object-cover mx-auto mb-4 border-4 border-white/20"
              />
            ) : (
              <div className="h-32 w-32 rounded-full bg-primary/30 flex items-center justify-center mx-auto mb-4 border-4 border-white/20">
                <span className="text-5xl font-bold text-white">
                  {(remoteName || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h2 className="text-2xl font-semibold text-white mb-1">
              {remoteName || 'Desconhecido'}
            </h2>
            <p className="text-white/70 text-sm">{getStatusText()}</p>
          </div>
        </div>
      )}

      {/* Vídeo local (picture-in-picture) */}
      {isVideo && (
        <Card className="absolute top-4 right-4 w-48 h-36 overflow-hidden border-2 border-white">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </Card>
      )}

      {/* Nome + status no topo (visível durante vídeo conectado) */}
      {isVideo && callStatus === 'accepted' && (
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-white font-semibold">{remoteName || 'Chamada de vídeo'}</p>
          <p className="text-white/70 text-xs">{getStatusText()}</p>
        </div>
      )}

      {/* Controles */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        {/* Mute */}
        <Button
          size="lg"
          variant={isMuted ? 'destructive' : 'secondary'}
          className="rounded-full h-16 w-16"
          onClick={handleToggleMute}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        {/* Encerrar */}
        <Button
          size="lg"
          variant="destructive"
          className="rounded-full h-16 w-16"
          onClick={onEndCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>

        {/* Vídeo (apenas se for chamada de vídeo) */}
        {isVideo && (
          <Button
            size="lg"
            variant={isVideoOff ? 'destructive' : 'secondary'}
            className="rounded-full h-16 w-16"
            onClick={handleToggleVideo}
          >
            {isVideoOff ? (
              <VideoOff className="h-6 w-6" />
            ) : (
              <Video className="h-6 w-6" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
