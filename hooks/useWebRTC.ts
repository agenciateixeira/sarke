'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Call, CallType, CallStatus, CreateCallData } from '@/types/webrtc'
import { RealtimeChannel } from '@supabase/supabase-js'

// ─────────────────────────────────────────
// ICE SERVERS
// STUN: descoberta de IP público
// TURN: relay quando STUN não traversa NAT (necessário em ~20% das redes)
// ─────────────────────────────────────────
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // STUN Google — descoberta de IP público
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // STUN Cloudflare
    { urls: 'stun:stun.cloudflare.com:3478' },
    // TURN OpenRelay — relay para NAT simétrico (secret correto)
    {
      urls: [
        'turn:staticauth.openrelay.metered.ca:80',
        'turn:staticauth.openrelay.metered.ca:80?transport=tcp',
        'turn:staticauth.openrelay.metered.ca:443',
        'turns:staticauth.openrelay.metered.ca:443',
      ],
      username: 'openrelayproject',
      credential: 'openrelayprojectsecret',
    },
  ],
  iceCandidatePoolSize: 10,
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

  // Refs sem stale closure
  const currentUserIdRef = useRef<string | null>(null)
  const activeCallRef = useRef<Call | null>(null)
  const incomingCallRef = useRef<Call | null>(null)

  // WebRTC
  const pc = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)

  // Elementos de mídia (criados no JSX do CallScreen)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  // Sons
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const ringbackRef = useRef<HTMLAudioElement | null>(null)

  // ICE queue — candidatos recebidos antes do setRemoteDescription
  const icePending = useRef<RTCIceCandidateInit[]>([])
  const remoteDescReady = useRef(false)

  // Realtime channels
  const callsCh = useRef<RealtimeChannel | null>(null)   // escuta tabela calls
  const signalsCh = useRef<RealtimeChannel | null>(null)  // escuta tabela webrtc_signals

  // Timeout chamada sem resposta
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sincronizar refs com state
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])
  useEffect(() => { activeCallRef.current = activeCall }, [activeCall])
  useEffect(() => { incomingCallRef.current = incomingCall }, [incomingCall])

  // ─────────────────────────────────────────
  // INIT — buscar userId
  // ─────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  // ─────────────────────────────────────────
  // SONS — ringtone e ringback via Web Audio API
  // ─────────────────────────────────────────
  const playRingtone = useCallback(() => {
    try { (ringtoneRef as any)._stop?.() } catch { }
    try {
      const ctx = new AudioContext()
      let active = true
      let closed = false
      const safeClose = () => { if (!closed && ctx.state !== 'closed') { closed = true; ctx.close().catch(() => {}) } }
      const playTone = () => {
        if (!active || ctx.state === 'closed') return Promise.resolve()
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain()
        o1.frequency.value = 480; o2.frequency.value = 620; g.gain.value = 0.15
        o1.connect(g); o2.connect(g); g.connect(ctx.destination)
        o1.start(); o2.start(); o1.stop(ctx.currentTime + 0.4); o2.stop(ctx.currentTime + 0.4)
        return new Promise<void>(res => { o1.onended = () => res() })
      }
      const loop = async () => { while (active) { await playTone(); if (!active) break; await new Promise(r => setTimeout(r, 800)) }; safeClose() }
      loop()
      ;(ringtoneRef as any)._stop = () => { active = false }
    } catch { }
  }, [])

  const playRingback = useCallback(() => {
    try { (ringbackRef as any)._stop?.() } catch { }
    try {
      const ctx = new AudioContext()
      let active = true
      let closed = false
      const safeClose = () => { if (!closed && ctx.state !== 'closed') { closed = true; ctx.close().catch(() => {}) } }
      const playTone = () => {
        if (!active || ctx.state === 'closed') return Promise.resolve()
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.frequency.value = 440; g.gain.value = 0.1
        o.connect(g); g.connect(ctx.destination)
        o.start(); o.stop(ctx.currentTime + 0.5)
        return new Promise<void>(res => { o.onended = () => res() })
      }
      const loop = async () => { while (active) { await playTone(); if (!active) break; await new Promise(r => setTimeout(r, 2500)) }; safeClose() }
      loop()
      ;(ringbackRef as any)._stop = () => { active = false }
    } catch { }
  }, [])

  const stopAllAudio = useCallback(() => {
    try { (ringtoneRef as any)._stop?.() } catch { }
    try { (ringbackRef as any)._stop?.() } catch { }
    ;(ringtoneRef as any)._stop = null
    ;(ringbackRef as any)._stop = null
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null }
  }, [])

  // ─────────────────────────────────────────
  // LIMPAR TUDO
  // ─────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopAllAudio()
    localStream.current?.getTracks().forEach(t => t.stop())
    localStream.current = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
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

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────
  const fetchProfiles = useCallback(async (callerId: string, receiverId: string) => {
    const { data } = await supabase.from('profiles').select('id, name, avatar_url').in('id', [callerId, receiverId])
    if (!data) return
    setCallerProfile(data.find(p => p.id === callerId) ?? null)
    setReceiverProfile(data.find(p => p.id === receiverId) ?? null)
  }, [])

  const applyIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    // Sem PC ou sem remoteDesc: enfileira — será drenado em flushIce()
    if (!pc.current || !remoteDescReady.current) {
      console.log('[WebRTC] ICE enfileirado (PC não pronto ainda)')
      icePending.current.push(candidate)
      return
    }
    try { await pc.current.addIceCandidate(new RTCIceCandidate(candidate)) } catch (e) { console.warn('[WebRTC] addIceCandidate error:', e) }
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

  // ─────────────────────────────────────────
  // ENVIAR SINAL via tabela webrtc_signals
  // Dura·vel, sobrevive a reconexões, sem conflito de canal
  // ─────────────────────────────────────────
  const sendSignal = useCallback(async (
    callId: string,
    toUserId: string,
    signalType: 'offer' | 'answer' | 'ice-candidate',
    signalData: object
  ) => {
    const fromUserId = currentUserIdRef.current
    if (!fromUserId) return
    console.log('[WebRTC] sendSignal:', signalType, '→', toUserId)
    const { error } = await supabase.from('webrtc_signals').insert({
      call_id: callId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      signal_type: signalType,
      signal_data: signalData,
    })
    if (error) console.error('[WebRTC] sendSignal error:', error)
  }, [])

  // ─────────────────────────────────────────
  // CRIAR PEER CONNECTION
  // ─────────────────────────────────────────
  const endCallRef = useRef<() => Promise<void>>(async () => {})

  const createPC = useCallback((callId: string, remoteId: string) => {
    pc.current?.close()
    const conn = new RTCPeerConnection(ICE_SERVERS)

    conn.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log('[WebRTC] local candidate:', candidate.type, candidate.protocol)
        sendSignal(callId, remoteId, 'ice-candidate', candidate.toJSON())
      } else {
        console.log('[WebRTC] ICE gathering completo')
      }
    }

    conn.onicecandidateerror = (ev: any) => {
      console.warn('[WebRTC] ICE candidate error:', ev.errorCode, ev.errorText)
    }

    conn.ontrack = (ev) => {
      console.log('[WebRTC] ontrack:', ev.track.kind, 'muted:', ev.track.muted)
      const stream = ev.streams?.[0]
      if (!stream) return

      if (ev.track.kind === 'audio') {
        const audioEl = remoteAudioRef.current
        if (!audioEl) { console.warn('[WebRTC] remoteAudioRef não montado!'); return }

        audioEl.srcObject = stream
        audioEl.volume = 1.0
        audioEl.muted = false

        const tryPlay = () => {
          audioEl.play()
            .then(() => console.log('[WebRTC] Audio playing!'))
            .catch(err => console.warn('[WebRTC] play() bloqueado:', err))
        }

        // Toca imediatamente se já desmutado
        if (!ev.track.muted) tryPlay()

        // Aguarda unmute (disparado quando RTP começa a chegar após ICE conectar)
        ev.track.onunmute = () => {
          console.log('[WebRTC] track unmuted — RTP fluindo')
          audioEl.muted = false
          audioEl.volume = 1.0
          tryPlay()
        }
      }

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
        // Força play quando conexão estabelecida
        const audioEl = remoteAudioRef.current
        if (audioEl && audioEl.srcObject && audioEl.paused) {
          audioEl.muted = false
          audioEl.volume = 1.0
          audioEl.play().catch(() => {})
        }
      } else if (s === 'failed') {
        console.error('[WebRTC] conexão falhou — tentando ICE restart')
        conn.restartIce()
        setTimeout(() => {
          if (pc.current?.connectionState === 'failed') {
            toast.error('Conexão falhou. Verifique sua rede.')
            endCallRef.current()
          }
        }, 5000)
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
      const { data: result } = await supabase.rpc('end_call', { p_call_id: call.id, p_user_id: currentUserIdRef.current })
      await createCallMessage(call, result?.duration ?? 0)
    } catch (e) {
      console.error('endCall:', e)
    } finally {
      cleanup()
    }
  }, [stopAllAudio, cleanup])

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

      // Cria PC e adiciona tracks
      const conn = createPC(newCall.id, data.receiver_id)
      stream.getTracks().forEach(t => {
        console.log('[WebRTC] startCall addTrack:', t.kind)
        conn.addTrack(t, stream)
      })

      // Cria offer e envia via DB
      const offer = await conn.createOffer()
      await conn.setLocalDescription(offer)
      await sendSignal(newCall.id, data.receiver_id, 'offer', offer)

      playRingback()

      // Timeout 30s
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

      // Cria PC e adiciona tracks
      const conn = createPC(call.id, call.caller_id)
      stream.getTracks().forEach(t => {
        console.log('[WebRTC] acceptCall addTrack:', t.kind)
        conn.addTrack(t, stream)
      })

      // Buscar offer no DB
      const { data: sigs } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('call_id', call.id)
        .eq('signal_type', 'offer')
        .order('created_at', { ascending: false })
        .limit(1)

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
      await sendSignal(call.id, call.caller_id, 'answer', answer)

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
      await supabase.from('calls').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', call.id)
      await createCallMessage({ ...call, status: 'rejected' }, 0)
      setIncomingCall(null)
    } catch (e) { console.error('rejectCall:', e) }
  }

  // ─────────────────────────────────────────
  // REALTIME: escuta tabela calls (chamadas recebidas + atualizações)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return

    const ch = supabase
      .channel(`calls-user-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'calls',
        filter: `receiver_id=eq.${currentUserId}`,
      }, async (payload) => {
        const call = payload.new as Call
        if (activeCallRef.current) return
        console.log('[WebRTC] chamada recebida! call_id:', call.id, 'de:', call.caller_id)
        setIncomingCall(call)
        fetchProfiles(call.caller_id, call.receiver_id)
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
      .subscribe((status) => {
        console.log('[WebRTC] calls channel:', status)
      })

    callsCh.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [currentUserId, stopAllAudio, cleanup, fetchProfiles, playRingtone])

  // ─────────────────────────────────────────
  // REALTIME: escuta tabela webrtc_signals (sinais ICE/answer)
  // Canal único por usuário — nunca conflita, sobrevive a reconexões
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return

    const ch = supabase
      .channel(`signals-user-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `to_user_id=eq.${currentUserId}`,
      }, async (payload) => {
        const signal = payload.new as {
          call_id: string
          from_user_id: string
          signal_type: string
          signal_data: any
        }

        console.log('[WebRTC] sinal recebido via DB:', signal.signal_type, 'de:', signal.from_user_id)

        const conn = pc.current

        if (signal.signal_type === 'answer') {
          if (!conn || conn.signalingState !== 'have-local-offer') return
          try {
            await conn.setRemoteDescription(new RTCSessionDescription(signal.signal_data))
            remoteDescReady.current = true
            console.log('[WebRTC] answer aplicado, drenando ICE queue...')
            await flushIce()
          } catch (e) { console.error('[WebRTC] answer error:', e) }
        }

        else if (signal.signal_type === 'ice-candidate') {
          console.log('[WebRTC] ICE candidate recebido')
          await applyIce(signal.signal_data)
        }
      })
      .subscribe((status) => {
        console.log('[WebRTC] signals channel:', status)
      })

    signalsCh.current = ch
    return () => {
      supabase.removeChannel(ch)
      signalsCh.current = null
    }
  }, [currentUserId, applyIce, flushIce])

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
    remoteAudioRef,
    localVideoRef, remoteVideoRef,
    localStream: localStream.current,
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo,
  }
}
