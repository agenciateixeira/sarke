export type ClimaTempo = 'claro' | 'nublado' | 'chuvoso' | 'tempestade'
export type ClimaCondicao = 'praticavel' | 'impraticavel'
export type StatusRDO = 'rascunho' | 'finalizado' | 'aprovado'
export type StatusAtividade = 'iniciada' | 'em_andamento' | 'concluida' | 'pausada' | 'cancelada'
export type TipoContratacao = 'propria' | 'terceirizada'
export type TipoMaterial = 'recebido' | 'utilizado'
export type TipoOcorrencia = 'acidente' | 'problema' | 'atraso' | 'falta_material' | 'outro'
export type GravidadeOcorrencia = 'baixa' | 'media' | 'alta' | 'critica'
export type StatusOcorrencia = 'aberto' | 'em_resolucao' | 'resolvido'

export interface RDO {
  id: string
  obra_id: string
  numero_relatorio: number
  data_relatorio: string
  dia_semana: string

  // Clima
  clima_manha_tempo?: ClimaTempo
  clima_manha_condicao?: ClimaCondicao
  clima_noite_tempo?: ClimaTempo
  clima_noite_condicao?: ClimaCondicao
  indice_pluviometrico?: number

  // Observações
  observacoes_gerais?: string

  // Status
  status: StatusRDO

  // Assinaturas
  assinatura_responsavel_obra?: string
  assinatura_fiscal?: string

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string

  // Relacionamentos (quando populados)
  obra?: {
    id: string
    nome: string
    endereco?: string
    cidade?: string
    estado?: string
  }
  atividades?: RDOAtividade[]
  fotos?: RDOFoto[]
  mao_obra?: RDOMaoObra[]
  equipamentos?: RDOEquipamento[]
  materiais?: RDOMaterial[]
  ocorrencias?: RDOOcorrencia[]
}

export interface RDOMaoObra {
  id: string
  rdo_id: string
  tipo: string
  quantidade: number
  tipo_contratacao: TipoContratacao
  empresa_id?: string
  created_at: string
}

export interface RDOAtividade {
  id: string
  rdo_id: string
  descricao: string
  status: StatusAtividade
  local?: string
  progresso: number
  ordem: number
  created_at: string
}

export interface RDOFoto {
  id: string
  rdo_id: string
  foto_url: string
  descricao?: string
  local?: string
  ordem: number
  tamanho_bytes?: number
  mime_type?: string
  created_at: string
}

export interface RDOEquipamento {
  id: string
  rdo_id: string
  nome: string
  quantidade: number
  horas_utilizadas?: number
  observacoes?: string
  created_at: string
}

export interface RDOMaterial {
  id: string
  rdo_id: string
  tipo: TipoMaterial
  descricao: string
  quantidade?: number
  unidade?: string
  fornecedor?: string
  created_at: string
}

export interface RDOOcorrencia {
  id: string
  rdo_id: string
  tipo?: TipoOcorrencia
  descricao: string
  gravidade: GravidadeOcorrencia
  acoes_tomadas?: string
  status: StatusOcorrencia
  created_at: string
}

export interface RDOCompleto extends RDO {
  obra_nome: string
  obra_endereco?: string
  obra_cidade?: string
  obra_estado?: string
  total_atividades: number
  atividades_concluidas: number
  total_fotos: number
  total_trabalhadores: number
  criado_por_nome?: string
  criado_por_email?: string
}
