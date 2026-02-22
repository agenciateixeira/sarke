'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface ClientImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

interface ColumnMapping {
  [key: string]: string // spreadsheet column -> our field
}

interface ParsedData {
  headers: string[]
  rows: any[][]
}

type ClientField = {
  key: string
  label: string
  required?: boolean
  patterns?: RegExp[]
  keywords?: string[]
}

const CLIENT_FIELDS: ClientField[] = [
  { key: 'name', label: 'Nome', required: true, keywords: ['nome', 'name', 'razão social', 'razao social'] },
  { key: 'type', label: 'Tipo', keywords: ['tipo', 'type', 'pessoa'] },
  { key: 'email', label: 'Email', patterns: [/email/i, /@/] },
  { key: 'phone', label: 'Telefone', keywords: ['telefone', 'phone', 'tel', 'celular', 'fone'] },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ', keywords: ['cpf', 'cnpj', 'documento'] },
  { key: 'rg', label: 'RG', keywords: ['rg', 'identidade'] },
  { key: 'estado_civil', label: 'Estado Civil', keywords: ['estado civil', 'civil'] },
  { key: 'profissao', label: 'Profissão', keywords: ['profissao', 'profissão', 'ocupacao', 'ocupação'] },
  { key: 'cnpj', label: 'CNPJ', keywords: ['cnpj'] },
  { key: 'razao_social', label: 'Razão Social', keywords: ['razao social', 'razão social'] },
  { key: 'representante_legal', label: 'Representante Legal', keywords: ['representante', 'responsavel', 'responsável'] },
  { key: 'website', label: 'Website', keywords: ['website', 'site', 'url'], patterns: [/http/i, /www/i] },
  { key: 'inscricao_estadual', label: 'Inscrição Estadual', keywords: ['inscricao estadual', 'inscrição estadual', 'ie'] },
  { key: 'inscricao_municipal', label: 'Inscrição Municipal', keywords: ['inscricao municipal', 'inscrição municipal', 'im'] },
  { key: 'address_street', label: 'Rua', keywords: ['rua', 'logradouro', 'endereco', 'endereço', 'street', 'address'] },
  { key: 'address_number', label: 'Número', keywords: ['numero', 'número', 'number', 'nº', 'n°'] },
  { key: 'address_complement', label: 'Complemento', keywords: ['complemento', 'complement', 'apto', 'apartamento'] },
  { key: 'address_neighborhood', label: 'Bairro', keywords: ['bairro', 'neighborhood'] },
  { key: 'address_city', label: 'Cidade', keywords: ['cidade', 'city', 'municipio', 'município'] },
  { key: 'address_state', label: 'Estado', keywords: ['estado', 'state', 'uf'] },
  { key: 'address_zip', label: 'CEP', keywords: ['cep', 'zip', 'codigo postal', 'código postal'] },
  { key: 'status', label: 'Status', keywords: ['status', 'situacao', 'situação'] },
  { key: 'notes', label: 'Observações', keywords: ['observacoes', 'observações', 'obs', 'notes', 'notas'] },
]

