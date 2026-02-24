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

// =====================================================
// FASE 2 - CONTAS A PAGAR/RECEBER
// =====================================================

// =====================================================
// 14. FORMAS DE PAGAMENTO
// =====================================================
export type FormaPagamentoTipo =
  | 'dinheiro'
  | 'pix'
  | 'ted'
  | 'doc'
  | 'boleto'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'cheque'
  | 'outros'

export interface FormaPagamento {
  id: string
  nome: string
  tipo: FormaPagamentoTipo
  taxa_percentual: number
  dias_compensacao: number
  ativa: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// 15. PARCELAS
// =====================================================
export type ParcelaStatus = 'pendente' | 'pago' | 'parcial' | 'atrasado' | 'cancelado'

export interface LancamentoParcela {
  id: string
  lancamento_id: string
  numero_parcela: number
  total_parcelas: number
  valor_original: number
  valor_juros: number
  valor_multa: number
  valor_desconto: number
  valor_total: number
  valor_pago: number
  data_vencimento: string
  data_pagamento: string | null
  status: ParcelaStatus
  forma_pagamento_id: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface ParcelaComRelacoes extends LancamentoParcela {
  lancamento?: Lancamento
  forma_pagamento?: FormaPagamento
}

// =====================================================
// 16. RECORRÊNCIA
// =====================================================
export type RecorrenciaFrequencia =
  | 'diaria'
  | 'semanal'
  | 'quinzenal'
  | 'mensal'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual'

export interface LancamentoRecorrencia {
  id: string
  lancamento_modelo_id: string
  frequencia: RecorrenciaFrequencia
  dia_vencimento: number | null
  data_inicio: string
  data_fim: string | null
  numero_repeticoes: number | null
  ativa: boolean
  proxima_geracao: string | null
  ultima_geracao: string | null
  ajustar_valor_automatico: boolean
  percentual_reajuste: number
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface RecorrenciaComLancamento extends LancamentoRecorrencia {
  lancamento?: Lancamento
}

// =====================================================
// 17. AGING (ANÁLISE DE VENCIMENTOS)
// =====================================================
export interface AgingReceber {
  a_vencer: number
  vencido_0_30: number
  vencido_31_60: number
  vencido_61_90: number
  vencido_91_180: number
  vencido_acima_180: number
  total_receber: number
}

export interface AgingPagar {
  a_vencer: number
  vencido_0_30: number
  vencido_31_60: number
  vencido_61_90: number
  vencido_91_180: number
  vencido_acima_180: number
  total_pagar: number
}

// =====================================================
// 18. PROJEÇÃO DE FLUXO DE CAIXA
// =====================================================
export interface ProjecaoFluxoCaixa {
  data: string
  receitas_previstas: number
  despesas_previstas: number
  saldo_dia: number
  saldo_acumulado: number
}

// =====================================================
// 19. TOP DEVEDORES
// =====================================================
export interface Cliente {
  id: string
  name: string
}

export interface TopDevedor {
  cliente_id: string
  cliente_nome: string
  quantidade_titulos: number
  valor_total_em_aberto: number
  valor_em_atraso: number
  dias_medio_atraso: number
}

// =====================================================
// 20. RESUMO CONTAS A RECEBER/PAGAR
// =====================================================
export interface ResumoContasReceber {
  total_receber: number
  total_vencido: number
  total_a_vencer: number
  quantidade_total: number
  quantidade_vencidas: number
  ticket_medio: number
}

export interface ResumoContasPagar {
  total_pagar: number
  total_vencido: number
  total_a_vencer: number
  quantidade_total: number
  quantidade_vencidas: number
  ticket_medio: number
}

// =====================================================
// 21. INPUTS - FASE 2
// =====================================================
export interface GerarParcelasInput {
  lancamento_id: string
  numero_parcelas: number
  data_primeiro_vencimento: string
  intervalo_dias?: number
}

export interface DarBaixaParcelaInput {
  parcela_id: string
  data_pagamento: string
  forma_pagamento_id?: string
  valor_pago?: number
  aplicar_juros_multa?: boolean
}

export interface CriarRecorrenciaInput {
  lancamento_modelo_id: string
  frequencia: RecorrenciaFrequencia
  dia_vencimento?: number
  data_inicio: string
  data_fim?: string
  numero_repeticoes?: number
  ajustar_valor_automatico?: boolean
  percentual_reajuste?: number
}

// =====================================================
// 22. UTILITIES - FASE 2
// =====================================================
export const PARCELA_STATUS_LABELS: Record<ParcelaStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  parcial: 'Parcial',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

export const PARCELA_STATUS_COLORS: Record<ParcelaStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  pago: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  atrasado: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  cancelado: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export const RECORRENCIA_LABELS: Record<RecorrenciaFrequencia, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamentoTipo, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  ted: 'TED',
  doc: 'DOC',
  boleto: 'Boleto',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  cheque: 'Cheque',
  outros: 'Outros',
}

// =====================================================
// FASE 4 - CONCILIAÇÃO BANCÁRIA E AUTOMAÇÕES
// =====================================================

// =====================================================
// 23. EXTRATOS BANCÁRIOS
// =====================================================
export type ExtratoBancarioStatus = 'processando' | 'concluido' | 'erro'

export interface ExtratoBancario {
  id: string
  conta_bancaria_id: string
  data_importacao: string
  arquivo_nome: string | null
  periodo_inicio: string
  periodo_fim: string
  quantidade_transacoes: number
  status: ExtratoBancarioStatus
  created_at: string
  updated_at: string
}

export interface ExtratoBancarioComRelacoes extends ExtratoBancario {
  conta_bancaria?: ContaBancaria
  transacoes?: TransacaoBancaria[]
}

// =====================================================
// 24. TRANSAÇÕES BANCÁRIAS
// =====================================================
export type TransacaoBancariaTipo = 'credito' | 'debito'
export type TransacaoConciliacaoStatus = 'pendente' | 'conciliado' | 'ignorado'

export interface TransacaoBancaria {
  id: string
  extrato_id: string
  conta_bancaria_id: string
  data_transacao: string
  descricao: string
  valor: number
  tipo: TransacaoBancariaTipo
  saldo_apos_transacao: number | null
  documento: string | null
  status_conciliacao: TransacaoConciliacaoStatus
  lancamento_id: string | null
  conciliado_em: string | null
  conciliado_por: string | null
  conciliacao_automatica: boolean
  created_at: string
  updated_at: string
}

export interface TransacaoBancariaComRelacoes extends TransacaoBancaria {
  extrato?: ExtratoBancario
  conta_bancaria?: ContaBancaria
  lancamento?: Lancamento
  sugestoes?: SugestaoConciliacao[]
  regras_aplicaveis?: RegraAplicavel[]
}

// =====================================================
// 25. REGRAS DE CATEGORIZAÇÃO
// =====================================================
export type RegraTipoTransacao = 'credito' | 'debito' | 'ambos'

export interface RegraCateorizacao {
  id: string
  nome: string
  ativa: boolean
  prioridade: number
  descricao_contem: string[] | null
  valor_minimo: number | null
  valor_maximo: number | null
  tipo_transacao: RegraTipoTransacao | null
  conta_bancaria_id: string | null
  conta_id: string | null
  categoria: string | null
  cliente_id: string | null
  projeto_id: string | null
  obra_id: string | null
  observacao_padrao: string | null
  total_aplicacoes: number
  ultima_aplicacao: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface RegraCategorizacaoComRelacoes extends RegraCateorizacao {
  conta_bancaria?: ContaBancaria
  conta?: PlanoContas
  cliente?: Cliente
}

// =====================================================
// 26. ALERTAS FINANCEIROS
// =====================================================
export type AlertaFinanceiroTipo =
  | 'saldo_baixo'
  | 'titulo_vencendo'
  | 'meta_atingida'
  | 'conciliacao_pendente'
  | 'fluxo_negativo'
  | 'custom'

export type AlertaSeveridade = 'info' | 'warning' | 'error' | 'success'

export interface AlertaFinanceiro {
  id: string
  tipo: AlertaFinanceiroTipo
  titulo: string
  mensagem: string
  severidade: AlertaSeveridade
  conta_bancaria_id: string | null
  lancamento_id: string | null
  data_referencia: string | null
  valor_referencia: number | null
  lido: boolean
  lido_em: string | null
  lido_por: string | null
  created_at: string
}

export interface AlertaFinanceiroComRelacoes extends AlertaFinanceiro {
  conta_bancaria?: ContaBancaria
  lancamento?: Lancamento
}

// =====================================================
// 27. SUGESTÕES DE CONCILIAÇÃO
// =====================================================
export interface SugestaoConciliacao {
  lancamento_id: string
  descricao: string
  valor_total: number
  data_vencimento: string
  score: number
  motivo: string
}

export interface RegraAplicavel {
  regra_id: string
  regra_nome: string
  prioridade: number
  conta_nome: string | null
  motivo: string
}

// =====================================================
// 28. INPUTS - FASE 4
// =====================================================
export interface ConciliarTransacaoInput {
  transacao_id: string
  lancamento_id: string
  usuario_id?: string
}

export interface AplicarRegraInput {
  transacao_id: string
  regra_id: string
}

export interface ImportarExtratoInput {
  conta_bancaria_id: string
  arquivo: File
  periodo_inicio: string
  periodo_fim: string
}

export interface CriarRegraCategorizacaoInput {
  nome: string
  ativa?: boolean
  prioridade?: number
  descricao_contem?: string[]
  valor_minimo?: number
  valor_maximo?: number
  tipo_transacao?: RegraTipoTransacao
  conta_bancaria_id?: string
  conta_id?: string
  categoria?: string
  cliente_id?: string
  projeto_id?: string
  obra_id?: string
  observacao_padrao?: string
}

// =====================================================
// 29. UTILITIES - FASE 4
// =====================================================
export const CONCILIACAO_STATUS_LABELS: Record<TransacaoConciliacaoStatus, string> = {
  pendente: 'Pendente',
  conciliado: 'Conciliado',
  ignorado: 'Ignorado',
}

export const CONCILIACAO_STATUS_COLORS: Record<TransacaoConciliacaoStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  conciliado: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  ignorado: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

export const ALERTA_SEVERIDADE_COLORS: Record<AlertaSeveridade, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
}

export const ALERTA_TIPO_LABELS: Record<AlertaFinanceiroTipo, string> = {
  saldo_baixo: 'Saldo Baixo',
  titulo_vencendo: 'Título Vencendo',
  meta_atingida: 'Meta Atingida',
  conciliacao_pendente: 'Conciliação Pendente',
  fluxo_negativo: 'Fluxo Negativo',
  custom: 'Personalizado',
}

// =====================================================
// SPRINT 1 - CARTÕES DE CRÉDITO
// =====================================================

// =====================================================
// 30. CARTÕES DE CRÉDITO
// =====================================================
export type CartaoBandeira = 'Visa' | 'Mastercard' | 'Amex' | 'Elo' | 'Hipercard' | 'Diners' | 'Outros'

export interface CartaoCredito {
  id: string
  nome: string
  bandeira: CartaoBandeira | null
  ultimos_digitos: string | null
  limite_total: number
  limite_disponivel: number
  dia_vencimento: number
  dia_fechamento: number
  portador: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CartaoCreditoComFaturas extends CartaoCredito {
  faturas?: FaturaCartao[]
  total_faturas_pendentes?: number
  proxima_fatura?: FaturaCartao
}

// =====================================================
// 31. FATURAS DE CARTÃO
// =====================================================
export type FaturaCartaoStatus = 'pendente' | 'parcial' | 'pago' | 'vencido'

export interface FaturaCartao {
  id: string
  cartao_id: string
  mes_referencia: number
  ano_referencia: number
  data_fechamento: string
  data_vencimento: string
  valor_total: number
  valor_pago: number
  status: FaturaCartaoStatus
  arquivo_nome: string | null
  conta_pagar_id: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface FaturaCartaoComRelacoes extends FaturaCartao {
  cartao?: CartaoCredito
  compras?: CompraCartao[]
  conta_pagar?: ContaPagar
  quantidade_compras?: number
}

// =====================================================
// 32. COMPRAS DE CARTÃO
// =====================================================
export interface CompraCartao {
  id: string
  fatura_id: string
  cartao_id: string
  data_compra: string
  descricao: string
  categoria_id: string | null
  valor: number
  parcelado: boolean
  parcela_atual: number | null
  parcela_total: number | null
  categoria_sugerida_id: string | null
  categoria_score: number | null
  categoria_confirmada: boolean
  observacoes: string | null
  created_at: string
}

export interface CompraCartaoComRelacoes extends CompraCartao {
  fatura?: FaturaCartao
  cartao?: CartaoCredito
  categoria?: CategoriaFinanceira
  categoria_sugerida?: CategoriaFinanceira
}

// =====================================================
// 33. CATEGORIAS FINANCEIRAS (IA)
// =====================================================
export type CategoriaFinanceiraTipo = 'receita' | 'despesa'

export interface CategoriaFinanceira {
  id: string
  nome: string
  tipo: CategoriaFinanceiraTipo
  icone: string | null
  cor: string | null
  conta_id: string | null
  created_at: string
}

export interface CategoriaComPalavrasChave extends CategoriaFinanceira {
  palavras_chave?: PalavraChaveCategoria[]
}

export interface PalavraChaveCategoria {
  id: string
  categoria_id: string
  palavra_chave: string
  peso: number
}

// =====================================================
// 34. ANÁLISES - CARTÃO
// =====================================================
export interface GastoPorPortador {
  portador: string
  total_compras: number
  valor_total: number
  valor_medio: number
  categoria_mais_gasta: string | null
}

export interface FaturaProximaVencimento {
  fatura_id: string
  cartao_nome: string
  portador: string | null
  valor_total: number
  data_vencimento: string
  dias_ate_vencimento: number
  status: FaturaCartaoStatus
}

export interface DeteccaoParcelamento {
  parcelado: boolean
  parcela_atual: number | null
  parcela_total: number | null
}

// =====================================================
// 35. INPUTS - CARTÃO
// =====================================================
export interface CriarCartaoInput {
  nome: string
  bandeira?: CartaoBandeira
  ultimos_digitos?: string
  limite_total: number
  dia_vencimento: number
  dia_fechamento: number
  portador?: string
  observacoes?: string
}

export interface AtualizarCartaoInput {
  cartao_id: string
  nome?: string
  bandeira?: CartaoBandeira
  ultimos_digitos?: string
  limite_total?: number
  dia_vencimento?: number
  dia_fechamento?: number
  portador?: string
  observacoes?: string
  ativo?: boolean
}

export interface ImportarFaturaInput {
  cartao_id: string
  mes_referencia: number
  ano_referencia: number
  arquivo: File
}

export interface PagarFaturaInput {
  fatura_id: string
  data_pagamento: string
  valor_pago: number
}

// =====================================================
// 36. UTILITIES - CARTÃO
// =====================================================
export const BANDEIRA_LABELS: Record<CartaoBandeira, string> = {
  Visa: 'Visa',
  Mastercard: 'Mastercard',
  Amex: 'American Express',
  Elo: 'Elo',
  Hipercard: 'Hipercard',
  Diners: 'Diners Club',
  Outros: 'Outros',
}

export const FATURA_STATUS_LABELS: Record<FaturaCartaoStatus, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  pago: 'Pago',
  vencido: 'Vencido',
}

export const FATURA_STATUS_COLORS: Record<FaturaCartaoStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  parcial: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  pago: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  vencido: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

// Helper: Calcular limite disponível percentual
export function calcularLimiteDisponivel(cartao: CartaoCredito): number {
  if (cartao.limite_total === 0) return 0
  return (cartao.limite_disponivel / cartao.limite_total) * 100
}

// Helper: Formatear parcela (3/12)
export function formatarParcela(parcela_atual: number, parcela_total: number): string {
  return `${parcela_atual}/${parcela_total}`
}

// Helper: Verificar se fatura está vencida
export function faturaVencida(data_vencimento: string): boolean {
  const hoje = new Date()
  const vencimento = new Date(data_vencimento + 'T00:00:00')
  return vencimento < hoje
}
