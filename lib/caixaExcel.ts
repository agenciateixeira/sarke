import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export interface MovimentacaoImportada {
  semana?: string
  categoria?: string
  data: string
  descricao: string
  empresa?: string
  valor: number
  tipo_recibo?: string
  codigo_recibo?: string
  status?: string
  observacoes?: string
}

export interface SemanaDetectada {
  nome: string
  startCol: number
  endCol: number
  headerRow: number
  movimentacoes: MovimentacaoImportada[]
}

export function detectarSemanasExcel(file: File): Promise<SemanaDetectada[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

        const semanas: SemanaDetectada[] = []

        // Procurar linhas que indicam início de semana
        for (let rowIdx = 0; rowIdx < jsonData.length; rowIdx++) {
          const row = jsonData[rowIdx]

          // Procurar células que contenham "SEMANA" ou "CAIXA"
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = row[colIdx]
            if (!cell) continue

            const cellStr = String(cell).toUpperCase()

            // Detectar título da semana (ex: "CAIXA DE OBRA - ITEM 14 - SEMANA 01")
            if (cellStr.includes('SEMANA') && (cellStr.includes('CAIXA') || cellStr.includes('ITEM'))) {
              // Extrair nome da semana
              const semanaMatch = cellStr.match(/SEMANA\s*(\d+)/)
              const semanaNumero = semanaMatch ? semanaMatch[1] : String(semanas.length + 1)

              // Título completo
              const tituloCompleto = cellStr.trim()

              // Procurar linha de cabeçalho (próximas 3 linhas)
              let headerRowIndex = -1
              let startCol = colIdx

              for (let i = rowIdx + 1; i < Math.min(rowIdx + 4, jsonData.length); i++) {
                const headerRow = jsonData[i]
                if (headerRow[colIdx] && String(headerRow[colIdx]).toLowerCase().includes('item')) {
                  headerRowIndex = i
                  break
                }
              }

              if (headerRowIndex === -1) continue

              // Mapear colunas deste bloco
              const headers = jsonData[headerRowIndex]
                .slice(startCol)
                .map((h: any) => h ? String(h).toLowerCase() : '')

              const itemIndex = headers.findIndex(h => h && h.includes('item'))
              const dataIndex = headers.findIndex(h => h && h.includes('data'))
              const descIndex = headers.findIndex(h => h && (h.includes('descrição') || h.includes('descricao')))
              const empresaIndex = headers.findIndex(h => h && h.includes('empresa'))
              const valorIndex = headers.findIndex(h => h && h.includes('valor'))
              const reciboIndex = headers.findIndex(h => h && h.includes('recibo'))
              const codigoIndex = headers.findIndex(h => h && (h.includes('codigo') || h.includes('código')))
              const statusIndex = headers.findIndex(h => h && h.includes('status'))

              if (dataIndex === -1 || descIndex === -1 || valorIndex === -1) continue

              // Determinar coluna final (próxima coluna vazia ou fim)
              let endCol = startCol
              for (let c = startCol; c < headers.length + startCol; c++) {
                if (headers[c - startCol]) {
                  endCol = c
                } else {
                  break
                }
              }

              // Ler movimentações deste bloco
              const movimentacoes: MovimentacaoImportada[] = []

              for (let dataRowIdx = headerRowIndex + 1; dataRowIdx < jsonData.length; dataRowIdx++) {
                const dataRow = jsonData[dataRowIdx]

                // Parar se encontrar outra semana
                const firstCell = dataRow[startCol]
                if (firstCell && String(firstCell).toUpperCase().includes('SEMANA')) {
                  break
                }

                // Extrair valores com offset da coluna inicial
                const data = dataRow[startCol + dataIndex]
                const descricao = dataRow[startCol + descIndex]
                const valor = dataRow[startCol + valorIndex]

                // Pular linhas vazias
                if (!data || !descricao || !valor) continue

                // Pular totais
                const descStr = String(descricao).toLowerCase()
                if (descStr.includes('total') || descStr.includes('soma') || descStr.includes('saldo')) continue

                const dataMovimentacao = parseExcelDate(data)
                if (!dataMovimentacao) continue

                const valorNum = parseNumber(valor)
                if (valorNum === undefined) continue

                movimentacoes.push({
                  semana: `SEMANA ${semanaNumero}`,
                  data: dataMovimentacao,
                  descricao: String(descricao),
                  empresa: empresaIndex >= 0 ? String(dataRow[startCol + empresaIndex] || '') : '',
                  valor: valorNum,
                  tipo_recibo: reciboIndex >= 0 ? mapTipoRecibo(String(dataRow[startCol + reciboIndex] || '')) : 'SEM NF',
                  codigo_recibo: codigoIndex >= 0 ? String(dataRow[startCol + codigoIndex] || '') : '',
                  status: statusIndex >= 0 ? mapStatus(String(dataRow[startCol + statusIndex] || '')) : 'PENDENTE',
                })
              }

              if (movimentacoes.length > 0) {
                semanas.push({
                  nome: tituloCompleto,
                  startCol,
                  endCol,
                  headerRow: headerRowIndex,
                  movimentacoes,
                })
              }
            }
          }
        }

        if (semanas.length === 0) {
          throw new Error('Nenhuma semana detectada. Certifique-se de que o arquivo tem o formato correto com títulos contendo "SEMANA".')
        }

        resolve(semanas)
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