export function ClientImportDialog({ open, onOpenChange, onImportComplete }: ClientImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [importing, setImporting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })

      if (jsonData.length < 2) {
        toast.error('Arquivo vazio ou sem dados')
        return
      }

      const headers = jsonData[0].map(h => String(h).trim())
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''))

      setParsedData({ headers, rows })

      // Auto-map columns
      const autoMapping = autoMapColumns(headers)
      setColumnMapping(autoMapping)

      setStep('mapping')
      toast.success(`Arquivo carregado: ${rows.length} linhas encontradas`)
    } catch (error) {
      console.error('Error parsing file:', error)
      toast.error('Erro ao ler arquivo', { description: 'Verifique se o arquivo é válido' })
    }
  }

  const autoMapColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {}

    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase().trim()

      // Try to find a matching field
      for (const field of CLIENT_FIELDS) {
        // Check keywords
        if (field.keywords?.some(keyword => headerLower.includes(keyword.toLowerCase()))) {
          if (!Object.values(mapping).includes(field.key)) {
            mapping[String(index)] = field.key
            break
          }
        }

        // Check patterns (for email, website, etc)
        if (field.patterns?.some(pattern => pattern.test(header))) {
          if (!Object.values(mapping).includes(field.key)) {
            mapping[String(index)] = field.key
            break
          }
        }
      }
    })

    return mapping
  }

  const validateData = (): string[] => {
    const errors: string[] = []

    if (!parsedData) return ['Nenhum dado para validar']

    // Check if required fields are mapped
    const requiredFields = CLIENT_FIELDS.filter(f => f.required)
    for (const field of requiredFields) {
      const isMapped = Object.values(columnMapping).includes(field.key)
      if (!isMapped) {
        errors.push(`Campo obrigatório não mapeado: ${field.label}`)
      }
    }

    // Validate at least one row
    if (parsedData.rows.length === 0) {
      errors.push('Nenhuma linha de dados encontrada')
    }

    return errors
  }

  const handleMapping = () => {
    const errors = validateData()
    setValidationErrors(errors)

    if (errors.length === 0) {
      setStep('preview')
    } else {
      toast.error('Erros de validação encontrados')
    }
  }

  const getMappedValue = (row: any[], columnIndex: number): any => {
    const fieldKey = columnMapping[String(columnIndex)]
    if (!fieldKey) return null

    const value = row[columnIndex]
    if (value === undefined || value === null || value === '') return null

    // Type conversions
    if (fieldKey === 'type') {
      const valueStr = String(value).toLowerCase()
      if (valueStr.includes('juridica') || valueStr.includes('pj')) return 'pessoa_juridica'
      if (valueStr.includes('fisica') || valueStr.includes('pf')) return 'pessoa_fisica'
      return 'pessoa_fisica'
    }

    if (fieldKey === 'status') {
      const valueStr = String(value).toLowerCase()
      if (valueStr.includes('ativo') || valueStr.includes('active')) return 'active'
      if (valueStr.includes('inativo') || valueStr.includes('inactive')) return 'inactive'
      if (valueStr.includes('prospect')) return 'prospect'
      return 'active'
    }

    return String(value).trim()
  }

  const prepareClientData = () => {
    if (!parsedData) return []

    return parsedData.rows.map((row, rowIndex) => {
      const client: any = {
        type: 'pessoa_fisica',
        status: 'active',
      }

      parsedData.headers.forEach((_, colIndex) => {
        const fieldKey = columnMapping[String(colIndex)]
        if (fieldKey) {
          const value = getMappedValue(row, colIndex)
          if (value !== null) {
            client[fieldKey] = value
          }
        }
      })

      return client
    }).filter(client => client.name) // Only import rows with names
  }

  const handleImport = async () => {
    setImporting(true)

    try {
      const clientsData = prepareClientData()

      if (clientsData.length === 0) {
        toast.error('Nenhum cliente válido para importar')
        setImporting(false)
        return
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Sessão expirada', { description: 'Faça login novamente' })
        setImporting(false)
        return
      }

      // Import via API
      const response = await fetch('/api/clients/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clients: clientsData }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao importar clientes')
      }

      toast.success(`${result.count} clientes importados com sucesso!`)
      onImportComplete()
      handleClose()
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error('Erro ao importar clientes', { description: error.message })
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setStep('upload')
    setParsedData(null)
    setColumnMapping({})
    setValidationErrors([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    onOpenChange(false)
  }

  const getUnmappedColumns = () => {
    if (!parsedData) return []
    return parsedData.headers.filter((_, index) => !columnMapping[String(index)])
  }

  const getMappedColumns = () => {
    if (!parsedData) return []
    return parsedData.headers.filter((_, index) => columnMapping[String(index)])
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de um arquivo Excel (.xlsx) ou CSV (.csv)'}
            {step === 'mapping' && 'Mapeie as colunas do arquivo para os campos do sistema'}
            {step === 'preview' && 'Revise os dados antes de importar'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-muted p-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-primary hover:underline">
                      Clique para selecionar
                    </span>
                    <span className="text-sm text-muted-foreground"> ou arraste um arquivo</span>
                  </Label>
                  <Input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: Excel (.xlsx, .xls) ou CSV (.csv)
                </p>
              </div>
            </div>

            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                O sistema irá mapear automaticamente as colunas baseado nos nomes dos campos.
                Você poderá ajustar o mapeamento na próxima etapa.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {getMappedColumns().length} de {parsedData.headers.length} colunas mapeadas
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {parsedData.rows.length} linhas
                </Badge>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Erros de validação:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Coluna do Arquivo</TableHead>
                    <TableHead className="w-1/3">Mapear para</TableHead>
                    <TableHead className="w-1/3">Exemplo de Dado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.headers.map((header, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell>
                        <Select
                          value={columnMapping[String(index)] || 'unmapped'}
                          onValueChange={(value) => {
                            const newMapping = { ...columnMapping }
                            if (value === 'unmapped') {
                              delete newMapping[String(index)]
                            } else {
                              newMapping[String(index)] = value
                            }
                            setColumnMapping(newMapping)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unmapped">
                              <span className="text-muted-foreground">Não mapear</span>
                            </SelectItem>
                            {CLIENT_FIELDS.map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {parsedData.rows[0]?.[index] || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && parsedData && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Pronto para importar {prepareClientData().length} clientes
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prepareClientData().slice(0, 10).map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {client.type === 'pessoa_juridica' ? 'PJ' : 'PF'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{client.email || '-'}</TableCell>
                        <TableCell className="text-sm">{client.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge>
                            {client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Inativo' : 'Prospect'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {prepareClientData().length > 10 && (
                <div className="p-2 text-center text-sm text-muted-foreground border-t">
                  Mostrando 10 de {prepareClientData().length} clientes
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={handleMapping}>
                Continuar para Preview
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>Importar {prepareClientData().length} Clientes</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
