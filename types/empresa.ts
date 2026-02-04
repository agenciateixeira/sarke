// =====================================================
// TIPOS DO SISTEMA DE EMPRESAS PARCEIRAS
// =====================================================

export type StatusEmpresa = 'ativa' | 'inativa' | 'bloqueada'

export type StatusVinculoEmpresa =
  | 'pendente'
  | 'proposta_enviada'
  | 'em_negociacao'
  | 'contratada'
  | 'em_execucao'
  | 'concluida'
  | 'cancelada'

export type TipoServico =
  // Serviços preliminares
  | 'topografia'
  | 'sondagem'
  | 'projeto'

  // Fundação e estrutura
  | 'terraplenagem'
  | 'fundacao'
  | 'estrutura_concreto'
  | 'estrutura_metalica'
  | 'alvenaria'

  // Cobertura
  | 'telhado'
  | 'impermeabilizacao'

  // Instalações
  | 'eletrica'
  | 'hidraulica'
  | 'esgoto'
  | 'gas'
  | 'ar_condicionado'
  | 'incendio'
  | 'automacao'

  // Acabamentos
  | 'revestimento_piso'
  | 'revestimento_parede'
  | 'pintura'
  | 'gesso'
  | 'forro'
  | 'esquadrias'
  | 'vidracaria'
  | 'marcenaria'
  | 'loucas_metais'
  | 'serralheria'

  // Externos
  | 'paisagismo'
  | 'calcada'
  | 'muro'
  | 'piscina'
  | 'decoracao'

  // Outros
  | 'limpeza'
  | 'transporte'
  | 'locacao_equipamentos'
  | 'outro'

// =====================================================
// INTERFACE: Empresa Parceira
// =====================================================

export interface EmpresaParceira {
  id: string

  // Identificação
  nome: string
  nome_fantasia?: string
  cnpj?: string
  inscricao_estadual?: string
  inscricao_municipal?: string

  // Contatos
  responsavel?: string
  telefone?: string
  celular?: string
  email?: string
  site?: string

  // Endereço
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string

  // Serviços
  servicos: string[]
  especialidade_principal?: string

  // Documentação
  logo_url?: string
  contrato_url?: string

  // Seguros e certidões
  seguro_vigente: boolean
  seguro_vencimento?: string
  certidao_negativa_url?: string
  certidao_vencimento?: string

  // Dados bancários
  banco?: string
  agencia?: string
  conta?: string
  tipo_conta?: string

  // Avaliação
  avaliacao_media: number
  numero_avaliacoes: number
  total_obras_executadas: number

  // Valores
  valor_total_contratado: number
  valor_total_pago: number

  // Status
  status: StatusEmpresa
  motivo_bloqueio?: string

  // Observações
  observacoes?: string
  pontos_fortes?: string
  pontos_atencao?: string

  // Relacionamentos carregados
  equipe_tecnica?: EmpresaEquipeTecnica[]
  equipamentos?: EmpresaEquipamento[]
  avaliacoes?: EmpresaAvaliacao[]

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string
}

// =====================================================
// INTERFACE: Equipe Técnica da Empresa
// =====================================================

export interface EmpresaEquipeTecnica {
  id: string
  empresa_id: string

  nome: string
  funcao: string
  cpf?: string
  telefone?: string
  email?: string

  // Qualificações
  formacao?: string
  crea_cau?: string
  certificados?: string[]

  // Status
  ativo: boolean

  created_at: string
  updated_at: string
}

// =====================================================
// INTERFACE: Equipamentos da Empresa
// =====================================================

export interface EmpresaEquipamento {
  id: string
  empresa_id: string

  tipo_equipamento: string
  modelo?: string
  quantidade: number

  // Status
  disponivel: boolean

  observacoes?: string

  created_at: string
}

// =====================================================
// INTERFACE: Vínculo Empresa-Cronograma
// =====================================================

export interface CronogramaEmpresaVinculo {
  id: string

