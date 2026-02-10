'use client'

import { useEffect, useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Call, CallStatus } from '@/types/webrtc'

interface CallScreenProps {
  call: Call
  callStatus: CallStatus | null
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  remoteAudioRef: React.RefObject<HTMLAudioElement>
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
  remoteAudioRef,
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

  useEffect(() => {
    if (callStatus === 'accepted') {
      const interval = setInterval(() => setCallDuration(d => d + 1), 1000)
      return () => clearInterval(interval)
    }
  }, [callStatus])

  const handleToggleMute = () => { onToggleMute(); setIsMuted(!isMuted) }
  const handleToggleVideo = () => { onToggleVideo(); setIsVideoOff(!isVideoOff) }

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const statusText = callStatus === 'calling' ? 'Chamando...'
    : callStatus === 'ringing' ? 'Tocando...'
    : callStatus === 'accepted' ? formatDuration(callDuration)
    : 'Conectando...'

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">

      {/* ── Elemento de áudio remoto — SEMPRE no DOM, oculto ── */}
      {/* Precisa estar no JSX (não criado dinamicamente) para o Chrome permitir autoplay */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      {/* Vídeo remoto em tela cheia (só videochamada conectada) */}
      {isVideo && callStatus === 'accepted' && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Avatar + nome + status — visível durante áudio ou enquanto conecta */}
      {(!isVideo || callStatus !== 'accepted') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-gray-900 to-black">
          {remoteAvatar ? (
            <img
              src={remoteAvatar}
              alt={remoteName}
              className="h-28 w-28 rounded-full object-cover border-4 border-white/20"
            />
          ) : (
            <div className="h-28 w-28 rounded-full bg-primary/30 flex items-center justify-center border-4 border-white/20">
              <span className="text-5xl font-bold text-white">
                {(remoteName || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="text-center">
            <p className="text-2xl font-semibold text-white">{remoteName || 'Desconhecido'}</p>
            <p className="text-white/60 text-sm mt-1">{statusText}</p>
          </div>
        </div>
      )}

      {/* Nome + timer sobrepostos no vídeo (videochamada conectada) */}
      {isVideo && callStatus === 'accepted' && (
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-white font-semibold text-sm">{remoteName}</p>
          <p className="text-white/70 text-xs">{statusText}</p>
        </div>
      )}

      {/* Vídeo local (picture-in-picture) */}
      {isVideo && (
        <Card className="absolute top-4 right-4 w-40 h-28 overflow-hidden border-2 border-white/50 z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </Card>
      )}

      {/* Controles */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-5">
        <Button
          size="lg"
          variant={isMuted ? 'destructive' : 'secondary'}
          className="rounded-full h-14 w-14"
          onClick={handleToggleMute}
          title={isMuted ? 'Ativar microfone' : 'Mutar'}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          size="lg"
          variant="destructive"
          className="rounded-full h-16 w-16"
          onClick={onEndCall}
          title="Encerrar chamada"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>

        {isVideo && (
          <Button
            size="lg"
            variant={isVideoOff ? 'destructive' : 'secondary'}
            className="rounded-full h-14 w-14"
            onClick={handleToggleVideo}
            title={isVideoOff ? 'Ligar câmera' : 'Desligar câmera'}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
        )}
      </div>
    </div>
  )
}
