import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatarMoeda, isDespesa } from '@/types/obra-adm-financeiro'

interface UnifiedPDFData {
  obra: {
    nome: string
    endereco?: string
    cidade?: string
    estado?: string
  }
  sections: string[]
  // Dados de cada seção (todos opcionais)
  rdoData?: any
  financeiroData?: any
  orcamentoData?: any
  cronogramaData?: any
  fotosData?: any
}

export async function generateUnifiedPDF(data: UnifiedPDFData): Promise<void> {
  const { obra, sections } = data
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  let currentPage = 1

  // ===== PÁGINA DE CAPA =====
  await addCoverPage(doc, obra, pageWidth, pageHeight, margin)

  // ===== ÍNDICE =====
  doc.addPage()
  currentPage++
  addIndexPage(doc, sections, pageWidth, margin)

  // ===== SEÇÕES =====
  for (const section of sections) {
    doc.addPage()
    currentPage++

    switch (section) {
      case 'rdo':
        if (data.rdoData) {
          await addRDOSection(doc, data.rdoData, pageWidth, pageHeight, margin)
        }
        break

      case 'financeiro':
        if (data.financeiroData) {
          await addFinanceiroSection(doc, data.financeiroData, pageWidth, margin)
        }
        break

      case 'orcamento':
        if (data.orcamentoData) {
          await addOrcamentoSection(doc, data.orcamentoData, pageWidth, margin)
        }
        break

      case 'cronograma':
        if (data.cronogramaData) {
          await addCronogramaSection(doc, data.cronogramaData, pageWidth, margin)
        }
        break

      case 'fotos':
        if (data.fotosData) {
          await addFotosSection(doc, data.fotosData, pageWidth, pageHeight, margin)
        }
        break
    }
  }

  // ===== RODAPÉ COM NUMERAÇÃO EM TODAS AS PÁGINAS =====
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: 'center',
    })
  }

  // ===== SALVAR =====
  const fileName = `${obra.nome.replace(/\s+/g, '_')}_Documento_Unificado_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
}

// ===== PÁGINA DE CAPA =====
async function addCoverPage(
  doc: jsPDF,
  obra: any,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  let yPosition = pageHeight / 3

  // Logo
  try {
    const logoWidth = 60
    const logoHeight = 60
    const logoX = pageWidth / 2 - logoWidth / 2

    const logoBase64 = await fetch('/logo.png')
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
      )

    doc.addImage(logoBase64, 'PNG', logoX, yPosition, logoWidth, logoHeight)
    yPosition += logoHeight + 20
  } catch (error) {
    console.error('Erro ao carregar logo:', error)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Sarke Studio', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 20
  }

  // Título
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Documento Unificado de Obra', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  // Nome da obra
  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text(obra.nome, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  // Endereço
  if (obra.endereco || obra.cidade || obra.estado) {
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    let endereco = obra.endereco || ''
    if (obra.cidade && obra.estado) {
      endereco += endereco ? ' - ' : ''
      endereco += `${obra.cidade}, ${obra.estado}`
    }
    doc.text(endereco, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 20
  }

  // Data de geração
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(
    `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  )
}

// ===== ÍNDICE =====
function addIndexPage(doc: jsPDF, sections: string[], pageWidth: number, margin: number) {
  let yPosition = margin + 10

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Índice', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const sectionLabels: Record<string, string> = {
    rdo: 'Relatório Diário de Obra (RDO)',
    financeiro: 'Caixa de Obra',
    orcamento: 'Orçamento de Materiais',
    cronograma: 'Cronograma de Obra',
    fotos: 'Galeria de Fotos',
  }

  let pageNumber = 3 // Capa (1) + Índice (2) + primeira seção (3)

  sections.forEach((section) => {
    doc.text(`${pageNumber}. ${sectionLabels[section]}`, margin + 5, yPosition)
    yPosition += 8
    pageNumber++
  })
}

// ===== SEÇÃO RDO =====
async function addRDOSection(
  doc: jsPDF,
  rdoData: any,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  let yPosition = margin

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Diário de Obra (RDO)', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  // Aqui você pode reutilizar a lógica de rdoPdf.ts
  // Por simplicidade, vou adicionar apenas cabeçalho
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Seção RDO em implementação', margin, yPosition)
}

