'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, FileText, AlertCircle, CheckCircle2, Sparkles, Eye, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatarMoeda } from '@/types/erp'
import type { ContaBancaria } from '@/types/erp'

interface TransacaoPreview {
  data: string
  descricao: string
  valor: number
  tipo: 'credito' | 'debito'
  saldo?: number
  categoria_sugerida?: {
    id: string
    nome: string
    score: number
    palavras: string[]
  }
}

export default function ImportacaoExtratosPage() {
  const [contaSelecionada, setContaSelecionada] = useState<string>('')
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [transacoesPreview, setTransacoesPreview] = useState<TransacaoPreview[]>([])
  const [loading, setLoading] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [modalCriarConta, setModalCriarConta] = useState(false)
  const [novaConta, setNovaConta] = useState({
    nome: '',
    banco_nome: '',
    tipo: 'conta_corrente',
    agencia: '',
    numero_conta: '',
    saldo_inicial: 0,
  })

  useEffect(() => {
    carregarContas()
  }, [])

  async function carregarContas() {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('ativa', true)
        .order('nome')

      if (error) throw error
      setContas(data || [])
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
      toast.error('Erro ao carregar contas bancárias')
    }
  }

  async function criarContaBancaria() {
    try {
      if (!novaConta.nome || !novaConta.banco_nome) {
        toast.error('Preencha nome e banco')
        return
      }

      const { data, error } = await supabase
        .from('contas_bancarias')
        .insert({
          nome: novaConta.nome,
          banco_nome: novaConta.banco_nome,
          tipo: novaConta.tipo,
          agencia: novaConta.agencia || null,
          numero_conta: novaConta.numero_conta || null,
          saldo_inicial: novaConta.saldo_inicial,
          saldo_atual: novaConta.saldo_inicial,
          ativa: true,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Conta bancária criada com sucesso!')
      setContaSelecionada(data.id)
      setModalCriarConta(false)
      carregarContas()

      // Resetar form
      setNovaConta({
        nome: '',
        banco_nome: '',
        tipo: 'conta_corrente',
        agencia: '',
        numero_conta: '',
        saldo_inicial: 0,
      })
    } catch (error: any) {
      console.error('Erro ao criar conta:', error)
      toast.error(error.message || 'Erro ao criar conta bancária')
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivo(file)

    // Validar tipo de arquivo
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['ofx', 'csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast.error('Formato não suportado. Use OFX, CSV ou Excel')
      setArquivo(null)
      return
    }

    // Preview automático
    await processarArquivo(file)
  }

  async function processarArquivo(file: File) {
    try {
      setLoading(true)
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (ext === 'csv') {
        await processarCSV(file)
      } else if (ext === 'ofx') {
        toast.info('Parser OFX em desenvolvimento. Use CSV por enquanto.')
      } else if (ext === 'xlsx' || ext === 'xls') {
        toast.info('Parser Excel em desenvolvimento. Use CSV por enquanto.')
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

    // Detectar formato (cabeçalho)
    const header = lines[0].toLowerCase()
    let formato: 'itau' | 'bradesco' | 'bb' | 'generico' = 'generico'

    if (header.includes('data') && header.includes('historico') && header.includes('valor')) {
      formato = 'itau'
    }

    const transacoes: TransacaoPreview[] = []

    // Processar linhas
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const cols = line.split(/[,;]/).map((c) => c.trim().replace(/"/g, ''))

      if (cols.length < 3) continue

      try {
        let data, descricao, valor, tipo: 'credito' | 'debito'

        if (formato === 'itau' || formato === 'generico') {
          // Formato: data, descricao, valor, saldo
          data = parseData(cols[0])
          descricao = cols[1] || 'Sem descrição'
          valor = parseValor(cols[2])
          tipo = valor >= 0 ? 'credito' : 'debito'
          valor = Math.abs(valor)
        }

        if (!data || !valor) continue

        transacoes.push({
          data: data.toISOString().split('T')[0],
          descricao,
          valor,
          tipo,
        })
      } catch (err) {
        console.error('Erro ao processar linha:', line, err)
      }
    }

    setTransacoesPreview(transacoes)

    // Buscar categorias sugeridas para cada transação
    await buscarCategoriasSugeridas(transacoes)

    toast.success(`${transacoes.length} transações identificadas`)
  }

  async function buscarCategoriasSugeridas(transacoes: TransacaoPreview[]) {
    try {
      for (let i = 0; i < transacoes.length; i++) {
        const { data: sugestoes } = await supabase.rpc('categorizar_automaticamente', {
          p_descricao: transacoes[i].descricao,
        })

        if (sugestoes && sugestoes.length > 0) {
          transacoes[i].categoria_sugerida = {
            id: sugestoes[0].categoria_id,
            nome: sugestoes[0].categoria_nome,
            score: sugestoes[0].score,
            palavras: sugestoes[0].palavras_encontradas || [],
          }
        }
      }

      setTransacoesPreview([...transacoes])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    }
  }

  function parseData(str: string): Date | null {
    try {
      // Formato DD/MM/YYYY
      if (str.includes('/')) {
        const [dia, mes, ano] = str.split('/')
        return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
      }
      // Formato YYYY-MM-DD
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
      // Remove tudo que não é número, ponto ou vírgula
      let num = str.replace(/[^\d,.-]/g, '')
      // Substitui vírgula por ponto
      num = num.replace(',', '.')
      return parseFloat(num) || 0
    } catch {
      return 0
    }
  }

  async function importarTransacoes() {
    if (!contaSelecionada) {
      toast.error('Selecione uma conta bancária')
      return
    }

    if (transacoesPreview.length === 0) {
      toast.error('Nenhuma transação para importar')
      return
    }

    try {
      setProcessando(true)

      // Criar extrato
      const { data: extrato, error: extratoError } = await supabase
        .from('extratos_bancarios')
        .insert({
          conta_bancaria_id: contaSelecionada,
          arquivo_nome: arquivo?.name,
          periodo_inicio: transacoesPreview[0].data,
          periodo_fim: transacoesPreview[transacoesPreview.length - 1].data,
          quantidade_transacoes: transacoesPreview.length,
          status: 'processando',
        })
        .select()
        .single()

      if (extratoError) throw extratoError

      // Inserir transações
      const transacoesParaInserir = transacoesPreview.map((t) => ({
        extrato_id: extrato.id,
        conta_bancaria_id: contaSelecionada,
        data_transacao: t.data,
        descricao: t.descricao,
        valor: t.valor,
        tipo: t.tipo,
        status_conciliacao: 'pendente',
      }))

      const { error: transacoesError } = await supabase
        .from('transacoes_bancarias')
        .insert(transacoesParaInserir)

      if (transacoesError) throw transacoesError

      // Aplicar categorizações automáticas (para as com score > 70)
      let autoCategorizadas = 0
      for (const t of transacoesPreview) {
        if (t.categoria_sugerida && t.categoria_sugerida.score >= 70) {
          try {
            // Buscar transação recém-criada
            const { data: transacaoCriada } = await supabase
              .from('transacoes_bancarias')
              .select('id')
              .eq('descricao', t.descricao)
              .eq('valor', t.valor)
              .eq('data_transacao', t.data)
              .single()

            if (transacaoCriada) {
              await supabase.rpc('aplicar_categorizacao_transacao', {
                p_transacao_id: transacaoCriada.id,
                p_categoria_id: t.categoria_sugerida.id,
                p_confirmar: false,
              })
              autoCategorizadas++
            }
          } catch (err) {
            console.error('Erro ao categorizar:', err)
          }
        }
      }

      // Atualizar status do extrato
      await supabase
        .from('extratos_bancarios')
        .update({ status: 'concluido' })
        .eq('id', extrato.id)

      toast.success(
        `${transacoesPreview.length} transações importadas! ${autoCategorizadas} categorizadas automaticamente.`
      )

      // Limpar
      setArquivo(null)
      setTransacoesPreview([])
      setContaSelecionada('')
    } catch (error: any) {
      console.error('Erro ao importar:', error)
      toast.error(error.message || 'Erro ao importar transações')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Importação de Extratos"
          description="Importe extratos bancários e de cartão de crédito com categorização automática"
        />

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Selecione o Arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo de Extrato</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="p-4 border rounded-lg text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium">OFX</p>
                  <p className="text-xs text-muted-foreground">Padrão bancário</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm font-medium">CSV</p>
                  <p className="text-xs text-muted-foreground">Excel / Texto</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm font-medium">Excel</p>
                  <p className="text-xs text-muted-foreground">XLSX / XLS</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="arquivo">Upload do Arquivo</Label>
              <div className="mt-2 flex items-center gap-4">
                <input
                  type="file"
                  id="arquivo"
                  accept=".ofx,.csv,.xlsx,.xls"
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
                    <p className="text-sm text-muted-foreground">
                      Formatos: OFX, CSV, Excel (máx 10MB)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <Label>Conta Bancária</Label>
              <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setModalCriarConta(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Nova Conta
                    </Button>
                  </div>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome} - {conta.banco_nome}
                    </SelectItem>
                  ))}
                  {contas.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma conta cadastrada
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {transacoesPreview.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  2. Preview - {transacoesPreview.length} Transações
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Categorização automática aplicada com IA
                </p>
              </div>
              <Button onClick={importarTransacoes} disabled={processando || !contaSelecionada}>
                {processando ? 'Importando...' : 'Importar Tudo'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Categoria (IA)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoesPreview.slice(0, 100).map((t, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{t.descricao}</TableCell>
                        <TableCell>
                          <Badge
                            variant={t.tipo === 'credito' ? 'default' : 'secondary'}
                            className={
                              t.tipo === 'credito'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            {t.tipo === 'credito' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatarMoeda(t.valor)}
                        </TableCell>
                        <TableCell>
                          {t.categoria_sugerida ? (
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3 w-3 text-yellow-600" />
                              <span className="text-sm">{t.categoria_sugerida.nome}</span>
                              <Badge
                                variant="outline"
                                className={
                                  t.categoria_sugerida.score >= 80
                                    ? 'bg-green-100 text-green-700'
                                    : t.categoria_sugerida.score >= 50
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-700'
                                }
                              >
                                {Math.round(t.categoria_sugerida.score)}%
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Sem sugestão
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {transacoesPreview.length > 100 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 100 de {transacoesPreview.length} transações
                </p>
              )}
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
                <h4 className="font-medium mb-1">Baixe o extrato do seu banco</h4>
                <p className="text-sm text-muted-foreground">
                  Acesse o internet banking e baixe o extrato em formato OFX, CSV ou Excel
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">Faça upload do arquivo</h4>
                <p className="text-sm text-muted-foreground">
                  Selecione a conta bancária e faça upload. O sistema identificará automaticamente as transações.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">IA categoriza automaticamente</h4>
                <p className="text-sm text-muted-foreground">
                  Nosso algoritmo analisa cada transação e sugere a categoria baseado em mais de 200 palavras-chave.
                  Transações com confiança acima de 70% são categorizadas automaticamente!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Revise e concilie</h4>
                <p className="text-sm text-muted-foreground">
                  Acesse "Conciliação Bancária" para revisar e ajustar as categorizações. O sistema aprende com suas correções!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Criar Conta Bancária */}
        <Dialog open={modalCriarConta} onOpenChange={setModalCriarConta}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Conta Bancária</DialogTitle>
              <DialogDescription>
                Cadastre uma nova conta bancária para importar extratos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Conta *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Conta Principal"
                  value={novaConta.nome}
                  onChange={(e) => setNovaConta({ ...novaConta, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="banco">Banco *</Label>
                <Input
                  id="banco"
                  placeholder="Ex: Itaú, Bradesco, Nubank..."
                  value={novaConta.banco_nome}
                  onChange={(e) => setNovaConta({ ...novaConta, banco_nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Conta</Label>
                <Select
                  value={novaConta.tipo}
                  onValueChange={(value) => setNovaConta({ ...novaConta, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                    <SelectItem value="conta_poupanca">Conta Poupança</SelectItem>
                    <SelectItem value="conta_investimento">Conta Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    placeholder="0000"
                    value={novaConta.agencia}
                    onChange={(e) => setNovaConta({ ...novaConta, agencia: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número da Conta</Label>
                  <Input
                    id="numero"
                    placeholder="00000-0"
                    value={novaConta.numero_conta}
                    onChange={(e) =>
                      setNovaConta({ ...novaConta, numero_conta: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saldo">Saldo Inicial</Label>
                <Input
                  id="saldo"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={novaConta.saldo_inicial}
                  onChange={(e) =>
                    setNovaConta({ ...novaConta, saldo_inicial: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalCriarConta(false)}>
                Cancelar
              </Button>
              <Button onClick={criarContaBancaria}>Criar Conta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
