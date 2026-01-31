// Types para Sistema de Chat - Sarke

export interface ChatGroup {
  id: string
  name: string
  description?: string
  avatar_url?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface Message {
  id: string
  sender_id: string
  content?: string
  media_url?: string
  media_type?: 'image' | 'video' | 'audio' | 'file'
  group_id?: string
  recipient_id?: string
  thread_id?: string
  is_thread_reply: boolean
  thread_reply_count: number
  mentioned_users: string[]
  created_at: string
  updated_at: string
}

export interface MessageWithSender extends Message {
  sender_name: string
  sender_avatar?: string
}

export interface MessageRead {
  id: string
  message_id: string
  user_id: string
  read_at: string
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name: string
  avatar_url?: string
  last_message?: Message
  last_message_at?: string
  unread_count: number
  members?: GroupMember[]
  created_by?: string
}

export interface CreateMessageData {
  content?: string
  media_url?: string
  media_type?: 'image' | 'video' | 'audio' | 'file'
  group_id?: string
  recipient_id?: string
  thread_id?: string
  is_thread_reply?: boolean
  mentioned_users?: string[]
}

export interface CreateGroupData {
  name: string
  description?: string
  member_ids: string[]
}

export interface TypingUser {
  user_id: string
  user_name: string
  typing: boolean
  recording: boolean
}

export interface PresenceState {
  user_id: string
  typing: boolean
  recording: boolean
}

export interface MentionPart {
  type: 'text' | 'mention'
  content: string
  userId?: string
}
