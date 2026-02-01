'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Call,
  CallType,
  CallStatus,
  WebRTCSignal,
  CreateCallData,
  SendSignalData,
} from '@/types/webrtc'
import { RealtimeChannel } from '@supabase/supabase-js'

// Configuração dos servidores ICE (STUN/TURN)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Servidor STUN público do Google (grátis)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TODO: Adicionar servidor TURN próprio para produção
    // { urls: 'turn:seu-servidor.com', username: 'user', credential: 'pass' }
  ],
}

// Função auxiliar para converter AudioBuffer para WAV
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44
  const arrayBuffer = new ArrayBuffer(length)
  const view = new DataView(arrayBuffer)
  const channels: Float32Array[] = []
  let pos = 0

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true)
    pos += 2
  }
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true)
    pos += 4
  }

  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8)
  setUint32(0x45564157) // "WAVE"
  setUint32(0x20746d66) // "fmt "
  setUint32(16)
  setUint16(1)
  setUint16(buffer.numberOfChannels)
  setUint32(buffer.sampleRate)
  setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels)
  setUint16(buffer.numberOfChannels * 2)
  setUint16(16)
  setUint32(0x61746164) // "data"
  setUint32(length - pos - 4)

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  let offset = pos
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return arrayBuffer
}

export function useWebRTC() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeCall, setActiveCall] = useState<Call | null>(null)
  const [incomingCall, setIncomingCall] = useState<Call | null>(null)
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null)

  // Refs para WebRTC
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const remoteStream = useRef<MediaStream | null>(null)

  // Refs para elementos de vídeo (serão passados para componentes)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  // Channels do Realtime
  const callsChannel = useRef<RealtimeChannel | null>(null)
  const signalsChannel = useRef<RealtimeChannel | null>(null)

  // Audio de toque para chamada recebida
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)

  // Audio de ringback (som para quem está ligando)
  const ringbackRef = useRef<HTMLAudioElement | null>(null)

  // Timeout para chamadas não atendidas (30 segundos)
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Flag para controlar se os áudios já foram criados
  const [audioInitialized, setAudioInitialized] = useState(false)

  // Função para parar TODOS os áudios forçadamente
  const stopAllAudio = useCallback(() => {
    // Parar ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
      ringtoneRef.current.currentTime = 0
      ringtoneRef.current.src = '' // Limpar source
    }

    // Parar ringback
    if (ringbackRef.current) {
      ringbackRef.current.pause()
      ringbackRef.current.currentTime = 0
      ringbackRef.current.src = '' // Limpar source
    }

    // Cancelar timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
  }, [])

  // =============================================
  // GET CURRENT USER
  // =============================================

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()

    // Cleanup quando componente desmontar
    return () => {
      stopAllAudio()
    }
  }, [stopAllAudio])

  // =============================================
  // INICIALIZAR PEER CONNECTION
  // =============================================

  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) return peerConnection.current

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Quando ICE candidate for gerado
    pc.onicecandidate = async (event) => {
      if (event.candidate && activeCall) {
        await sendSignal({
          call_id: activeCall.id,
          to_user_id: activeCall.caller_id === currentUserId ? activeCall.receiver_id : activeCall.caller_id,
          signal_type: 'ice-candidate',
          signal_data: event.candidate.toJSON(),
        })
      }
    }

    // Quando receber stream remoto
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStream.current = event.streams[0]
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }
    }

    // Monitorar estado da conexão
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        toast.error('Conexão perdida')
        endCall()
      }
    }

    peerConnection.current = pc
    return pc
  }, [activeCall, currentUserId])

  // =============================================
  // GET LOCAL MEDIA (ÁUDIO/VÍDEO)
  // =============================================

  const getLocalMedia = useCallback(async (type: CallType) => {
    try {
      let constraints: MediaStreamConstraints = {}

      if (type === 'audio') {
        constraints = { audio: true, video: false }
      } else if (type === 'video') {
        constraints = { audio: true, video: true }
      } else if (type === 'screen') {
        // Compartilhamento de tela
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        localStream.current = screenStream
        return screenStream
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStream.current = stream

      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream
      }

      return stream
    } catch (err) {
      console.error('Error getting local media:', err)
      toast.error('Erro ao acessar câmera/microfone')
      throw err
    }
  }, [])

  // =============================================
  // START CALL (CALLER)
  // =============================================

  const startCall = async (data: CreateCallData): Promise<Call | null> => {
    if (!currentUserId) return null

    try {
      // Obter mídia local
      await getLocalMedia(data.type)

      // Criar chamada no banco
      const { data: newCall, error } = await supabase
        .from('calls')
        .insert({
          caller_id: currentUserId,
          receiver_id: data.receiver_id,
          type: data.type,
          status: 'calling',
        })
        .select()
        .single()

      if (error) throw error

      setActiveCall(newCall)
      setCallStatus('calling')

      // Inicializar peer connection
      const pc = initializePeerConnection()

      // Adicionar tracks locais
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current!)
        })
      }

      // Criar offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Enviar offer via sinalização
      await sendSignal({
        call_id: newCall.id,
        to_user_id: data.receiver_id,
        signal_type: 'offer',
        signal_data: offer,
      })

      // Criar e tocar ringback (som de "chamando...") para quem está ligando
      // Tom simples: beep curto a cada 3 segundos
      if (!ringbackRef.current) {
        // Criar contexto de áudio para gerar tom simples
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const sampleRate = audioContext.sampleRate
          const duration = 3 // 3 segundos: beep + pausa
          const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
          const data = buffer.getChannelData(0)

          // Gerar beep de 0.5s no início
          for (let i = 0; i < sampleRate * 0.5; i++) {
            const t = i / sampleRate
            data[i] = Math.sin(2 * Math.PI * 440 * t) * 0.2 // 440Hz, volume 20%
          }

          // Resto é silêncio (já está zerado)

          // Converter para áudio
          const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate)
          const source = offlineContext.createBufferSource()
          source.buffer = buffer
          source.connect(offlineContext.destination)
          source.start()

          offlineContext.startRendering().then((renderedBuffer) => {
            const wav = audioBufferToWav(renderedBuffer)
            const blob = new Blob([wav], { type: 'audio/wav' })
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.loop = true
            ringbackRef.current = audio

            audio.play().catch((err) => {
              console.log('Não foi possível tocar o ringback:', err)
            })
          })
        } catch (err) {
          console.error('Erro ao criar ringback:', err)
        }
      } else {
        // Se já existe, apenas tocar
        ringbackRef.current.currentTime = 0
        ringbackRef.current.play().catch((err) => {
          console.log('Não foi possível tocar o ringback:', err)
        })
      }

      // Timeout de 30 segundos - marcar como "missed" se não atender
      callTimeoutRef.current = setTimeout(async () => {
        if (activeCall?.id === newCall.id && activeCall.status === 'calling') {
          // Parar TODOS os áudios
          stopAllAudio()

          // Buscar nome do usuário que não atendeu
          const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', data.receiver_id)
            .single()

          const receiverName = receiverProfile?.name || 'o usuário'

          // Marcar como missed
          await supabase
            .from('calls')
            .update({ status: 'missed', ended_at: new Date().toISOString() })
            .eq('id', newCall.id)

          endCall()

          // Mensagem personalizada
          toast.error('Chamada não concluída', {
            description: `Sua ligação não pode ser concluída, ${receiverName} está offline. Tente mais tarde.`,
            duration: 5000,
          })
        }
      }, 30000) // 30 segundos

      toast.success('Chamando...')
      return newCall
    } catch (err) {
      console.error('Error starting call:', err)
      toast.error('Erro ao iniciar chamada')
      return null
    }
  }

  // =============================================
  // ACCEPT CALL (RECEIVER)
  // =============================================

  const acceptCall = async (call: Call) => {
    if (!currentUserId) return

    try {
      // Parar TODOS os áudios
      stopAllAudio()

      // Obter mídia local
      await getLocalMedia(call.type)

      setActiveCall(call)
      setCallStatus('accepted')
      setIncomingCall(null)

      // Atualizar status no banco
      await supabase
        .from('calls')
        .update({ status: 'accepted', started_at: new Date().toISOString() })
        .eq('id', call.id)

      // Inicializar peer connection
      const pc = initializePeerConnection()

      // Adicionar tracks locais
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current!)
        })
      }

      // Buscar offer do caller
      const { data: signals } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('call_id', call.id)
        .eq('signal_type', 'offer')
        .order('created_at', { ascending: false })
        .limit(1)

      if (signals && signals.length > 0) {
        const offerSignal = signals[0]
        await pc.setRemoteDescription(new RTCSessionDescription(offerSignal.signal_data as RTCSessionDescriptionInit))

        // Criar answer
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Enviar answer
        await sendSignal({
          call_id: call.id,
          to_user_id: call.caller_id,
          signal_type: 'answer',
          signal_data: answer,
        })
      }

      toast.success('Chamada aceita!')
    } catch (err) {
      console.error('Error accepting call:', err)
      toast.error('Erro ao aceitar chamada')
    }
  }

  // =============================================
  // REJECT CALL
  // =============================================

  const rejectCall = async (call: Call) => {
    try {
      // Parar TODOS os áudios
      stopAllAudio()

      await supabase
        .from('calls')
        .update({ status: 'rejected', ended_at: new Date().toISOString() })
        .eq('id', call.id)

      // Criar mensagem de chamada recusada
      await createCallMessage({ ...call, status: 'rejected' }, 0)

      setIncomingCall(null)
      toast.info('Chamada recusada')
    } catch (err) {
      console.error('Error rejecting call:', err)
    }
  }

  // =============================================
  // END CALL
  // =============================================

  const endCall = async () => {
    if (!activeCall) return

    try {
      // Parar TODOS os áudios
      stopAllAudio()

      // Finalizar chamada no banco via RPC
      const { data: result } = await supabase.rpc('end_call', {
        p_call_id: activeCall.id,
        p_user_id: currentUserId,
      })

      // Criar mensagem automática no chat sobre a chamada
      await createCallMessage(activeCall, result?.duration || 0)

      // Parar tracks locais
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop())
        localStream.current = null
      }

      // Fechar peer connection
      if (peerConnection.current) {
        peerConnection.current.close()
        peerConnection.current = null
      }

      setActiveCall(null)
      setCallStatus(null)

      toast.info('Chamada finalizada')
    } catch (err) {
      console.error('Error ending call:', err)
      toast.error('Erro ao finalizar chamada')
    }
  }

  // =============================================
  // CREATE CALL MESSAGE (automática no chat)
  // =============================================

  const createCallMessage = async (call: Call, duration: number) => {
    if (!currentUserId) return

    try {
      // Determinar o tipo e status da chamada
      const callTypeText = call.type === 'audio' ? '📞 Áudio' : call.type === 'video' ? '📹 Vídeo' : '🖥️ Tela'

      let messageContent = ''

      if (call.status === 'rejected') {
        messageContent = `${callTypeText} - Chamada recusada`
      } else if (call.status === 'missed') {
        messageContent = `${callTypeText} - Chamada perdida`
      } else if (call.status === 'ended' && duration > 0) {
        const mins = Math.floor(duration / 60)
        const secs = duration % 60
        const durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
        messageContent = `${callTypeText} - Chamada concluída (${durationText})`
      } else {
        messageContent = `${callTypeText} - Chamada finalizada`
      }

      // Determinar recipient_id (quem não é o currentUser)
      const recipientId = call.caller_id === currentUserId ? call.receiver_id : call.caller_id

      // Criar mensagem no chat
      await supabase.from('messages').insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        content: messageContent,
        group_id: null,
      })
    } catch (err) {
      console.error('Error creating call message:', err)
    }
  }

  // =============================================
  // SEND SIGNAL (OFFER/ANSWER/ICE)
  // =============================================

  const sendSignal = async (data: SendSignalData) => {
    if (!currentUserId) return

    try {
      await supabase.from('webrtc_signals').insert({
        call_id: data.call_id,
        from_user_id: currentUserId,
        to_user_id: data.to_user_id,
        signal_type: data.signal_type,
        signal_data: data.signal_data,
      })
    } catch (err) {
      console.error('Error sending signal:', err)
    }
  }

  // =============================================
  // TOGGLE MUTE/VIDEO
  // =============================================

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
      }
    }
  }

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
      }
    }
  }

  // =============================================
  // REALTIME - LISTEN TO CALLS
  // =============================================

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('calls-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newCall = payload.new as Call
          setIncomingCall(newCall)

          // Criar e tocar ringtone (se não existir)
          if (!ringtoneRef.current) {
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
              const sampleRate = audioContext.sampleRate
              const duration = 2 // 2 segundos: ring curto + pausa
              const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)
              const data = buffer.getChannelData(0)

              // Gerar 2 rings curtos (0.2s cada) com pausa entre eles
              // Ring 1: 0 a 0.2s
              for (let i = 0; i < sampleRate * 0.2; i++) {
                const t = i / sampleRate
                const wave1 = Math.sin(2 * Math.PI * 480 * t)
                const wave2 = Math.sin(2 * Math.PI * 620 * t)
                data[i] = (wave1 + wave2) * 0.15 // Dual tone, volume 15%
              }

              // Pausa: 0.2s a 0.4s (já está zerado)

              // Ring 2: 0.4s a 0.6s
              for (let i = sampleRate * 0.4; i < sampleRate * 0.6; i++) {
                const t = (i - sampleRate * 0.4) / sampleRate
                const wave1 = Math.sin(2 * Math.PI * 480 * t)
                const wave2 = Math.sin(2 * Math.PI * 620 * t)
                data[i] = (wave1 + wave2) * 0.15
              }

              // Resto é silêncio

              const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate)
              const source = offlineContext.createBufferSource()
              source.buffer = buffer
              source.connect(offlineContext.destination)
              source.start()

              offlineContext.startRendering().then((renderedBuffer) => {
                const wav = audioBufferToWav(renderedBuffer)
                const blob = new Blob([wav], { type: 'audio/wav' })
                const url = URL.createObjectURL(blob)
                const audio = new Audio(url)
                audio.loop = true
                ringtoneRef.current = audio

                audio.play().catch((err) => {
                  console.log('Não foi possível tocar o ringtone:', err)
                })
              })
            } catch (err) {
              console.error('Erro ao criar ringtone:', err)
            }
          } else {
            // Se já existe, apenas tocar
            ringtoneRef.current.currentTime = 0
            ringtoneRef.current.play().catch((err) => {
              console.log('Não foi possível tocar o ringtone:', err)
            })
          }

          toast.info('📞 Chamada recebida!')

          // Notificação do navegador (se permitido)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Chamada recebida', {
              body: `Chamada de ${newCall.type === 'video' ? 'vídeo' : 'áudio'}`,
              icon: '/logo.png',
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
        },
        (payload) => {
          const updatedCall = payload.new as Call

          // Se a chamada for atualizada (rejected, ended, missed), parar áudios
          if (updatedCall.status === 'rejected' || updatedCall.status === 'ended' || updatedCall.status === 'missed') {
            stopAllAudio()
          }

          if (activeCall?.id === updatedCall.id) {
            setCallStatus(updatedCall.status)
            if (updatedCall.status === 'rejected' || updatedCall.status === 'ended') {
              endCall()
            }
          }

          // Se for incomingCall que foi rejeitada/finalizada, limpar
          if (incomingCall?.id === updatedCall.id) {
            if (updatedCall.status === 'rejected' || updatedCall.status === 'ended' || updatedCall.status === 'missed') {
              setIncomingCall(null)
            }
          }
        }
      )
      .subscribe()

    callsChannel.current = channel

    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, activeCall])

  // =============================================
  // REALTIME - LISTEN TO SIGNALS
  // =============================================

  useEffect(() => {
    if (!currentUserId || !activeCall) return

    const channel = supabase
      .channel(`signals-${activeCall.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `to_user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const signal = payload.new as WebRTCSignal
          const pc = peerConnection.current

          if (!pc) return

          if (signal.signal_type === 'offer') {
            // Receiver recebe offer
            await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data as RTCSessionDescriptionInit))
          } else if (signal.signal_type === 'answer') {
            // Caller recebe answer
            await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data as RTCSessionDescriptionInit))
          } else if (signal.signal_type === 'ice-candidate') {
            // Ambos recebem ICE candidates
            await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data as RTCIceCandidateInit))
          }
        }
      )
      .subscribe()

    signalsChannel.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, activeCall])

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    activeCall,
    incomingCall,
    callStatus,
    currentUserId,

    // Refs (para componentes)
    localVideoRef,
    remoteVideoRef,
    localStream: localStream.current,
    remoteStream: remoteStream.current,

    // Actions
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  }
}
