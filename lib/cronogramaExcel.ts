import * as XLSX from 'xlsx'
import { CronogramaObraCompleto, CronogramaObraAtividade } from '@/types/cronograma-obra'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CronogramaExcelData {
  cronograma: CronogramaObraCompleto
  atividades: CronogramaObraAtividade[]
  obraNome?: string
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
  pausada: 'Pausada',
  cancelada: 'Cancelada',
}

const prioridadeLabels: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export function exportarCronogramaExcel(data: CronogramaExcelData): void {
  const { cronograma, atividades, obraNome } = data

  // Criar workbook
  const wb = XLSX.utils.book_new()

  // ===== ABA 1: INFORMAÇÕES DO CRONOGRAMA =====
  const infoData = [
    ['CRONOGRAMA DE OBRA'],
    [''],
    ['Obra:', obraNome || 'N/A'],
    ['Nome do Cronograma:', cronograma.nome || 'Cronograma Principal'],
    ['Status:', statusLabels[cronograma.status] || cronograma.status],
    [''],
    ['Data de Início:', cronograma.data_inicio ? format(new Date(cronograma.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'],
    ['Previsão de Término:', cronograma.data_fim_prevista ? format(new Date(cronograma.data_fim_prevista), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'],
    ['Término Real:', cronograma.data_fim_real ? format(new Date(cronograma.data_fim_real), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'],
    [''],
    ['Progresso:', `${cronograma.progresso_real || 0}%`],
    [''],
    ['ESTATÍSTICAS'],
    ['Total de Atividades:', atividades.length],
    ['Concluídas:', cronograma.atividades_concluidas || 0],
    ['Em Andamento:', cronograma.atividades_em_andamento || 0],
    ['Atrasadas:', cronograma.atividades_atrasadas || 0],
    ['Pendentes:', cronograma.atividades_pendentes || 0],
    [''],
    ['Descrição:', cronograma.descricao || ''],
  ]

  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Informações')

  // ===== ABA 2: ATIVIDADES =====
  // Ordenar atividades por data
  const atividadesOrdenadas = [...atividades].sort(
    (a, b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime()
  )

  const atividadesData = [
    [
      'Nº',
      'Data Prevista',
      'Mês',
      'Dia da Semana',
      'Descrição do Serviço',
      'Status',
      'Prioridade',
      'Observação',
      'Data Início Real',
      'Data Conclusão Real',
    ],
  ]

  atividadesOrdenadas.forEach((atividade, index) => {
    atividadesData.push([
      index + 1,
      format(new Date(atividade.data_prevista), 'dd/MM/yyyy', { locale: ptBR }),
      atividade.mes || '',
      atividade.dia_semana || '',
      atividade.descricao_servico,
      statusLabels[atividade.status] || atividade.status,
      prioridadeLabels[atividade.prioridade] || atividade.prioridade || 'Normal',
      atividade.observacao || '',
      atividade.data_inicio_real ? format(new Date(atividade.data_inicio_real), 'dd/MM/yyyy', { locale: ptBR }) : '',
      atividade.data_conclusao_real ? format(new Date(atividade.data_conclusao_real), 'dd/MM/yyyy', { locale: ptBR }) : '',
    ])
  })

  const wsAtividades = XLSX.utils.aoa_to_sheet(atividadesData)

  // Ajustar largura das colunas
  wsAtividades['!cols'] = [
    { wch: 5 },  // Nº
    { wch: 12 }, // Data Prevista
    { wch: 12 }, // Mês
    { wch: 15 }, // Dia da Semana
    { wch: 50 }, // Descrição
    { wch: 15 }, // Status
    { wch: 12 }, // Prioridade
    { wch: 30 }, // Observação
    { wch: 15 }, // Data Início Real
    { wch: 15 }, // Data Conclusão Real
  ]

  XLSX.utils.book_append_sheet(wb, wsAtividades, 'Atividades')

  // ===== ABA 3: TEMPLATE PARA IMPORTAÇÃO =====
  const templateData = [
    ['TEMPLATE PARA IMPORTAÇÃO DE CRONOGRAMA'],
    [''],
    ['INSTRUÇÕES:'],
    ['1. Preencha apenas as linhas abaixo da linha de cabeçalho (linha 6)'],
    ['2. Data Prevista: use formato DD/MM/AAAA (ex: 15/03/2024)'],
    ['3. Status: Pendente, Em Andamento, Concluída, Atrasada, Pausada ou Cancelada'],
    ['4. Prioridade: Baixa, Normal, Alta ou Urgente'],
    ['5. Não altere os nomes das colunas'],
    ['6. Após preencher, importe este arquivo no sistema'],
    [''],
    ['Data Prevista', 'Descrição do Serviço', 'Status', 'Prioridade', 'Observação'],
    ['15/03/2024', 'Exemplo: Fundação e alicerce', 'Pendente', 'Alta', 'Verificar solo antes'],
    ['20/03/2024', 'Exemplo: Levantamento de paredes', 'Pendente', 'Normal', ''],
  ]

  const wsTemplate = XLSX.utils.aoa_to_sheet(templateData)

  // Ajustar largura das colunas do template
  wsTemplate['!cols'] = [
    { wch: 15 }, // Data Prevista
    { wch: 50 }, // Descrição
    { wch: 15 }, // Status
    { wch: 12 }, // Prioridade
    { wch: 30 }, // Observação
  ]

  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Importação')

  // Gerar e baixar arquivo
  const fileName = `Cronograma_${obraNome?.replace(/[^a-zA-Z0-9]/g, '_') || 'Obra'}_${format(
    new Date(),
    'ddMMyyyy'
  )}.xlsx`

  XLSX.writeFile(wb, fileName)
}

export interface AtividadeImportada {
  data_prevista: string
  descricao_servico: string
  status?: string
  prioridade?: string
  observacao?: string
}

export function importarCronogramaExcel(file: File): Promise<AtividadeImportada[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // Tentar ler da aba "Atividades" ou "Template Importação" ou primeira aba
        let sheetName = workbook.SheetNames.find(name =>
          name.includes('Atividades') || name.includes('Template')
        ) || workbook.SheetNames[0]

        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

        // Encontrar linha de cabeçalho (procura por "Data" ou "Descrição/Serviço")
        let headerRowIndex = -1
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row.some((cell: any) => {
            const cellStr = String(cell).toLowerCase()
            return (
              cellStr.includes('data') ||
              cellStr.includes('descrição') ||
              cellStr.includes('descricao') ||
              cellStr.includes('serviço') ||
              cellStr.includes('servico') ||
              cellStr.includes('atividade')
            )
          })) {
            headerRowIndex = i
            break
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('Cabeçalho não encontrado. Certifique-se de que há colunas com "Data" e "Descrição" ou "Serviço".')
        }

        const headers = jsonData[headerRowIndex].map((h: any) => String(h).toLowerCase())
        const dataRows = jsonData.slice(headerRowIndex + 1)

        // Mapear colunas - busca mais flexível
        const dataIndex = headers.findIndex(h =>
          h.includes('data') ||
          (h.includes('dt') && !h.includes('atualiza'))
        )
        const descIndex = headers.findIndex(h =>
          h.includes('descrição') ||
          h.includes('descricao') ||
          h.includes('serviço') ||
          h.includes('servico') ||
          h.includes('atividade')
        )
        const statusIndex = headers.findIndex(h => h.includes('status'))
        const prioridadeIndex = headers.findIndex(h => h.includes('prioridade'))
        const obsIndex = headers.findIndex(h =>
          h.includes('observação') ||
          h.includes('observacao') ||
          h.includes('obs')
        )

        if (dataIndex === -1 || descIndex === -1) {
          throw new Error('Colunas obrigatórias não encontradas (Data Prevista e Descrição).')
        }

        const atividades: AtividadeImportada[] = []

        for (const row of dataRows) {
          // Pular linhas vazias
          if (!row[dataIndex] || !row[descIndex]) continue

          const dataPrevista = parseExcelDate(row[dataIndex])
          if (!dataPrevista) continue

          atividades.push({
            data_prevista: dataPrevista,
            descricao_servico: String(row[descIndex]),
            status: statusIndex >= 0 ? mapStatus(String(row[statusIndex] || '')) : 'pendente',
            prioridade: prioridadeIndex >= 0 ? mapPrioridade(String(row[prioridadeIndex] || '')) : 'normal',
            observacao: obsIndex >= 0 ? String(row[obsIndex] || '') : '',
          })
        }

        if (atividades.length === 0) {
          throw new Error('Nenhuma atividade válida encontrada no arquivo.')
        }

        resolve(atividades)
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

function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pendente': 'pendente',
    'em andamento': 'em_andamento',
    'concluída': 'concluida',
    'concluida': 'concluida',
    'atrasada': 'atrasada',
    'pausada': 'pausada',
    'cancelada': 'cancelada',
  }

  return statusMap[status.toLowerCase()] || 'pendente'
}

function mapPrioridade(prioridade: string): string {
  const prioridadeMap: Record<string, string> = {
    'baixa': 'baixa',
    'normal': 'normal',
    'alta': 'alta',
    'urgente': 'urgente',
  }

  return prioridadeMap[prioridade.toLowerCase()] || 'normal'
}
