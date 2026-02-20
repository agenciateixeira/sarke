// =====================================================
// TIPOS PARA SISTEMA DE PROJETOS - SARKE STUDIO
// =====================================================

// Enums e Tipos Base
export type AreaProjeto = 'residencial' | 'comercial' | 'corporativo'
export type FrenteProjeto = 'arq' | 'int'
export type EtapaProjeto = 'planejamento' | 'planta_baixa' | '3d' | 'executivo' | 'concluido' | 'pausado' | 'cancelado'
export type StatusEtapa = 'pendente' | 'em_andamento' | 'concluido'
export type TipoArquivoProjeto = 'dwg' | 'pdf' | 'revit' | 'sketchup' | 'render' | 'foto' | 'video' | 'documento' | 'memorial' | 'orcamento' | 'contrato' | 'outro'
export type CategoriaArquivo = 'planejamento' | 'planta_baixa' | '3d' | 'executivo' | 'geral'
export type TipoEventoTimeline = 'criacao' | 'mudanca_etapa' | 'aprovacao' | 'revisao' | 'upload_arquivo' | 'comentario' | 'reuniao' | 'entrega' | 'outro'

// =====================================================
// PROJETO PRINCIPAL
// =====================================================
export interface Projeto {
  id: string

  // Informações Básicas
  nome: string
  descricao?: string
  cliente_id?: string

  // Classificação
  area: AreaProjeto
  tipo_especifico?: string
  frente: FrenteProjeto[]

  // Localização
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  latitude?: number
  longitude?: number

  // Dimensões
  area_construida?: number
  area_terreno?: number
  area_util?: number
  numero_pavimentos?: number
  numero_ambientes?: number

  // Etapa e Progresso
  etapa_atual: EtapaProjeto
  progresso_percentual: number

  // Status de Cada Etapa
  planejamento_status: StatusEtapa
  planejamento_progresso: number

  planta_baixa_status: StatusEtapa
  planta_baixa_progresso: number

  modelo_3d_status: StatusEtapa
  modelo_3d_progresso: number

  executivo_status: StatusEtapa
  executivo_progresso: number

  // Datas
  data_inicio?: string
  data_previsao_entrega?: string
  data_entrega_real?: string
  prazo_dias?: number

  // Datas por Etapa
  planejamento_data_inicio?: string
  planejamento_data_fim?: string

  planta_baixa_data_inicio?: string
  planta_baixa_data_fim?: string

  modelo_3d_data_inicio?: string
  modelo_3d_data_fim?: string

  executivo_data_inicio?: string
  executivo_data_fim?: string

  // Financeiro
  valor_contrato?: number
  valor_recebido: number
  valor_pendente?: number

  // Equipe Responsável
  arquiteto_responsavel_id?: string
  designer_responsavel_id?: string
  coordenador_id?: string

  // Observações
  observacoes?: string
  briefing?: string
  conceito?: string
  estilo?: string

  // Metadados
  created_by?: string
  created_at: string
  updated_at: string
}

// =====================================================
// PROJETO COMPLETO (com joins)
// =====================================================
export interface ProjetoCompleto extends Projeto {
  // Cliente
  cliente_nome?: string
  cliente_email?: string
  cliente_telefone?: string

  // Equipe
  arquiteto_nome?: string
  designer_nome?: string
  coordenador_nome?: string

  // Contadores
  total_arquivos: number
  comentarios_pendentes: number

  // Status Geral
  status_geral: 'completo' | 'em_andamento' | 'pausado' | 'cancelado'
}

// =====================================================
// ETAPA: PLANEJAMENTO
// =====================================================
export interface ProjetoPlanejamento {
  id: string
  projeto_id: string

  // Formulário Inicial
  formulario_preenchido: boolean
  formulario_data?: string

  // Visita Técnica
  visita_realizada: boolean
  visita_data?: string
  visita_responsavel_id?: string
  visita_observacoes?: string

  // Entrevista de Alinhamento
  entrevista_realizada: boolean
  entrevista_data?: string
  entrevista_participantes?: string[]

  // Análise de Briefing
  briefing_analisado: boolean
  briefing_necessidades?: string
  briefing_desejos?: string
  briefing_restricoes?: string
  briefing_orcamento?: number

  // Referências
  referencias?: any // JSONB

  // Planejamento Interno
  planejamento_equipe?: string
  prazo_definido?: number

  // Aprovação
  aprovado: boolean
  aprovado_por?: string
  aprovado_em?: string

  created_at: string
  updated_at: string
}

// =====================================================
// ETAPA: PLANTA BAIXA
// =====================================================
export interface ProjetoPlantaBaixa {
  id: string
  projeto_id: string

  // Conceito
  conceito?: string
  partido_arquitetonico?: string

  // Setorização
  setorizacao?: any // JSONB

  // Estudos
  estudo_fluxo?: string
  estudo_mobiliario?: string
  estudo_iluminacao?: string
  estudo_ventilacao?: string

  // Análise Normativa
  analise_normativa_realizada: boolean
  codigo_obras?: string
  restricoes_legais?: string
  afastamentos?: string
  taxa_ocupacao?: number
  coeficiente_aproveitamento?: number

  // Versões da Planta
  versao_atual: number

  // Arquivos
  arquivo_dwg_url?: string
  arquivo_pdf_url?: string
  arquivo_revit_url?: string

  // Aprovação Cliente
  aprovado_cliente: boolean
  aprovado_cliente_data?: string
  aprovado_cliente_observacoes?: string

  // Revisões
  numero_revisoes: number

