'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Call,
  CallType,
  CallStatus,
  CreateCallData,
} from '@/types/webrtc'
import { RealtimeChannel } from '@supabase/supabase-js'

// =============================================
// CONFIGURAÇÃO ICE (STUN)
// =============================================
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

// =============================================
// GERAR SOM SINTETIZADO (WAV)
// =============================================
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh = buffer.numberOfChannels
  const length = buffer.length * numCh * 2 + 44
  const ab = new ArrayBuffer(length)
  const view = new DataView(ab)
  let pos = 0

  const u16 = (d: number) => { view.setUint16(pos, d, true); pos += 2 }
  const u32 = (d: number) => { view.setUint32(pos, d, true); pos += 4 }

  u32(0x46464952); u32(length - 8); u32(0x45564157)
  u32(0x20746d66); u32(16); u16(1); u16(numCh)
  u32(buffer.sampleRate); u32(buffer.sampleRate * 2 * numCh)
  u16(numCh * 2); u16(16); u32(0x61746164); u32(length - pos - 4)

  const channels: Float32Array[] = []
  for (let i = 0; i < numCh; i++) channels.push(buffer.getChannelData(i))

  let offset = pos
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return ab
}

async function createToneAudio(
  frequencies: number[],
  onDuration: number,
  offDuration: number,
  volume = 0.15
): Promise<HTMLAudioElement> {
  const sampleRate = 44100
  const totalDuration = onDuration + offDuration
  const ctx = new OfflineAudioContext(1, sampleRate * totalDuration, sampleRate)
  const buf = ctx.createBuffer(1, sampleRate * totalDuration, sampleRate)
  const data = buf.getChannelData(0)

  for (let i = 0; i < sampleRate * onDuration; i++) {
    const t = i / sampleRate
    data[i] = frequencies.reduce((sum, f) => sum + Math.sin(2 * Math.PI * f * t), 0) * (volume / frequencies.length)
  }

  const source = ctx.createBufferSource()
  source.buffer = buf
  source.connect(ctx.destination)
  source.start()

  const rendered = await ctx.startRendering()
  const wav = audioBufferToWav(rendered)
  const blob = new Blob([wav], { type: 'audio/wav' })
  const audio = new Audio(URL.createObjectURL(blob))
  audio.loop = true
  return audio
}

// =============================================
// HOOK
// =============================================
interface CallProfile {
  id: string
  name: string
  avatar_url?: string
}

