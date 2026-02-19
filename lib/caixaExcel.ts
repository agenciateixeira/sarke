import * as XLSX from 'xlsx'
import { format, parse } from 'date-fns'

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

export function importarCaixaExcel(file: File): Promise<MovimentacaoImportada[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // Usar a primeira planilha
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

        // Encontrar linha de cabeçalho
        let headerRowIndex = -1
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row.some((cell: any) => {
            if (!cell) return false
            const cellStr = String(cell).toLowerCase()
            return (
              cellStr.includes('data') ||
              cellStr.includes('descrição') ||
              cellStr.includes('descricao') ||
              cellStr.includes('valor') ||
              cellStr.includes('empresa')
            )
          })) {
            headerRowIndex = i
            break
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('Cabeçalho não encontrado. Certifique-se de que há colunas com "Data", "Descrição" e "Valor".')
        }

        const headers = jsonData[headerRowIndex].map((h: any) => h ? String(h).toLowerCase() : '')
        const dataRows = jsonData.slice(headerRowIndex + 1)

        // Mapear colunas - com verificação de null/undefined
        const semanaIndex = headers.findIndex(h => h && h.includes('semana'))
        const categoriaIndex = headers.findIndex(h => h && (h.includes('categoria') || h.includes('tipo')))
        const dataIndex = headers.findIndex(h =>
          h && (h.includes('data') || (h.includes('dt') && !h.includes('atualiza')))
        )
        const descIndex = headers.findIndex(h =>
          h && (h.includes('descrição') || h.includes('descricao'))
        )
        const empresaIndex = headers.findIndex(h =>
          h && (h.includes('empresa') || h.includes('fornecedor'))
        )
        const valorIndex = headers.findIndex(h => h && h.includes('valor'))
        const tipoReciboIndex = headers.findIndex(h =>
          h && ((h.includes('tipo') && h.includes('recibo')) || h.includes('nf') || h.includes('nota'))
        )
        const codigoReciboIndex = headers.findIndex(h =>
          h && ((h.includes('código') || h.includes('codigo') || h.includes('número') || h.includes('numero')) &&
          (h.includes('recibo') || h.includes('nota') || h.includes('cupom')))
        )
        const statusIndex = headers.findIndex(h => h && h.includes('status'))
        const obsIndex = headers.findIndex(h =>
          h && (h.includes('observ') || h.includes('obs'))
        )

        if (dataIndex === -1 || descIndex === -1 || valorIndex === -1) {
          throw new Error('Colunas obrigatórias não encontradas (Data, Descrição e Valor).')
        }

        const movimentacoes: MovimentacaoImportada[] = []

        for (const row of dataRows) {
          // Pular linhas vazias
          if (!row[dataIndex] || !row[descIndex] || !row[valorIndex]) continue

          // Pular linhas de total/soma
          const descStr = String(row[descIndex]).toLowerCase()
          if (descStr.includes('total') || descStr.includes('soma') || descStr.includes('saldo')) continue

          const dataMovimentacao = parseExcelDate(row[dataIndex])
          if (!dataMovimentacao) continue

          const valor = parseNumber(row[valorIndex])
          if (valor === undefined) continue

          movimentacoes.push({
            semana: semanaIndex >= 0 ? String(row[semanaIndex] || '') : '',
            categoria: categoriaIndex >= 0 ? String(row[categoriaIndex] || '') : '',
            data: dataMovimentacao,
            descricao: String(row[descIndex]),
            empresa: empresaIndex >= 0 ? String(row[empresaIndex] || '') : '',
            valor: valor,
            tipo_recibo: tipoReciboIndex >= 0 ? mapTipoRecibo(String(row[tipoReciboIndex] || '')) : 'SEM NF',
            codigo_recibo: codigoReciboIndex >= 0 ? String(row[codigoReciboIndex] || '') : '',
            status: statusIndex >= 0 ? mapStatus(String(row[statusIndex] || '')) : 'PENDENTE',
            observacoes: obsIndex >= 0 ? String(row[obsIndex] || '') : '',
          })
        }

        if (movimentacoes.length === 0) {
          throw new Error('Nenhuma movimentação válida encontrada no arquivo.')
        }

        resolve(movimentacoes)
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
