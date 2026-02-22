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
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_completed'
  | 'comment_added'
  | 'project_updated'
  | 'message'
  // Pipeline notifications
  | 'deal_stage_changed'
  | 'deal_assigned'
  | 'automation_executed'
  | 'automation_failed'
  | 'document_approval_requested'
  | 'document_approval_approved'
  | 'document_approval_rejected'
  | 'document_uploaded'
  | 'deadline_approaching'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  description?: string
  message?: string

  // Action/Link
  link?: string
  action_label?: string

  // Old reference fields (backwards compatibility)
  reference_type?: string
  reference_id?: string
  related_task_id?: string
  related_subtask_id?: string
  related_project_id?: string

  // Pipeline-specific fields
  deal_id?: string
  document_id?: string
  automation_log_id?: string
  data?: Record<string, any>

  // Priority
  priority?: 'low' | 'normal' | 'high' | 'urgent'

  // Status
  read: boolean
  is_read?: boolean
  read_at?: string

  // Timestamps
  created_at: string
  updated_at?: string
  expires_at?: string
}

export const notificationTypeLabels: Record<string, string> = {
  access_request: 'Solicitação de Acesso',
  access_approved: 'Acesso Aprovado',
  access_denied: 'Acesso Negado',
  mention: 'Menção',
  task_assigned: 'Tarefa Atribuída',
  task_due_soon: 'Prazo Próximo',
  task_overdue: 'Tarefa Atrasada',
  task_completed: 'Tarefa Concluída',
  comment_added: 'Novo Comentário',
  project_updated: 'Projeto Atualizado',
  message: 'Mensagem',
  // Pipeline
  deal_stage_changed: 'Etapa Alterada',
  deal_assigned: 'Deal Atribuído',
  automation_executed: 'Automação Executada',
  automation_failed: 'Automação Falhou',
  document_approval_requested: 'Aprovação Solicitada',
  document_approval_approved: 'Documento Aprovado',
  document_approval_rejected: 'Documento Rejeitado',
  document_uploaded: 'Documento Enviado',
  deadline_approaching: 'Prazo Próximo',
}

export const notificationTypeColors: Record<string, string> = {
  access_request: 'bg-blue-100 text-blue-800',
  access_approved: 'bg-green-100 text-green-800',
  access_denied: 'bg-red-100 text-red-800',
  mention: 'bg-purple-100 text-purple-800',
  task_assigned: 'bg-blue-100 text-blue-800',
  task_due_soon: 'bg-yellow-100 text-yellow-800',
  task_overdue: 'bg-red-100 text-red-800',
  task_completed: 'bg-green-100 text-green-800',
  comment_added: 'bg-purple-100 text-purple-800',
  project_updated: 'bg-gray-100 text-gray-800',
  message: 'bg-indigo-100 text-indigo-800',
  // Pipeline
  deal_stage_changed: 'bg-blue-100 text-blue-800',
  deal_assigned: 'bg-purple-100 text-purple-800',
  automation_executed: 'bg-green-100 text-green-800',
  automation_failed: 'bg-red-100 text-red-800',
  document_approval_requested: 'bg-yellow-100 text-yellow-800',
  document_approval_approved: 'bg-green-100 text-green-800',
  document_approval_rejected: 'bg-red-100 text-red-800',
  document_uploaded: 'bg-blue-100 text-blue-800',
  deadline_approaching: 'bg-orange-100 text-orange-800',
}

export interface CreateAccessRequestData {
  reason?: string
}

export interface ReviewAccessRequestData {
  request_id: string
  approved: boolean
  hours_valid?: number
}
