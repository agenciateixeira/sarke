export interface PipelineStage {
  id: string
  name: string
  description?: string
  order_index: number
  color: string
  created_at: string
}

export interface Deal {
  id: string
  title: string
  description?: string
  client_id?: string
  project_id?: string
  stage_id: string
  value?: number
  probability: number
  expected_close_date?: string
  actual_close_date?: string
  owner_id?: string
  status: 'open' | 'won' | 'lost'
  lost_reason?: string
  created_at: string
  updated_at: string
  // Relacionamentos
  client?: {
    id: string
    name: string
    email?: string
  }
  owner?: {
    id: string
    name: string
    avatar_url?: string
  }
}

export interface DealFormData {
  title: string
  description?: string
  client_id?: string
  stage_id: string
  value?: number
  probability: number
  expected_close_date?: string
}
