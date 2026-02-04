// =====================================================
// TIPOS DO SISTEMA DE CRONOGRAMA
// =====================================================

export type TipoCronograma = 'obra' | 'projeto' | 'geral'

export type StatusCronograma = 'planejamento' | 'ativo' | 'pausado' | 'concluido' | 'cancelado'

export type UnidadeTempo = 'horas' | 'dias' | 'semanas'

export type TipoAtividade = 'fase' | 'atividade' | 'marco'

export type StatusAtividade =
  | 'nao_iniciada'
  | 'em_andamento'
  | 'concluida'
  | 'atrasada'
  | 'pausada'
  | 'cancelada'

export type TipoDependencia = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'

export type TipoRecurso = 'mao_de_obra' | 'equipamento' | 'material' | 'outro'

export type TipoAlteracao =
  | 'criacao'
  | 'atualizacao_datas'
  | 'atualizacao_progresso'
  | 'atualizacao_status'
  | 'atualizacao_recursos'
  | 'atualizacao_dependencias'
  | 'exclusao'

// =====================================================
// INTERFACE: Cronograma Principal
// =====================================================

export interface Cronograma {
  id: string
  nome: string
  descricao?: string

  // Tipo e referências
  tipo: TipoCronograma
  obra_id?: string
  project_id?: string

  // Relacionamentos carregados
  obra?: {
    id: string
    nome: string
  }
  projeto?: {
    id: string
    name: string
  }

  // Datas
  data_inicio: string
  data_fim: string

  // Status
  status: StatusCronograma
  progresso_percentual: number

  // Configurações
  exibir_caminho_critico: boolean
  exibir_folgas: boolean
  unidade_tempo: UnidadeTempo

  // Responsável
  responsavel_id?: string
  responsavel?: {
    id: string
    name: string
  }
  equipe_acesso: string[]

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string
}

// =====================================================
// INTERFACE: Atividade do Cronograma
// =====================================================

export interface CronogramaAtividade {
  id: string
  cronograma_id: string

  // Hierarquia
  parent_id?: string
  parent?: CronogramaAtividade
  children?: CronogramaAtividade[]
  ordem: number
  nivel: number

  // Identificação
  codigo?: string // WBS code
  nome: string
  descricao?: string

  // Tipo
  tipo: TipoAtividade
  categoria?: string

  // Datas planejadas
  data_inicio_planejada: string
  data_fim_planejada: string
  duracao_planejada: number

  // Datas reais
  data_inicio_real?: string
  data_fim_real?: string
  duracao_real?: number

  // Status
  status: StatusAtividade
  progresso_percentual: number

  // Recursos
  responsavel_id?: string
  responsavel?: {
    id: string
    name: string
  }
  equipe_atribuida: string[]
  custo_planejado?: number
  custo_real?: number

  // Análise de caminho crítico
  eh_caminho_critico: boolean
  folga_total: number
  folga_livre: number

  // Datas calculadas
  inicio_mais_cedo?: string
  fim_mais_cedo?: string
  inicio_mais_tarde?: string
  fim_mais_tarde?: string

  // Integrações
  obra_etapa_id?: string
  task_id?: string

  obra_etapa?: {
    id: string
    nome: string
  }
  task?: {
    id: string
    title: string
  }

  // Observações
  observacoes?: string
  riscos?: string

  // Campos customizados (flexibilidade total)
  campos_customizados?: Record<string, any>

  // Relacionamentos carregados
  dependencias?: CronogramaDependencia[]
  predecessores?: CronogramaDependencia[]
  recursos?: CronogramaAlocacaoRecurso[]

  // Metadados
  created_at: string
  updated_at: string
}

// =====================================================
// INTERFACE: Dependência entre Atividades
// =====================================================

export interface CronogramaDependencia {
  id: string

  // Relacionamentos
  atividade_id: string
  atividade_predecessor_id: string

  atividade?: CronogramaAtividade
  predecessor?: CronogramaAtividade

