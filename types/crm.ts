// Tipos para CRM de Arquitetura - Sarke

export type ClientType = 'pessoa_fisica' | 'pessoa_juridica'
export type ClientStatus = 'active' | 'inactive' | 'prospect'

export type EstadoCivil = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel'

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  cpf_cnpj?: string
  type?: ClientType

  // Documentos
  rg?: string
  estado_civil?: EstadoCivil
  profissao?: string
  cnpj?: string
  razao_social?: string
  representante_legal?: string

  // Informações adicionais da empresa
  website?: string
  inscricao_estadual?: string
  inscricao_municipal?: string

  // Endereço
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  address_zip?: string

  notes?: string
  status: ClientStatus

  // Pipeline
  pipeline_stage_id?: string
  estimated_value?: number
  probability?: number

  created_by?: string
  created_at: string
  updated_at: string
}

export type ProjectType =
  | 'residencial'
  | 'comercial'
  | 'industrial'
  | 'reforma'
  | 'paisagismo'
  | 'interiores'
  | 'urbanismo'
  | 'outro'

export type ProjectStatus =
  | 'prospeccao'
  | 'orcamento'
  | 'aprovado'
  | 'em_andamento'
  | 'em_obra'
  | 'concluido'
  | 'cancelado'
  | 'pausado'

export type ProjectPriority = 'baixa' | 'media' | 'alta' | 'urgente'

export interface ArchitectureProject {
  id: string
  name: string
  description?: string
  client_id?: string

  project_type?: ProjectType
  estimated_value?: number
  final_value?: number
  status: ProjectStatus

  start_date?: string
  estimated_end_date?: string
  actual_end_date?: string

  area_m2?: number
  location?: string
  priority: ProjectPriority

  architect_id?: string

  created_by?: string
  created_at: string
  updated_at: string
}

export interface PipelineStage {
  id: string
  name: string
  description?: string
  order_index: number
  color: string
  created_at: string
}

export type DealStatus = 'open' | 'won' | 'lost'

export interface Deal {
  id: string
  title: string
  description?: string
  client_id?: string
  project_id?: string

  stage_id?: string
  value?: number
  probability: number

  expected_close_date?: string
  actual_close_date?: string

  owner_id?: string
  status: DealStatus
  lost_reason?: string

  created_at: string
  updated_at: string
}

export type ActivityType = 'call' | 'meeting' | 'email' | 'note' | 'task' | 'deadline'
export type ActivityStatus = 'pending' | 'completed' | 'cancelled'

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description?: string

  client_id?: string
  project_id?: string
  deal_id?: string

  scheduled_at?: string
  completed_at?: string
  status: ActivityStatus

  assigned_to?: string
  created_by?: string

  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  name: string
  description?: string
  file_path: string
  file_type?: string
  file_size?: number

  client_id?: string
  project_id?: string

  uploaded_by?: string
  created_at: string
}

// Views
export interface ProjectWithClient extends ArchitectureProject {
  client_name?: string
  client_email?: string
  client_phone?: string
  architect_name?: string
}

export interface PipelineOverview {
  stage_name: string
  order_index: number
  color: string
  deal_count: number
  total_value: number
  avg_probability: number
}

// Estatísticas do Dashboard
export interface DashboardStats {
  total_clients: number
  active_projects: number
  projects_in_progress: number
  total_revenue: number
  monthly_revenue: number
  open_deals: number
  deals_value: number
  pending_activities: number
}

// Labels de status em português
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  prospeccao: 'Prospecção',
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  em_andamento: 'Em Andamento',
  em_obra: 'Em Obra',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  pausado: 'Pausado',
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  industrial: 'Industrial',
  reforma: 'Reforma',
  paisagismo: 'Paisagismo',
  interiores: 'Interiores',
  urbanismo: 'Urbanismo',
  outro: 'Outro',
}

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: 'Ligação',
  meeting: 'Reunião',
  email: 'E-mail',
  note: 'Nota',
  task: 'Tarefa',
  deadline: 'Prazo',
}

// =============================================
// NOVOS TIPOS - CONTRATOS E ATIVIDADES
// =============================================

export type PaymentMethod = 'boleto' | 'transferencia' | 'pix' | 'cartao' | 'cheque' | 'dinheiro'
export type ContractStatus = 'draft' | 'pending' | 'approved' | 'active' | 'completed' | 'cancelled' | 'suspended'
export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type ClientActivityType = 'call' | 'email' | 'meeting' | 'visit' | 'proposal' | 'contract' | 'payment' | 'note' | 'task' | 'milestone'
export type ClientActivityStatus = 'pending' | 'completed' | 'cancelled'

export interface Contract {
  id: string
  client_id: string

  // Informações do contrato
  contract_number?: string
  object: string
  description: string

  // Valores e prazos
  contract_value: number
  start_date?: string
  end_date?: string
  deadline_months?: number

  // Pagamento
  payment_method?: PaymentMethod
  installments?: number

  // Status
  status: ContractStatus

  // Anexos e observações
  contract_file_url?: string
  notes?: string

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ContractInstallment {
  id: string
  contract_id: string

  // Informações da parcela
  installment_number: number
  due_date: string
  amount: number

  // Status de pagamento
  status: InstallmentStatus
  payment_date?: string
  payment_method?: string
  payment_proof_url?: string

  // Metadados
  notes?: string
  created_at: string
  updated_at: string
}

export interface ClientActivity {
  id: string
  client_id: string

  // Tipo de atividade
  activity_type: ClientActivityType
  title: string
  description?: string

  // Relacionamentos
  contract_id?: string

  // Agendamento
  scheduled_date?: string
  completed_date?: string

  // Status
  status: ClientActivityStatus

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PipelineStageData {
  id: string
  name: string
  order_index: number
  color: string
  created_at: string
  updated_at: string
}

// Views
export interface ClientWithPipeline extends Client {
  pipeline_stage_name?: string
  pipeline_stage_color?: string
  pipeline_stage_order?: number
  contracts_count?: number
  activities_count?: number
  total_contract_value?: number
}

export interface ContractWithDetails extends Contract {
  client_name?: string
  client_email?: string
  client_phone?: string
  installments_count?: number
  paid_amount?: number
  pending_amount?: number
  overdue_amount?: number
}

// Labels
export const ESTADO_CIVIL_LABELS: Record<EstadoCivil, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  uniao_estavel: 'União Estável',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  boleto: 'Boleto',
  transferencia: 'Transferência',
  pix: 'PIX',
  cartao: 'Cartão',
  cheque: 'Cheque',
  dinheiro: 'Dinheiro',
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Rascunho',
  pending: 'Pendente Aprovação',
  approved: 'Aprovado',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  suspended: 'Suspenso',
}

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
}

export const CLIENT_ACTIVITY_TYPE_LABELS: Record<ClientActivityType, string> = {
  call: 'Ligação',
  email: 'E-mail',
  meeting: 'Reunião',
  visit: 'Visita',
  proposal: 'Proposta',
  contract: 'Contrato',
  payment: 'Pagamento',
  note: 'Nota',
  task: 'Tarefa',
  milestone: 'Marco',
}
