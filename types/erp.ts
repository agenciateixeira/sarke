// =====================================================
// TYPES - ERP Financeiro
// =====================================================

// =====================================================
// 1. PLANO DE CONTAS
// =====================================================
export type PlanoContasTipo = 'receita' | 'despesa' | 'ativo' | 'passivo' | 'patrimonio'
export type PlanoContasNatureza = 'debito' | 'credito'

export interface PlanoContas {
  id: string
  codigo: string
  nivel: number
  pai_id: string | null
  nome: string
  descricao: string | null
  tipo: PlanoContasTipo
  natureza: PlanoContasNatureza
  aceita_lancamento: boolean
  ativa: boolean
  created_at: string
  updated_at: string
}

export interface PlanoContasComFilhos extends PlanoContas {
  filhos?: PlanoContasComFilhos[]
}

// =====================================================
// 2. CONTAS BANCÁRIAS
// =====================================================
export type ContaBancariaTipo = 'conta_corrente' | 'poupanca' | 'caixa' | 'carteira_digital'

export interface ContaBancaria {
  id: string
  banco_codigo: string | null
  banco_nome: string | null
  tipo: ContaBancariaTipo
  agencia: string | null
  numero_conta: string | null
  nome: string
  apelido: string | null
  saldo_inicial: number
  saldo_atual: number
  integrado: boolean
  api_config: any | null
  ultima_sincronizacao: string | null
  ativa: boolean
  created_at: string
  updated_at: string
}

export interface SaldoBancario extends ContaBancaria {
  total_receitas: number
  total_despesas: number
  receitas_pendentes: number
  despesas_pendentes: number
}

// =====================================================
// 3. LANÇAMENTOS
// =====================================================
export type LancamentoTipo = 'receita' | 'despesa' | 'transferencia'
export type LancamentoStatus = 'pendente' | 'parcial' | 'pago' | 'cancelado' | 'atrasado'

export interface Lancamento {
  id: string
  tipo: LancamentoTipo
  descricao: string
  numero_documento: string | null
  data_lancamento: string
  data_competencia: string
  data_vencimento: string | null
  data_pagamento: string | null
  valor_total: number
  valor_pago: number
  status: LancamentoStatus
  cliente_id: string | null
  fornecedor_id: string | null
  projeto_id: string | null
  obra_id: string | null
  conta_bancaria_id: string | null
  forma_pagamento: string | null
  valor_impostos: number
  comprovante_url: string | null
  nota_fiscal_url: string | null
  recorrente: boolean
  observacoes: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface LancamentoComRelacoes extends Lancamento {
  cliente?: {
    id: string
    name: string
  } | null
  fornecedor?: {
    id: string
    nome: string
  } | null
  projeto?: {
    id: string
    nome: string
  } | null
  obra?: {
    id: string
    nome: string
  } | null
  conta_bancaria?: {
    id: string
    nome: string
    apelido: string | null
  } | null
  itens?: LancamentoItem[]
}

// =====================================================
// 4. ITENS DE LANÇAMENTO (PARTIDAS DOBRADAS)
// =====================================================
export type LancamentoItemTipo = 'debito' | 'credito'

export interface LancamentoItem {
  id: string
  lancamento_id: string
  conta_id: string
  tipo: LancamentoItemTipo
  valor: number
  historico: string | null
  created_at: string
}

export interface LancamentoItemComConta extends LancamentoItem {
  conta?: PlanoContas
}

// =====================================================
// 5. RELATÓRIOS - DRE
// =====================================================
export interface DRE {
  receitas_total: number
  despesas_total: number
  lucro_bruto: number
  despesas_operacionais: number
  lucro_liquido: number
}

export interface DREDetalhado extends DRE {
  periodo_inicio: string
  periodo_fim: string

  // Receitas detalhadas
  receitas_operacionais: number
  receitas_nao_operacionais: number

  // Despesas detalhadas
  custos_diretos: number
  despesas_pessoal: number
  despesas_infraestrutura: number
  despesas_administrativo: number
  despesas_marketing: number
  impostos: number
  despesas_financeiras: number

  // Margens
  margem_bruta_percentual: number
  margem_liquida_percentual: number