  cronograma_id: string
  empresa_id: string

  // Relacionamentos carregados
  cronograma?: {
    id: string
    nome: string
  }
  empresa?: EmpresaParceira

  // Status
  status: StatusVinculoEmpresa

  // Valores
  valor_contratado?: number
  valor_executado: number
  valor_pago: number

  // Datas previstas
  data_inicio_prevista?: string
  data_fim_prevista?: string

  // Datas reais
  data_mobilizacao?: string
  data_desmobilizacao?: string

  // Performance
  percentual_conclusao: number
  avaliacao?: number
  avaliacao_observacoes?: string

  // Documentos
  contrato_url?: string
  medicoes?: string[]

  // Observações
  observacoes?: string

  // Metadados
  created_at: string
  updated_at: string
}

// =====================================================
// INTERFACE: Avaliação de Empresa
// =====================================================

export interface EmpresaAvaliacao {
  id: string

  empresa_id: string
  cronograma_id?: string
  obra_id?: string

  // Relacionamentos
  empresa?: EmpresaParceira
  cronograma?: {
    id: string
    nome: string
  }
  obra?: {
    id: string
    nome: string
  }

  // Avaliação geral
  avaliacao_geral: number

  // Critérios específicos
  qualidade_servico?: number
  cumprimento_prazo?: number
  seguranca_trabalho?: number
  organizacao_limpeza?: number
  atendimento?: number

  // Feedback
  pontos_positivos?: string
  pontos_negativos?: string
  recomenda: boolean

  // Quem avaliou
  avaliado_por?: string
  avaliado_por_profile?: {
    id: string
    name: string
  }
  data_avaliacao: string
}

// =====================================================
// TIPOS AUXILIARES PARA UI
// =====================================================

// Para listagem com performance
export interface EmpresaComPerformance extends EmpresaParceira {
  obras_em_execucao: number
  obras_concluidas: number
  valor_contratos_ativos: number
  valor_executado_ativos: number
  media_dias_obra?: number
}

// Para seleção de empresa
export interface EmpresaOption {
  value: string
  label: string
  servicos: string[]
  avaliacao: number
  disponivel: boolean
}

// Documento vencido (alerta)
export interface DocumentoVencido {
  empresa_id: string
  empresa_nome: string
  tipo_documento: string
  data_vencimento: string
  dias_vencido: number
}

// Filtros para listagem
export interface EmpresaFiltros {
  search?: string
  status?: StatusEmpresa
  servicos?: string[]
  avaliacao_minima?: number
  cidade?: string
  estado?: string
  apenas_disponiveis?: boolean
}

export interface VinculoFiltros {
  cronograma_id?: string
  status?: StatusVinculoEmpresa
  data_inicio?: string
  data_fim?: string
}

// Dashboard de empresa
export interface EmpresaDashboard {
  empresa: EmpresaParceira
  obras_ativas: number
  obras_concluidas_ano: number
  faturamento_ano: number
  faturamento_mes: number
  proximas_mobilizacoes: {
    cronograma_id: string
    cronograma_nome: string
    data_prevista: string
  }[]
  alertas: {
    tipo: 'documento_vencido' | 'avaliacao_baixa' | 'atraso'
    mensagem: string
    prioridade: 'alta' | 'media' | 'baixa'
  }[]
}

// Dados da anamnese para empresas
export interface AnamneseEmpresasData {
  servicos_necessarios: {
    servico: string
    descricao: string
    empresa_id?: string // se já tiver
    empresa_nome?: string
    valor_estimado?: number
  }[]
  empresas_ja_contratadas: {
    empresa_id: string
    servico: string
    valor: number
  }[]
}

// Template de empresas por tipo de obra
export interface TemplateEmpresasObra {
  tipo_obra: string
  subtipo?: string
  empresas_padrao: {
    servico: string
    obrigatorio: boolean
    ordem_entrada: number
    duracao_media_dias: number
  }[]
}
