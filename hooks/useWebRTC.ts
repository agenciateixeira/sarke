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

  // =============================================
  // GET CURRENT USER
  // =============================================

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()

    // Criar elemento de áudio para toque (ringtone)
    // Usa um beep simples via Data URL
    const ringtone = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NXbXp66hWFQpGn+DyvmwhBTGH0fPTgjMGHm7A7+OZ')
    ringtone.loop = true
    ringtoneRef.current = ringtone
  }, [])

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
      // Parar ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.pause()
        ringtoneRef.current.currentTime = 0
      }

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
      // Parar ringtone
      if (ringtoneRef.current) {
        ringtoneRef.current.pause()
        ringtoneRef.current.currentTime = 0
      }

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

          // Tocar ringtone
          if (ringtoneRef.current) {
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
          if (activeCall?.id === updatedCall.id) {
            setCallStatus(updatedCall.status)
            if (updatedCall.status === 'rejected' || updatedCall.status === 'ended') {
              endCall()
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
