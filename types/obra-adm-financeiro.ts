// =====================================================
// TYPES: Sistema ADM/Financeiro de Obras
// Data: 2026-02-06
// Descrição: Tipos TypeScript para orçamento e caixa de obra
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export type StatusObraEnum =
  | 'FINALIZADO'
  | 'EM ANDAMENTO'
  | 'PENDENTE'
  | 'CANCELADO'
  | 'PAUSADO';

export type StatusPagamentoEnum =
  | 'PAGO'
  | 'A PAGAR'
  | 'PARCIAL'
  | 'DESCONTO'
  | 'CANCELADO';

export type MedidaEnum =
  | 'VERBA'
  | 'M²'
  | 'M³'
  | 'UNID'
  | 'METROS'
  | 'KG'
  | 'LITROS'
  | 'HORAS'
  | 'DIAS';

export type TipoReciboEnum =
  | 'NF'
  | 'CUPOM'
  | 'RECIBO'
  | 'SEM NF'
  | 'PIX'
  | 'TRANSFERÊNCIA';

export type StatusCaixaEnum =
  | 'PAGO'
  | 'PENDENTE'
  | 'TRANSFERIDO'
  | 'CANCELADO';

export type StatusSemanaEnum =
  | 'ABERTA'
  | 'FECHADA'
  | 'ENVIADA_CLIENTE';

// =====================================================
// INTERFACE: ObraOrcamentoMaterial
// =====================================================

export interface ObraOrcamentoMaterial {
  id: string;
  obra_id: string;

  // Identificação
  local?: string;
  item: string;
  descricao: string;

  // Quantidades
  quantidade?: number;
  medida?: MedidaEnum | string;

  // Valores
  valor_total: number;
  valor_pago: number;
  valor_restante: number;

  // Controle
  forma_pagamento?: string;
  empresa_parceira_id?: string;
  responsavel_sarke?: string;

  // Status
  status_obra?: StatusObraEnum | string;
  status_pagamento: StatusPagamentoEnum | string;

  // Observações
  observacoes?: string;

  // Ordem
  ordem?: number;

  // Metadados
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ObraOrcamentoMaterialInput {
  obra_id: string;
  local?: string;
  item: string;
  descricao: string;
  quantidade?: number;
  medida?: string;
  valor_total?: number;
  valor_pago?: number;
  forma_pagamento?: string;
  empresa_parceira_id?: string;
  responsavel_sarke?: string;
  status_obra?: string;
  status_pagamento?: string;
  observacoes?: string;
  ordem?: number;
}

// =====================================================
// INTERFACE: ObraCaixa
// =====================================================

export interface ObraCaixa {
  id: string;
  obra_id: string;

  // Identificação
  semana?: string;
  categoria?: string;
  item_numero?: number;

  // Dados da movimentação
  data: string;
  descricao: string;
  empresa?: string;

  // Valor (negativo = despesa, positivo = receita)
  valor: number;

  // Comprovante
  tipo_recibo?: TipoReciboEnum | string;
  codigo_recibo?: string;
  anexo_url?: string;

  // Controle de comprovantes
  is_marketplace: boolean;
  prazo_comprovante?: string;
  tem_comprovante: boolean;
  justificativa_sem_comprovante?: string;
  comprovante_aprovado: boolean;
  comprovante_aprovado_por?: string;
  comprovante_aprovado_em?: string;

  // Status
  status: StatusCaixaEnum | string;

  // Observações
  observacoes?: string;

  // Metadados
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ObraCaixaInput {
  obra_id: string;
  semana?: string;
  categoria?: string;
  item_numero?: number;
  data: string;
  descricao: string;
  empresa?: string;
  valor: number;
  tipo_recibo?: string;
  codigo_recibo?: string;
  anexo_url?: string;
  is_marketplace?: boolean;
  justificativa_sem_comprovante?: string;
  status?: string;
  observacoes?: string;
}

// =====================================================
// INTERFACE: ObraCaixaSemana
// =====================================================

export interface ObraCaixaSemana {
  id: string;
  obra_id: string;

  // Identificação
  numero_semana: number;
  nome: string; // "SEMANA 01", "SEMANA 02"

  // Período
  data_inicio: string;
  data_fim: string;

  // Totalizadores
  total_despesas: number;
  total_receitas: number;
  saldo: number;

  // Status
  status: StatusSemanaEnum;
  data_envio_cliente?: string;

