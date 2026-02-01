// =============================================
// TIPOS DE NOTIFICAÇÕES E SOLICITAÇÕES
// =============================================

export type AccessRequestStatus = 'pending' | 'approved' | 'denied'

export interface AccessRequest {
  id: string
  user_id: string
  reason?: string
  status: AccessRequestStatus
  reviewed_by?: string
  reviewed_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface AccessRequestWithUser extends AccessRequest {
  user_name: string
  user_avatar?: string
  reviewer_name?: string
}

export type NotificationType =
  | 'access_request'
  | 'access_approved'
  | 'access_denied'
  | 'mention'
  | 'task_assigned'
  | 'message'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  description?: string
  reference_type?: string
  reference_id?: string
  read: boolean
  created_at: string
}

export interface CreateAccessRequestData {
  reason?: string
}

export interface ReviewAccessRequestData {
  request_id: string
  approved: boolean
  hours_valid?: number
}
