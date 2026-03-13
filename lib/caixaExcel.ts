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
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true })

        // MELHORIA 1: Procurar pela aba correta (CAIXA DE OBRA)
        let sheetName = workbook.SheetNames.find(name =>
          name.toUpperCase().includes('CAIXA') ||
          name.toUpperCase().includes('OBRA')
        )

        // Se não encontrar, usar primeira aba como fallback
        if (!sheetName) {
          sheetName = workbook.SheetNames[0]
          console.warn(`⚠️ Aba "CAIXA DE OBRA" não encontrada. Usando: ${sheetName}`)
        } else {
          console.log(`✅ Usando aba: ${sheetName}`)
        }

        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
          header: 1,
          defval: null,
          blankrows: true
        })

        const semanas: SemanaDetectada[] = []

        // MELHORIA 2: Regex melhorados para capturar padrões corretos
        const regexPatterns = [
          /CAIXA\s+DE\s+OBRA.*?SEMANA\s+(\d{1,2})/i,
          /CAIXA\s+DE\s+EL[ÉE]TRICA.*?SEMANA\s+(\d{1,2})/i,
        ]

        // Procurar linhas que indicam início de semana
        for (let rowIdx = 0; rowIdx < jsonData.length; rowIdx++) {
          const row = jsonData[rowIdx]
          if (!row) continue

          // Verificar cada célula da linha
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = row[colIdx]
            if (!cell) continue

            const cellStr = String(cell).trim()

            // Testar todos os padrões
            let matchFound = false
            let semanaNumero = ''

            for (const pattern of regexPatterns) {
              const match = cellStr.match(pattern)
              if (match) {
                matchFound = true
                semanaNumero = match[1].padStart(2, '0') // Garantir 2 dígitos
                break
              }
            }

            if (!matchFound) continue

            console.log(`🔍 Encontrado: ${cellStr} na linha ${rowIdx + 1}, coluna ${colIdx + 1}`)

            // MELHORIA 3: Estrutura correta - cabeçalhos sempre 2 linhas abaixo
            const headerRowIndex = rowIdx + 2

            if (headerRowIndex >= jsonData.length) {
              console.warn(`⚠️ Sem espaço para cabeçalho após linha ${rowIdx + 1}`)
              continue
            }

            const headerRow = jsonData[headerRowIndex]
            if (!headerRow) {
              console.warn(`⚠️ Linha de cabeçalho vazia em ${headerRowIndex + 1}`)
              continue
            }

            // MELHORIA 4: Detectar início e fim das colunas dinamicamente
            let startCol = colIdx
            let endCol = colIdx

            // Encontrar primeira coluna com "ITEM" no cabeçalho
            for (let c = Math.max(0, colIdx - 2); c < Math.min(colIdx + 10, headerRow.length); c++) {
              if (headerRow[c] && String(headerRow[c]).toLowerCase().includes('item')) {
                startCol = c
                break
              }
            }

            // Mapear colunas do cabeçalho
            const headers: string[] = []
            for (let c = startCol; c < headerRow.length; c++) {
              const header = headerRow[c]
              if (header && String(header).trim()) {
                headers.push(String(header).toLowerCase().trim())
                endCol = c
              } else if (headers.length > 0) {
                // Parar quando encontrar coluna vazia após ter começado
                break
              }
            }

            console.log(`📋 Cabeçalhos detectados (${headers.length}):`, headers.join(', '))

            // Identificar índices das colunas
            const columnMap = {
              item: headers.findIndex(h => h.includes('item')),
              data: headers.findIndex(h => h.includes('data')),
              descricao: headers.findIndex(h => h.includes('descrição') || h.includes('descricao')),
              empresa: headers.findIndex(h => h.includes('empresa')),
              valor: headers.findIndex(h => h.includes('valor')),
              recibo: headers.findIndex(h => h.includes('recibo')),
              codigo: headers.findIndex(h => h.includes('codigo') || h.includes('código')),
              status: headers.findIndex(h => h.includes('status'))
            }

            // Validar colunas essenciais
            if (columnMap.data === -1 || columnMap.descricao === -1 || columnMap.valor === -1) {
              console.warn(`⚠️ Semana ${semanaNumero}: Colunas essenciais não encontradas`)
              console.warn(`   DATA: ${columnMap.data}, DESC: ${columnMap.descricao}, VALOR: ${columnMap.valor}`)
              continue
            }

            // MELHORIA 8: Determinar categoria baseada no título (antes do loop)
            const categoria = cellStr.toUpperCase().includes('ELÉTRICA') || cellStr.toUpperCase().includes('ELETRICA')
              ? 'ELÉTRICA'
              : 'OBRA'

            // MELHORIA 5: Ler movimentações até encontrar próxima semana ou linha vazia
            const movimentacoes: MovimentacaoImportada[] = []

            for (let dataRowIdx = headerRowIndex + 1; dataRowIdx < jsonData.length; dataRowIdx++) {
              const dataRow = jsonData[dataRowIdx]
              if (!dataRow) continue

              // Parar se encontrar outra semana em qualquer coluna
              let foundNextWeek = false
              for (let c = 0; c < dataRow.length; c++) {
                const cellValue = dataRow[c]
                if (cellValue && String(cellValue).toUpperCase().includes('SEMANA')) {
                  foundNextWeek = true
                  break
                }
              }
              if (foundNextWeek) {
                console.log(`🛑 Encontrada próxima semana na linha ${dataRowIdx + 1}`)
                break
              }

              // Extrair valores
              const item = dataRow[startCol + columnMap.item]
              const data = dataRow[startCol + columnMap.data]
              const descricao = dataRow[startCol + columnMap.descricao]
              const valor = dataRow[startCol + columnMap.valor]

              // Pular linhas sem dados essenciais
              if (!data || !descricao || valor === null || valor === undefined) continue

              // Pular linhas de total
              const descStr = String(descricao).toLowerCase()
              if (descStr.includes('total') ||
                  descStr.includes('soma') ||
                  descStr.includes('saldo') ||
                  descStr.includes('parcial')) {
                console.log(`⏭️ Pulando linha de total: ${descricao}`)
                continue
              }

              // MELHORIA 6: Parse melhorado de data
              const dataMovimentacao = parseExcelDate(data)
              if (!dataMovimentacao) {
                console.warn(`⚠️ Data inválida na linha ${dataRowIdx + 1}:`, data)
                continue
              }

              // MELHORIA 7: Parse melhorado de valor
              const valorNum = parseNumber(valor)
              if (valorNum === undefined) {
                console.warn(`⚠️ Valor inválido na linha ${dataRowIdx + 1}:`, valor)
                continue
              }

              movimentacoes.push({
                semana: `SEMANA ${semanaNumero}`,
                categoria: categoria,
                data: dataMovimentacao,
                descricao: String(descricao).trim(),
                empresa: columnMap.empresa >= 0 ? String(dataRow[startCol + columnMap.empresa] || '').trim() : '',
                valor: valorNum,
                tipo_recibo: columnMap.recibo >= 0 ? mapTipoRecibo(String(dataRow[startCol + columnMap.recibo] || '')) : 'SEM NF',
                codigo_recibo: columnMap.codigo >= 0 ? String(dataRow[startCol + columnMap.codigo] || '').trim() : '',
                status: columnMap.status >= 0 ? mapStatus(String(dataRow[startCol + columnMap.status] || '')) : 'PENDENTE',
              })
            }

            if (movimentacoes.length > 0) {
              // Verificar se já existe uma semana com este número
              const semanaExistente = semanas.find(s => s.nome === `SEMANA ${semanaNumero}`)

              if (semanaExistente) {
                // Mesclar movimentações na semana existente
                console.log(`🔄 Mesclando movimentações em SEMANA ${semanaNumero} (${categoria})`)
                semanaExistente.movimentacoes.push(...movimentacoes)
              } else {
                // Criar nova semana
                semanas.push({
                  nome: `SEMANA ${semanaNumero}`,
                  startCol,
                  endCol,
                  headerRow: headerRowIndex,
                  movimentacoes,
                })
              }

              console.log(`✅ SEMANA ${semanaNumero} (${categoria}) - ${movimentacoes.length} movimentações`)
            } else {
              console.warn(`⚠️ ${cellStr} - Nenhuma movimentação encontrada`)
            }
          }
        }

        if (semanas.length === 0) {
          throw new Error('Nenhuma semana detectada. Verifique se o arquivo possui a aba "CAIXA DE OBRA" com o formato esperado (títulos contendo "SEMANA XX").')
        }

        console.log(`\n📊 Total de semanas detectadas: ${semanas.length}`)
        const totalMov = semanas.reduce((acc, s) => acc + s.movimentacoes.length, 0)
        console.log(`💰 Total de movimentações: ${totalMov}`)

        resolve(semanas)
      } catch (error: any) {
        console.error('❌ Erro ao detectar semanas:', error)
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
