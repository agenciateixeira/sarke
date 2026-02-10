'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Call, CallType, CallStatus, CreateCallData } from '@/types/webrtc'
import { RealtimeChannel } from '@supabase/supabase-js'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

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
  const [callerProfile, setCallerProfile] = useState<CallProfile | null>(null)
  const [receiverProfile, setReceiverProfile] = useState<CallProfile | null>(null)

  // ── Refs que sempre têm o valor mais recente (sem stale closure) ──
  const currentUserIdRef = useRef<string | null>(null)
  const activeCallRef = useRef<Call | null>(null)
  const incomingCallRef = useRef<Call | null>(null)

  // ── WebRTC ──
  const pc = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const remoteAudio = useRef<HTMLAudioElement | null>(null) // <-- áudio remoto

  // ── Video elements (para videochamadas) ──
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  // ── ICE queue ──
  const icePending = useRef<RTCIceCandidateInit[]>([])
  const remoteDescReady = useRef(false)

  // ── Realtime channels ──
  const callsCh = useRef<RealtimeChannel | null>(null)
  const signalsCh = useRef<RealtimeChannel | null>(null)

  // ── Sons ──
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const ringbackRef = useRef<HTMLAudioElement | null>(null)
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sincronizar refs
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])
  useEffect(() => { activeCallRef.current = activeCall }, [activeCall])
  useEffect(() => { incomingCallRef.current = incomingCall }, [incomingCall])

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    ringtoneRef.current?.pause()
    ringbackRef.current?.pause()
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    stopAllAudio()
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = null
      remoteAudio.current = null
    }
    pc.current?.close()
    pc.current = null
    icePending.current = []
    remoteDescReady.current = false
    setActiveCall(null)
    setCallStatus(null)
    setIncomingCall(null)
    setCallerProfile(null)
    setReceiverProfile(null)
  }, [stopAllAudio])

  const fetchProfiles = useCallback(async (callerId: string, receiverId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', [callerId, receiverId])
    if (!data) return
    setCallerProfile(data.find(p => p.id === callerId) ?? null)
    setReceiverProfile(data.find(p => p.id === receiverId) ?? null)
  }, [])

  // Aplica ICE candidate — fila até remoteDesc estar pronta
  const applyIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!pc.current) return
    if (!remoteDescReady.current) {
      icePending.current.push(candidate)
      return
    }
    try { await pc.current.addIceCandidate(new RTCIceCandidate(candidate)) }
    catch { /* ignorar erros de ICE */ }
  }, [])

  const flushIce = useCallback(async () => {
    const queue = [...icePending.current]
    icePending.current = []
    for (const c of queue) {
      try { await pc.current?.addIceCandidate(new RTCIceCandidate(c)) }
      catch { /* ignorar */ }
    }
  }, [])

  // Obtém mídia local (microfone / câmera)
  const getMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    if (type === 'screen') {
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    }
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    })
  }, [])

  // Envia sinal via Supabase Broadcast
  const sendSignal = useCallback((event: string, payload: Record<string, unknown>) => {
    signalsCh.current?.send({ type: 'broadcast', event, payload })
  }, [])

  // Cria e configura o RTCPeerConnection
  const createPC = useCallback((callId: string, remoteId: string) => {
    pc.current?.close()
    const conn = new RTCPeerConnection(ICE_SERVERS)

    conn.onicecandidate = ({ candidate }) => {
      if (candidate) {
        sendSignal('ice', {
          to: remoteId,
          from: currentUserIdRef.current,
          candidate: candidate.toJSON(),
        })
      }
    }

    conn.ontrack = (ev) => {
      const stream = ev.streams?.[0]
      if (!stream) return

      // Áudio remoto — elemento dedicado (funciona para audio e video)
      if (!remoteAudio.current) {
        remoteAudio.current = new Audio()
        remoteAudio.current.autoplay = true
      }
      remoteAudio.current.srcObject = stream

      // Vídeo remoto (se for videochamada)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
      }
    }

    conn.onconnectionstatechange = () => {
      const s = conn.connectionState
      console.log('[WebRTC] state:', s)
      if (s === 'connected') {
        stopAllAudio()
        setCallStatus('accepted')
      } else if (s === 'failed') {
        toast.error('Conexão falhou')
        endCallRef.current()
      } else if (s === 'disconnected') {
        toast.warning('Conexão instável...')
      }
    }

    pc.current = conn
    return conn
  }, [sendSignal, stopAllAudio])

  // ─────────────────────────────────────────
  // endCall — ref para evitar circular
  // ─────────────────────────────────────────
  const endCallRef = useRef<() => Promise<void>>(async () => {})

  const endCall = useCallback(async () => {
    const call = activeCallRef.current
    if (!call) return

    try {
      stopAllAudio()
      // Avisar o outro lado via broadcast antes de limpar
      const remoteId = call.caller_id === currentUserIdRef.current
        ? call.receiver_id
        : call.caller_id
      sendSignal('hangup', { to: remoteId, call_id: call.id })

      // Atualizar banco
      const { data: result } = await supabase.rpc('end_call', {
        p_call_id: call.id,
        p_user_id: currentUserIdRef.current,
      })

      // Mensagem no chat
      await createCallMessage(call, result?.duration ?? 0)
    } catch (e) {
      console.error('endCall error:', e)
    } finally {
      cleanup()
    }
  }, [stopAllAudio, sendSignal, cleanup])

  useEffect(() => { endCallRef.current = endCall }, [endCall])

  // ─────────────────────────────────────────
  // MENSAGEM AUTOMÁTICA NO CHAT
  // ─────────────────────────────────────────
  const createCallMessage = async (call: Call, duration: number) => {
    const userId = currentUserIdRef.current
    if (!userId) return
    const t = call.type === 'audio' ? '📞 Áudio' : call.type === 'video' ? '📹 Vídeo' : '🖥️ Tela'
    let content = ''
    if (call.status === 'rejected') content = `${t} - Chamada recusada`
    else if (call.status === 'missed') content = `${t} - Chamada perdida`
    else if (duration > 0) {
      const m = Math.floor(duration / 60), s = duration % 60
      content = `${t} - Chamada concluída (${m > 0 ? `${m}m ` : ''}${s}s)`
    } else content = `${t} - Chamada finalizada`
    const recipientId = call.caller_id === userId ? call.receiver_id : call.caller_id
    await supabase.from('messages').insert({ sender_id: userId, recipient_id: recipientId, content, group_id: null }).catch(() => {})
  }

  // ─────────────────────────────────────────
  // INICIAR CHAMADA (quem liga)
  // ─────────────────────────────────────────
  const startCall = async (data: CreateCallData): Promise<Call | null> => {
    const userId = currentUserIdRef.current
    if (!userId) return null

    try {
      const stream = await getMedia(data.type)
      localStream.current = stream
      if (localVideoRef.current && data.type !== 'audio') localVideoRef.current.srcObject = stream

      const { data: newCall, error } = await supabase
        .from('calls')
        .insert({ caller_id: userId, receiver_id: data.receiver_id, type: data.type, status: 'calling' })
        .select().single()
      if (error) throw error

      setActiveCall(newCall)
      setCallStatus('calling')
      fetchProfiles(userId, data.receiver_id)

      const conn = createPC(newCall.id, data.receiver_id)
      stream.getTracks().forEach(t => conn.addTrack(t, stream))

      const offer = await conn.createOffer()
      await conn.setLocalDescription(offer)

      // Enviar offer via broadcast
      sendSignal('offer', { to: data.receiver_id, from: userId, call_id: newCall.id, sdp: offer })

      // Também salvar no DB como fallback
      await supabase.from('webrtc_signals').insert({
        call_id: newCall.id, from_user_id: userId, to_user_id: data.receiver_id,
        signal_type: 'offer', signal_data: offer,
      }).catch(() => {})

      // Ringback
      ringbackRef.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=')
      ringbackRef.current.loop = true

      // Timeout 30s
      callTimeoutRef.current = setTimeout(async () => {
        if (!activeCallRef.current) return
        stopAllAudio()
        await supabase.from('calls').update({ status: 'missed', ended_at: new Date().toISOString() }).eq('id', newCall.id)
        cleanup()
        toast.info('Chamada não atendida')
      }, 30000)

      return newCall
    } catch (err) {
      console.error('startCall error:', err)
      toast.error('Não foi possível iniciar a chamada. Verifique o microfone.')
      cleanup()
      return null
    }
  }

  // ─────────────────────────────────────────
  // ACEITAR CHAMADA (quem recebe)
  // ─────────────────────────────────────────
  const acceptCall = async (call: Call) => {
    const userId = currentUserIdRef.current
    if (!userId) return

    try {
      stopAllAudio()
      const stream = await getMedia(call.type)
      localStream.current = stream
      if (localVideoRef.current && call.type !== 'audio') localVideoRef.current.srcObject = stream

      setActiveCall(call)
      setCallStatus('accepted')
      setIncomingCall(null)
      fetchProfiles(call.caller_id, userId)

      await supabase.from('calls')
        .update({ status: 'accepted', started_at: new Date().toISOString() })
        .eq('id', call.id)

      const conn = createPC(call.id, call.caller_id)
      stream.getTracks().forEach(t => conn.addTrack(t, stream))

      // Buscar offer do DB
      const { data: sigs } = await supabase
        .from('webrtc_signals').select('*')
        .eq('call_id', call.id).eq('signal_type', 'offer')
        .order('created_at', { ascending: false }).limit(1)

      if (!sigs || sigs.length === 0) {
        toast.error('Offer não encontrada. Tente novamente.')
        cleanup()
        return
      }

      const offerSdp = sigs[0].signal_data as RTCSessionDescriptionInit
      await conn.setRemoteDescription(new RTCSessionDescription(offerSdp))
      remoteDescReady.current = true
      await flushIce()

      const answer = await conn.createAnswer()
      await conn.setLocalDescription(answer)

      // Enviar answer via broadcast
      sendSignal('answer', { to: call.caller_id, from: userId, call_id: call.id, sdp: answer })

      // Salvar no DB
      await supabase.from('webrtc_signals').insert({
        call_id: call.id, from_user_id: userId, to_user_id: call.caller_id,
        signal_type: 'answer', signal_data: answer,
      }).catch(() => {})

    } catch (err) {
      console.error('acceptCall error:', err)
      toast.error('Erro ao aceitar chamada')
      cleanup()
    }
  }

  // ─────────────────────────────────────────
  // RECUSAR CHAMADA
  // ─────────────────────────────────────────
  const rejectCall = async (call: Call) => {
    try {
      stopAllAudio()
      sendSignal('hangup', { to: call.caller_id, call_id: call.id })
      await supabase.from('calls').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', call.id)
      await createCallMessage({ ...call, status: 'rejected' }, 0)
      setIncomingCall(null)
    } catch (e) {
      console.error('rejectCall error:', e)
    }
  }

  // ─────────────────────────────────────────
  // REALTIME: chamadas recebidas (INSERT)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return

    const ch = supabase
      .channel(`calls-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'calls',
        filter: `receiver_id=eq.${currentUserId}`,
      }, async (payload) => {
        const call = payload.new as Call
        // Ignorar se já tenho uma chamada ativa
        if (activeCallRef.current) return

        setIncomingCall(call)
        fetchProfiles(call.caller_id, call.receiver_id)

        // Ringtone simples
        try {
          ringtoneRef.current = new Audio()
          ringtoneRef.current.loop = true
          // Tom gerado inline — não depende de arquivo externo
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 480
          gain.gain.value = 0.1
          osc.start()
          setTimeout(() => { osc.stop(); ctx.close() }, 30000)
        } catch { /* ignorar se AudioContext não disponível */ }

        toast.info('📞 Chamada recebida!')

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Chamada recebida', { body: `Chamada de ${call.type === 'video' ? 'vídeo' : 'áudio'}` })
        }
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission()
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'calls',
      }, (payload) => {
        const updated = payload.new as Call

        // Verificar se é a minha chamada ativa OU minha chamada recebida
        const isMyActiveCall = activeCallRef.current?.id === updated.id
        const isMyIncoming = incomingCallRef.current?.id === updated.id

        if (updated.status === 'ended' || updated.status === 'rejected' || updated.status === 'missed') {
          if (isMyActiveCall || isMyIncoming) {
            stopAllAudio()
            cleanup()
            const msg = updated.status === 'rejected' ? 'Chamada recusada' :
              updated.status === 'missed' ? 'Chamada não atendida' : 'Chamada encerrada'
            toast.info(msg)
          }
        } else if (updated.status === 'accepted' && isMyActiveCall) {
          stopAllAudio()
          setCallStatus('accepted')
        }
      })
      .subscribe()

    callsCh.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [currentUserId, stopAllAudio, cleanup, fetchProfiles])

  // ─────────────────────────────────────────
  // REALTIME: sinais WebRTC (Broadcast)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return

    const ch = supabase
      .channel(`signals-${currentUserId}`)
      // Receber answer (caller recebe isso)
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to !== currentUserId) return
        const conn = pc.current
        if (!conn || conn.signalingState !== 'have-local-offer') return
        try {
          await conn.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          remoteDescReady.current = true
          await flushIce()
        } catch (e) { console.error('answer error:', e) }
      })
      // Receber ICE candidates
      .on('broadcast', { event: 'ice' }, async ({ payload }) => {
        if (payload.to !== currentUserId) return
        await applyIce(payload.candidate)
      })
      // Receber hangup (outro lado desligou)
      .on('broadcast', { event: 'hangup' }, ({ payload }) => {
        if (payload.to !== currentUserId) return
        const isMyCall = activeCallRef.current?.id === payload.call_id
          || incomingCallRef.current?.id === payload.call_id
        if (isMyCall) {
          stopAllAudio()
          cleanup()
          toast.info('Chamada encerrada')
        }
      })
      // Receber offer via broadcast (receiver recebe isso — salva no DB)
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to !== currentUserId) return
        // Salvar no DB para o acceptCall buscar
        await supabase.from('webrtc_signals').insert({
          call_id: payload.call_id,
          from_user_id: payload.from,
          to_user_id: payload.to,
          signal_type: 'offer',
          signal_data: payload.sdp,
        }).catch(() => {})
      })
      .subscribe()

    signalsCh.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [currentUserId, applyIce, flushIce, stopAllAudio, cleanup])

  // ─────────────────────────────────────────
  // CONTROLES
  // ─────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
  }, [])

  const toggleVideo = useCallback(() => {
    localStream.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
  }, [])

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
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  }
}
