import * as XLSX from 'xlsx'

export interface MaterialImportado {
  local?: string
  item: string
  descricao: string
  quantidade?: number
  medida?: string
  valor_total?: number
  valor_pago?: number
  forma_pagamento?: string
  responsavel_sarke?: string
  status_obra?: string
  status_pagamento?: string
  observacoes?: string
}

export function importarOrcamentoExcel(file: File): Promise<MaterialImportado[]> {
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

        // Encontrar linha de cabeçalho (procura por "Item" ou "Descrição")
        let headerRowIndex = -1
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row.some((cell: any) => {
            const cellStr = String(cell).toLowerCase()
            return cellStr.includes('item') || cellStr.includes('descrição') || cellStr.includes('descricao')
          })) {
            headerRowIndex = i
            break
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('Cabeçalho não encontrado. Certifique-se de que há colunas "Item" e "Descrição".')
        }

        const headers = jsonData[headerRowIndex].map((h: any) => String(h).toLowerCase())
        const dataRows = jsonData.slice(headerRowIndex + 1)

        // Mapear colunas (com várias variações de nome)
        const localIndex = headers.findIndex(h => h.includes('local'))
        const itemIndex = headers.findIndex(h => h.includes('item') && !h.includes('descrição'))
        const descIndex = headers.findIndex(h => h.includes('descrição') || h.includes('descricao'))
        const qtdeIndex = headers.findIndex(h => h.includes('quantidade') || h.includes('qtde') || h.includes('qtd'))
        const medidaIndex = headers.findIndex(h => h.includes('medida') || h.includes('unidade') || h.includes('un'))
        const valorTotalIndex = headers.findIndex(h =>
          (h.includes('valor') && h.includes('total')) ||
          h.includes('preço') ||
          h.includes('preco')
        )
        const valorPagoIndex = headers.findIndex(h => h.includes('valor') && h.includes('pago'))
        const formaPagIndex = headers.findIndex(h => h.includes('forma') && h.includes('pagamento'))
        const responsavelIndex = headers.findIndex(h => h.includes('responsável') || h.includes('responsavel'))
        const statusObraIndex = headers.findIndex(h => h.includes('status') && h.includes('obra'))
        const statusPagIndex = headers.findIndex(h => h.includes('status') && (h.includes('pag') || h.includes('financ')))
        const obsIndex = headers.findIndex(h => h.includes('observ') || h.includes('obs'))

        if (itemIndex === -1 || descIndex === -1) {
          throw new Error('Colunas obrigatórias não encontradas (Item e Descrição).')
        }

        const materiais: MaterialImportado[] = []

        for (const row of dataRows) {
          // Pular linhas vazias
          if (!row[itemIndex] || !row[descIndex]) continue

          // Pular linhas que parecem ser totais ou resumos
          const itemStr = String(row[itemIndex]).toLowerCase()
          if (itemStr.includes('total') || itemStr.includes('soma')) continue

          materiais.push({
            local: localIndex >= 0 ? String(row[localIndex] || '') : '',
            item: String(row[itemIndex]),
            descricao: String(row[descIndex]),
            quantidade: qtdeIndex >= 0 ? parseNumber(row[qtdeIndex]) : undefined,
            medida: medidaIndex >= 0 ? String(row[medidaIndex] || '') : '',
            valor_total: valorTotalIndex >= 0 ? parseNumber(row[valorTotalIndex]) : 0,
            valor_pago: valorPagoIndex >= 0 ? parseNumber(row[valorPagoIndex]) : 0,
            forma_pagamento: formaPagIndex >= 0 ? String(row[formaPagIndex] || '') : '',
            responsavel_sarke: responsavelIndex >= 0 ? String(row[responsavelIndex] || '') : '',
            status_obra: statusObraIndex >= 0 ? mapStatusObra(String(row[statusObraIndex] || '')) : 'PENDENTE',
            status_pagamento: statusPagIndex >= 0 ? mapStatusPagamento(String(row[statusPagIndex] || '')) : 'A PAGAR',
            observacoes: obsIndex >= 0 ? String(row[obsIndex] || '') : '',
          })
        }

        if (materiais.length === 0) {
          throw new Error('Nenhum material válido encontrado no arquivo.')
        }

        resolve(materiais)
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

function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined

  // Se já é número
  if (typeof value === 'number') return value

  // Se é string, limpar e converter
  if (typeof value === 'string') {
    // Remover R$, espaços, pontos de milhar
    let cleaned = value.replace(/R\$|[.\s]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? undefined : num
  }

  return undefined
}

function mapStatusObra(status: string): string {
  const statusLower = status.toLowerCase().trim()

  const statusMap: Record<string, string> = {
    'pendente': 'PENDENTE',
    'em andamento': 'EM ANDAMENTO',
    'andamento': 'EM ANDAMENTO',
    'finalizado': 'FINALIZADO',
    'concluído': 'FINALIZADO',
    'concluido': 'FINALIZADO',
    'pausado': 'PAUSADO',
    'cancelado': 'CANCELADO',
  }

  return statusMap[statusLower] || 'PENDENTE'
}

function mapStatusPagamento(status: string): string {
  const statusLower = status.toLowerCase().trim()

  const statusMap: Record<string, string> = {
    'a pagar': 'A PAGAR',
    'pagar': 'A PAGAR',
    'pendente': 'A PAGAR',
    'pago': 'PAGO',
    'quitado': 'PAGO',
    'parcial': 'PARCIAL',
    'parcialmente pago': 'PARCIAL',
    'desconto': 'DESCONTO',
    'cancelado': 'CANCELADO',
  }

  return statusMap[statusLower] || 'A PAGAR'
}
