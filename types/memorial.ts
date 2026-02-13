// =====================================================
// TYPES - SISTEMA DE MEMORIAL DE OBRAS
// Baseado em: supabase/migrations/20260213_memorial_obras.sql
// =====================================================

// =====================================================
// TABELA: memorial_obras
// =====================================================
export interface MemorialObra {
  id: string
  obra_original_id: string

  // Dados da obra
  nome: string
  descricao?: string | null
  cliente_id?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null

  // Informações do projeto
  area_construida?: number | null
  area_terreno?: number | null
  tipo_obra?: string | null
  valor_contrato?: number | null

  // Datas e prazos
  data_inicio?: string | null // Date format: YYYY-MM-DD
  data_previsao_termino?: string | null
  data_termino_real?: string | null
  duracao_meses?: number | null

  // Status e progresso
  status: string
  progresso_percentual?: number

  // Responsáveis
  engenheiro_responsavel_id?: string | null
  arquiteto_responsavel_id?: string | null
  fiscal_responsavel_id?: string | null

  // Documentação
  alvara_numero?: string | null
  alvara_data_emissao?: string | null
  art_rrt_numero?: string | null

  // Observações
  observacoes?: string | null
  riscos?: string | null

  // Metadados de arquivamento
  arquivado_em: string
  arquivado_por?: string | null
  motivo_arquivamento?: string | null

  // Metadados originais
  created_by?: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// TABELA: memorial_obra_fotos
// =====================================================
export interface MemorialObraFoto {
  id: string
  memorial_obra_id: string
  foto_original_id?: string | null
  titulo?: string | null
  descricao?: string | null
  url: string
  tipo?: string | null
  data_foto?: string | null
  latitude?: number | null
  longitude?: number | null
  uploaded_by?: string | null
  created_at: string
}

// =====================================================
// TABELA: memorial_obra_documentos
// =====================================================
export interface MemorialObraDocumento {
  id: string
  memorial_obra_id: string
  documento_original_id?: string | null
  titulo: string
  descricao?: string | null
  tipo?: string | null
  url: string
  tamanho_bytes?: number | null
  mime_type?: string | null
  uploaded_by?: string | null
  created_at: string
}

// =====================================================
// TABELA: memorial_cronograma_obras
// =====================================================
export interface MemorialCronogramaObra {
  id: string
  memorial_obra_id: string
  cronograma_original_id?: string | null
  nome: string
  descricao?: string | null
  data_inicio?: string | null
  data_fim_prevista?: string | null
  data_fim_real?: string | null
  status?: string | null
  progresso_percentual?: number | null
  created_at: string
  updated_at: string
  created_by?: string | null
}

// =====================================================
// TABELA: memorial_cronograma_atividades
// =====================================================
export interface MemorialCronogramaAtividade {
  id: string
  memorial_cronograma_id: string
  atividade_original_id?: string | null
  mes?: string | null
  dia_semana?: string | null
  data_prevista: string
  descricao_servico: string
  observacao?: string | null
  empresa_parceira_id?: string | null
  status?: string | null
  data_inicio_real?: string | null
  data_conclusao_real?: string | null
  rdo_id?: string | null
  ordem?: number | null
  prioridade?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
}

// =====================================================
// TABELA: memorial_rdos
// =====================================================
export interface MemorialRDO {
  id: string
  memorial_obra_id: string
  rdo_original_id?: string | null
  data: string
  clima?: string | null
  responsavel_id?: string | null
  atividades?: string | null
  materiais?: string | null
  equipamentos?: string | null
  mao_de_obra?: string | null
  observacoes?: string | null
  fotos?: any // JSONB
  created_at: string
  updated_at: string
}

// =====================================================
// TABELA: memorial_caixa_obra
// =====================================================
export interface MemorialCaixaObra {
  id: string
  memorial_obra_id: string
  movimentacao_original_id?: string | null
  tipo: 'entrada' | 'saida'
  categoria?: string | null
  descricao: string
  valor: number
  data: string
  forma_pagamento?: string | null
  comprovante_url?: string | null
  empresa_parceira_id?: string | null
  created_by?: string | null
  created_at: string
}

// =====================================================
// TABELA: memorial_orcamento_materiais
// =====================================================
export interface MemorialOrcamentoMaterial {
  id: string
  memorial_obra_id: string
  material_original_id?: string | null
  categoria?: string | null
  item: string
  descricao?: string | null
  unidade?: string | null
  quantidade?: number | null
  valor_unitario?: number | null
  valor_total?: number | null
  fornecedor?: string | null
  observacoes?: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// TABELA: memorial_obra_empresas
// =====================================================
export interface MemorialObraEmpresa {
  id: string
  memorial_obra_id: string
  empresa_parceira_id?: string | null
  empresa_nome: string
  empresa_cnpj?: string | null
  tipo_servico?: string | null
  data_inicio?: string | null
  data_fim?: string | null
  valor_contrato?: number | null
  status?: string | null
  created_at: string
}

// =====================================================
// TABELA: memorial_historico
// =====================================================
export interface MemorialHistorico {
  id: string
  memorial_obra_id: string
  acao: 'arquivado' | 'desarquivado'
  realizado_por?: string | null
  realizado_em: string
  motivo?: string | null
  detalhes?: any // JSONB
}

// =====================================================
// TYPES COMPOSTOS (com relações)
// =====================================================

// Memorial completo com contadores
export interface MemorialObraCompleto extends MemorialObra {
  cliente_nome?: string
  engenheiro_nome?: string
  arquiteto_nome?: string
  fiscal_nome?: string
  arquivado_por_nome?: string

  // Contadores
  total_fotos?: number
  total_documentos?: number
  total_rdos?: number
  total_movimentacoes?: number
  total_materiais?: number
  total_empresas?: number

  // Totalizadores financeiros
  total_entradas?: number
  total_saidas?: number
  saldo_final?: number
}

// Resumo do memorial para listagem
export interface MemorialObraResumo {
  id: string
  obra_original_id: string
  nome: string
  endereco?: string
  cidade?: string
  estado?: string
  tipo_obra?: string
  status: string
  data_inicio?: string
  data_termino_real?: string
  arquivado_em: string
  arquivado_por_nome?: string
  total_fotos?: number
  total_documentos?: number
  valor_contrato?: number
  saldo_final?: number
}

// Dados para arquivamento
export interface ArquivarObraParams {
  obra_id: string
  user_id: string
  motivo?: string
}

// Dados para desarquivamento
export interface DesarquivarObraParams {
  memorial_id: string
  user_id: string
  motivo?: string
}

// Estatísticas do memorial
export interface MemorialEstatisticas {
  total_obras_arquivadas: number
  obras_por_status: Record<string, number>
  obras_por_tipo: Record<string, number>
  obras_por_ano: Record<string, number>
  valor_total_contratos: number
  area_total_construida: number
}

// Filtros para memorial
export interface MemorialFiltros {
  status?: string[]
  tipo_obra?: string[]
  cidade?: string[]
  estado?: string[]
  ano_conclusao?: number[]
  data_arquivamento_de?: string
  data_arquivamento_ate?: string
  busca?: string
  cliente_id?: string
}
