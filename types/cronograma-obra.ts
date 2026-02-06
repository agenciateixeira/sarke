// =====================================================
// TYPES - SISTEMA DE CRONOGRAMA DE OBRAS
// Baseado em: supabase/migrations/20260206_cronograma_obras.sql
// Modelo: Cronograma Prime R01.xlsx
// =====================================================

export type CronogramaObraStatus = 'ativo' | 'pausado' | 'concluido' | 'cancelado'

export type AtividadeStatus = 'pendente' | 'realizado' | 'em_andamento' | 'atrasado' | 'cancelado'

export type AtividadePrioridade = 'baixa' | 'normal' | 'alta' | 'critica'

export type MaterialStatusCompra =
  | 'pendente'
  | 'cotacao'
  | 'pedido_realizado'
  | 'em_transito'
  | 'recebido'
  | 'cancelado'

export type NotificacaoTipo =
  | 'atividade_proxima'
  | 'atividade_atrasada'
  | 'material_faltando'
  | 'obra_atrasada'

export type HistoricoTipoAlteracao =
  | 'criacao'
  | 'edicao'
  | 'exclusao'
  | 'status_mudado'
  | 'reagendamento'
  | 'conclusao'

// =====================================================
// TABELA: cronograma_obras
// =====================================================
export interface CronogramaObra {
  id: string
  obra_id: string
  nome: string
  descricao?: string | null
  data_inicio?: string | null // Date format: YYYY-MM-DD
  data_fim_prevista?: string | null
  data_fim_real?: string | null
  status: CronogramaObraStatus
  progresso_percentual: number
  created_at: string
  updated_at: string
  created_by?: string | null
}

export interface CronogramaObraInsert {
  obra_id: string
  nome: string
  descricao?: string
  data_inicio?: string
  data_fim_prevista?: string
  data_fim_real?: string
  status?: CronogramaObraStatus
  created_by?: string
}

// =====================================================
// TABELA: cronograma_obra_atividades
// =====================================================
export interface CronogramaObraAtividade {
  id: string
  cronograma_id: string
  mes?: string | null
  dia_semana?: string | null
  data_prevista: string // Date format: YYYY-MM-DD
  descricao_servico: string
  observacao?: string | null
  empresa_parceira_id?: string | null
  status: AtividadeStatus
  data_inicio_real?: string | null
  data_conclusao_real?: string | null
  rdo_id?: string | null
  ordem: number
  prioridade: AtividadePrioridade
  created_at: string
  updated_at: string
  created_by?: string | null
}

export interface CronogramaObraAtividadeInsert {
  cronograma_id: string
  mes?: string
  dia_semana?: string
  data_prevista: string
  descricao_servico: string
  observacao?: string
  empresa_parceira_id?: string
  status?: AtividadeStatus
  data_inicio_real?: string
  data_conclusao_real?: string
  rdo_id?: string
  ordem?: number
  prioridade?: AtividadePrioridade
  created_by?: string
}

// =====================================================
// TABELA: cronograma_obra_materiais
// =====================================================
export interface CronogramaObraMaterial {
  id: string
  cronograma_id: string
  atividade_id?: string | null
  data_necessaria?: string | null // Date format: YYYY-MM-DD
  servico?: string | null
  descricao_material: string
  quantidade: number
  unidade_medida: string
  valor_unitario?: number | null
  valor_total?: number | null
  valor_pago: number
  saldo?: number | null
  status_compra: MaterialStatusCompra
  fornecedor?: string | null
  data_compra?: string | null
  data_entrega_prevista?: string | null
  data_entrega_real?: string | null
  observacoes?: string | null
  created_at: string
  updated_at: string
}

export interface CronogramaObraMaterialInsert {
  cronograma_id: string
  atividade_id?: string
  data_necessaria?: string
  servico?: string
  descricao_material: string
  quantidade: number
  unidade_medida: string
  valor_unitario?: number
  valor_total?: number
  valor_pago?: number
  saldo?: number
  status_compra?: MaterialStatusCompra
  fornecedor?: string
  data_compra?: string
  data_entrega_prevista?: string
  data_entrega_real?: string
  observacoes?: string
}

// =====================================================
// TABELA: cronograma_obra_templates
// =====================================================
export interface CronogramaObraTemplate {
  id: string
  nome: string
  descricao?: string | null
  tipo_obra?: string | null
  duracao_estimada_dias?: number | null
  estrutura: any // JSONB - estrutura flexível do template
  vezes_usado: number
  ultima_utilizacao?: string | null
  created_at: string
  created_by?: string | null
}

export interface CronogramaObraTemplateInsert {
  nome: string
  descricao?: string
  tipo_obra?: string
  duracao_estimada_dias?: number
  estrutura: any
  created_by?: string
}

