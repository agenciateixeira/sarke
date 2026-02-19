import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { CronogramaObraCompleto, CronogramaObraAtividade } from '@/types/cronograma-obra'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CronogramaPDFData {
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

export async function generateCronogramaPDF(data: CronogramaPDFData): Promise<void> {
  const { cronograma, atividades, obraNome } = data
  const doc = new jsPDF('landscape') // Paisagem para mais espaço

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  let yPosition = margin

  // ===== CABEÇALHO COM LOGO =====
  try {
    // Carregar logo da Sarke
    const logoWidth = 40
    const logoHeight = 40
    const logoX = pageWidth / 2 - logoWidth / 2

    const logoBase64 = await fetch('/logo.png')
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      }))

    doc.addImage(logoBase64, 'PNG', logoX, yPosition, logoWidth, logoHeight)
    yPosition += logoHeight + 5
  } catch (error) {
    console.error('Erro ao carregar logo:', error)
    // Fallback: apenas texto
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Sarke Studio', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10
  }

  // Título
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Cronograma de Obra', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 8

  // Nome da obra
  if (obraNome) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(obraNome, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10
  } else {
    yPosition += 5
  }

  // ===== INFORMAÇÕES DO CRONOGRAMA =====
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  // Primeira linha: Nome | Status | Progresso
  doc.text('Nome do Cronograma:', margin, yPosition)
  doc.text('Status:', margin + 100, yPosition)
  doc.text('Progresso:', pageWidth - margin - 60, yPosition)
  yPosition += 5

  doc.setFont('helvetica', 'normal')
  doc.text(cronograma.nome || 'Cronograma Principal', margin, yPosition)
  doc.text(statusLabels[cronograma.status] || cronograma.status, margin + 100, yPosition)
  doc.text(`${cronograma.progresso_real || 0}%`, pageWidth - margin - 60, yPosition)
  yPosition += 8

  // Segunda linha: Datas
  if (cronograma.data_inicio || cronograma.data_fim_prevista) {
    doc.setFont('helvetica', 'bold')
    doc.text('Início:', margin, yPosition)
    if (cronograma.data_fim_prevista) {
      doc.text('Previsão de Término:', margin + 70, yPosition)
    }
    yPosition += 5

    doc.setFont('helvetica', 'normal')
    if (cronograma.data_inicio) {
      doc.text(format(new Date(cronograma.data_inicio), 'dd/MM/yyyy', { locale: ptBR }), margin, yPosition)
    }
    if (cronograma.data_fim_prevista) {
      doc.text(
        format(new Date(cronograma.data_fim_prevista), 'dd/MM/yyyy', { locale: ptBR }),
        margin + 70,
        yPosition
      )
    }
    yPosition += 12
  }

  // ===== ESTATÍSTICAS =====
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
  doc.text('Estatísticas', margin + 2, yPosition)
  yPosition += 10

  const stats = [
    ['Total de Atividades', atividades.length.toString()],
    ['Concluídas', cronograma.atividades_concluidas?.toString() || '0'],
    ['Em Andamento', cronograma.atividades_em_andamento?.toString() || '0'],
    ['Atrasadas', cronograma.atividades_atrasadas?.toString() || '0'],
    ['Pendentes', cronograma.atividades_pendentes?.toString() || '0'],
  ]

  ;(doc as any).autoTable({
    startY: yPosition,
    head: [['Métrica', 'Quantidade']],
    body: stats,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: pageWidth - 2 * margin - 50 },
      1: { cellWidth: 50, halign: 'center' },
    },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 10

  // ===== TABELA DE ATIVIDADES =====
  if (atividades.length > 0) {
    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
    doc.text(`Atividades (${atividades.length})`, margin + 2, yPosition)
    yPosition += 10

    // Ordenar atividades por data
    const atividadesOrdenadas = [...atividades].sort(
      (a, b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime()
    )

    const atividadesData = atividadesOrdenadas.map((a, index) => [
      (index + 1).toString(),
      format(new Date(a.data_prevista), 'dd/MM/yy', { locale: ptBR }),
      a.mes || '-',
      a.descricao_servico,
      statusLabels[a.status] || a.status,
      prioridadeLabels[a.prioridade] || a.prioridade || 'Normal',
      a.observacao || '-',
    ])

    ;(doc as any).autoTable({
      startY: yPosition,
      head: [['#', 'Data', 'Mês', 'Descrição', 'Status', 'Prioridade', 'Observação']],
      body: atividadesData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 80 },
        4: { cellWidth: 30, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 60 },
      },
      // Colorir status
      didParseCell: function (data: any) {
        if (data.column.index === 4 && data.section === 'body') {
          const status = atividades[data.row.index].status
          if (status === 'concluida') {
            data.cell.styles.textColor = [22, 163, 74] // green
          } else if (status === 'atrasada') {
            data.cell.styles.textColor = [220, 38, 38] // red
          } else if (status === 'em_andamento') {
            data.cell.styles.textColor = [59, 130, 246] // blue
          }
        }
      },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // ===== OBSERVAÇÕES =====
  if (cronograma.descricao) {
    if (yPosition > pageHeight - 40) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
    doc.text('Descrição', margin + 2, yPosition)
    yPosition += 10

    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(cronograma.descricao, pageWidth - 2 * margin)
    doc.text(lines, margin, yPosition)
    yPosition += lines.length * 5 + 10
  }

  // ===== RODAPÉ EM TODAS AS PÁGINAS =====
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Cronograma - ${obraNome || 'Obra'} - Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      margin,
      pageHeight - 10
    )
    doc.text(`${i} / ${totalPages}`, pageWidth - margin, pageHeight - 10, {
      align: 'right',
    })
  }

  // ===== ASSINATURAS (última página) =====
  doc.setPage(totalPages)
  yPosition = pageHeight - 40

  doc.setFont('helvetica', 'normal')
  doc.line(margin, yPosition, margin + 100, yPosition)
  doc.text('Responsável Técnico', margin + 35, yPosition + 5)

  doc.line(pageWidth - margin - 100, yPosition, pageWidth - margin, yPosition)
  doc.text('Fiscal da Obra', pageWidth - margin - 65, yPosition + 5)

  // ===== SALVAR PDF =====
  const fileName = `Cronograma_${obraNome?.replace(/[^a-zA-Z0-9]/g, '_') || 'Obra'}_${format(
    new Date(),
    'ddMMyyyy'
  )}.pdf`
  doc.save(fileName)
}
