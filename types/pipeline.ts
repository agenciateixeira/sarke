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

export type BusinessType = 'residencial' | 'comercial' | 'corporativo' | 'publico'

export type ServiceType =
  | 'projeto_arquitetonico'
  | 'projeto_arquitetonico_completo'
  | 'projeto_interiores'
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

  // Código da oportunidade (gerado automaticamente: EST00001, EST00002, ...)
  opportunity_cod: string

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

// =============================================
// AUTOMAÇÕES (FASE 2)
// =============================================

export type AutomationTriggerType =
  | 'stage_changed'      // Quando muda de etapa
  | 'time_in_stage'      // Após X dias na mesma etapa
  | 'inactivity'         // Sem atividades há X dias
  | 'temperature_changed' // Quando temperatura muda
  | 'value_changed'      // Quando valor muda
  | 'scheduled'          // Execução agendada

export type AutomationActionType =
  | 'move_to_stage'      // Mover para outra etapa
  | 'create_task'        // Criar tarefa
  | 'send_notification'  // Enviar notificação
  | 'change_temperature' // Alterar temperatura
  | 'archive_deal'       // Arquivar deal
  | 'assign_owner'       // Atribuir responsável
  | 'send_email'         // Enviar email

export type AutomationLogStatus = 'success' | 'failed' | 'skipped'

export interface AutomationConditions {
  stage_id?: string
  temperature?: Temperature
  days_in_stage?: number
  days_without_activity?: number
  value_min?: number
  value_max?: number
  business_type?: BusinessType
  lead_source?: LeadSource
  status?: DealStatus
}

export interface AutomationActionParams {
  // Para move_to_stage
  target_stage_id?: string

  // Para create_task
  title?: string
  description?: string
  due_days?: number

  // Para send_notification
  message?: string
  users?: string[]

  // Para change_temperature
  temperature?: Temperature

  // Para assign_owner
  owner_id?: string
}

export interface AutomationRule {
  id: string
  name: string
  description?: string
  is_active: boolean

  // Trigger
  trigger_type: AutomationTriggerType
  conditions: AutomationConditions

  // Action
  action_type: AutomationActionType
  action_params: AutomationActionParams

  // Controle
  created_at: string
  updated_at: string
  created_by?: string

  // Estatísticas
  execution_count: number
  last_execution_at?: string
  priority: number
}

export interface AutomationLog {
  id: string
  rule_id: string
  deal_id: string
  executed_at: string
  status: AutomationLogStatus
  trigger_data?: Record<string, any>
  action_result?: Record<string, any>
  error_message?: string
  executed_by?: string
}

export interface AutomationAction {
  id: string
  log_id: string
  deal_id: string
  action_type: AutomationActionType
  action_details: Record<string, any>
  previous_state: Record<string, any>
  can_undo: boolean
  undone_at?: string
  undone_by?: string
  created_at: string
}

export interface AutomationStats {
  rule_id: string
  name: string
  trigger_type: AutomationTriggerType
  action_type: AutomationActionType
  is_active: boolean
  execution_count: number
  last_execution_at?: string
  success_count: number
  failed_count: number
  skipped_count: number
  undone_count: number
}

export interface AutomationRuleFormData {
  name: string
  description?: string
  is_active: boolean
  trigger_type: AutomationTriggerType
  conditions: AutomationConditions
  action_type: AutomationActionType
  action_params: AutomationActionParams
  priority?: number
}

// =============================================
// TEMPLATES DE COMUNICAÇÃO (SPRINT 2)
// =============================================

export type TemplateType = 'email' | 'whatsapp' | 'sms'

export type TemplateCategory =
  | 'follow_up'
  | 'proposal'
  | 'reminder'
  | 'welcome'
  | 'thank_you'
  | 'negotiation'
  | 'closing'
  | 'other'

export type SendStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'

export type RecipientType = 'client' | 'deal' | 'contact'

export type VariableType = 'text' | 'number' | 'date' | 'currency' | 'boolean'

export type VariableCategory = 'client' | 'deal' | 'user' | 'company' | 'system'

export interface CommunicationTemplate {
  id: string
  name: string
  description?: string
  type: TemplateType
  category?: TemplateCategory

  // Conteúdo
  subject?: string // Apenas para emails
  body: string

  // Variáveis
  available_variables: string[]

  // Metadados
  is_active: boolean
  is_default: boolean
  usage_count: number
  last_used_at?: string

  // Auditoria
  created_at: string
  updated_at: string
  created_by?: string
}

export interface TemplateVariable {
  id: string
  variable_key: string
  variable_label: string
  variable_description?: string
  variable_type: VariableType
  variable_category: VariableCategory
  example_value?: string
  format_mask?: string
  created_at: string
}

