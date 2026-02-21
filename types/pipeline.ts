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
