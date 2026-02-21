// =============================================
// ENUMS e TIPOS
// =============================================

export type LeadSource =
  | 'website'
  | 'indicacao'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'google_ads'
  | 'facebook_ads'
  | 'evento'
  | 'cold_call'
  | 'email_marketing'
  | 'parceria'
  | 'retorno'
  | 'outros'

export type BusinessType = 'residencial' | 'comercial' | 'industrial' | 'publico'

export type ServiceType =
  | 'projeto_arquitetonico'
  | 'gestao_obra'
  | 'consultoria'
  | 'regularizacao'
  | 'reformas'
  | 'acompanhamento'
  | 'outros'

export type Temperature = 'quente' | 'morno' | 'frio'

export type Urgency = 'alta' | 'media' | 'baixa'

export type DealStatus = 'open' | 'won' | 'lost'

// =============================================
// INTERFACES
// =============================================

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

  // Relacionamentos
  client_id?: string
  project_id?: string
  stage_id: string
  owner_id?: string

  // Valores
  value?: number
  probability: number

  // Datas
  expected_close_date?: string
  actual_close_date?: string

  // Status
  status: DealStatus
  lost_reason?: string

  // Qualificação do Lead (FASE 1)
  lead_source?: LeadSource
  lead_source_detail?: string
  business_type?: BusinessType
  service_type?: ServiceType
  temperature?: Temperature
  urgency?: Urgency

  // Follow-up
  last_contact_date?: string
  next_follow_up_date?: string

  // Organização
  tags?: string[]
  notes?: string

  // Arquivamento
  archived?: boolean
  archived_at?: string
  archived_by?: string

  // Extras
  competitors?: string
  decision_deadline?: string

  // Metadados
  created_at: string
  updated_at: string

  // Relacionamentos expandidos
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

  // Campos de qualificação (FASE 1)
  lead_source?: LeadSource
  lead_source_detail?: string
  business_type?: BusinessType
  service_type?: ServiceType
  temperature?: Temperature
  urgency?: Urgency

  // Follow-up
  next_follow_up_date?: string

  // Organização
  tags?: string[]
  notes?: string

  // Extras
  competitors?: string
  decision_deadline?: string
}

// =============================================
// ATIVIDADES E INTERAÇÕES (FASE 2)
// =============================================

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task' | 'status_change'

export interface DealActivity {
  id: string
  deal_id: string
  type: ActivityType
  title: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string

  // Campos específicos
  due_date?: string
  completed_at?: string
  duration_minutes?: number

  // Metadados
  metadata?: Record<string, any>

  // Relacionamentos expandidos
  creator?: {
    id: string
    name: string
    avatar_url?: string
  }
}

export interface DealActivityFormData {
  type: ActivityType
  title: string
  description?: string
  due_date?: string
  duration_minutes?: number
}

export interface DealAttachment {
  id: string
  deal_id: string
  activity_id?: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_by: string
  uploaded_at: string
  description?: string

  // Relacionamentos expandidos
  uploader?: {
    id: string
    name: string
    avatar_url?: string
  }
}

// =============================================
// ANALYTICS E MÉTRICAS (FASE 2)
// =============================================

export interface PipelineStageMetrics {
  stage_id: string
  stage_name: string
  order_index: number
  deals_count: number
  total_value: number
  weighted_value: number
  avg_probability: number
  avg_deal_value: number
}

export interface StageConversionRate {
  stage_id: string
  stage_name: string
  order_index: number
  deals_entered: number
  deals_advanced: number
  deals_regressed: number
  conversion_rate: number
}

export interface StageAverageDuration {
  stage_id: string
  stage_name: string
  order_index: number
  deals_count: number
  avg_days: number
  min_days: number
  max_days: number
}

export interface PipelinePerformance {
  active_deals: number
  won_deals_30d: number
  lost_deals_30d: number
  active_pipeline_value: number
  won_value_30d: number
  avg_won_deal_value: number
  win_rate_30d: number
  churn_rate_30d: number
}

export interface OwnerPerformance {
  owner_id: string
  owner_name: string
  active_deals: number
  won_deals_30d: number
  lost_deals_30d: number
  active_pipeline_value: number
  won_value_30d: number
  win_rate_30d: number
}

export interface ChurnAnalysis {
  month: string
  churned_deals: number
  won_deals: number
  reactivated_deals: number
  churn_rate: number
  reactivation_rate: number
}

export interface LostReasonAnalysis {
  lost_reason: string
  count: number
  total_value_lost: number
  avg_value_lost: number
  percentage: number
}

export interface RevenueForecast {
  month: string
  forecasted_revenue: number
  confidence_level: 'Low' | 'Medium' | 'High'
}

export interface DealActivityStats {
  deal_id: string
  total_activities: number
  notes_count: number
  calls_count: number
  emails_count: number
  meetings_count: number
  tasks_count: number
  completed_tasks_count: number
  overdue_tasks_count: number
  last_activity_at: string
}