export interface CommunicationSend {
  id: string
  template_id?: string

  // Destinatário
  recipient_type: RecipientType
  recipient_id: string
  recipient_email?: string
  recipient_phone?: string

  // Conteúdo renderizado
  rendered_subject?: string
  rendered_body: string

  // Status
  status: SendStatus
  provider?: string
  provider_message_id?: string
  error_message?: string

  // Timestamps
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string

  // Contexto
  source?: 'manual' | 'automation' | 'workflow'
  source_id?: string

  // Auditoria
  created_at: string
  created_by?: string
}

export interface TemplateFormData {
  name: string
  description?: string
  type: TemplateType
  category?: TemplateCategory
  subject?: string
  body: string
  available_variables?: string[]
  is_active?: boolean
  is_default?: boolean
}

export interface RenderTemplateParams {
  template_id: string
  variables: Record<string, string>
}

export interface RenderedTemplate {
  subject?: string
  body: string
}

export interface SendTemplateParams {
  template_id: string
  recipient_type: RecipientType
  recipient_id: string
  recipient_email?: string
  recipient_phone?: string
  variables: Record<string, string>
  source?: 'manual' | 'automation' | 'workflow'
  source_id?: string
}

// =============================================
// NOTIFICAÇÕES (SPRINT 4)
// =============================================

export type NotificationType =
  | 'deal_stage_changed'
  | 'deal_assigned'
  | 'automation_executed'
  | 'automation_failed'
  | 'document_approval_requested'
  | 'document_approval_approved'
  | 'document_approval_rejected'
  | 'document_uploaded'
  | 'task_assigned'
  | 'deadline_approaching'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationChannel = 'in_app' | 'email' | 'both' | 'none'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  action_label?: string
  data: Record<string, any>
  deal_id?: string
  document_id?: string
  automation_log_id?: string
  read: boolean
  read_at?: string
  priority: NotificationPriority
  created_at: string
  expires_at?: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  notification_type: string
  enabled: boolean
  channel: NotificationChannel
  email_digest: boolean
  digest_frequency?: 'daily' | 'weekly'
  digest_time?: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferenceFormData {
  notification_type: string
  enabled: boolean
  channel: NotificationChannel
  email_digest?: boolean
  digest_frequency?: 'daily' | 'weekly'
  digest_time?: string
}

// =============================================
// DOCUMENTOS (SPRINT 4)
// =============================================

export type DocumentCategory =
  | 'proposta'
  | 'contrato'
  | 'planta'
  | 'orcamento'
  | 'planilha'
  | 'rrt_art'
  | 'imagem'
  | 'email'
  | 'outro'

export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface DealDocument {
  id: string
  deal_id: string
  category: DocumentCategory
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  version: number
  is_current: boolean
  parent_document_id?: string
  description?: string
  tags?: string[]
  status: DocumentStatus
  requires_approval: boolean
  is_shared: boolean
  shared_with_client: boolean
  uploaded_by: string
  uploaded_at: string
  created_at: string
  updated_at: string

  // Relacionamentos expandidos
  uploader?: {
    id: string
    name: string
    avatar_url?: string
  }
}

export interface DocumentVersion {
  id: string
  document_id: string
  version: number
  file_path: string
  file_size: number
  changes_description?: string
  uploaded_by: string
  uploaded_at: string

  // Relacionamentos expandidos
  uploader?: {
    id: string
    name: string
    avatar_url?: string
  }
}

export interface DocumentApproval {
  id: string
  document_id: string
  approver_id: string
  status: ApprovalStatus
  comment?: string
  required: boolean
  order_index: number
  approved_at?: string
  created_at: string

  // Relacionamentos expandidos
  approver?: {
    id: string
    name: string
    avatar_url?: string
  }
  document?: DealDocument
}

export interface DocumentSharedLink {
  id: string
  document_id: string
  token: string
  password_hash?: string
  expires_at?: string
  max_downloads?: number
  download_count: number
  created_by: string
  created_at: string
  last_accessed_at?: string
}

export interface DocumentLinkAccess {
  id: string
  link_id: string
  accessed_at: string
  ip_address?: string
  user_agent?: string
  action: 'view' | 'download'
  success: boolean
}

export interface DealDocumentFormData {
  deal_id: string
  category: DocumentCategory
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  description?: string
  tags?: string[]
  requires_approval?: boolean
  shared_with_client?: boolean
}

export interface DocumentApprovalFormData {
  document_id: string
  approver_id: string
  required?: boolean
  order_index?: number
}

export interface DocumentSharedLinkFormData {
  document_id: string
  password?: string
  expires_at?: string
  max_downloads?: number
}

export interface DocumentComment {
  id: string
  document_id: string
  user_id: string
  comment: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    name: string
    avatar_url?: string
  }
}
