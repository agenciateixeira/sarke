import * as XLSX from 'xlsx'
import { CronogramaObraCompleto, CronogramaObraAtividade } from '@/types/cronograma-obra'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Interface para atividade importada
export interface AtividadeImportada {
  data_prevista: string
  descricao_servico: string
  status?: string
  prioridade?: string
  observacao?: string
  mes?: string
  dia_semana?: string
}

// Interface para material/serviço importado (caixa da obra)
export interface MaterialServicoCaixaImportado {
  data?: string
  servico?: string
  descricao_material?: string
  quantidade?: number
  medida?: string
  valor_unitario?: number
  valor_total?: number
  responsavel?: string
  status?: string
  observacoes?: string
}

// Interface do resultado da importação
export interface ResultadoImportacao {
  cronograma: {
    atividades: AtividadeImportada[]
    totalLinhas: number
    totalImportado: number
  }
  caixaObra?: {
    materiais: MaterialServicoCaixaImportado[]
    totalLinhas: number
    totalImportado: number
  }
  avisos: string[]
  empresasNaoCadastradas?: string[] // Lista de empresas encontradas na planilha mas não cadastradas no sistema
}

/**
 * IMPORTAÇÃO MELHORADA - VERSÃO 2.0
 * Corrige o problema de importar apenas a primeira tarefa de cada dia
 * Suporta múltiplas abas (Cronograma + Caixa da Obra/Serviços)
 * Valida empresas parceiras cadastradas no sistema
 */
export function importarCronogramaExcelV2(file: File): Promise<ResultadoImportacao> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        const resultado: ResultadoImportacao = {
          cronograma: {
            atividades: [],
            totalLinhas: 0,
            totalImportado: 0
          },
          avisos: []
        }

        // ========== PROCESSAR CRONOGRAMA ==========
        const cronogramaSheet = buscarAbaCronograma(workbook)
        if (cronogramaSheet) {
          const cronogramaResult = processarAbaCronograma(workbook, cronogramaSheet.name)
          resultado.cronograma = cronogramaResult
          if (cronogramaResult.avisos) {
            resultado.avisos.push(...cronogramaResult.avisos)
          }
          // Coletar empresas únicas da planilha
          if (cronogramaResult.empresasUnicas) {
            resultado.empresasNaoCadastradas = cronogramaResult.empresasUnicas
          }
        } else {
          resultado.avisos.push('Aba de cronograma não encontrada')
        }

        // ========== PROCESSAR CAIXA DA OBRA/SERVIÇOS (se existir) ==========
        const caixaSheet = buscarAbaCaixaObra(workbook)
        if (caixaSheet) {
          const caixaResult = processarAbaCaixaObra(workbook, caixaSheet.name)
          resultado.caixaObra = caixaResult
          resultado.avisos.push(`Aba "${caixaSheet.name}" encontrada e processada com ${caixaResult.totalImportado} itens`)
        }

        // Validar se importou algo
        if (resultado.cronograma.totalImportado === 0 && (!resultado.caixaObra || resultado.caixaObra.totalImportado === 0)) {
          throw new Error('Nenhum dado válido encontrado no arquivo')
        }

        resolve(resultado)
      } catch (error: any) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Busca a aba de cronograma na planilha
 */
function buscarAbaCronograma(workbook: XLSX.WorkBook): { name: string; index: number } | null {
  const cronogramaKeywords = ['cronograma', 'atividades', 'planejamento', 'schedule']

  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i].toLowerCase()
    if (cronogramaKeywords.some(keyword => sheetName.includes(keyword))) {
      return { name: workbook.SheetNames[i], index: i }
    }
  }

  // Se não encontrou por nome, usar primeira aba como padrão
  if (workbook.SheetNames.length > 0) {
    return { name: workbook.SheetNames[0], index: 0 }
  }

  return null
}

/**
 * Busca a aba de caixa da obra/serviços
 */
function buscarAbaCaixaObra(workbook: XLSX.WorkBook): { name: string; index: number } | null {
  const caixaKeywords = ['caixa', 'serviço', 'servico', 'material', 'materiais', 'financeiro', 'orçamento', 'orcamento']

  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i].toLowerCase()
    if (caixaKeywords.some(keyword => sheetName.includes(keyword))) {
      return { name: workbook.SheetNames[i], index: i }
    }
  }

  return null
}

/**
 * Processa aba de cronograma - VERSÃO MELHORADA
 * Agora captura TODAS as tarefas, não apenas a primeira de cada dia
 */
