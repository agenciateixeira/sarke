// =============================================
// TIPOS WEBRTC
// =============================================

export type CallType = 'audio' | 'video' | 'screen'

export type CallStatus =
  | 'calling'    // Chamando
  | 'ringing'    // Tocando no receptor
  | 'accepted'   // Aceita
  | 'rejected'   // Rejeitada
  | 'ended'      // Finalizada
  | 'missed'     // Perdida
  | 'failed'     // Falhou

export interface Call {
  id: string
  type: CallType
  caller_id: string
  receiver_id: string
  status: CallStatus
  started_at?: string
  ended_at?: string
  duration?: number
  created_at: string
  updated_at: string
}

export interface CallWithUsers extends Call {
  caller_name: string
  caller_avatar?: string
  receiver_name: string
  receiver_avatar?: string
}

export type SignalType = 'offer' | 'answer' | 'ice-candidate'

export interface WebRTCSignal {
  id: string
  call_id: string
  from_user_id: string
  to_user_id: string
  signal_type: SignalType
  signal_data: RTCSessionDescriptionInit | RTCIceCandidateInit
  created_at: string
}

export interface CreateCallData {
  receiver_id: string
  type: CallType
}

export interface SendSignalData {
  call_id: string
  to_user_id: string
  signal_type: SignalType
  signal_data: RTCSessionDescriptionInit | RTCIceCandidateInit
}