// ===== SEÇÃO FINANCEIRO (CAIXA) =====
async function addFinanceiroSection(
  doc: jsPDF,
  financeiroData: any,
  pageWidth: number,
  margin: number
) {
  let yPosition = margin

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Caixa de Obra', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  if (!financeiroData.movimentacoes || financeiroData.movimentacoes.length === 0) {
    doc.setFontSize(10)
    doc.text('Nenhuma movimentação registrada', margin, yPosition)
    return
  }

  // Tabela de movimentações
  const tableData = financeiroData.movimentacoes.map((mov: any) => [
    format(new Date(mov.data), 'dd/MM/yy', { locale: ptBR }),
    mov.descricao,
    mov.empresa || '-',
    formatarMoeda(mov.valor),
    mov.tipo_recibo || '-',
    mov.status || '-',
  ])

  ;(doc as any).autoTable({
    startY: yPosition,
    head: [['Data', 'Descrição', 'Empresa', 'Valor', 'Recibo', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
    },
    didParseCell: function (data: any) {
      if (data.column.index === 3 && data.section === 'body') {
        const valor = financeiroData.movimentacoes[data.row.index].valor
        if (isDespesa(valor)) {
          data.cell.styles.textColor = [220, 38, 38] // red-600
        } else {
          data.cell.styles.textColor = [22, 163, 74] // green-600
        }
      }
    },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 10

  // Totalizadores
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  doc.setTextColor(220, 38, 38)
  doc.text(
    `Total Despesas: ${formatarMoeda(financeiroData.totalDespesas || 0)}`,
    margin,
    yPosition
  )

  doc.setTextColor(22, 163, 74)
  doc.text(
    `Total Receitas: ${formatarMoeda(financeiroData.totalReceitas || 0)}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  )

  const saldo = financeiroData.saldo || 0
  doc.setTextColor(saldo >= 0 ? 22 : 234, saldo >= 0 ? 163 : 88, saldo >= 0 ? 74 : 12)
  doc.text(`Saldo: ${formatarMoeda(saldo)}`, pageWidth - margin, yPosition, { align: 'right' })

  doc.setTextColor(0, 0, 0)
}

// ===== SEÇÃO ORÇAMENTO =====
async function addOrcamentoSection(
  doc: jsPDF,
  orcamentoData: any,
  pageWidth: number,
  margin: number
) {
  let yPosition = margin

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Orçamento de Materiais', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Seção de Orçamento em implementação', margin, yPosition)
}

// ===== SEÇÃO CRONOGRAMA =====
async function addCronogramaSection(
  doc: jsPDF,
  cronogramaData: any,
  pageWidth: number,
  margin: number
) {
  let yPosition = margin

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Cronograma de Obra', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Seção de Cronograma em implementação', margin, yPosition)
}

// ===== SEÇÃO FOTOS =====
async function addFotosSection(
  doc: jsPDF,
  fotosData: any[],
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  let yPosition = margin

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Galeria de Fotos (${fotosData.length})`, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  // Grid 2x2 de fotos por página
  const photosPerPage = 4
  const photoWidth = (pageWidth - 3 * margin) / 2
  const photoHeight = photoWidth * 0.75

  for (let i = 0; i < fotosData.length; i++) {
    const foto = fotosData[i]
    const posInPage = i % photosPerPage
    const col = posInPage % 2
    const row = Math.floor(posInPage / 2)

    const x = margin + col * (photoWidth + margin)
    const y = yPosition + row * (photoHeight + 15)

    if (posInPage === 0 && i > 0) {
      doc.addPage()
      yPosition = margin + 15
    }

    try {
      // Carregar imagem
      const imgBase64 = await fetch(foto.url)
        .then((res) => res.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
        )

      doc.addImage(imgBase64, 'JPEG', x, y, photoWidth, photoHeight)

      // Descrição
      if (foto.descricao || foto.titulo) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        const text = foto.descricao || foto.titulo
        const lines = doc.splitTextToSize(text, photoWidth)
        doc.text(lines.slice(0, 2), x, y + photoHeight + 3)
      }
    } catch (error) {
      console.error('Erro ao carregar foto:', error)
      // Placeholder
      doc.rect(x, y, photoWidth, photoHeight)
      doc.setFontSize(8)
      doc.text('Erro ao carregar imagem', x + photoWidth / 2, y + photoHeight / 2, {
        align: 'center',
      })
    }
  }
}