function processarAbaCronograma(workbook: XLSX.WorkBook, sheetName: string): any {
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

  // Encontrar linha de cabeçalho
  let headerRowIndex = -1
  const headerKeywords = ['data', 'descrição', 'descricao', 'serviço', 'servico', 'atividade', 'tarefa']

  console.log('[ImportadorV2] Procurando cabeçalho...')
  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const row = jsonData[i]
    if (Array.isArray(row) && row.length > 0) {
      const rowText = row
        .filter(cell => cell !== null && cell !== undefined)
        .map(cell => String(cell))
        .join(' ')
        .toLowerCase()

      // Debug: mostrar primeiras 3 linhas para entender a estrutura
      if (i < 3) {
        console.log(`[ImportadorV2] Linha ${i}: ${rowText.substring(0, 100)}...`)
      }

      if (headerKeywords.some(keyword => rowText.includes(keyword))) {
        headerRowIndex = i
        console.log(`[ImportadorV2] Cabeçalho encontrado na linha ${i}`)
        break
      }
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Cabeçalho não encontrado no cronograma')
  }

  // Garantir que headers é um array válido
  if (!Array.isArray(jsonData[headerRowIndex])) {
    throw new Error('Linha de cabeçalho inválida')
  }

  console.log(`[ImportadorV2] Processando cabeçalho com ${jsonData[headerRowIndex].length} colunas`)

  const headers = jsonData[headerRowIndex].map((h: any) => {
    if (h === null || h === undefined || h === '') return ''
    return String(h).toLowerCase().trim()
  })

  // Debug: mostrar headers encontrados
  console.log('[ImportadorV2] Headers:', headers.slice(0, 10).join(', '))

  const dataRows = jsonData.slice(headerRowIndex + 1)

  // Mapear índices das colunas com verificações seguras
  const indices = {
    mes: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('mês') || h.includes('mes')
    }),
    diaSemana: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('dia') && (h.includes('semana') || h.includes('week'))
    }),
    data: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('data') || (h.includes('dt') && !h.includes('atualiza'))
    }),
    descricao: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('descrição') || h.includes('descricao') ||
        h.includes('serviço') || h.includes('servico') ||
        h.includes('atividade') || h.includes('tarefa')
    }),
    observacao: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('observação') || h.includes('observacao') || h.includes('obs')
    }),
    empresa: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('empresa') || h.includes('responsável') || h.includes('responsavel')
    }),
    status: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('status')
    })
  }

  // Debug: mostrar índices encontrados
  console.log('[ImportadorV2] Índices encontrados:', {
    data: indices.data,
    descricao: indices.descricao,
    status: indices.status,
    observacao: indices.observacao,
    empresa: indices.empresa
  })

  if (indices.data === -1 || indices.descricao === -1) {
    console.error('[ImportadorV2] Colunas obrigatórias não encontradas!')
    console.error('[ImportadorV2] Headers disponíveis:', headers)
    throw new Error('Colunas obrigatórias não encontradas (Data e Descrição)')
  }

  const atividades: AtividadeImportada[] = []
  const empresasEncontradas = new Set<string>() // Coletar empresas únicas
  let ultimaDataValida: string | null = null
  let ultimoMes: string | null = null
  let ultimoDiaSemana: string | null = null
  let linhasProcessadas = 0
  let linhasVaziasConsecutivas = 0
  const MAX_LINHAS_VAZIAS = 10 // Permitir até 10 linhas vazias antes de parar

  // MUDANÇA PRINCIPAL: Processar todas as linhas, usando última data quando não houver
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    linhasProcessadas++

    // Verificar se tem descrição (campo obrigatório)
    const descricao = row[indices.descricao]

    // Se linha vazia ou sem descrição
    if (!descricao || String(descricao).trim() === '') {
      linhasVaziasConsecutivas++

      // Se encontrou mais de MAX_LINHAS_VAZIAS consecutivas, parar de processar
      if (linhasVaziasConsecutivas > MAX_LINHAS_VAZIAS) {
        break
      }

      continue
    }

    // Reset contador de linhas vazias quando encontra conteúdo
    linhasVaziasConsecutivas = 0

    // Ignorar linhas de total ou resumo
    const descStr = String(descricao).toLowerCase()
    if (descStr.includes('total') || descStr.includes('soma') || descStr.includes('resumo')) continue

    // Verificar se tem data nesta linha
    let dataPrevista: string | null = null
    const dataCell = row[indices.data]

    if (dataCell) {
      dataPrevista = parseExcelDate(dataCell)
      if (dataPrevista) {
        // Atualizar última data válida
        ultimaDataValida = dataPrevista
        // Atualizar mês e dia da semana se disponíveis
        if (indices.mes >= 0 && row[indices.mes]) {
          ultimoMes = String(row[indices.mes])
        }
        if (indices.diaSemana >= 0 && row[indices.diaSemana]) {
          ultimoDiaSemana = String(row[indices.diaSemana])
        }
      }
    }

    // Se não tem data nesta linha, usar a última data válida
    if (!dataPrevista && ultimaDataValida) {
      dataPrevista = ultimaDataValida
    }

    // Se ainda não tem data, pular (só acontece se a primeira linha não tem data)
    if (!dataPrevista) continue

    // Coletar empresa se existir
    const empresa = indices.empresa >= 0 && row[indices.empresa]
      ? String(row[indices.empresa]).trim()
      : ''

    if (empresa && empresa !== '') {
      empresasEncontradas.add(empresa)
    }

    // Criar atividade sem o campo empresa (não existe na tabela)
    atividades.push({
      data_prevista: dataPrevista,
      descricao_servico: String(descricao),
      status: indices.status >= 0 && row[indices.status]
        ? mapStatus(String(row[indices.status]))
        : 'pendente',
      prioridade: 'normal',
      observacao: indices.observacao >= 0 && row[indices.observacao]
        ? String(row[indices.observacao])
        : '',
      mes: ultimoMes || undefined,
      dia_semana: ultimoDiaSemana || undefined
    })
  }

  // Converter Set para Array de empresas únicas
  const empresasUnicas = Array.from(empresasEncontradas).filter(e => e !== 'SARKE') // Filtrar SARKE pois é a própria empresa

  console.log(`[ImportadorV2] Importação concluída: ${atividades.length} atividades de ${linhasProcessadas} linhas`)

  return {
    atividades,
    totalLinhas: linhasProcessadas,
    totalImportado: atividades.length,
    empresasUnicas: empresasUnicas.length > 0 ? empresasUnicas : undefined,
    avisos: atividades.length === 0
      ? ['Nenhuma atividade válida encontrada no cronograma']
      : [`${atividades.length} atividades importadas de ${linhasProcessadas} linhas processadas`]
  }
}