export function importarCaixaExcel(file: File): Promise<MovimentacaoImportada[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // Detectar todas as semanas
      const semanas = await detectarSemanasExcel(file)

      // Retornar todas as movimentações de todas as semanas
      const todasMovimentacoes = semanas.flatMap(s => s.movimentacoes)

      if (todasMovimentacoes.length === 0) {
        throw new Error('Nenhuma movimentação válida encontrada no arquivo.')
      }

      resolve(todasMovimentacoes)
    } catch (error: any) {
      reject(error)
    }
  })
}

function parseExcelDate(value: any): string | null {
  if (!value) return null

  // Se já é uma data válida em formato ISO
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value
  }

  // Se é string no formato DD/MM/AAAA
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

  // Se é string de data do Excel (ex: "2025-06-09 00:00:00")
  if (typeof value === 'string' && value.includes(' ')) {
    const datePart = value.split(' ')[0]
    const dateMatch = datePart.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
    }
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

function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined

  // Se já é número
  if (typeof value === 'number') return value

  // Se é string, limpar e converter
  if (typeof value === 'string') {
    // Remover R$, espaços, pontos de milhar
    let cleaned = value.replace(/R\$|[.\s]/g, '').replace(',', '.')

    // Se começa com - ou tem (parênteses), é negativo
    const isNegative = cleaned.startsWith('-') || value.includes('(')
    cleaned = cleaned.replace(/[-()]/g, '')

    const num = parseFloat(cleaned)
    if (isNaN(num)) return undefined

    return isNegative ? -Math.abs(num) : num
  }

  return undefined
}

function mapTipoRecibo(tipo: string): string {
  const tipoLower = tipo.toLowerCase().trim()

  const tipoMap: Record<string, string> = {
    'nf': 'NF',
    'nota fiscal': 'NF',
    'nota': 'NF',
    'cupom': 'CUPOM',
    'cupom fiscal': 'CUPOM',
    'recibo': 'RECIBO',
    'sem nf': 'SEM NF',
    'sem nota': 'SEM NF',
    's/nf': 'SEM NF',
  }

  return tipoMap[tipoLower] || 'SEM NF'
}

function mapStatus(status: string): string {
  const statusLower = status.toLowerCase().trim()

  const statusMap: Record<string, string> = {
    'pago': 'PAGO',
    'quitado': 'PAGO',
    'transferido': 'TRANSFERIDO',
    'pendente': 'PENDENTE',
    'a pagar': 'PENDENTE',
  }

  return statusMap[statusLower] || 'PENDENTE'
}
