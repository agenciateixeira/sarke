'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Upload, FileText, CheckCircle2, Sparkles, CreditCard, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatarMoeda, type CartaoCredito, formatarParcela } from '@/types/erp'
import Link from 'next/link'

interface CompraPreview {
  data: string
  descricao: string
  valor: number
  parcelado: boolean
  parcela_atual: number | null
  parcela_total: number | null
  categoria_sugerida?: {
    id: string
    nome: string
    score: number
  }
}

export default function ImportarFaturaPage() {
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [cartaoSelecionado, setCartaoSelecionado] = useState<string>('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [comprasPreview, setComprasPreview] = useState<CompraPreview[]>([])
  const [loading, setLoading] = useState(false)
  const [processando, setProcessando] = useState(false)

  // Dados da fatura
  const [mesReferencia, setMesReferencia] = useState(new Date().getMonth() + 1)
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear())

  useEffect(() => {
    carregarCartoes()
  }, [])

  async function carregarCartoes() {
    try {
      const { data, error } = await supabase
        .from('cartoes_credito')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setCartoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
      toast.error('Erro ao carregar cartões')
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivo(file)

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'pdf'].includes(ext || '')) {
      toast.error('Formato não suportado. Use CSV ou PDF')
      setArquivo(null)
      return
    }

    await processarArquivo(file)
  }

  async function processarArquivo(file: File) {
    try {
      setLoading(true)
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (ext === 'csv') {
        await processarCSV(file)
      } else if (ext === 'pdf') {
        await processarPDF(file)
      }
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error)
      toast.error(error.message || 'Erro ao processar arquivo')
    } finally {
      setLoading(false)
    }
  }

  async function processarCSV(file: File) {
    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      toast.error('Arquivo vazio ou inválido')
      return
    }

    const compras: CompraPreview[] = []

    // Processar linhas (pular cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const cols = line.split(/[,;]/).map((c) => c.trim().replace(/"/g, ''))

      if (cols.length < 3) continue

      try {
        // Formato: data, descricao, valor
        const data = parseData(cols[0])
        const descricao = cols[1] || 'Sem descrição'
        const valor = parseValor(cols[2])

        if (!data || !valor) continue

        // Detectar parcelamento
        const parcelamento = await detectarParcelamento(descricao)

        compras.push({
          data: data.toISOString().split('T')[0],
          descricao,
          valor: Math.abs(valor),
          ...parcelamento,
        })
      } catch (err) {
        console.error('Erro ao processar linha:', line, err)
      }
    }

    setComprasPreview(compras)
    await buscarCategoriasSugeridas(compras)
    toast.success(`${compras.length} compras identificadas`)
  }

  async function processarPDF(file: File) {
    try {
      if (typeof window === 'undefined') {
        toast.error('PDF só pode ser processado no navegador')
        return
      }

      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise

      let textContent = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items
          .map((item: any) => item.str)
          .join(' ')
        textContent += pageText + '\n'
      }

      const compras = parsearTextoPDFFatura(textContent)

      if (compras.length === 0) {
        toast.error('Nenhuma compra encontrada no PDF')
        return
      }

      setComprasPreview(compras)
      await buscarCategoriasSugeridas(compras)
      toast.success(`✅ ${compras.length} compras identificadas da fatura`)
    } catch (error: any) {
      console.error('Erro ao processar PDF:', error)
      toast.error('Erro ao processar PDF da fatura')
    }
  }

  function parsearTextoPDFFatura(texto: string): CompraPreview[] {
    const compras: CompraPreview[] = []
    const lines = texto.split('\n')

    const regexData = /(\d{2}\/\d{2}(?:\/\d{4})?)/
    const regexValor = /(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2})/

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const matchData = line.match(regexData)
      const matchValor = line.match(regexValor)

      if (matchData && matchValor) {
        try {
          let dataStr = matchData[1]
          if (!dataStr.includes('/20')) {
            const anoAtual = new Date().getFullYear()
            dataStr += `/${anoAtual}`
          }
          const [dia, mes, ano] = dataStr.split('/')
          const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))

          const valorStr = matchValor[1].replace(/\./g, '').replace(',', '.')
          const valor = parseFloat(valorStr)

          const posData = line.indexOf(matchData[0])
          const posValor = line.indexOf(matchValor[0])
          let descricao = line.substring(posData + matchData[0].length, posValor).trim()

          if (!descricao && i + 1 < lines.length) {
            descricao = lines[i + 1].trim()
          }

          if (!descricao) descricao = 'Compra sem descrição'

          // Detectar parcelamento síncrono
          const parcelamentoMatch = descricao.match(/(\d{1,2})\s*\/\s*(\d{1,2})/)
          const parcelamento = parcelamentoMatch
            ? {
                parcelado: true,
                parcela_atual: parseInt(parcelamentoMatch[1]),
                parcela_total: parseInt(parcelamentoMatch[2]),
              }
            : {
                parcelado: false,
                parcela_atual: null,
                parcela_total: null,
              }

          compras.push({
            data: data.toISOString().split('T')[0],
            descricao,
            valor: Math.abs(valor),
            ...parcelamento,
          })
        } catch (err) {
          console.error('Erro ao parsear linha:', line, err)
        }
      }
    }

    return compras
  }

  async function detectarParcelamento(
    descricao: string
  ): Promise<{ parcelado: boolean; parcela_atual: number | null; parcela_total: number | null }> {
    try {
      const { data, error } = await supabase.rpc('detectar_parcelamento', {
        p_descricao: descricao,
      })

      if (error) throw error

      if (data && data.length > 0) {
        return data[0]
      }

      return { parcelado: false, parcela_atual: null, parcela_total: null }
    } catch (error) {
      console.error('Erro ao detectar parcelamento:', error)
      return { parcelado: false, parcela_atual: null, parcela_total: null }
    }
  }

  async function buscarCategoriasSugeridas(compras: CompraPreview[]) {
    try {
      for (let i = 0; i < compras.length; i++) {
        const { data: sugestoes } = await supabase.rpc('categorizar_automaticamente', {
          p_descricao: compras[i].descricao,
        })

        if (sugestoes && sugestoes.length > 0) {
          compras[i].categoria_sugerida = {
            id: sugestoes[0].categoria_id,
            nome: sugestoes[0].categoria_nome,
            score: sugestoes[0].score,
          }
        }
      }

      setComprasPreview([...compras])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  function parseData(str: string): Date | null {
    try {
      if (str.includes('/')) {
        const [dia, mes, ano] = str.split('/')
        return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
      }
      if (str.includes('-')) {
        return new Date(str)
      }
      return null
    } catch {
      return null
    }
  }

  function parseValor(str: string): number {
    try {
      let num = str.replace(/[^\d,.-]/g, '')
      num = num.replace(',', '.')
      return parseFloat(num) || 0
    } catch {
      return 0
    }
  }

  async function importarFatura() {
    if (!cartaoSelecionado) {
      toast.error('Selecione um cartão')
      return
    }

    if (comprasPreview.length === 0) {
      toast.error('Nenhuma compra para importar')
      return
    }

    try {
      setProcessando(true)

      // Buscar dados do cartão
      const cartao = cartoes.find((c) => c.id === cartaoSelecionado)
      if (!cartao) throw new Error('Cartão não encontrado')

      // Calcular datas da fatura
      const dataFechamento = new Date(anoReferencia, mesReferencia - 1, cartao.dia_fechamento)
      const dataVencimento = new Date(anoReferencia, mesReferencia - 1, cartao.dia_vencimento)

      // Se vencimento < fechamento, vencimento é no mês seguinte
      if (dataVencimento < dataFechamento) {
        dataVencimento.setMonth(dataVencimento.getMonth() + 1)
      }

      // Criar fatura
      const { data: fatura, error: faturaError } = await supabase
        .from('faturas_cartao')
        .insert({
          cartao_id: cartaoSelecionado,
          mes_referencia: mesReferencia,
          ano_referencia: anoReferencia,
          data_fechamento: dataFechamento.toISOString().split('T')[0],
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          valor_total: 0, // Será calculado pelo trigger
          valor_pago: 0,
          status: 'pendente',
          arquivo_nome: arquivo?.name,
        })
        .select()
        .single()

      if (faturaError) throw faturaError

      // Inserir compras
      const comprasParaInserir = comprasPreview.map((c) => ({
        fatura_id: fatura.id,
        cartao_id: cartaoSelecionado,
        data_compra: c.data,
        descricao: c.descricao,
        valor: c.valor,
        parcelado: c.parcelado,
        parcela_atual: c.parcela_atual,
        parcela_total: c.parcela_total,
        categoria_sugerida_id: c.categoria_sugerida?.id || null,
        categoria_score: c.categoria_sugerida?.score || null,
        categoria_confirmada: false,
        categoria_id: c.categoria_sugerida && c.categoria_sugerida.score >= 70 ? c.categoria_sugerida.id : null,
      }))

      const { error: comprasError } = await supabase.from('compras_cartao').insert(comprasParaInserir)

      if (comprasError) throw comprasError

      const autoCategorizadas = comprasParaInserir.filter((c) => c.categoria_id !== null).length

      toast.success(
        `✅ Fatura importada! ${comprasPreview.length} compras. ${autoCategorizadas} categorizadas automaticamente.`
      )

      // Limpar
      setArquivo(null)
      setComprasPreview([])
      setCartaoSelecionado('')
    } catch (error: any) {
      console.error('Erro ao importar fatura:', error)
      toast.error(error.message || 'Erro ao importar fatura')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/financeiro/cartoes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <PageHeader
            title="Importar Fatura de Cartão"
            description="Importe faturas de cartão de crédito com categorização automática"
          />
        </div>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Selecione o Arquivo da Fatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cartão de Crédito *</Label>
              <Select value={cartaoSelecionado} onValueChange={setCartaoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cartoes.map((cartao) => (
                    <SelectItem key={cartao.id} value={cartao.id}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {cartao.nome}
                        {cartao.ultimos_digitos && ` (•••• ${cartao.ultimos_digitos})`}
                      </div>
                    </SelectItem>
                  ))}
                  {cartoes.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum cartão cadastrado
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mês de Referência</Label>
                <Select
                  value={mesReferencia.toString()}
                  onValueChange={(value) => setMesReferencia(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                      <SelectItem key={mes} value={mes.toString()}>
                        {new Date(2000, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ano de Referência</Label>
                <Select
                  value={anoReferencia.toString()}
                  onValueChange={(value) => setAnoReferencia(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="arquivo">Upload da Fatura (PDF ou CSV)</Label>
              <div className="mt-2 flex items-center gap-4">
                <input
                  type="file"
                  id="arquivo"
                  accept=".pdf,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="arquivo"
                  className="flex-1 flex items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">
                      {arquivo ? arquivo.name : 'Clique para selecionar ou arraste aqui'}
                    </p>
                    <p className="text-sm text-muted-foreground">Formatos: PDF, CSV (máx 10MB)</p>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {comprasPreview.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  2. Preview - {comprasPreview.length} Compras
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Categorização automática aplicada com IA
                </p>
              </div>
              <Button onClick={importarFatura} disabled={processando || !cartaoSelecionado}>
                {processando ? 'Importando...' : 'Importar Fatura'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Parcelamento</TableHead>
                      <TableHead>Categoria (IA)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comprasPreview.slice(0, 100).map((compra, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {new Date(compra.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{compra.descricao}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatarMoeda(compra.valor)}
                        </TableCell>
                        <TableCell className="text-center">
                          {compra.parcelado ? (
                            <Badge variant="outline" className="bg-blue-50">
                              {formatarParcela(
                                compra.parcela_atual || 1,
                                compra.parcela_total || 1
                              )}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">À vista</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {compra.categoria_sugerida ? (
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3 w-3 text-yellow-600" />
                              <span className="text-sm">{compra.categoria_sugerida.nome}</span>
                              <Badge
                                variant="outline"
                                className={
                                  compra.categoria_sugerida.score >= 80
                                    ? 'bg-green-100 text-green-700'
                                    : compra.categoria_sugerida.score >= 50
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-700'
                                }
                              >
                                {Math.round(compra.categoria_sugerida.score)}%
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem sugestão</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {comprasPreview.length > 100 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 100 de {comprasPreview.length} compras
                </p>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium">
                  💡 Total da Fatura: {formatarMoeda(comprasPreview.reduce((sum, c) => sum + c.valor, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Baixe a fatura do seu cartão</h4>
                <p className="text-sm text-muted-foreground">
                  Acesse o app/site do banco e baixe a fatura em formato PDF ou CSV
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Selecione cartão e período</h4>
                <p className="text-sm text-muted-foreground">
                  Escolha o cartão e informe o mês/ano de referência da fatura
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">IA categoriza + detecta parcelamento</h4>
                <p className="text-sm text-muted-foreground">
                  Sistema identifica automaticamente parcelas (3/12) e categoriza despesas com +70% de confiança
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Fatura criada automaticamente</h4>
                <p className="text-sm text-muted-foreground">
                  O sistema calcula o valor total, atualiza o limite disponível e cria a fatura no cartão!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
