import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { RDO, RDOMaoObra, RDOAtividade, RDOFoto } from '@/types/rdo'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface RDOPDFData {
  rdo: RDO
  maoObra: RDOMaoObra[]
  atividades: RDOAtividade[]
  fotos: RDOFoto[]
}

const climaLabels: Record<string, string> = {
  claro: '☀ Claro',
  nublado: '☁ Nublado',
  chuvoso: '🌧 Chuvoso',
  tempestade: '⛈ Tempestade',
}

const condicaoLabels: Record<string, string> = {
  praticavel: 'Praticável',
  impraticavel: 'Impraticável',
}

const statusLabels: Record<string, string> = {
  iniciada: 'Iniciada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  pausada: 'Pausada',
  cancelada: 'Cancelada',
}

export async function generateRDOPDF(data: RDOPDFData): Promise<void> {
  const { rdo, maoObra, atividades, fotos } = data
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  let yPosition = margin

  // ===== CABEÇALHO =====
  // Logo/Título Sarke Studio
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Sarke Studio', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  // Título RDO
  doc.setFontSize(14)
  doc.text('Relatório Diário de Obra (RDO)', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 12

  // ===== INFORMAÇÕES PRINCIPAIS =====
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  // Primeira linha: Relatório n° | Data | Dia da semana
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório n°', margin, yPosition)
  doc.text('Data do relatório', margin + 50, yPosition)
  doc.text('Dia da semana', margin + 110, yPosition)
  yPosition += 5

  doc.setFont('helvetica', 'normal')
  doc.text(rdo.numero_relatorio.toString(), margin, yPosition)
  doc.text(
    format(new Date(rdo.data_relatorio), 'dd/MM/yyyy', { locale: ptBR }),
    margin + 50,
    yPosition
  )
  doc.text(rdo.dia_semana, margin + 110, yPosition)
  yPosition += 10

  // Obra
  doc.setFont('helvetica', 'bold')
  doc.text('Obra', margin, yPosition)
  yPosition += 5
  doc.setFont('helvetica', 'normal')
  doc.text(rdo.obra?.nome || 'N/A', margin, yPosition)
  yPosition += 12

  // ===== CONDIÇÃO CLIMÁTICA =====
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
  doc.text('Condição climática', margin + 2, yPosition)
  yPosition += 10

  // Tabela de clima
  const climaData = [
    [
      'Manhã',
      climaLabels[rdo.clima_manha_tempo || 'claro'],
      condicaoLabels[rdo.clima_manha_condicao || 'praticavel'],
    ],
    [
      'Noite',
      climaLabels[rdo.clima_noite_tempo || 'claro'],
      condicaoLabels[rdo.clima_noite_condicao || 'praticavel'],
    ],
  ]

  ;(doc as any).autoTable({
    startY: yPosition,
    head: [['', 'Tempo', 'Condição']],
    body: climaData,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 5

  // Índice pluviométrico
  if (rdo.indice_pluviometrico) {
    doc.setFont('helvetica', 'bold')
    doc.text('Índice pluviométrico: ', margin, yPosition)
    doc.setFont('helvetica', 'normal')
    doc.text(`${rdo.indice_pluviometrico} mm`, margin + 40, yPosition)
    yPosition += 10
  }

  // ===== MÃO DE OBRA =====
  if (maoObra.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
    doc.text('Mão de obra', margin + 2, yPosition)
    yPosition += 10

    const maoObraData = maoObra.map((m) => [
      m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1),
      m.quantidade.toString(),
      m.tipo_contratacao === 'propria' ? 'Própria' : 'Terceirizada',
    ])

    ;(doc as any).autoTable({
      startY: yPosition,
      head: [['Tipo', 'Quantidade', 'Contratação']],
      body: maoObraData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // ===== ATIVIDADES =====
  if (atividades.length > 0) {
    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 60) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
    doc.text(`Atividades (${atividades.length})`, margin + 2, yPosition)
    yPosition += 10

    const atividadesData = atividades.map((a) => [
      a.descricao,
      statusLabels[a.status] || a.status,
    ])

    ;(doc as any).autoTable({
      startY: yPosition,
      head: [['Descrição', 'Status']],
      body: atividadesData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: pageWidth - 2 * margin - 40 },
        1: { cellWidth: 40, halign: 'center' },
      },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // ===== OBSERVAÇÕES GERAIS =====
  if (rdo.observacoes_gerais) {
    if (yPosition > pageHeight - 40) {
      doc.addPage()
      yPosition = margin
    }

    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
    doc.text('Observações Gerais', margin + 2, yPosition)
    yPosition += 10

    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(
      rdo.observacoes_gerais,
      pageWidth - 2 * margin
    )
    doc.text(lines, margin, yPosition)
    yPosition += lines.length * 5 + 10
  }

  // ===== FOTOS =====
  if (fotos.length > 0) {
    doc.addPage()
    yPosition = margin

    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F')
    doc.text(`Fotos (${fotos.length})`, margin + 2, yPosition)
    yPosition += 12

    // Grid 2x2 de fotos por página
    const photosPerPage = 4
    const photoWidth = (pageWidth - 3 * margin) / 2
    const photoHeight = photoWidth * 0.75 // aspect ratio 4:3

    for (let i = 0; i < fotos.length; i++) {
      if (i > 0 && i % photosPerPage === 0) {
        doc.addPage()
        yPosition = margin
      }

      const col = i % 2
      const row = Math.floor((i % photosPerPage) / 2)

      const x = margin + col * (photoWidth + margin)
      const y = yPosition + row * (photoHeight + margin + 10)

      try {
        // Tentar adicionar imagem
        doc.addImage(fotos[i].foto_url, 'JPEG', x, y, photoWidth, photoHeight)

        // Descrição abaixo da foto
        if (fotos[i].descricao) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          const descLines = doc.splitTextToSize(fotos[i].descricao || '', photoWidth)
          doc.text(descLines[0], x, y + photoHeight + 5)
        }
      } catch (error) {
        // Se falhar ao carregar imagem, mostrar placeholder
        doc.setFillColor(240, 240, 240)
        doc.rect(x, y, photoWidth, photoHeight, 'F')
        doc.setFontSize(10)
        doc.text('Foto não disponível', x + photoWidth / 2, y + photoHeight / 2, {
          align: 'center',
        })
      }
    }
  }

  // ===== RODAPÉ =====
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Relatório ${format(new Date(rdo.data_relatorio), 'dd/MM/yyyy')} n° ${rdo.numero_relatorio}`,
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
  doc.line(margin, yPosition, margin + 80, yPosition)
  doc.text('Assinatura', margin + 30, yPosition + 5)

  doc.line(pageWidth - margin - 80, yPosition, pageWidth - margin, yPosition)
  doc.text('Assinatura', pageWidth - margin - 50, yPosition + 5)

  // ===== SALVAR PDF =====
  const fileName = `RDO_${rdo.numero_relatorio}_${format(
    new Date(rdo.data_relatorio),
    'ddMMyyyy'
  )}.pdf`
  doc.save(fileName)
}