  // Observações
  observacoes?: string;

  // Metadados
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ObraCaixaSemanaInput {
  obra_id: string;
  numero_semana: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  status?: StatusSemanaEnum;
  observacoes?: string;
}

// =====================================================
// INTERFACE: Views e Resumos
// =====================================================

export interface ObraOrcamentoResumo {
  obra_id: string;
  total_itens: number;
  itens_pagos: number;
  itens_a_pagar: number;
  itens_parciais: number;
  valor_total_orcado: number;
  valor_total_pago: number;
  valor_total_restante: number;
  percentual_pago: number;
}

export interface ObraCaixaResumoSemana {
  obra_id: string;
  semana: string;
  total_movimentacoes: number;
  total_despesas_count: number;
  total_receitas_count: number;
  total_despesas: number;
  total_receitas: number;
  saldo_semana: number;
  data_inicio: string;
  data_fim: string;
}

export interface ObraFinanceiroConsolidado {
  obra_id: string;
  obra_nome: string;
  cliente_id?: string;

  // Orçamento
  orcamento_total: number;
  orcamento_pago: number;
  orcamento_restante: number;
  orcamento_percentual_pago: number;

  // Caixa
  caixa_total_despesas: number;
  caixa_total_receitas: number;
  caixa_saldo_total: number;
}

// =====================================================
// INTERFACE: Filtros e Buscas
// =====================================================

export interface OrcamentoFiltros {
  obra_id?: string;
  local?: string;
  status_obra?: string;
  status_pagamento?: string;
  empresa_parceira_id?: string;
  responsavel_sarke?: string;
  busca?: string; // busca em descricao, item, local
}

export interface CaixaFiltros {
  obra_id?: string;
  semana?: string;
  categoria?: string;
  data_inicio?: string;
  data_fim?: string;
  status?: string;
  tipo_recibo?: string;
  busca?: string; // busca em descricao, empresa
}

export interface SemanasFiltros {
  obra_id?: string;
  status?: StatusSemanaEnum;
  data_inicio?: string;
  data_fim?: string;
}

// =====================================================
// INTERFACE: Importação/Exportação Excel
// =====================================================

export interface OrcamentoExcelRow {
  local?: string;
  item: string;
  descricao: string;
  quantidade?: number;
  medida?: string;
  valor_total?: number;
  valor_pago?: number;
  valor_restante?: number;
  forma_pagamento?: string;
  empresa?: string;
  responsavel_sarke?: string;
  status_obra?: string;
  status_pagamento?: string;
}

export interface CaixaExcelRow {
  item?: number;
  data: string;
  descricao: string;
  empresa?: string;
  valor: number;
  tipo_recibo?: string;
  codigo_recibo?: string;
  status?: string;
}

export interface ImportarOrcamentoExcelInput {
  obra_id: string;
  arquivo: File;
  substituir?: boolean; // substituir dados existentes ou adicionar
}

export interface ImportarCaixaExcelInput {
  obra_id: string;
  semana: string;
  arquivo: File;
  substituir?: boolean;
}

// =====================================================
// INTERFACE: Estatísticas e Dashboards
// =====================================================

export interface EstatisticasOrcamento {
  obra_id: string;

  // Totais gerais
  total_itens: number;
  total_orcado: number;
  total_pago: number;
  total_restante: number;

  // Por status de pagamento
  por_status: {
    status: StatusPagamentoEnum;
    quantidade: number;
    valor_total: number;
  }[];

  // Por local
  por_local: {
    local: string;
    quantidade: number;
    valor_total: number;
    valor_pago: number;
  }[];

  // Por empresa parceira
  por_empresa: {
    empresa_id: string;
    empresa_nome: string;
    quantidade: number;
    valor_total: number;
    valor_pago: number;
  }[];

  // Progressão de pagamento
  percentual_pago: number;
  itens_finalizados: number;
  itens_pendentes: number;
}

export interface EstatisticasCaixa {
  obra_id: string;

  // Totais gerais
  total_movimentacoes: number;
  total_despesas: number;
  total_receitas: number;
  saldo_total: number;

  // Por semana
  por_semana: {
    semana: string;
    total_despesas: number;
    total_receitas: number;
    saldo: number;
  }[];

  // Por categoria
  por_categoria: {
    categoria: string;
    total_despesas: number;
    total_receitas: number;
  }[];

  // Maiores despesas
  maiores_despesas: ObraCaixa[];

