const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Cronograma Prime R01.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('📊 Cronograma Prime R01 - Análise\n');
console.log('Planilhas encontradas:', workbook.SheetNames.join(', '));
console.log('');

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n=== PLANILHA: ${sheetName} ===\n`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Mostrar primeiras 20 linhas
  const maxRows = Math.min(20, data.length);
  for (let i = 0; i < maxRows; i++) {
    if (data[i] && data[i].length > 0) {
      console.log(`Linha ${i + 1}:`, data[i].slice(0, 10).join(' | '));
    }
  }

  console.log(`\n... (Total de ${data.length} linhas)`);
});
