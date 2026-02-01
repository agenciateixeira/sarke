// =============================================
// TIPOS PARA MELHORIAS DO CHAT
// =============================================

export interface TypingIndicator {
  id: string
  user_id: string
  conversation_id: string
  conversation_type: 'direct' | 'group'
  is_typing: boolean
  updated_at: string
}

export interface UserTag {
  id: string
  user_id: string // Quem criou a tag
  tagged_user_id: string // Quem recebeu a tag
  tag_name: string
  tag_color: string
  created_at: string
}

export interface ScheduledMeeting {
  id: string
  title: string
  description?: string
  scheduled_for: string
  duration_minutes: number
  created_by: string
  conversation_id?: string
  conversation_type?: 'direct' | 'group'
  meeting_url?: string
  status: 'scheduled' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
}

export interface MeetingParticipant {
  id: string
  meeting_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface ChatTask {
  id: string
  title: string
  description?: string
  assigned_to?: string
  created_by: string
  conversation_id?: string
  conversation_type?: 'direct' | 'group'
  due_date?: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  parent_task_id?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

// Tipos para comandos de barra "/"
export type SlashCommand =
  | { type: 'meeting'; data: Partial<ScheduledMeeting> }
  | { type: 'task'; data: Partial<ChatTask> }
  | { type: 'subtask'; data: Partial<ChatTask>; parentId: string }
