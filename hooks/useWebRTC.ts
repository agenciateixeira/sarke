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
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // TURN público (OpenRelay) — necessário para redes com NAT simétrico
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
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

  // Refs sempre atualizados (sem stale closure)
  const currentUserIdRef = useRef<string | null>(null)
  const activeCallRef = useRef<Call | null>(null)
  const incomingCallRef = useRef<Call | null>(null)

  // WebRTC
  const pc = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)

  // Elementos de mídia — DEVEM estar no JSX (React cria o DOM element)
  // O hook exporta esses refs para serem aplicados nos elementos <audio>/<video> do JSX
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null) // áudio remoto
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  // Sons de ringtone / ringback — também elementos de áudio no DOM
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const ringbackRef = useRef<HTMLAudioElement | null>(null)

  // ICE queue
  const icePending = useRef<RTCIceCandidateInit[]>([])
  const remoteDescReady = useRef(false)

  // Realtime
  const callsCh = useRef<RealtimeChannel | null>(null)
  const signalsCh = useRef<RealtimeChannel | null>(null)

  // Timeout chamada sem resposta
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sincronizar refs com state
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
  // SONS — ringtone e ringback
  // Gerados com Web Audio API dentro de gestos do usuário
  // ─────────────────────────────────────────
  const playRingtone = useCallback(() => {
    // Para qualquer ringtone anterior antes de criar novo
    try { (ringtoneRef as any)._stop?.() } catch { }

    try {
      const ctx = new AudioContext()
      let active = true
      let closed = false

      const safeClose = () => {
        if (!closed && ctx.state !== 'closed') {
          closed = true
          ctx.close().catch(() => {})
        }
      }

      const playTone = () => {
        if (!active || ctx.state === 'closed') return Promise.resolve()
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()
        osc1.frequency.value = 480
        osc2.frequency.value = 620
        gain.gain.value = 0.15
        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)
        osc1.start()
        osc2.start()
        osc1.stop(ctx.currentTime + 0.4)
        osc2.stop(ctx.currentTime + 0.4)
        return new Promise<void>(resolve => { osc1.onended = () => resolve() })
      }

      const loop = async () => {
        while (active) {
          await playTone()
          if (!active) break
          await new Promise(r => setTimeout(r, 800))
        }
        safeClose()
      }
      loop()

      ;(ringtoneRef as any)._stop = () => { active = false }
    } catch { /* AudioContext não disponível */ }
  }, [])

  const playRingback = useCallback(() => {
    // Para qualquer ringback anterior antes de criar novo
    try { (ringbackRef as any)._stop?.() } catch { }

    try {
      const ctx = new AudioContext()
      let active = true
      let closed = false

      const safeClose = () => {
        if (!closed && ctx.state !== 'closed') {
          closed = true
          ctx.close().catch(() => {})
        }
      }

      const playTone = () => {
        if (!active || ctx.state === 'closed') return Promise.resolve()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 440
        gain.gain.value = 0.1
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.5)
        return new Promise<void>(resolve => { osc.onended = () => resolve() })
      }

      const loop = async () => {
        while (active) {
          await playTone()
          if (!active) break
          await new Promise(r => setTimeout(r, 2500))
        }
        safeClose()
      }
      loop()

      ;(ringbackRef as any)._stop = () => { active = false }
    } catch { /* ignorar */ }
  }, [])

  const stopAllAudio = useCallback(() => {
    try { (ringtoneRef as any)._stop?.() } catch { }
    try { (ringbackRef as any)._stop?.() } catch { }
    ;(ringtoneRef as any)._stop = null
    ;(ringbackRef as any)._stop = null
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current)
      callTimeoutRef.current = null
    }
  }, [])

  // ─────────────────────────────────────────
  // LIMPAR TUDO
  // ─────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopAllAudio()
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    pc.current?.close()
    pc.current = null
    // Fechar canal de sinais da chamada
    if (signalsCh.current) {
      supabase.removeChannel(signalsCh.current)
      signalsCh.current = null
    }
    icePending.current = []
    remoteDescReady.current = false
    setActiveCall(null)
    setCallStatus(null)
    setIncomingCall(null)
    setCallerProfile(null)
    setReceiverProfile(null)
  }, [stopAllAudio])

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────
  const fetchProfiles = useCallback(async (callerId: string, receiverId: string) => {
    const { data } = await supabase
      .from('profiles').select('id, name, avatar_url')
      .in('id', [callerId, receiverId])
    if (!data) return
    setCallerProfile(data.find(p => p.id === callerId) ?? null)
    setReceiverProfile(data.find(p => p.id === receiverId) ?? null)
  }, [])

  const applyIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!pc.current) return
    if (!remoteDescReady.current) { icePending.current.push(candidate); return }
    try { await pc.current.addIceCandidate(new RTCIceCandidate(candidate)) } catch { }
  }, [])

  const flushIce = useCallback(async () => {
    const q = [...icePending.current]; icePending.current = []
    for (const c of q) {
      try { await pc.current?.addIceCandidate(new RTCIceCandidate(c)) } catch { }
    }
  }, [])

  const getMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    if (type === 'screen') return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    return navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
  }, [])

  const sendSignal = useCallback((event: string, payload: Record<string, unknown>) => {
    if (!signalsCh.current) {
      console.warn('[WebRTC] sendSignal: canal de sinais não está aberto!')
      return
    }
    console.log('[WebRTC] sendSignal:', event, 'to:', payload.to)
    signalsCh.current.send({ type: 'broadcast', event, payload })
  }, [])

  // Entra no canal de sinais e aguarda SUBSCRIBED antes de resolver
  const joinSignalChannel = useCallback((callId: string): Promise<void> => {
    if (signalsCh.current) {
      supabase.removeChannel(signalsCh.current)
      signalsCh.current = null
    }
    console.log('[WebRTC] joinSignalChannel:', `call-signals-${callId}`)

    return new Promise((resolve) => {
      const ch = supabase
        .channel(`call-signals-${callId}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.to !== currentUserIdRef.current) return
          console.log('[WebRTC] recebeu answer')
          const conn = pc.current
          if (!conn || conn.signalingState !== 'have-local-offer') return
          try {
            await conn.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            remoteDescReady.current = true
            await flushIce()
          } catch (e) { console.error('answer error:', e) }
        })
        .on('broadcast', { event: 'ice' }, async ({ payload }) => {
          if (payload.to !== currentUserIdRef.current) return
          console.log('[WebRTC] recebeu ICE candidate')
          await applyIce(payload.candidate)
        })
        .on('broadcast', { event: 'hangup' }, ({ payload }) => {
          if (payload.to !== currentUserIdRef.current) return
          const isMyCall = activeCallRef.current?.id === payload.call_id
            || incomingCallRef.current?.id === payload.call_id
          if (isMyCall) {
            cleanup()
            toast.info('Chamada encerrada')
          }
        })
        .subscribe((status) => {
          console.log('[WebRTC] signal channel status:', status)
          if (status === 'SUBSCRIBED') resolve()
        })
      signalsCh.current = ch
    })
  }, [applyIce, flushIce, cleanup])

  // ─────────────────────────────────────────
  // CRIAR PEER CONNECTION
  // ─────────────────────────────────────────
  const endCallRef = useRef<() => Promise<void>>(async () => {})

  const createPC = useCallback((callId: string, remoteId: string) => {
    pc.current?.close()
    const conn = new RTCPeerConnection(ICE_SERVERS)

    conn.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal('ice', { to: remoteId, from: currentUserIdRef.current, candidate: candidate.toJSON() })
    }

    conn.ontrack = (ev) => {
      console.log('[WebRTC] ontrack fired, kind:', ev.track.kind, 'muted:', ev.track.muted)
      const stream = ev.streams?.[0]
      if (!stream) return

      if (ev.track.kind === 'audio') {
        const audioEl = remoteAudioRef.current
        if (!audioEl) {
          console.warn('[WebRTC] remoteAudioRef não montado no DOM!')
          return
        }

        // Conecta o stream ao elemento de áudio imediatamente
        audioEl.srcObject = stream
        audioEl.volume = 1.0
        audioEl.muted = false

        const tryPlay = () => {
          audioEl.play().then(() => {
            console.log('[WebRTC] Audio playing!')
          }).catch(err => {
            console.warn('[WebRTC] play() bloqueado:', err)
          })
        }

        // Se a track já está desmutada, toca agora
        if (!ev.track.muted) {
          tryPlay()
        }

        // Escuta unmute — dispara quando o ICE completa e o áudio realmente começa
        ev.track.onunmute = () => {
          console.log('[WebRTC] track unmuted! Tocando áudio remoto...')
          audioEl.muted = false
          audioEl.volume = 1.0
          tryPlay()
        }

        // Também toca quando connectionState chegar em 'connected'
        conn.addEventListener('connectionstatechange', () => {
          if (conn.connectionState === 'connected') {
            console.log('[WebRTC] connected! Forçando play do áudio...')
            audioEl.muted = false
            audioEl.volume = 1.0
            tryPlay()
          }
        }, { once: true })
      }

      // Vídeo remoto para videochamadas
      if (remoteVideoRef.current && ev.track.kind === 'video') {
        remoteVideoRef.current.srcObject = stream
      }
    }

    conn.onconnectionstatechange = () => {
      const s = conn.connectionState
      console.log('[WebRTC] connectionState:', s)
      if (s === 'connected') {
        stopAllAudio()
        setCallStatus('accepted')
      } else if (s === 'failed') {
        toast.error('Conexão falhou. Verifique sua rede.')
        endCallRef.current()
      } else if (s === 'disconnected') {
        toast.warning('Conexão instável...')
      }
    }

    conn.oniceconnectionstatechange = () => {
      console.log('[WebRTC] iceConnectionState:', conn.iceConnectionState)
    }

    conn.onicegatheringstatechange = () => {
      console.log('[WebRTC] iceGatheringState:', conn.iceGatheringState)
    }

    conn.onsignalingstatechange = () => {
      console.log('[WebRTC] signalingState:', conn.signalingState)
    }

    pc.current = conn
    return conn
  }, [sendSignal, stopAllAudio])

  // ─────────────────────────────────────────
  // END CALL
  // ─────────────────────────────────────────
  const endCall = useCallback(async () => {
    const call = activeCallRef.current
    if (!call) return
    try {
      stopAllAudio()
      const remoteId = call.caller_id === currentUserIdRef.current ? call.receiver_id : call.caller_id
      sendSignal('hangup', { to: remoteId, call_id: call.id })
      const { data: result } = await supabase.rpc('end_call', { p_call_id: call.id, p_user_id: currentUserIdRef.current })
      await createCallMessage(call, result?.duration ?? 0)
    } catch (e) {
      console.error('endCall:', e)
    } finally {
      cleanup()
    }
  }, [stopAllAudio, sendSignal, cleanup])

  useEffect(() => { endCallRef.current = endCall }, [endCall])

  // ─────────────────────────────────────────
  // MENSAGEM NO CHAT
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
    try { await supabase.from('messages').insert({ sender_id: userId, recipient_id: recipientId, content, group_id: null }) } catch { }
  }

  // ─────────────────────────────────────────
  // START CALL (quem liga)
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

      // Espera canal estar SUBSCRIBED antes de criar o PC e enviar sinais
      await joinSignalChannel(newCall.id)

      const conn = createPC(newCall.id, data.receiver_id)
      stream.getTracks().forEach(t => {
        console.log('[WebRTC] startCall addTrack:', t.kind, 'enabled:', t.enabled, 'readyState:', t.readyState)
        conn.addTrack(t, stream)
      })

      const offer = await conn.createOffer()
      await conn.setLocalDescription(offer)

      // Salvar offer no DB (o receptor vai buscar ao aceitar)
      try {
        await supabase.from('webrtc_signals').insert({
          call_id: newCall.id, from_user_id: userId, to_user_id: data.receiver_id,
          signal_type: 'offer', signal_data: offer,
        })
      } catch { }

      // Ringback (dentro do gesto do usuário — OK para autoplay)
      playRingback()

      // Timeout 30s sem atender
      callTimeoutRef.current = setTimeout(async () => {
        if (!activeCallRef.current) return
        stopAllAudio()
        await supabase.from('calls').update({ status: 'missed', ended_at: new Date().toISOString() }).eq('id', newCall.id)
        cleanup()
        toast.info('Chamada não atendida')
      }, 30000)

      return newCall
    } catch (err: any) {
      console.error('startCall:', err)
      if (err?.name === 'NotAllowedError') {
        toast.error('Permissão negada. Permita o acesso ao microfone nas configurações do navegador.')
      } else {
        toast.error('Não foi possível iniciar a chamada')
      }
      cleanup()
      return null
    }
  }

  // ─────────────────────────────────────────
  // ACCEPT CALL (quem recebe)
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

      await supabase.from('calls').update({ status: 'accepted', started_at: new Date().toISOString() }).eq('id', call.id)

      // Espera canal estar SUBSCRIBED antes de criar PC e enviar sinais
      await joinSignalChannel(call.id)

      const conn = createPC(call.id, call.caller_id)
      stream.getTracks().forEach(t => {
        console.log('[WebRTC] acceptCall addTrack:', t.kind, 'enabled:', t.enabled, 'readyState:', t.readyState)
        conn.addTrack(t, stream)
      })

      // Buscar offer no DB
      const { data: sigs } = await supabase
        .from('webrtc_signals').select('*')
        .eq('call_id', call.id).eq('signal_type', 'offer')
        .order('created_at', { ascending: false }).limit(1)

      if (!sigs || sigs.length === 0) {
        toast.error('Erro ao conectar chamada. Tente novamente.')
        cleanup()
        return
      }

      const offerSdp = sigs[0].signal_data as RTCSessionDescriptionInit
      await conn.setRemoteDescription(new RTCSessionDescription(offerSdp))
      remoteDescReady.current = true
      await flushIce()

      const answer = await conn.createAnswer()
      await conn.setLocalDescription(answer)

      sendSignal('answer', { to: call.caller_id, from: userId, call_id: call.id, sdp: answer })
      try {
        await supabase.from('webrtc_signals').insert({
          call_id: call.id, from_user_id: userId, to_user_id: call.caller_id,
          signal_type: 'answer', signal_data: answer,
        })
      } catch { }

    } catch (err: any) {
      console.error('acceptCall:', err)
      if (err?.name === 'NotAllowedError') {
        toast.error('Permissão negada. Permita o acesso ao microfone.')
      } else {
        toast.error('Erro ao aceitar chamada')
      }
      cleanup()
    }
  }

  // ─────────────────────────────────────────
  // REJECT CALL
  // ─────────────────────────────────────────
  const rejectCall = async (call: Call) => {
    try {
      stopAllAudio()
      sendSignal('hangup', { to: call.caller_id, call_id: call.id })
      await supabase.from('calls').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', call.id)
      await createCallMessage({ ...call, status: 'rejected' }, 0)
      setIncomingCall(null)
    } catch (e) { console.error('rejectCall:', e) }
  }

  // ─────────────────────────────────────────
  // REALTIME: chamadas recebidas
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
        if (activeCallRef.current) return // já em chamada

        setIncomingCall(call)
        fetchProfiles(call.caller_id, call.receiver_id)
        // Ringtone — chamado aqui pois o INSERT do Supabase Realtime pode não ser dentro de gesto
        // Mas o IncomingCallDialog aparecerá e o usuário vai interagir com ele
        playRingtone()
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
        const isMyActive = activeCallRef.current?.id === updated.id
        const isMyIncoming = incomingCallRef.current?.id === updated.id

        if (['ended', 'rejected', 'missed'].includes(updated.status)) {
          if (isMyActive || isMyIncoming) {
            const msg = updated.status === 'rejected' ? 'Chamada recusada'
              : updated.status === 'missed' ? 'Chamada não atendida' : 'Chamada encerrada'
            cleanup()
            toast.info(msg)
          }
        } else if (updated.status === 'accepted' && isMyActive) {
          stopAllAudio()
          setCallStatus('accepted')
        }
      })
      .subscribe()

    callsCh.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [currentUserId, stopAllAudio, cleanup, fetchProfiles, playRingtone])

  // Canal de sinais criado dinamicamente por joinSignalChannel() ao iniciar/aceitar chamada

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
    activeCall, incomingCall, callStatus, currentUserId,
    callerProfile, receiverProfile,
    remoteAudioRef,   // <-- aplicar num <audio> no JSX
    localVideoRef, remoteVideoRef,
    localStream: localStream.current,
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo,
  }
}
