import * as XLSX from 'xlsx'

// ========== INTERFACES ==========

// Interface para Material (Orçamento)
export interface MaterialImportado {
  local?: string
  item: string
  descricao: string
  quantidade?: number
  medida?: string
  valor_total?: number
  valor_pago?: number
  valor_restante?: number
  forma_pagamento?: string
  empresa?: string
  responsavel_sarke?: string
  status_obra?: string
  status_pagamento?: string
}

// Interface para Caixa de Obra (Fluxo Financeiro)
export interface CaixaObraImportado {
  item_numero?: number
  data: string
  descricao: string
  empresa?: string
  valor: number // Negativo = Saída, Positivo = Entrada (schema determina o tipo pelo sinal)
  recibo?: string
  codigo?: string
  status?: string
  categoria?: string
}

// Interface para Serviço
export interface ServicoImportado {
  data?: string
  servico?: string
  descricao_material?: string
  quantidade?: number
  medida?: string
  valor_unitario?: number
  valor_total?: number
  valor_recebido?: number
  saldo?: number
}

// Interface do resultado da importação
export interface ResultadoImportacaoFinanceira {
  materiais?: {
    dados: MaterialImportado[]
    total: number
    valor_total: number
  }
  caixaObra?: {
    dados: CaixaObraImportado[]
    total: number
    total_entradas: number
    total_saidas: number
    saldo: number
  }
  servicos?: {
    dados: ServicoImportado[]
    total: number
    valor_total: number
  }
  avisos: string[]
  erros: string[]
}

/**
 * IMPORTADOR FINANCEIRO DE OBRA - V1.0
 * Importa as 3 abas: MATERIAIS, CAIXA DE OBRA, SERVIÇOS
 * Especialmente importante: CAIXA DE OBRA para fluxo financeiro
 */
export function importarFinanceiroObra(file: File): Promise<ResultadoImportacaoFinanceira> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        const resultado: ResultadoImportacaoFinanceira = {
          avisos: [],
          erros: []
        }

        // ========== 1. PROCESSAR ABA MATERIAIS ==========
        if (workbook.SheetNames.includes('MATERIAIS')) {
          try {
            const materiaisResult = processarAbaMateriais(workbook, 'MATERIAIS')
            resultado.materiais = materiaisResult
            resultado.avisos.push(`✅ ${materiaisResult.total} materiais importados (Total: R$ ${materiaisResult.valor_total.toLocaleString('pt-BR')})`)
          } catch (error: any) {
            resultado.erros.push(`Erro em MATERIAIS: ${error.message}`)
          }
        }

        // ========== 2. PROCESSAR ABA CAIXA DE OBRA (MAIS IMPORTANTE!) ==========
        const caixaSheetName = workbook.SheetNames.find(name =>
          name.toUpperCase().includes('CAIXA') ||
          name.toUpperCase().includes('FLUXO')
        )

        if (caixaSheetName) {
          try {
            const caixaResult = processarAbaCaixaObra(workbook, caixaSheetName)
            resultado.caixaObra = caixaResult
            resultado.avisos.push(`✅ ${caixaResult.total} movimentos do caixa importados`)
            resultado.avisos.push(`   💰 Entradas: R$ ${caixaResult.total_entradas.toLocaleString('pt-BR')}`)
            resultado.avisos.push(`   💸 Saídas: R$ ${caixaResult.total_saidas.toLocaleString('pt-BR')}`)
            resultado.avisos.push(`   📊 Saldo: R$ ${caixaResult.saldo.toLocaleString('pt-BR')}`)
          } catch (error: any) {
            resultado.erros.push(`Erro em CAIXA DE OBRA: ${error.message}`)
          }
        } else {
          resultado.erros.push('⚠️ Aba CAIXA DE OBRA não encontrada!')
        }

        // ========== 3. PROCESSAR ABA SERVIÇOS ==========
        if (workbook.SheetNames.includes('SERVIÇOS') || workbook.SheetNames.includes('SERVICOS')) {
          try {
            const servicosResult = processarAbaServicos(workbook, workbook.SheetNames.find(n => n.includes('SERVI'))!)
            resultado.servicos = servicosResult
            resultado.avisos.push(`✅ ${servicosResult.total} serviços importados`)
          } catch (error: any) {
            resultado.erros.push(`Erro em SERVIÇOS: ${error.message}`)
          }
        }

        // Validar se importou algo
        if (!resultado.materiais && !resultado.caixaObra && !resultado.servicos) {
          throw new Error('Nenhum dado válido encontrado na planilha')
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
 * Processar aba MATERIAIS (Orçamento)
 */
function processarAbaMateriais(workbook: XLSX.WorkBook, sheetName: string): any {
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

  // Encontrar cabeçalho
  let headerRow = -1
  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const row = jsonData[i]
    if (Array.isArray(row)) {
      const rowText = row.join(' ').toLowerCase()
      if (rowText.includes('descrição') && rowText.includes('valor')) {
        headerRow = i
        break
      }
    }
  }

  if (headerRow === -1) {
    throw new Error('Cabeçalho não encontrado em MATERIAIS')
  }

  const headers = jsonData[headerRow].map((h: any) => (h ? String(h).toLowerCase() : ''))
  const dataRows = jsonData.slice(headerRow + 1)

  // Mapear índices
  const indices = {
    local: headers.findIndex(h => h.includes('local')),
    item: headers.findIndex(h => h.includes('item')),
    descricao: headers.findIndex(h => h.includes('descrição') || h.includes('descricao')),
    quantidade: headers.findIndex(h => h.includes('qtde') || h.includes('quantidade')),
    medida: headers.findIndex(h => h.includes('medida') || h.includes('unidade')),
    valorTotal: headers.findIndex(h => h.includes('valor') && h.includes('total')),
    valorPago: headers.findIndex(h => h.includes('valor') && h.includes('pago')),
    valorRestante: headers.findIndex(h => h.includes('restante') || h.includes('saldo')),
    pagamento: headers.findIndex(h => h.includes('pagamento') || h.includes('forma')),
    empresa: headers.findIndex(h => h.includes('empresa') || h.includes('fornecedor')),
    responsavel: headers.findIndex(h => h.includes('responsavel') || h.includes('sarke')),
    statusObra: headers.findIndex(h => h.includes('status') && h.includes('obra')),
    status: headers.findIndex(h => h === 'status' || h.includes('status') && !h.includes('obra'))
  }

  const materiais: MaterialImportado[] = []
  let valorTotal = 0

  for (const row of dataRows) {
    // Verificar se tem descrição
    if (indices.descricao >= 0 && row[indices.descricao]) {
      const material: MaterialImportado = {
        local: indices.local >= 0 ? String(row[indices.local] || '') : '',
        item: indices.item >= 0 ? String(row[indices.item] || '') : '',
        descricao: String(row[indices.descricao]),
        quantidade: indices.quantidade >= 0 ? parseNumber(row[indices.quantidade]) : undefined,
        medida: indices.medida >= 0 ? String(row[indices.medida] || '') : undefined,
        valor_total: indices.valorTotal >= 0 ? parseNumber(row[indices.valorTotal]) : 0,
        valor_pago: indices.valorPago >= 0 ? parseNumber(row[indices.valorPago]) : 0,
        valor_restante: indices.valorRestante >= 0 ? parseNumber(row[indices.valorRestante]) : undefined,
        forma_pagamento: indices.pagamento >= 0 ? String(row[indices.pagamento] || '') : undefined,
        empresa: indices.empresa >= 0 ? String(row[indices.empresa] || '') : undefined,
        responsavel_sarke: indices.responsavel >= 0 ? String(row[indices.responsavel] || '') : undefined,
        status_obra: indices.statusObra >= 0 ? String(row[indices.statusObra] || '') : 'PENDENTE',
        status_pagamento: indices.status >= 0 ? String(row[indices.status] || '') : 'A PAGAR'
      }

      materiais.push(material)
      valorTotal += material.valor_total || 0
    }
  }

  return {
    dados: materiais,
    total: materiais.length,
    valor_total: valorTotal
  }
}

