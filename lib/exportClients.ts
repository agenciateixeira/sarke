import * as XLSX from 'xlsx'
import { Client } from '@/types/crm'

export function exportClientsToExcel(clients: Client[], filename: string = 'clientes') {
  // Preparar dados para exportação
  const data = clients.map(client => ({
    'Nome': client.name,
    'Tipo': client.type === 'pessoa_juridica' ? 'Pessoa Jurídica' : 'Pessoa Física',
    'Email': client.email || '',
    'Telefone': client.phone || '',
    'CPF/CNPJ': client.cpf_cnpj || '',
    'RG': client.rg || '',
    'Estado Civil': client.estado_civil || '',
    'Profissão': client.profissao || '',
    'CNPJ': client.cnpj || '',
    'Razão Social': client.razao_social || '',
    'Representante Legal': client.representante_legal || '',
    'Website': client.website || '',
    'Inscrição Estadual': client.inscricao_estadual || '',
    'Inscrição Municipal': client.inscricao_municipal || '',
    'Rua': client.address_street || '',
    'Número': client.address_number || '',
    'Complemento': client.address_complement || '',
    'Bairro': client.address_neighborhood || '',
    'Cidade': client.address_city || '',
    'Estado': client.address_state || '',
    'CEP': client.address_zip || '',
    'Status': client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect',
    'Observações': client.notes || '',
    'Data de Cadastro': new Date(client.created_at).toLocaleDateString('pt-BR'),
  }))

  // Criar workbook e worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 30 }, // Nome
    { wch: 15 }, // Tipo
    { wch: 30 }, // Email
    { wch: 15 }, // Telefone
    { wch: 18 }, // CPF/CNPJ
    { wch: 15 }, // RG
    { wch: 15 }, // Estado Civil
    { wch: 20 }, // Profissão
    { wch: 18 }, // CNPJ
    { wch: 30 }, // Razão Social
    { wch: 30 }, // Representante Legal
    { wch: 30 }, // Website
    { wch: 18 }, // Inscrição Estadual
    { wch: 18 }, // Inscrição Municipal
    { wch: 30 }, // Rua
    { wch: 10 }, // Número
    { wch: 20 }, // Complemento
    { wch: 20 }, // Bairro
    { wch: 20 }, // Cidade
    { wch: 5 },  // Estado
    { wch: 12 }, // CEP
    { wch: 12 }, // Status
    { wch: 40 }, // Observações
    { wch: 15 }, // Data de Cadastro
  ]
  ws['!cols'] = colWidths

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

  // Gerar arquivo e fazer download
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export function exportClientsToCSV(clients: Client[], filename: string = 'clientes') {
  // Preparar dados para exportação
  const data = clients.map(client => ({
    'Nome': client.name,
    'Tipo': client.type === 'pessoa_juridica' ? 'Pessoa Jurídica' : 'Pessoa Física',
    'Email': client.email || '',
    'Telefone': client.phone || '',
    'CPF/CNPJ': client.cpf_cnpj || '',
    'RG': client.rg || '',
    'Estado Civil': client.estado_civil || '',
    'Profissão': client.profissao || '',
    'CNPJ': client.cnpj || '',
    'Razão Social': client.razao_social || '',
    'Representante Legal': client.representante_legal || '',
    'Website': client.website || '',
    'Inscrição Estadual': client.inscricao_estadual || '',
    'Inscrição Municipal': client.inscricao_municipal || '',
    'Rua': client.address_street || '',
    'Número': client.address_number || '',
    'Complemento': client.address_complement || '',
    'Bairro': client.address_neighborhood || '',
    'Cidade': client.address_city || '',
    'Estado': client.address_state || '',
    'CEP': client.address_zip || '',
    'Status': client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect',
    'Observações': client.notes || '',
    'Data de Cadastro': new Date(client.created_at).toLocaleDateString('pt-BR'),
  }))

  // Criar worksheet e converter para CSV
  const ws = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(ws)

  // Criar blob e fazer download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