/**
 * Processa aba de caixa da obra/serviços
 */
function processarAbaCaixaObra(workbook: XLSX.WorkBook, sheetName: string): any {
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

  // Encontrar linha de cabeçalho
  let headerRowIndex = -1
  const headerKeywords = ['data', 'serviço', 'servico', 'descrição', 'descricao', 'material', 'quantidade', 'valor']

  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const row = jsonData[i]
    if (Array.isArray(row) && row.length > 0) {
      const rowText = row
        .filter(cell => cell !== null && cell !== undefined)
        .map(cell => String(cell))
        .join(' ')
        .toLowerCase()
      if (headerKeywords.some(keyword => rowText.includes(keyword))) {
        headerRowIndex = i
        break
      }
    }
  }

  if (headerRowIndex === -1) {
    return { materiais: [], totalLinhas: 0, totalImportado: 0 }
  }

  // Garantir que headers é um array válido
  if (!Array.isArray(jsonData[headerRowIndex])) {
    return { materiais: [], totalLinhas: 0, totalImportado: 0 }
  }

  const headers = jsonData[headerRowIndex].map((h: any) => {
    if (h === null || h === undefined || h === '') return ''
    return String(h).toLowerCase().trim()
  })
  const dataRows = jsonData.slice(headerRowIndex + 1)

  // Mapear índices das colunas com verificações seguras
  const indices = {
    data: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('data')
    }),
    servico: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('serviço') || h.includes('servico')
    }),
    descricao: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return (h.includes('descrição') || h.includes('descricao')) &&
        (h.includes('material') || h.includes('item'))
    }),
    quantidade: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('qtde') || h.includes('qtd') || h.includes('quantidade')
    }),
    medida: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('medida') || h.includes('unidade') || h.includes('un')
    }),
    valorUnit: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('valor') && (h.includes('unit') || h.includes('un'))
    }),
    valorTotal: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('valor') && (h.includes('total') || !h.includes('unit'))
    }),
    responsavel: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('responsável') || h.includes('responsavel')
    }),
    status: headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('status')
    })
  }

  const materiais: MaterialServicoCaixaImportado[] = []
  let linhasProcessadas = 0

  for (const row of dataRows) {
    linhasProcessadas++

    // Precisa ter pelo menos descrição ou serviço
    const descricao = indices.descricao >= 0 ? row[indices.descricao] : null
    const servico = indices.servico >= 0 ? row[indices.servico] : null

    if (!descricao && !servico) continue

    materiais.push({
      data: indices.data >= 0 && row[indices.data]
        ? parseExcelDate(row[indices.data]) || undefined
        : undefined,
      servico: servico ? String(servico) : undefined,
      descricao_material: descricao ? String(descricao) : undefined,
      quantidade: indices.quantidade >= 0
        ? parseNumber(row[indices.quantidade])
        : undefined,
      medida: indices.medida >= 0 && row[indices.medida]
        ? String(row[indices.medida])
        : undefined,
      valor_unitario: indices.valorUnit >= 0
        ? parseNumber(row[indices.valorUnit])
        : undefined,
      valor_total: indices.valorTotal >= 0
        ? parseNumber(row[indices.valorTotal])
        : undefined,
      responsavel: indices.responsavel >= 0 && row[indices.responsavel]
        ? String(row[indices.responsavel])
        : undefined,
      status: indices.status >= 0 && row[indices.status]
        ? String(row[indices.status])
        : undefined
    })
  }

  return {
    materiais,
    totalLinhas: linhasProcessadas,
    totalImportado: materiais.length
  }
}