/**
 * Processar aba CAIXA DE OBRA (Fluxo Financeiro) - MAIS IMPORTANTE!
 */
function processarAbaCaixaObra(workbook: XLSX.WorkBook, sheetName: string): any {
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

  // Encontrar cabeçalho (geralmente linha 3 ou 4)
  let headerRow = -1
  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
    const row = jsonData[i]
    if (Array.isArray(row)) {
      const rowText = row.join(' ').toLowerCase()
      if (rowText.includes('data') && rowText.includes('descrição')) {
        headerRow = i
        break
      }
    }
  }

  if (headerRow === -1) {
    throw new Error('Cabeçalho não encontrado em CAIXA DE OBRA')
  }

  const headers = jsonData[headerRow].map((h: any) => (h ? String(h).toLowerCase() : ''))
  const dataRows = jsonData.slice(headerRow + 1)

  // Mapear índices (pode ter colunas duplicadas para entrada/saída)
  const indices = {
    item: headers.findIndex(h => h === 'item'),
    data: headers.findIndex(h => h.includes('data')),
    descricao: headers.findIndex(h => h.includes('descrição') || h.includes('descricao')),
    empresa: headers.findIndex(h => h.includes('empresa') || h.includes('fornecedor')),
    valor: headers.findIndex(h => h.includes('valor')),
    recibo: headers.findIndex(h => h.includes('recibo')),
    codigo: headers.findIndex(h => h.includes('codigo') || h.includes('cod')),
    status: headers.findIndex(h => h.includes('status'))
  }

  const movimentos: CaixaObraImportado[] = []
  let totalEntradas = 0
  let totalSaidas = 0

  for (const row of dataRows) {
    // Verificar se tem data e descrição
    if (indices.data >= 0 && indices.descricao >= 0 && row[indices.data] && row[indices.descricao]) {
      const valor = indices.valor >= 0 ? parseNumber(row[indices.valor]) || 0 : 0

      // O valor já mantém o sinal correto (negativo = despesa, positivo = receita)
      // Não precisamos converter para Math.abs() nem adicionar tipo_movimento
      const movimento: CaixaObraImportado = {
        item_numero: indices.item >= 0 ? parseInt(row[indices.item]) || undefined : undefined,
        data: parseExcelDate(row[indices.data]) || '',
        descricao: String(row[indices.descricao]),
        empresa: indices.empresa >= 0 ? String(row[indices.empresa] || '') : undefined,
        valor: valor, // Mantém o sinal: negativo = despesa, positivo = receita
        recibo: indices.recibo >= 0 ? String(row[indices.recibo] || '') : undefined,
        codigo: indices.codigo >= 0 ? String(row[indices.codigo] || '') : undefined,
        status: indices.status >= 0 ? String(row[indices.status] || '') : 'PENDENTE',
        categoria: identificarCategoria(String(row[indices.descricao]))
      }

      movimentos.push(movimento)

      // Para contabilizar entradas e saídas, usamos o sinal
      if (valor >= 0) {
        totalEntradas += valor
      } else {
        totalSaidas += Math.abs(valor)
      }
    }
  }

  return {
    dados: movimentos,
    total: movimentos.length,
    total_entradas: totalEntradas,
    total_saidas: totalSaidas,
    saldo: totalEntradas - totalSaidas
  }
}