export function useWebRTC() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeCall, setActiveCall] = useState<Call | null>(null)
  const [incomingCall, setIncomingCall] = useState<Call | null>(null)
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null)
  // Perfis dos participantes da chamada
  const [callerProfile, setCallerProfile] = useState<CallProfile | null>(null)
  const [receiverProfile, setReceiverProfile] = useState<CallProfile | null>(null)

  // WebRTC refs
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)

  // Ref com valor atual do activeCall para uso em closures (evita stale closure)
  const activeCallRef = useRef<Call | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  // Video elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  // Broadcast channels
  const callsChannel = useRef<RealtimeChannel | null>(null)
  const signalChannel = useRef<RealtimeChannel | null>(null)

  // Audio
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const ringbackRef = useRef<HTMLAudioElement | null>(null)

  // Timeout
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ICE candidate queue (fix race condition)
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])
  const remoteDescriptionSet = useRef(false)

  // Sincronizar refs com state
  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  // =============================================
  // INIT USER
  // =============================================
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null)
    })
    return () => stopAllAudio()
  }, [])

  // =============================================
  // PARAR TODOS OS ÁUDIOS
  // =============================================
  const stopAllAudio = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
      ringtoneRef.current.currentTime = 0
    }
    if (ringbackRef.current) {
      ringbackRef.current.pause()
      ringbackRef.current.currentTime = 0
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
  }, [])

  // =============================================
  // BUSCAR PERFIS DOS PARTICIPANTES
  // =============================================
  const fetchCallProfiles = useCallback(async (callerId: string, receiverId: string) => {
    const ids = [callerId, receiverId].filter(Boolean)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', ids)
    if (!data) return
    setCallerProfile(data.find((p) => p.id === callerId) ?? null)
    setReceiverProfile(data.find((p) => p.id === receiverId) ?? null)
  }, [])

  // =============================================
  // LIMPAR RECURSOS WEBRTC
  // =============================================
  const cleanupCallResources = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop())
      localStream.current = null
    }
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }
    pendingCandidates.current = []
    remoteDescriptionSet.current = false
    setActiveCall(null)
    setCallStatus(null)
    setIncomingCall(null)
    setCallerProfile(null)
    setReceiverProfile(null)
  }, [])

  // =============================================
  // APLICAR ICE CANDIDATE (com queue)
  // =============================================
  const applyIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnection.current
    if (!pc) return

    if (!remoteDescriptionSet.current) {
      // Encaminhar para fila até remoteDescription estar pronta
      pendingCandidates.current.push(candidate)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('addIceCandidate error (ignorado):', err)
    }
  }, [])

  // Flush da fila de ICE candidates
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnection.current
    if (!pc) return

    const candidates = [...pendingCandidates.current]
    pendingCandidates.current = []

    for (const c of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c))
      } catch (err) {
        console.warn('flushPendingCandidates error (ignorado):', err)
      }
    }
  }, [])

  // =============================================
  // OBTER MÍDIA LOCAL
  // =============================================
  const getLocalMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    try {
      let stream: MediaStream

      if (type === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        })
      }

      localStream.current = stream

      if (localVideoRef.current && type !== 'audio') {
        localVideoRef.current.srcObject = stream
      }

      return stream
    } catch (err) {
      console.error('Erro ao obter mídia local:', err)
      toast.error('Erro ao acessar câmera/microfone. Verifique as permissões.')
      throw err
    }
  }, [])

  // =============================================
  // CRIAR PEER CONNECTION
  // =============================================
  // Ref para endCall (evitar dependência circular)
  const endCallRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const createPeerConnection = useCallback((callId: string, remoteUserId: string) => {
    // Fechar conexão anterior se existir
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Enviar ICE candidates via Broadcast (mais rápido que DB)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalChannel.current?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            call_id: callId,
            to_user_id: remoteUserId,
            from_user_id: currentUserIdRef.current,
            candidate: event.candidate.toJSON(),
          },
        })
      }
    }

    // Stream remoto recebido
    pc.ontrack = (event) => {
      if (event.streams?.[0] && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    // Monitorar estado da conexão
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('[WebRTC] Connection state:', state)
      if (state === 'failed') {
        toast.error('Conexão falhou. Verifique sua rede.')
        endCallRef.current()
      } else if (state === 'disconnected') {
        toast.warning('Conexão instável...')
      } else if (state === 'connected') {
        stopAllAudio()
      }
    }

    peerConnection.current = pc
    return pc
  }, [stopAllAudio])

  // =============================================
  // ENVIAR SINAL VIA BROADCAST
  // =============================================
  const sendSignalBroadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    signalChannel.current?.send({
      type: 'broadcast',
      event,
      payload,
    })
  }, [])

  // =============================================
  // INICIAR CHAMADA (CALLER)
  // =============================================
  const startCall = async (data: CreateCallData): Promise<Call | null> => {
    const userId = currentUserIdRef.current
    if (!userId) return null

    try {
      // Obter mídia antes de criar a chamada
      await getLocalMedia(data.type)

      // Criar registro da chamada no banco
      const { data: newCall, error } = await supabase
        .from('calls')
        .insert({
          caller_id: userId,
          receiver_id: data.receiver_id,
          type: data.type,
          status: 'calling',
        })
        .select()
        .single()

      if (error) throw error

      setActiveCall(newCall)
      setCallStatus('calling')

      // Buscar perfis dos participantes
      await fetchCallProfiles(userId, data.receiver_id)

      // Criar PeerConnection
      const pc = createPeerConnection(newCall.id, data.receiver_id)

      // Adicionar tracks locais
      localStream.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!)
      })

      // Criar offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Enviar offer via Broadcast
      sendSignalBroadcast('offer', {
        call_id: newCall.id,
        to_user_id: data.receiver_id,
        from_user_id: userId,
        sdp: offer,
      })

      // Tocar ringback
      if (!ringbackRef.current) {
        ringbackRef.current = await createToneAudio([440], 0.5, 2.5, 0.2).catch(() => null as any)
      }
      ringbackRef.current?.play().catch(() => null)

      // Timeout de 30 segundos
      callTimeoutRef.current = setTimeout(async () => {
        const call = activeCallRef.current
        if (call?.id === newCall.id) {
          stopAllAudio()
          await supabase
            .from('calls')
            .update({ status: 'missed', ended_at: new Date().toISOString() })
            .eq('id', newCall.id)

          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', data.receiver_id)
            .single()

          cleanupCallResources()
          toast.error('Chamada não atendida', {
            description: `${profile?.name || 'O usuário'} não está disponível.`,
          })
        }
      }, 30000)

      return newCall
    } catch (err) {
      console.error('Erro ao iniciar chamada:', err)
      toast.error('Não foi possível iniciar a chamada')
      cleanupCallResources()
      return null
    }
  }

  // =============================================
  // ACEITAR CHAMADA (RECEIVER)
  // =============================================
  const acceptCall = async (call: Call) => {
    const userId = currentUserIdRef.current
    if (!userId) return

    try {
      stopAllAudio()

      await getLocalMedia(call.type)

      setActiveCall(call)
      setCallStatus('accepted')
      setIncomingCall(null)

      // Atualizar banco
      await supabase
        .from('calls')
        .update({ status: 'accepted', started_at: new Date().toISOString() })
        .eq('id', call.id)

      // Criar PeerConnection
      const pc = createPeerConnection(call.id, call.caller_id)

      // Adicionar tracks locais
      localStream.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current!)
      })

      // Buscar offer (pode ter chegado via broadcast antes de aceitar)
      // Tentar via banco como fallback
      const { data: signals } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('call_id', call.id)
        .eq('signal_type', 'offer')
        .order('created_at', { ascending: false })
        .limit(1)

      if (signals && signals.length > 0) {
        const offerData = signals[0].signal_data as RTCSessionDescriptionInit
        await pc.setRemoteDescription(new RTCSessionDescription(offerData))
        remoteDescriptionSet.current = true
        await flushPendingCandidates()

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Enviar answer via Broadcast E salvar no banco como fallback
        sendSignalBroadcast('answer', {
          call_id: call.id,
          to_user_id: call.caller_id,
          from_user_id: userId,
          sdp: answer,
        })

        // Salvar no banco como fallback
        await supabase.from('webrtc_signals').insert({
          call_id: call.id,
          from_user_id: userId,
          to_user_id: call.caller_id,
          signal_type: 'answer',
          signal_data: answer,
        })
      }

      toast.success('Chamada aceita!')
    } catch (err) {
      console.error('Erro ao aceitar chamada:', err)
      toast.error('Erro ao aceitar chamada')
      cleanupCallResources()
    }
  }

  // =============================================
  // RECUSAR CHAMADA
  // =============================================
  const rejectCall = async (call: Call) => {
    try {
      stopAllAudio()

      await supabase
        .from('calls')
        .update({ status: 'rejected', ended_at: new Date().toISOString() })
        .eq('id', call.id)

      await createCallMessage({ ...call, status: 'rejected' }, 0)
      setIncomingCall(null)
    } catch (err) {
      console.error('Erro ao recusar chamada:', err)
    }
  }

  // =============================================
  // FINALIZAR CHAMADA
  // =============================================
  // eslint-disable-next-line prefer-const
  const endCall = useCallback(async () => {
    const call = activeCallRef.current
    if (!call) return

    try {
      stopAllAudio()

      const { data: result } = await supabase.rpc('end_call', {
        p_call_id: call.id,
        p_user_id: currentUserIdRef.current,
      })

      await createCallMessage(call, result?.duration || 0)
      cleanupCallResources()
    } catch (err) {
      console.error('Erro ao finalizar chamada:', err)
      cleanupCallResources()
    }
  }, [stopAllAudio, cleanupCallResources])

  // Manter ref atualizado para uso em closures
  useEffect(() => {
    endCallRef.current = endCall
  }, [endCall])

  // =============================================
  // MENSAGEM AUTOMÁTICA NO CHAT
  // =============================================
  const createCallMessage = async (call: Call, duration: number) => {
    const userId = currentUserIdRef.current
    if (!userId) return

    try {
      const typeText = call.type === 'audio' ? '📞 Áudio' : call.type === 'video' ? '📹 Vídeo' : '🖥️ Tela'
      let content = ''

      if (call.status === 'rejected') {
        content = `${typeText} - Chamada recusada`
      } else if (call.status === 'missed') {
        content = `${typeText} - Chamada perdida`
      } else if (duration > 0) {
        const mins = Math.floor(duration / 60)
        const secs = duration % 60
        content = `${typeText} - Chamada concluída (${mins > 0 ? `${mins}m ` : ''}${secs}s)`
      } else {
        content = `${typeText} - Chamada finalizada`
      }

      const recipientId = call.caller_id === userId ? call.receiver_id : call.caller_id

      await supabase.from('messages').insert({
        sender_id: userId,
        recipient_id: recipientId,
        content,
        group_id: null,
      })
    } catch (err) {
      console.error('Erro ao criar mensagem de chamada:', err)
    }
  }

  // =============================================
  // CONTROLES DE MÍDIA
  // =============================================
  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
  }, [])

  const toggleVideo = useCallback(() => {
    localStream.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
  }, [])

  // =============================================
  // REALTIME: CALLS (Postgres Changes — para notificar chamadas recebidas)
  // =============================================
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`calls-incoming-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const newCall = payload.new as Call
          setIncomingCall(newCall)

          // Buscar perfil de quem está ligando
          fetchCallProfiles(newCall.caller_id, newCall.receiver_id)

          // Tocar ringtone
          if (!ringtoneRef.current) {
            ringtoneRef.current = await createToneAudio([480, 620], 0.4, 0.2, 0.15).catch(() => null as any)
          }
          ringtoneRef.current?.play().catch(() => null)

          toast.info('📞 Chamada recebida!')

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Chamada recebida', {
              body: `Chamada de ${newCall.type === 'video' ? 'vídeo' : 'áudio'}`,
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
          const updated = payload.new as Call
          const myCall = activeCallRef.current
          const incoming = incomingCall

          if (['rejected', 'ended', 'missed'].includes(updated.status)) {
            stopAllAudio()

            if (myCall?.id === updated.id) {
              cleanupCallResources()
              const msg = updated.status === 'rejected' ? 'Chamada recusada' :
                updated.status === 'missed' ? 'Chamada não atendida' : 'Chamada finalizada'
              toast.info(msg)
            }

            if (incoming?.id === updated.id) {
              setIncomingCall(null)
            }
          } else if (updated.status === 'accepted') {
            stopAllAudio()
            if (myCall?.id === updated.id) {
              setCallStatus('accepted')
            }
          }
        }
      )
      .subscribe()

    callsChannel.current = channel

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, stopAllAudio, cleanupCallResources])

  // =============================================
  // REALTIME: SIGNALS (Broadcast — rápido, sem DB)
  // =============================================
  useEffect(() => {
    if (!currentUserId) return

    // Canal único de sinais por usuário
    const channel = supabase
      .channel(`signals-${currentUserId}`)
      .on('broadcast', { event: 'offer' }, async (payload) => {
        const { call_id, from_user_id, sdp, to_user_id } = payload.payload
        if (to_user_id !== currentUserId) return

        console.log('[WebRTC] Received offer via broadcast')

        // Salvar offer no banco para o receiver usar ao aceitar
        await supabase.from('webrtc_signals').insert({
          call_id,
          from_user_id,
          to_user_id,
          signal_type: 'offer',
          signal_data: sdp,
        }).then(() => null).catch(() => null)
      })
      .on('broadcast', { event: 'answer' }, async (payload) => {
        const { to_user_id, sdp } = payload.payload
        if (to_user_id !== currentUserId) return

        const pc = peerConnection.current
        if (!pc || pc.signalingState !== 'have-local-offer') return

        console.log('[WebRTC] Received answer via broadcast')
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
          remoteDescriptionSet.current = true
          await flushPendingCandidates()
        } catch (err) {
          console.error('Erro ao processar answer:', err)
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
        const { to_user_id, candidate } = payload.payload
        if (to_user_id !== currentUserId) return

        await applyIceCandidate(candidate)
      })
      .subscribe()

    signalChannel.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, applyIceCandidate, flushPendingCandidates])

  // =============================================
  // RETURN
  // =============================================
  return {
    activeCall,
    incomingCall,
    callStatus,
    currentUserId,
    callerProfile,
    receiverProfile,
    localVideoRef,
    remoteVideoRef,
    localStream: localStream.current,
    remoteStream: null,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  }
}