  // EBITDA
  ebitda: number
  ebitda_percentual: number
}

// =====================================================
// 6. RELATÓRIOS - FLUXO DE CAIXA
// =====================================================
export interface FluxoCaixaDia {
  data: string
  entradas: number
  saidas: number
  saldo_dia: number
  saldo_acumulado: number
}

export interface FluxoCaixa {
  periodo_inicio: string
  periodo_fim: string
  saldo_inicial: number
  total_entradas: number
  total_saidas: number
  saldo_final: number
  dias: FluxoCaixaDia[]
}

// =====================================================
// 7. RESUMO MENSAL
// =====================================================
export interface ResumoMes {
  mes: number
  ano: number
  receita_total: number
  receita_recebida: number
  receita_pendente: number
  despesa_total: number
  despesa_paga: number
  despesa_pendente: number
  saldo_liquido: number
  total_lancamentos: number
}

// =====================================================
// 8. CONTAS A RECEBER/PAGAR
// =====================================================
export interface ContaReceber {
  id: string
  descricao: string
  valor_total: number
  valor_pago: number
  valor_pendente: number
  data_vencimento: string | null
  status: LancamentoStatus
  dias_atraso: number
  cliente_id: string | null
  cliente_nome: string | null
  projeto_id: string | null
  projeto_nome: string | null
  obra_id: string | null
  obra_nome: string | null
  created_at: string
}

export interface ContaPagar {
  id: string
  descricao: string
  valor_total: number
  valor_pago: number
  valor_pendente: number
  data_vencimento: string | null
  status: LancamentoStatus
  dias_atraso: number
  fornecedor_id: string | null
  fornecedor_nome: string | null
  projeto_id: string | null
  projeto_nome: string | null
  obra_id: string | null
  obra_nome: string | null
  created_at: string
}

// =====================================================
// 9. FORMS E INPUTS
// =====================================================
export interface CriarLancamentoInput {
  tipo: LancamentoTipo
  descricao: string
  valor_total: number
  data_lancamento: string
  data_competencia: string
  data_vencimento?: string
  conta_debito_id: string
  conta_credito_id: string
  conta_bancaria_id?: string
  cliente_id?: string
  fornecedor_id?: string
  projeto_id?: string
  obra_id?: string
  forma_pagamento?: string
  observacoes?: string
  tags?: string[]
}

export interface DarBaixaInput {
  lancamento_id: string
  valor_pago: number
  data_pagamento: string
  conta_bancaria_id: string
}

export interface CancelarLancamentoInput {
  lancamento_id: string
  motivo?: string
}

// =====================================================
// 10. DASHBOARD
// =====================================================
export interface DashboardERPStats {
  // Mês atual
  receita_mes: number
  despesa_mes: number
  saldo_liquido: number

  // Pendentes
  contas_receber: number
  contas_receber_quantidade: number
  contas_pagar: number
  contas_pagar_quantidade: number

  // Alertas
  lancamentos_atrasados: number
  vencimentos_proximos: number // próximos 7 dias

  // Comparativo mês anterior
  receita_mes_anterior: number
  despesa_mes_anterior: number
  variacao_receita_percentual: number
  variacao_despesa_percentual: number
}

export interface VencimentoProximo {
  id: string
  tipo: LancamentoTipo
  descricao: string
  valor_pendente: number
  data_vencimento: string
  dias_restantes: number
  cliente_nome?: string
  fornecedor_nome?: string
}

// =====================================================
// 11. FILTROS
// =====================================================
export interface FiltroLancamentos {
  tipo?: LancamentoTipo[]
  status?: LancamentoStatus[]
  data_inicio?: string
  data_fim?: string
  cliente_id?: string
  fornecedor_id?: string
  projeto_id?: string
  obra_id?: string
  conta_bancaria_id?: string
  conta_id?: string
  busca?: string
  tags?: string[]
}

export interface FiltroRelatorios {
  data_inicio: string
  data_fim: string
  tipo_relatorio?: 'dre' | 'fluxo_caixa' | 'balanco' | 'rentabilidade'
}

// =====================================================
// 12. UTILITIES
// =====================================================
export const STATUS_LABELS: Record<LancamentoStatus, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  pago: 'Pago',
  cancelado: 'Cancelado',
  atrasado: 'Atrasado',
}

export const STATUS_COLORS: Record<LancamentoStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  pago: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  cancelado: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  atrasado: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

export const TIPO_LABELS: Record<LancamentoTipo, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  transferencia: 'Transferência',
}

export const TIPO_COLORS: Record<LancamentoTipo, string> = {
  receita: 'text-green-600',
  despesa: 'text-red-600',
  transferencia: 'text-blue-600',
}

// =====================================================
// 13. HELPERS
// =====================================================
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function formatarData(data: string): string {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function calcularDiasAtraso(dataVencimento: string): number {
  const hoje = new Date()
  const vencimento = new Date(dataVencimento + 'T00:00:00')
  const diff = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

export function calcularDiasRestantes(dataVencimento: string): number {
  const hoje = new Date()
  const vencimento = new Date(dataVencimento + 'T00:00:00')
  const diff = Math.floor((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}