  // Últimas movimentações
  ultimas_movimentacoes: ObraCaixa[];
}

// =====================================================
// INTERFACE: Exportação para PDF
// =====================================================

export interface ExportOrcamentoPDFConfig {
  obra_id: string;
  incluir_logo?: boolean;
  incluir_totalizadores?: boolean;
  filtrar_por_local?: string;
  filtrar_por_status?: StatusPagamentoEnum;
  ordenar_por?: 'item' | 'local' | 'valor_total';
}

export interface ExportCaixaPDFConfig {
  obra_id: string;
  semana?: string; // se não especificar, exporta todas as semanas
  incluir_logo?: boolean;
  incluir_totalizadores?: boolean;
  incluir_graficos?: boolean;
  incluir_recibos?: boolean; // anexar fotos dos recibos
}

// =====================================================
// INTERFACE: Integração com RDO
// =====================================================

export interface RDOComCaixaSemana {
  // Dados do RDO normal
  rdo_id: string;
  obra_id: string;
  data: string;
  // ... outros campos do RDO

  // Dados do caixa da semana
  incluir_caixa?: boolean;
  caixa_semana?: string; // qual semana incluir
  caixa_dados?: ObraCaixaResumoSemana;
  caixa_movimentacoes?: ObraCaixa[];
}

export interface ExportRDOComCaixaConfig {
  rdo_id: string;
  incluir_caixa_semana: boolean;
  semana_selecionada?: string;
  exibir_detalhamento?: boolean; // exibir todas as movimentações ou apenas resumo
}

// =====================================================
// INTERFACE: Sistema de Comprovantes
// =====================================================

export type StatusComprovanteEnum =
  | 'PENDENTE'
  | 'JUSTIFICADO'
  | 'ENVIADO'
  | 'APROVADO'
  | 'VENCIDO';

export type TipoNotificacaoEnum =
  | 'LEMBRETE_COMPROVANTE'
  | 'PRAZO_VENCENDO'
  | 'PRAZO_VENCIDO';

export interface ObraCaixaComprovantePendente {
  id: string;
  caixa_id: string;
  obra_id: string;

  // Status
  status: StatusComprovanteEnum;
  dias_pendente: number;
  esta_vencido: boolean;

  // Notificações
  ultima_notificacao_enviada?: string;
  total_notificacoes_enviadas: number;

  // Responsáveis notificados
  usuarios_notificados?: string[];
  admins_notificados?: string[];

  // Metadados
  created_at: string;
  updated_at: string;
}

export interface ObraCaixaNotificacaoLog {
  id: string;
  caixa_id: string;
  pendencia_id?: string;

  // Dados da notificação
  tipo: TipoNotificacaoEnum;
  usuario_notificado?: string;
  mensagem?: string;

  // Status
  enviada: boolean;
  erro?: string;

  // Metadados
  created_at: string;
}

export interface ObraComprovantesPendentesResumo {
  obra_id: string;
  total_pendentes: number;
  total_vencidos: number;
  total_aguardando: number;
  total_justificados: number;
  alertas_criticos: number;
}

export interface ObraComprovantesPendentesDetalhes {
  pendencia_id: string;
  caixa_id: string;
  obra_id: string;
  status: StatusComprovanteEnum;
  dias_pendente: number;
  esta_vencido: boolean;
  total_notificacoes_enviadas: number;
  ultima_notificacao_enviada?: string;

  // Dados do caixa
  data: string;
  descricao: string;
  empresa?: string;
  valor: number;
  tipo_recibo?: string;
  codigo_recibo?: string;
  prazo_comprovante?: string;
  is_marketplace: boolean;
  justificativa_sem_comprovante?: string;
  usuario_responsavel_id?: string;

  // Dados da obra
  obra_nome: string;

  // Dados do usuário
  usuario_responsavel_nome?: string;
  usuario_responsavel_email?: string;