/**
 * Processar aba SERVIÇOS
 */
function processarAbaServicos(workbook: XLSX.WorkBook, sheetName: string): any {
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

  // Encontrar cabeçalho
  let headerRow = -1
  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const row = jsonData[i]
    if (Array.isArray(row) && row.length > 0) {
      const rowText = row
        .filter(cell => cell !== null && cell !== undefined)
        .map(cell => String(cell))
        .join(' ')
        .toLowerCase()
      if (rowText.includes('descrição') || rowText.includes('serviço')) {
        headerRow = i
        break
      }
    }
  }

  if (headerRow === -1) {
    return { dados: [], total: 0, valor_total: 0 }
  }

  // Garantir que headers é um array válido
  if (!Array.isArray(jsonData[headerRow])) {
    return { dados: [], total: 0, valor_total: 0 }
  }

  const headers = jsonData[headerRow].map((h: any) => {
    if (h === null || h === undefined || h === '') return ''
    return String(h).toLowerCase().trim()
  })
  const dataRows = jsonData.slice(headerRow + 1)

  const servicos: ServicoImportado[] = []
  let valorTotal = 0

  for (const row of dataRows) {
    const descricaoIdx = headers.findIndex(h => {
      if (typeof h !== 'string' || h === '') return false
      return h.includes('descrição') || h.includes('descricao')
    })

    if (descricaoIdx >= 0 && row[descricaoIdx]) {
      const dataIdx = headers.findIndex(h => {
        if (typeof h !== 'string' || h === '') return false
        return h.includes('data')
      })

      const qtdeIdx = headers.findIndex(h => {
        if (typeof h !== 'string' || h === '') return false
        return h.includes('qtde') || h.includes('quantidade')
      })

      const totalIdx = headers.findIndex(h => {
        if (typeof h !== 'string' || h === '') return false
        return h.includes('total')
      })

      const servico: ServicoImportado = {
        data: dataIdx >= 0 ? parseExcelDate(row[dataIdx]) : undefined,
        descricao_material: String(row[descricaoIdx]),
        quantidade: qtdeIdx >= 0 ? parseNumber(row[qtdeIdx]) : undefined,
        valor_total: totalIdx >= 0 ? (parseNumber(row[totalIdx]) || 0) : 0
      }

      servicos.push(servico)
      valorTotal += servico.valor_total || 0
    }
  }

  return {
    dados: servicos,
    total: servicos.length,
    valor_total: valorTotal
  }
}

// ========== FUNÇÕES AUXILIARES ==========

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

function parseExcelDate(value: any): string | null {
  if (!value) return null

  // Se já é string de data
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value.split('T')[0]
  }

  // Se é número serial do Excel
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  // Se é objeto Date
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }

  return null
}

function identificarCategoria(descricao: string): string {
  const desc = descricao.toLowerCase()

  // Categorias de entrada
  if (desc.includes('adiantamento') || desc.includes('entrada') || desc.includes('recebimento')) {
    return 'RECEITA'
  }

  // Categorias de saída
  if (desc.includes('material') || desc.includes('compra')) return 'MATERIAL'
  if (desc.includes('mão de obra') || desc.includes('serviço')) return 'MÃO DE OBRA'
  if (desc.includes('aluguel') || desc.includes('locação')) return 'ALUGUEL'
  if (desc.includes('transporte') || desc.includes('frete')) return 'TRANSPORTE'
  if (desc.includes('alimentação') || desc.includes('refeição')) return 'ALIMENTAÇÃO'
  if (desc.includes('combustível') || desc.includes('gasolina')) return 'COMBUSTÍVEL'

  return 'OUTROS'
}