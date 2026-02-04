export type TipoObra = 'residencial' | 'comercial' | 'industrial' | 'reforma'

export type StatusObra =
  | 'planejamento'
  | 'em_andamento'
  | 'pausada'
  | 'concluida'
  | 'cancelada'

export type StatusEtapa =
  | 'pendente'
  | 'em_andamento'
  | 'concluida'
  | 'atrasada'

export type StatusMedicao =
  | 'rascunho'
  | 'enviada'
  | 'aprovada'
  | 'rejeitada'
  | 'paga'

export type TipoFotoObra =
  | 'progresso'
  | 'antes'
  | 'durante'
  | 'depois'
  | 'problema'
  | 'solucao'

export type TipoDocumentoObra =
  | 'projeto'
  | 'memorial'
  | 'orcamento'
  | 'contrato'
  | 'alvara'
  | 'art_rrt'
  | 'medicao'
  | 'outro'

export type ClimaRDO =
  | 'sol'
  | 'chuva'
  | 'nublado'
  | 'parcialmente_nublado'

export interface Obra {
  id: string
  nome: string
  descricao?: string
  cliente_id?: string
  cliente?: {
    id: string
    name: string
    email?: string
    phone?: string
  }

  // Endereço
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string

  // Informações do projeto
  area_construida?: number
  area_terreno?: number
  tipo_obra?: TipoObra
  valor_contrato?: number

  // Datas e prazos
  data_inicio?: string
  data_previsao_termino?: string
  data_termino_real?: string
  duracao_meses?: number

  // Status e progresso
  status: StatusObra
  progresso_percentual: number

  // Responsáveis
  engenheiro_responsavel_id?: string
  arquiteto_responsavel_id?: string
  fiscal_responsavel_id?: string

  engenheiro?: { id: string; name: string }
  arquiteto?: { id: string; name: string }
  fiscal?: { id: string; name: string }

  // Documentação
  alvara_numero?: string
  alvara_data_emissao?: string
  art_rrt_numero?: string

  // Observações
  observacoes?: string
  riscos?: string

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ObraFoto {
  id: string
  obra_id: string
  titulo?: string
  descricao?: string
  url: string
  tipo: TipoFotoObra
  data_foto?: string
  latitude?: number
  longitude?: number
  uploaded_by?: string
  created_at: string
}

export interface ObraDocumento {
  id: string
  obra_id: string
  titulo: string
  descricao?: string
  tipo?: TipoDocumentoObra
  url: string
  tamanho_bytes?: number
  mime_type?: string
  uploaded_by?: string
  created_at: string
}

export interface ObraMedicao {
  id: string
  obra_id: string
  numero_medicao: number
  data_medicao: string
  periodo_inicio?: string
  periodo_fim?: string
  percentual_executado?: number
  valor_medicao?: number
  status: StatusMedicao
  observacoes?: string
  medido_por?: string
  aprovado_por?: string
  data_aprovacao?: string
  created_at: string
  updated_at: string
}

export interface ObraEtapa {
  id: string
  obra_id: string
  nome: string
  descricao?: string
  ordem: number
  data_inicio_prevista?: string
  data_fim_prevista?: string
  data_inicio_real?: string
  data_fim_real?: string
  status: StatusEtapa
  progresso_percentual: number
  responsavel_id?: string
  responsavel?: { id: string; name: string }
  created_at: string
  updated_at: string
}

export interface ObraRDO {
  id: string
  obra_id: string
  data: string
  clima?: ClimaRDO
  temperatura_min?: number
  temperatura_max?: number

  // Mão de obra
  num_operarios: number
  num_serventes: number
  num_mestres: number
  num_encarregados: number

  // Atividades
  atividades_executadas?: string
  servicos_realizados?: string

  // Equipamentos e materiais
  equipamentos_utilizados?: string
  materiais_recebidos?: string

  // Ocorrências
  ocorrencias?: string
  problemas?: string
  solucoes?: string

  // Observações
  observacoes?: string
  visitas?: string

  // Fotos
  fotos?: string[]

  elaborado_por?: string
  created_at: string
  updated_at: string
}