  // Urgência
  dias_urgencia: number;
}

// =====================================================
// UTILS: Funções auxiliares de tipos
// =====================================================

export const STATUS_PAGAMENTO_LABELS: Record<StatusPagamentoEnum, string> = {
  'PAGO': 'Pago',
  'A PAGAR': 'A Pagar',
  'PARCIAL': 'Parcial',
  'DESCONTO': 'Desconto',
  'CANCELADO': 'Cancelado',
};

export const STATUS_OBRA_LABELS: Record<StatusObraEnum, string> = {
  'FINALIZADO': 'Finalizado',
  'EM ANDAMENTO': 'Em Andamento',
  'PENDENTE': 'Pendente',
  'CANCELADO': 'Cancelado',
  'PAUSADO': 'Pausado',
};

export const TIPO_RECIBO_LABELS: Record<TipoReciboEnum, string> = {
  'NF': 'Nota Fiscal',
  'CUPOM': 'Cupom Fiscal',
  'RECIBO': 'Recibo',
  'SEM NF': 'Sem Nota Fiscal',
  'PIX': 'PIX',
  'TRANSFERÊNCIA': 'Transferência Bancária',
};

export const STATUS_CAIXA_LABELS: Record<StatusCaixaEnum, string> = {
  'PAGO': 'Pago',
  'PENDENTE': 'Pendente',
  'TRANSFERIDO': 'Transferido',
  'CANCELADO': 'Cancelado',
};

export const STATUS_SEMANA_LABELS: Record<StatusSemanaEnum, string> = {
  'ABERTA': 'Aberta',
  'FECHADA': 'Fechada',
  'ENVIADA_CLIENTE': 'Enviada ao Cliente',
};

// Função auxiliar para formatar valores monetários
export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

// Função auxiliar para calcular valor restante
export const calcularValorRestante = (total: number, pago: number): number => {
  return total - pago;
};

// Função auxiliar para calcular percentual pago
export const calcularPercentualPago = (pago: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((pago / total) * 100 * 100) / 100;
};

// Função auxiliar para determinar cor do status de pagamento
export const getStatusPagamentoCor = (status: StatusPagamentoEnum): string => {
  const cores: Record<StatusPagamentoEnum, string> = {
    'PAGO': 'green',
    'A PAGAR': 'red',
    'PARCIAL': 'yellow',
    'DESCONTO': 'blue',
    'CANCELADO': 'gray',
  };
  return cores[status] || 'gray';
};

// Função auxiliar para determinar se é despesa ou receita
export const isDespesa = (valor: number): boolean => valor < 0;
export const isReceita = (valor: number): boolean => valor > 0;

// Labels para status de comprovantes
export const STATUS_COMPROVANTE_LABELS: Record<StatusComprovanteEnum, string> = {
  'PENDENTE': 'Pendente',
  'JUSTIFICADO': 'Justificado',
  'ENVIADO': 'Enviado',
  'APROVADO': 'Aprovado',
  'VENCIDO': 'Vencido',
};

// Labels para tipo de notificação
export const TIPO_NOTIFICACAO_LABELS: Record<TipoNotificacaoEnum, string> = {
  'LEMBRETE_COMPROVANTE': 'Lembrete de Comprovante',
  'PRAZO_VENCENDO': 'Prazo Vencendo',
  'PRAZO_VENCIDO': 'Prazo Vencido',
};

// Função auxiliar para verificar se comprovante está pendente
export const isComprovantePendente = (caixa: ObraCaixa): boolean => {
  return (
    caixa.valor < 0 && // É despesa
    !caixa.tem_comprovante &&
    (!caixa.justificativa_sem_comprovante || caixa.justificativa_sem_comprovante.trim() === '')
  );
};

// Função auxiliar para verificar se prazo está vencido
export const isPrazoVencido = (prazoComprovante?: string): boolean => {
  if (!prazoComprovante) return false;
  return new Date(prazoComprovante) < new Date();
};

// Função auxiliar para calcular dias restantes até vencimento
export const calcularDiasRestantes = (prazoComprovante?: string): number => {
  if (!prazoComprovante) return 0;
  const hoje = new Date();
  const prazo = new Date(prazoComprovante);
  const diff = prazo.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Função auxiliar para determinar cor do status de comprovante
export const getStatusComprovanteCor = (
  temComprovante: boolean,
  prazoComprovante?: string,
  justificativa?: string
): string => {
  // Tem comprovante = verde
  if (temComprovante) return 'green';

  // Tem justificativa = amarelo
  if (justificativa && justificativa.trim() !== '') return 'yellow';

  // Prazo vencido = vermelho
  if (isPrazoVencido(prazoComprovante)) return 'red';

  // Prazo próximo (menos de 2 dias) = laranja
  const diasRestantes = calcularDiasRestantes(prazoComprovante);
  if (diasRestantes <= 2 && diasRestantes > 0) return 'orange';

  // Pendente normal = azul
  return 'blue';
};