/**
 * Parse de datas do Excel
 */
function parseExcelDate(value: any): string | null {
  if (!value) return null

  // Se já é uma data válida em formato ISO
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value
  }

  // Se é string no formato DD/MM/AAAA ou D/M/AAAA
  if (typeof value === 'string' && value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [day, month, year] = value.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Se é número (serial date do Excel)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  // Se é objeto Date do JavaScript
  if (value instanceof Date) {
    return format(value, 'yyyy-MM-dd')
  }

  // Tentar parsear como data
  try {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return format(date, 'yyyy-MM-dd')
    }
  } catch {
    // Ignorar erro
  }

  return null
}

/**
 * Parse de números
 */
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined

  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    // Remover R$, espaços, pontos de milhar
    let cleaned = value.replace(/R\$|[.\s]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? undefined : num
  }

  return undefined
}

/**
 * Status válidos no banco de dados
 */
const STATUS_VALIDOS = ['pendente', 'realizado', 'em_andamento', 'atrasado', 'cancelado']

/**
 * Validar se status é válido
 */
function validarStatus(status: string): string {
  if (!STATUS_VALIDOS.includes(status)) {
    console.warn(`[ImportadorV2] Status inválido '${status}', usando 'pendente'`)
    return 'pendente'
  }
  return status
}

/**
 * Mapear status - usar apenas valores válidos do banco
 * Valores permitidos: pendente, realizado, em_andamento, atrasado, cancelado
 */
function mapStatus(status: string): string {
  const statusLower = status.toLowerCase().trim()

  const statusMap: Record<string, string> = {
    'pendente': 'pendente',
    'em andamento': 'em_andamento',
    'andamento': 'em_andamento',
    'concluída': 'realizado',
    'concluida': 'realizado',
    'finalizado': 'realizado',
    'finalizada': 'realizado',
    'ok': 'realizado',
    'feito': 'realizado',
    'completo': 'realizado',
    'atrasada': 'atrasado',
    'atrasado': 'atrasado',
    'atraso': 'atrasado',
    'pausada': 'pendente', // Pausada -> Pendente (mais próximo)
    'pausado': 'pendente',
    'cancelada': 'cancelado',
    'cancelado': 'cancelado',
    'não foi': 'cancelado',
    'nao foi': 'cancelado'
  }

  const mapped = statusMap[statusLower] || 'pendente'

  // Validar que o status mapeado é válido
  const validated = validarStatus(mapped)

  if (mapped !== validated) {
    console.warn(`[ImportadorV2] Status '${status}' mapeou para '${mapped}' inválido, usando '${validated}'`)
  } else {
    console.log(`[ImportadorV2] Mapeando status '${status}' -> '${validated}'`)
  }

  return validated
}

/**
 * Exportar cronograma (mantém compatibilidade)
 */
export { exportarCronogramaExcel } from './cronogramaExcel'