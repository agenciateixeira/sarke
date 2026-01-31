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

      {/* Avatar/Nome quando não é vídeo */}
      {!isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-6xl text-white">
                {call.caller_id?.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Chamada de Áudio
            </h2>
            <p className="text-white/80">{getStatusText()}</p>
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

      {/* Status e duração */}
      {isVideo && (
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-white font-medium">{getStatusText()}</p>
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
