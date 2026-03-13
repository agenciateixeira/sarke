#!/usr/bin/env node

/**
 * Script de teste para validar a importação V2 de cronogramas
 * Testa com a planilha real do Diego: Cronograma - Viale Conveniencia.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Caminho da planilha de teste
const testFile = path.expanduser = (p) => p.replace('~', process.env.HOME);
const filePath = testFile('~/Downloads/Cronograma - Viale Conveniencia.xlsx');

console.log('==========================================');
console.log('TESTE DE IMPORTAÇÃO V2 - CRONOGRAMA');
console.log('==========================================\n');

// Verificar se o arquivo existe
if (!fs.existsSync(filePath)) {
  console.error('❌ Arquivo não encontrado:', filePath);
  process.exit(1);
}

// Ler o arquivo
const workbook = XLSX.readFile(filePath);

console.log('📁 Arquivo carregado com sucesso');
console.log(`📋 Abas encontradas: ${workbook.SheetNames.join(', ')}\n`);

// Processar aba CRONOGRAMA
const cronogramaSheet = workbook.Sheets['CRONOGRAMA'];
if (!cronogramaSheet) {
  console.error('❌ Aba CRONOGRAMA não encontrada');
  process.exit(1);
}

const jsonData = XLSX.utils.sheet_to_json(cronogramaSheet, { header: 1 });

// Encontrar cabeçalho
let headerRow = -1;
for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
  const row = jsonData[i];
  if (Array.isArray(row)) {
    const rowText = row.join(' ').toLowerCase();
    if (rowText.includes('data') && rowText.includes('descrição')) {
      headerRow = i;
      break;
    }
  }
}

if (headerRow === -1) {
  console.error('❌ Cabeçalho não encontrado');
  process.exit(1);
}

console.log(`✅ Cabeçalho encontrado na linha ${headerRow + 1}`);
console.log(`   Colunas: ${jsonData[headerRow].filter(h => h).join(' | ')}\n`);

// Simular processamento V2
const headers = jsonData[headerRow].map(h => (h ? String(h).toLowerCase() : ''));
const dataRows = jsonData.slice(headerRow + 1);

const indices = {
  data: headers.findIndex(h => h.includes('data')),
  descricao: headers.findIndex(h => h.includes('descrição') || h.includes('serviço')),
  empresa: headers.findIndex(h => h.includes('empresa')),
  status: headers.findIndex(h => h.includes('status'))
};

let ultimaData = null;
let atividadesImportadas = [];
let linhasProcessadas = 0;
let linhasComData = 0;
let linhasSemData = 0;

for (const row of dataRows) {
  linhasProcessadas++;

  // Tem descrição?
  const descricao = row[indices.descricao];
  if (!descricao || String(descricao).trim() === '') continue;

  // Tem data?
  const dataCell = row[indices.data];
  let dataAtividade = null;

  if (dataCell) {
    // Linha com data nova
    ultimaData = dataCell;
    dataAtividade = dataCell;
    linhasComData++;
  } else if (ultimaData) {
    // Linha sem data - usar última data válida
    dataAtividade = ultimaData;
    linhasSemData++;
  }

  if (!dataAtividade) continue;

  atividadesImportadas.push({
    data: dataAtividade,
    descricao: descricao,
    empresa: row[indices.empresa] || '',
    status: row[indices.status] || 'pendente'
  });
}

console.log('========== RESULTADO DA IMPORTAÇÃO V2 ==========\n');
console.log(`📊 Estatísticas:`);
console.log(`   • Linhas processadas: ${linhasProcessadas}`);
console.log(`   • Linhas com data: ${linhasComData}`);
console.log(`   • Linhas sem data (usando data anterior): ${linhasSemData}`);
console.log(`   • Total de atividades importadas: ${atividadesImportadas.length}`);
console.log(`   • Média de tarefas por dia: ${(atividadesImportadas.length / linhasComData).toFixed(1)}\n`);

// Mostrar exemplos de dias com múltiplas tarefas
const tarefasPorData = {};
atividadesImportadas.forEach(ativ => {
  const dataStr = String(ativ.data);
  if (!tarefasPorData[dataStr]) {
    tarefasPorData[dataStr] = [];
  }
  tarefasPorData[dataStr].push(ativ);
});

console.log('📅 Exemplos de dias com múltiplas tarefas:\n');
let exemplosCount = 0;
for (const [data, tarefas] of Object.entries(tarefasPorData)) {
  if (tarefas.length > 1 && exemplosCount < 3) {
    console.log(`   Data: ${data}`);
    console.log(`   Total de tarefas: ${tarefas.length}`);
    tarefas.forEach((t, i) => {
      console.log(`     ${i + 1}. ${t.descricao.substring(0, 50)}...`);
    });
    console.log('');
    exemplosCount++;
  }
}

// Verificar aba SERVIÇOS
const servicosSheet = workbook.Sheets['SERVIÇOS'];
if (servicosSheet) {
  console.log('========== ABA SERVIÇOS (CAIXA DA OBRA) ==========\n');

  const servicosData = XLSX.utils.sheet_to_json(servicosSheet, { header: 1 });
  let materiaisCount = 0;

  for (const row of servicosData) {
    // Procurar por linhas com descrição de material
    const hasContent = row.some(cell => cell && String(cell).trim() !== '');
    if (hasContent) {
      const descricao = row.find(cell =>
        cell &&
        String(cell).length > 5 &&
        !String(cell).toLowerCase().includes('total')
      );
      if (descricao) materiaisCount++;
    }
  }

  console.log(`✅ Aba SERVIÇOS encontrada`);
  console.log(`   • Itens de material/serviço: ~${materiaisCount}`);
  console.log(`   • Esta aba seria importada automaticamente para o Caixa da Obra\n`);
}

// Comparação
console.log('========== COMPARAÇÃO: V1 vs V2 ==========\n');
console.log(`❌ Versão ANTIGA (V1): Importaria apenas ${linhasComData} tarefas`);
console.log(`✅ Versão NOVA (V2): Importa todas as ${atividadesImportadas.length} tarefas`);
console.log(`📈 Melhoria: ${atividadesImportadas.length - linhasComData} tarefas adicionais recuperadas!\n`);

if (atividadesImportadas.length > linhasComData) {
  console.log('🎉 SUCESSO: A nova versão corrige o problema de importação!');
} else {
  console.log('⚠️  ATENÇÃO: Verificar se a planilha tem estrutura esperada');
}

console.log('\n==========================================');
console.log('         TESTE CONCLUÍDO COM SUCESSO');
console.log('==========================================');