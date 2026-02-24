// =====================================================
// EXPORTAÇÃO DE DRE - PDF, Excel e CSV
// =====================================================

interface DREData {
  receitas_operacionais: number
  receitas_servicos: number
  receitas_outros: number
  receitas_total: number
  custos_diretos: number
  despesas_administrativas: number
  despesas_comerciais: number
  despesas_pessoal: number
  despesas_operacionais: number
  despesas_total: number
  resultado_bruto: number
  resultado_operacional: number
  resultado_liquido: number
  margem_bruta_percentual: number
  margem_operacional_percentual: number
  margem_liquida_percentual: number
}

// ==========================================
// EXPORTAR PARA CSV
// ==========================================
export function exportarDREParaCSV(dre: DREData, periodo: { inicio: string; fim: string }) {
  const linhas = [
    ['DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)'],
    [`Período: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}`],
    [''],
    ['RECEITAS', '', ''],
    ['  Receitas de Serviços', formatarMoeda(dre.receitas_servicos), ''],
    ['  Outras Receitas', formatarMoeda(dre.receitas_outros), ''],
    ['TOTAL DE RECEITAS', formatarMoeda(dre.receitas_total), '100%'],
    [''],
    ['CUSTOS E DESPESAS', '', ''],
    ['  (-) Custos Diretos', formatarMoeda(dre.custos_diretos), percentual(dre.custos_diretos, dre.receitas_total)],
    ['  (-) Despesas Administrativas', formatarMoeda(dre.despesas_administrativas), percentual(dre.despesas_administrativas, dre.receitas_total)],
    ['  (-) Despesas Comerciais', formatarMoeda(dre.despesas_comerciais), percentual(dre.despesas_comerciais, dre.receitas_total)],
    ['  (-) Despesas com Pessoal', formatarMoeda(dre.despesas_pessoal), percentual(dre.despesas_pessoal, dre.receitas_total)],
    ['TOTAL DE DESPESAS', formatarMoeda(dre.despesas_total), percentual(dre.despesas_total, dre.receitas_total)],
    [''],
    ['RESULTADOS', '', ''],
    ['RESULTADO BRUTO', formatarMoeda(dre.resultado_bruto), `${dre.margem_bruta_percentual.toFixed(2)}%`],
    ['RESULTADO OPERACIONAL', formatarMoeda(dre.resultado_operacional), `${dre.margem_operacional_percentual.toFixed(2)}%`],
    ['RESULTADO LÍQUIDO', formatarMoeda(dre.resultado_liquido), `${dre.margem_liquida_percentual.toFixed(2)}%`],
  ]

  const csv = linhas.map((linha) => linha.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `DRE_${periodo.inicio}_${periodo.fim}.csv`
  link.click()
}

// ==========================================
// EXPORTAR PARA HTML (para PDF via browser)
// ==========================================
export function exportarDREParaPDF(dre: DREData, periodo: { inicio: string; fim: string }) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DRE - ${periodo.inicio} a ${periodo.fim}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: white;
      color: #1a1a1a;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }

    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
      letter-spacing: 2px;
    }

    .report-info {
      text-align: right;
    }

    .report-title {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .report-period {
      font-size: 14px;
      color: #666;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }

    th {
      text-align: left;
      padding: 12px;
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }

    th.text-right {
      text-align: right;
    }

    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    td.text-right {
      text-align: right;
    }

    tr.indent td:first-child {
      padding-left: 30px;
      color: #64748b;
    }

    tr.total {
      font-weight: bold;
      background: #f8fafc;
    }

    tr.total td {
      border-top: 2px solid #cbd5e1;
      border-bottom: 2px solid #cbd5e1;
      padding: 14px 12px;
    }

    tr.resultado {
      font-weight: bold;
      font-size: 15px;
    }

    tr.resultado.positivo {
      background: #f0fdf4;
      color: #15803d;
    }

    tr.resultado.negativo {
      background: #fef2f2;
      color: #dc2626;
    }

    .positivo {
      color: #15803d;
    }

    .negativo {
      color: #dc2626;
    }

    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }

    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SARKE</div>
    <div class="report-info">
      <div class="report-title">Demonstração do Resultado do Exercício</div>
      <div class="report-period">Período: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}</div>
    </div>
  </div>

  <!-- RECEITAS -->
  <div class="section">
    <div class="section-title">💰 Receitas</div>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th class="text-right">Valor</th>
          <th class="text-right">% Receita</th>
        </tr>
      </thead>
      <tbody>
        <tr class="indent">
          <td>Receitas de Serviços</td>
          <td class="text-right">${formatarMoeda(dre.receitas_servicos)}</td>
          <td class="text-right">${percentual(dre.receitas_servicos, dre.receitas_total)}</td>
        </tr>
        <tr class="indent">
          <td>Outras Receitas</td>
          <td class="text-right">${formatarMoeda(dre.receitas_outros)}</td>
          <td class="text-right">${percentual(dre.receitas_outros, dre.receitas_total)}</td>
        </tr>
        <tr class="total">
          <td><strong>Total de Receitas</strong></td>
          <td class="text-right"><strong>${formatarMoeda(dre.receitas_total)}</strong></td>
          <td class="text-right"><strong>100,00%</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- CUSTOS E DESPESAS -->
  <div class="section">
    <div class="section-title">📉 Custos e Despesas</div>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th class="text-right">Valor</th>
          <th class="text-right">% Receita</th>
        </tr>
      </thead>
      <tbody>
        <tr class="indent">
          <td>(-) Custos Diretos</td>
          <td class="text-right negativo">${formatarMoeda(dre.custos_diretos)}</td>
          <td class="text-right">${percentual(dre.custos_diretos, dre.receitas_total)}</td>
        </tr>
        <tr class="indent">
          <td>(-) Despesas Administrativas</td>
          <td class="text-right negativo">${formatarMoeda(dre.despesas_administrativas)}</td>
          <td class="text-right">${percentual(dre.despesas_administrativas, dre.receitas_total)}</td>
        </tr>
        <tr class="indent">
          <td>(-) Despesas Comerciais</td>
          <td class="text-right negativo">${formatarMoeda(dre.despesas_comerciais)}</td>
          <td class="text-right">${percentual(dre.despesas_comerciais, dre.receitas_total)}</td>
        </tr>
        <tr class="indent">
          <td>(-) Despesas com Pessoal</td>
          <td class="text-right negativo">${formatarMoeda(dre.despesas_pessoal)}</td>
          <td class="text-right">${percentual(dre.despesas_pessoal, dre.receitas_total)}</td>
        </tr>
        <tr class="total">
          <td><strong>Total de Despesas</strong></td>
          <td class="text-right negativo"><strong>${formatarMoeda(dre.despesas_total)}</strong></td>
          <td class="text-right"><strong>${percentual(dre.despesas_total, dre.receitas_total)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- RESULTADOS -->
  <div class="section">
    <div class="section-title">📊 Resultados</div>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th class="text-right">Valor</th>
          <th class="text-right">Margem</th>
        </tr>
      </thead>
      <tbody>
        <tr class="resultado ${dre.resultado_bruto >= 0 ? 'positivo' : 'negativo'}">
          <td><strong>Resultado Bruto</strong></td>
          <td class="text-right"><strong>${formatarMoeda(dre.resultado_bruto)}</strong></td>
          <td class="text-right"><strong>${dre.margem_bruta_percentual.toFixed(2)}%</strong></td>
        </tr>
        <tr class="resultado ${dre.resultado_operacional >= 0 ? 'positivo' : 'negativo'}">
          <td><strong>Resultado Operacional</strong></td>
          <td class="text-right"><strong>${formatarMoeda(dre.resultado_operacional)}</strong></td>
          <td class="text-right"><strong>${dre.margem_operacional_percentual.toFixed(2)}%</strong></td>
        </tr>
        <tr class="resultado ${dre.resultado_liquido >= 0 ? 'positivo' : 'negativo'}">
          <td><strong>RESULTADO LÍQUIDO</strong></td>
          <td class="text-right"><strong>${formatarMoeda(dre.resultado_liquido)}</strong></td>
          <td class="text-right"><strong>${dre.margem_liquida_percentual.toFixed(2)}%</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Gerado automaticamente pelo Sistema ERP Sarke em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
    <p>Este documento é confidencial e destinado exclusivamente para uso interno.</p>
  </div>
</body>
</html>
  `

  // Abrir em nova janela para impressão/PDF
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

// ==========================================
// HELPERS
// ==========================================
function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function formatarData(data: string): string {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
}

function percentual(valor: number, total: number): string {
  if (total === 0) return '0,00%'
  return ((valor / total) * 100).toFixed(2).replace('.', ',') + '%'
}