// =====================================================
// TABELA: cronograma_obra_notificacoes
// =====================================================
export interface CronogramaObraNotificacao {
  id: string
  cronograma_id: string
  atividade_id?: string | null
  tipo: NotificacaoTipo
  titulo: string
  mensagem: string
  destinatarios: string[] // UUID[]
  empresa_parceira_id?: string | null
  enviado: boolean
  lido: boolean
  data_envio?: string | null
  data_leitura?: string | null
  created_at: string
}

export interface CronogramaObraNotificacaoInsert {
  cronograma_id: string
  atividade_id?: string
  tipo: NotificacaoTipo
  titulo: string
  mensagem: string
  destinatarios: string[]
  empresa_parceira_id?: string
}

// =====================================================
// TABELA: cronograma_obra_historico
// =====================================================
export interface CronogramaObraHistorico {
  id: string
  cronograma_id: string
  atividade_id?: string | null
  tipo_alteracao: HistoricoTipoAlteracao
  dados_anteriores?: any | null // JSONB
  dados_novos?: any | null // JSONB
  motivo?: string | null
  alterado_por?: string | null
  created_at: string
}

export interface CronogramaObraHistoricoInsert {
  cronograma_id: string
  atividade_id?: string
  tipo_alteracao: HistoricoTipoAlteracao
  dados_anteriores?: any
  dados_novos?: any
  motivo?: string
  alterado_por?: string
}

// =====================================================
// VIEWS
// =====================================================

// View: cronograma_obras_completo
export interface CronogramaObraCompleto extends CronogramaObra {
  obra_nome: string
  obra_endereco: string
  total_atividades: number
  atividades_concluidas: number
  atividades_pendentes: number
  atividades_atrasadas: number
  atividades_em_andamento: number
  total_materiais: number
  custo_total_materiais: number
  valor_pago_materiais: number
  saldo_materiais: number
  progresso_real: number
}

// View: cronograma_obra_atividades_hoje
export interface CronogramaObraAtividadeHoje extends CronogramaObraAtividade {
  obra_id: string
  obra_nome: string
  empresa_nome?: string | null
}

// View: cronograma_obra_atividades_atrasadas
export interface CronogramaObraAtividadeAtrasada extends CronogramaObraAtividade {
  obra_id: string
  obra_nome: string
  empresa_nome?: string | null
  dias_atraso: number
}

// View: cronograma_obra_materiais_pendentes
export interface CronogramaObraMaterialPendente extends CronogramaObraMaterial {
  obra_id: string
  obra_nome: string
  atividade_descricao?: string | null
}

// =====================================================
// TYPES AUXILIARES
// =====================================================

// Dados para importação do Excel (Planilha CRONOGRAMA)
export interface CronogramaExcelAtividade {
  mes: string
  dia_semana: string
  data: string
  descricao_servico: string
  observacao?: string
  empresa?: string
  status?: string
}

// Dados para importação do Excel (Planilha SERVIÇOS)
export interface CronogramaExcelMaterial {
  data?: string
  servico?: string
  descricao_material: string
  quantidade: number
  unidade_medida: string
  valor_unitario?: number
  valor_total?: number
  valor_recebido?: number
  saldo?: number
}

// Dados para exportação
export interface CronogramaExportData {
  cronograma: CronogramaObra
  atividades: CronogramaObraAtividade[]
  materiais: CronogramaObraMaterial[]
  estatisticas: {
    total_atividades: number
    concluidas: number
    pendentes: number
    atrasadas: number
    progresso: number
    custo_total: number
    valor_pago: number
    saldo: number
  }
}

// Filtros para listagem
export interface CronogramaObraFiltros {
  obra_id?: string
  status?: CronogramaObraStatus[]
  data_inicio_de?: string
  data_inicio_ate?: string
  busca?: string
}

export interface AtividadeFiltros {
  cronograma_id?: string
  status?: AtividadeStatus[]
  prioridade?: AtividadePrioridade[]
  data_prevista_de?: string
  data_prevista_ate?: string
  empresa_parceira_id?: string
  busca?: string
}

export interface MaterialFiltros {
  cronograma_id?: string
  atividade_id?: string
  status_compra?: MaterialStatusCompra[]
  data_necessaria_de?: string
  data_necessaria_ate?: string
  fornecedor?: string
  busca?: string
}

// Para célula editável na tabela (estilo Excel)
export interface CronogramaCelulaEditavel {
  linha: number
  coluna: string
  valor: any
  tipo: 'atividade' | 'material'
}

// Estatísticas do cronograma
export interface CronogramaEstatisticas {
  total_atividades: number
  atividades_concluidas: number
  atividades_pendentes: number
  atividades_atrasadas: number
  atividades_em_andamento: number
  progresso_percentual: number
  total_materiais: number
  materiais_recebidos: number
  materiais_pendentes: number
  custo_total: number
  valor_pago: number
  saldo_devedor: number
  prazo_original_dias: number
  prazo_decorrido_dias: number
  prazo_restante_dias: number
  atraso_dias: number
}
