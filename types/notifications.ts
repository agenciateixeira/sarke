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

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  description?: string
  message?: string
  reference_type?: string
  reference_id?: string
  related_task_id?: string
  related_subtask_id?: string
  related_project_id?: string
  read: boolean
  is_read?: boolean
  read_at?: string
  created_at: string
  updated_at?: string
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
}

export interface CreateAccessRequestData {
  reason?: string
}

export interface ReviewAccessRequestData {
  request_id: string
  approved: boolean
  hours_valid?: number
}