  // Tipo de dependência
  tipo: TipoDependencia

  // Lag time
  lag_dias: number

  // Observações
  observacoes?: string

  created_at: string
}

// =====================================================
// INTERFACE: Recurso
// =====================================================

export interface CronogramaRecurso {
  id: string
  cronograma_id: string

  // Identificação
  nome: string
  tipo: TipoRecurso
  unidade?: string

  // Custos
  custo_unitario?: number

  // Disponibilidade
  disponibilidade_maxima?: number

  // Metadados
  created_at: string
  updated_at: string
}

// =====================================================
// INTERFACE: Alocação de Recurso
// =====================================================

export interface CronogramaAlocacaoRecurso {
  id: string

  // Relacionamentos
  atividade_id: string
  recurso_id: string

  atividade?: CronogramaAtividade
  recurso?: CronogramaRecurso

  // Quantidades
  quantidade_planejada: number
  quantidade_real?: number

  // Custos
  custo_planejado?: number
  custo_real?: number

  // Metadados
  created_at: string
  updated_at: string
}

// =====================================================
// INTERFACE: Baseline
// =====================================================

export interface CronogramaBaseline {
  id: string
  cronograma_id: string

  nome: string
  descricao?: string
  data_snapshot: string

  // Snapshot completo
  dados_cronograma: any // JSON com todos os dados

  // Baseline ativa?
  is_ativa: boolean

  created_by?: string
  created_at: string
}

// =====================================================
// INTERFACE: Histórico de Alterações
// =====================================================

export interface CronogramaHistorico {
  id: string
  cronograma_id: string
  atividade_id?: string

  // Tipo
  tipo_alteracao: TipoAlteracao

  // Dados
  dados_anteriores?: any
  dados_novos?: any
  motivo?: string

  // Usuário
  alterado_por?: string
  alterado_por_profile?: {
    id: string
    name: string
  }

  created_at: string
}

// =====================================================
// TIPOS AUXILIARES PARA UI
// =====================================================

// Para exibição em árvore/hierarquia
export interface CronogramaAtividadeTree extends CronogramaAtividade {
  children: CronogramaAtividadeTree[]
  expanded?: boolean
  selected?: boolean
}

// Para células editáveis da tabela/planilha
export interface CronogramaCelulaEditavel {
  atividadeId: string
  campo: keyof CronogramaAtividade
  valor: any
  valorOriginal: any
  editado: boolean
}

// Para análise de caminho crítico
export interface AnalisePathCritico {
  atividadesCriticas: CronogramaAtividade[]
  duracaoTotal: number
  dataConclusao: string
  folgas: {
    atividadeId: string
    folgaTotal: number
    folgaLivre: number
  }[]
}

// Para comparação com baseline
export interface ComparacaoBaseline {
  atividadeId: string
  campo: string
  valorBaseline: any
  valorAtual: any
  variacao: number | string
  tipo: 'melhor' | 'pior' | 'igual'
}

// Para visualização de Gantt
export interface GanttBar {
  atividadeId: string
  nome: string
  inicio: Date
  fim: Date
  progresso: number
  ehCritico: boolean
  nivel: number
  dependencias: string[]
}

// Filtros para listagem
export interface CronogramaFiltros {
  search?: string
  tipo?: TipoCronograma
  status?: StatusCronograma
  responsavel_id?: string
  data_inicio?: string
  data_fim?: string
}

export interface AtividadeFiltros {
  search?: string
  tipo?: TipoAtividade
  status?: StatusAtividade
  responsavel_id?: string
  apenas_criticas?: boolean
  apenas_atrasadas?: boolean
  categoria?: string
}

// Para exportação
export interface ExportacaoCronograma {
  formato: 'pdf' | 'excel' | 'csv' | 'mpp' // Microsoft Project
  incluir_gantt: boolean
  incluir_recursos: boolean
  incluir_custos: boolean
  incluir_historico: boolean
}
