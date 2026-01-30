// Tipos para Sistema de Tarefas (Estilo ClickUp) - Sarke

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

// =============================================
// PIPELINE COLUMNS
// =============================================

export interface PipelineColumn {
  id: string
  name: string
  order_index: number
  color: string
  created_at: string
  updated_at: string
}

// =============================================
// TASKS
// =============================================

export interface Task {
  id: string

  // Informações básicas
  title: string
  description?: string

  // Pipeline
  column_id?: string
  order_in_column: number

  // Metadados
  status: TaskStatus
  priority: TaskPriority

  // Responsável e datas
  assigned_to?: string
  due_date?: string
  start_date?: string
  completed_date?: string

  // Tracking de tempo
  estimated_time_minutes?: number
  tracked_time_minutes: number

  // Cliente/Projeto (opcional)
  client_id?: string
  project_id?: string

  // Flags
  is_completed: boolean
  is_archived: boolean

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string
}

// =============================================
// SUBTASKS
// =============================================

export interface Subtask {
  id: string
  task_id: string

  // Informações básicas
  title: string
  description?: string

  // Metadados
  order_index: number
  priority: TaskPriority

  // Responsável e datas
  assigned_to?: string
  due_date?: string

  // Flags
  is_completed: boolean
  completed_at?: string
  completed_by?: string

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string
}

// =============================================
// COMMENTS
// =============================================

export interface TaskComment {
  id: string
  task_id: string
  content: string
  created_by?: string
  created_at: string
  updated_at: string
}

// =============================================
// ATTACHMENTS
// =============================================

export interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_type?: string
  file_size?: number
  uploaded_by?: string
  created_at: string
}

// =============================================
// VIEWS
// =============================================

export interface TaskWithDetails extends Task {
  // Informações do responsável
  assigned_to_name?: string
  assigned_to_avatar?: string

  // Informações da coluna
  column_name?: string
  column_color?: string

  // Informações do cliente
  client_name?: string

  // Contadores
  subtasks_count: number
  completed_subtasks_count: number
  comments_count: number
  attachments_count: number

  // Time tracking
  time_entries_count: number
  total_tracked_minutes: number
  has_running_timer: boolean

  // Criado por
  created_by_name?: string
}

export interface SubtaskWithDetails extends Subtask {
  // Informações do responsável
  assigned_to_name?: string
  assigned_to_avatar?: string

  // Informações de quem completou
  completed_by_name?: string

  // Metadados
  created_by_name?: string
}

export interface TaskCommentWithDetails extends TaskComment {
  // Informações de quem criou
  created_by_name?: string
  created_by_avatar?: string
}

// =============================================
// CREATE/UPDATE TYPES
// =============================================

export interface CreateTaskData {
  title: string
  description?: string
  column_id?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string
  start_date?: string
  estimated_time_minutes?: number
  client_id?: string
  project_id?: string
}

export interface UpdateTaskData {
  title?: string
  description?: string
  column_id?: string
  order_in_column?: number
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string
  start_date?: string
  completed_date?: string
  estimated_time_minutes?: number
  tracked_time_minutes?: number
  client_id?: string
  project_id?: string
  is_completed?: boolean
  is_archived?: boolean
}

export interface CreateSubtaskData {
  task_id: string
  title: string
  description?: string
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string
}

export interface UpdateSubtaskData {
  title?: string
  description?: string
  order_index?: number
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string
  is_completed?: boolean
}

export interface CreateColumnData {
  name: string
  order_index: number
  color?: string
}

export interface UpdateColumnData {
  name?: string
  order_index?: number
  color?: string
}

// =============================================
// TIME TRACKING
// =============================================

export interface TaskTimeEntry {
  id: string
  task_id: string
  user_id?: string
  user_name?: string
  started_at: string
  ended_at?: string
  duration_minutes?: number
  notes?: string
  is_running: boolean
  created_at: string
  updated_at: string
}

export interface CreateTimeEntryData {
  task_id: string
  notes?: string
}

export interface UpdateTimeEntryData {
  ended_at?: string
  duration_minutes?: number
  notes?: string
  is_running?: boolean
}

// =============================================
// LABELS
// =============================================

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  review: 'Em Revisão',
  completed: 'Concluído',
  blocked: 'Bloqueado',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  completed: '#10b981',
  blocked: '#ef4444',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
}

export const TASK_PRIORITY_ICONS: Record<TaskPriority, string> = {
  low: '↓',
  medium: '→',
  high: '↑',
  urgent: '⚠️',
}