  created_at: string
  updated_at: string
}

// =====================================================
// ETAPA: 3D
// =====================================================
export interface Projeto3D {
  id: string
  projeto_id: string

  // Modelagem
  modelo_revit_url?: string
  modelo_sketchup_url?: string

  // Renderização
  total_renders: number
  renders_aprovados: number

  // Imagens
  imagens_estaticas?: string[]
  imagens_360?: string[]

  // Pós-produção
  pos_producao_ia: boolean
  pos_producao_software?: string

  // Realidade Virtual
  vr_disponivel: boolean
  vr_link?: string
  passeio_virtual_url?: string

  // Video
  video_disponivel: boolean
  video_url?: string
  video_duracao?: number

  // Aprovação
  aprovado_cliente: boolean
  aprovado_cliente_data?: string

  // Revisões
  numero_revisoes: number

  created_at: string
  updated_at: string
}

// =====================================================
// ETAPA: EXECUTIVO
// =====================================================
export interface ProjetoExecutivo {
  id: string
  projeto_id: string

  // ARQ - Arquitetônico
  planta_estrutural: boolean
  planta_estrutural_url?: string

  cortes_fachadas: boolean
  cortes_fachadas_url?: string

  paginacao_pisos: boolean
  paginacao_pisos_url?: string

  memorial_descritivo_arq: boolean
  memorial_descritivo_arq_url?: string

  detalhamentos_construtivos: boolean
  detalhamentos_construtivos_url?: string

  // INT - Interiores
  planta_eletrica: boolean
  planta_eletrica_url?: string

  planta_hidraulica: boolean
  planta_hidraulica_url?: string

  projeto_luminotecnico: boolean
  projeto_luminotecnico_url?: string

  projeto_forro: boolean
  projeto_forro_url?: string

  detalhamento_marcenaria: boolean
  detalhamento_marcenaria_url?: string

  comunicacao_visual: boolean
  comunicacao_visual_url?: string

  memorial_tecnico_int: boolean
  memorial_tecnico_int_url?: string

  // Caderno Técnico Completo
  caderno_completo: boolean
  caderno_completo_url?: string

  // Aprovação
  aprovado_cliente: boolean
  aprovado_cliente_data?: string

  // Entrega
  entregue: boolean
  data_entrega?: string

  created_at: string
  updated_at: string
}

// =====================================================
// ARQUIVOS
// =====================================================
export interface ProjetoArquivo {
  id: string
  projeto_id: string

  // Informações do Arquivo
  titulo: string
  descricao?: string
  tipo: TipoArquivoProjeto
  categoria?: CategoriaArquivo

  // Arquivo
  url: string
  tamanho_bytes?: number
  mime_type?: string

  // Versionamento
  versao: number
  versao_anterior_id?: string

  // Visibilidade
  visivel_cliente: boolean

  // Metadata
  uploaded_by?: string
  created_at: string
}

// =====================================================
// TIMELINE
// =====================================================
export interface ProjetoTimeline {
  id: string
  projeto_id: string

  // Evento
  tipo_evento: TipoEventoTimeline
  titulo: string
  descricao?: string

  // Dados do Evento
  dados?: any // JSONB

  // Relacionamentos
  arquivo_id?: string

  // Usuário
  usuario_id?: string
  usuario?: {
    name: string
    avatar_url?: string
  }

  created_at: string
}

// =====================================================
// COMENTÁRIOS
// =====================================================
export interface ProjetoComentario {
  id: string
  projeto_id: string

  // Comentário
  texto: string
  categoria?: CategoriaArquivo | 'geral'

  // Anexos
  anexos?: string[]

  // Status
  resolvido: boolean
  resolvido_por?: string
  resolvido_em?: string

  // Autor
  autor_id?: string
  autor?: {
    name: string
    avatar_url?: string
  }

  // Thread (respostas)
  comentario_pai_id?: string
  respostas?: ProjetoComentario[]

  created_at: string
  updated_at: string
}

// =====================================================
// HELPERS E UTILITÁRIOS
// =====================================================

// Labels para área
export const areaLabels: Record<AreaProjeto, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  corporativo: 'Corporativo',
}

// Labels para frente
export const frenteLabels: Record<FrenteProjeto, string> = {
  arq: 'ARQ',
  int: 'INT',
}

// Labels para etapa
export const etapaLabels: Record<EtapaProjeto, string> = {
  planejamento: 'Planejamento',
  planta_baixa: 'Planta Baixa',
  '3d': '3D',
  executivo: 'Executivo',
  concluido: 'Concluído',
  pausado: 'Pausado',
  cancelado: 'Cancelado',
}

// Cores para etapa
export const etapaCores: Record<EtapaProjeto, string> = {
  planejamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  planta_baixa: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  '3d': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  executivo: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  concluido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pausado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

// Labels para status de etapa
export const statusEtapaLabels: Record<StatusEtapa, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
}

// Cores para status de etapa
export const statusEtapaCores: Record<StatusEtapa, string> = {
  pendente: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  em_andamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  concluido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
}

// Function: Verificar se usuário tem acesso ao projeto
export function hasProjetoAccess(userRole: string): boolean {
  return ['admin', 'gerente', 'colaborador', 'juridico'].includes(userRole)
}

// Function: Formatar frentes
export function formatarFrente(frente: FrenteProjeto[]): string {
  if (frente.length === 0) return '-'
  if (frente.length === 1) return frenteLabels[frente[0]]
  return frente.map(f => frenteLabels[f]).join(' + ')
}
