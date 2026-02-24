'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Filter,
  Search,
  Calendar as CalendarIcon,
  X,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LancamentoCard } from '@/components/erp/LancamentoCard'
import { PlanoContasSelector } from '@/components/erp/PlanoContasSelector'
import { formatarMoeda, formatarData } from '@/types/erp'
import type { LancamentoComRelacoes, ContaBancaria, Cliente } from '@/types/erp'
import { toast } from 'sonner'

export default function LancamentosPage() {
  const [lancamentos, setLancamentos] = useState<LancamentoComRelacoes[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedLancamento, setSelectedLancamento] = useState<LancamentoComRelacoes | null>(null)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  // Formulário
  const [formData, setFormData] = useState({
    tipo: 'despesa' as 'receita' | 'despesa' | 'transferencia',
    descricao: '',
    valor_total: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    data_competencia: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    conta_debito_id: '',
    conta_credito_id: '',
    conta_bancaria_id: '',
    cliente_id: '',
    fornecedor_id: '',
    projeto_id: '',
    observacoes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Dados para selects
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  useEffect(() => {
    fetchLancamentos()
    fetchSelects()
  }, [])

  useEffect(() => {
    fetchLancamentos()
  }, [filtroTipo, filtroStatus, filtroBusca, filtroDataInicio, filtroDataFim])

  async function fetchLancamentos() {
    try {
      setLoading(true)

      let query = supabase
        .from('lancamentos')
        .select(
          `
          *,
          cliente:clients(id, name),
          fornecedor:empresas_parceiras(id, nome),
          projeto:projetos(id, nome),
          obra:obras(id, nome),
          conta_bancaria:contas_bancarias(id, nome, apelido)
        `
        )
        .order('data_lancamento', { ascending: false })

      // Aplicar filtros
      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      if (filtroBusca) {
        query = query.ilike('descricao', `%${filtroBusca}%`)
      }

      if (filtroDataInicio) {
        query = query.gte('data_competencia', filtroDataInicio)
      }

      if (filtroDataFim) {
        query = query.lte('data_competencia', filtroDataFim)
      }

      const { data, error } = await query

      if (error) throw error

      setLancamentos((data as any) || [])
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error)
      toast.error('Erro ao carregar lançamentos')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSelects() {
    const [contasRes, clientesRes] = await Promise.all([
      supabase.from('contas_bancarias').select('*').eq('ativa', true),
      supabase.from('clients').select('id, name').eq('status', 'active'),
    ])

    if (contasRes.data) setContas(contasRes.data)
    if (clientesRes.data) setClientes(clientesRes.data as any)
  }

  async function handleCreateLancamento() {
    try {
      if (!formData.descricao.trim()) {
        toast.error('Descrição é obrigatória')
        return
      }

      if (!formData.valor_total || parseFloat(formData.valor_total) <= 0) {
        toast.error('Valor inválido')
        return
      }

      if (!formData.conta_debito_id || !formData.conta_credito_id) {
        toast.error('Selecione as contas de débito e crédito')
        return
      }

      setSubmitting(true)

      const { data, error } = await supabase.rpc('criar_lancamento_completo', {
        p_tipo: formData.tipo,
        p_descricao: formData.descricao,
        p_valor: parseFloat(formData.valor_total),
        p_data_lancamento: formData.data_lancamento,
        p_data_competencia: formData.data_competencia,
        p_conta_debito_id: formData.conta_debito_id,
        p_conta_credito_id: formData.conta_credito_id,
        p_conta_bancaria_id: formData.conta_bancaria_id || null,
      })

      if (error) throw error

      toast.success('Lançamento criado com sucesso!')
      setCreateModalOpen(false)
      resetForm()
      fetchLancamentos()
    } catch (error: any) {
      console.error('Erro ao criar lançamento:', error)
      toast.error(error.message || 'Erro ao criar lançamento')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormData({
      tipo: 'despesa',
      descricao: '',
      valor_total: '',
      data_lancamento: new Date().toISOString().split('T')[0],
      data_competencia: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      conta_debito_id: '',
      conta_credito_id: '',
      conta_bancaria_id: '',
      cliente_id: '',
      fornecedor_id: '',
      projeto_id: '',
      observacoes: '',
    })
  }

  function handleLancamentoClick(lancamento: LancamentoComRelacoes) {
    setSelectedLancamento(lancamento)
    setDetailModalOpen(true)
  }

  function limparFiltros() {
    setFiltroTipo('todos')
    setFiltroStatus('todos')
    setFiltroBusca('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
  }

  const filtrosAtivos =
    filtroTipo !== 'todos' ||
    filtroStatus !== 'todos' ||
    filtroBusca ||
    filtroDataInicio ||
    filtroDataFim

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Lançamentos Financeiros"
          description="Gestão completa de receitas, despesas e transferências"
          actions={
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Lançamento
            </Button>
          }
        />

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
              {filtrosAtivos && (
                <Button variant="ghost" size="sm" onClick={limparFiltros}>
                  <X className="mr-2 h-3 w-3" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {/* Busca */}
              <div className="md:col-span-3 lg:col-span-2">
                <Label htmlFor="busca">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="busca"
                    placeholder="Descrição..."
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Tipo */}
              <div>
                <Label>Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                    <SelectItem value="transferencia">Transferências</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Período - Data Início */}
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  placeholder="Início"
                />
              </div>

              {/* Período - Data Fim */}
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  placeholder="Fim"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Lançamentos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {loading
                  ? 'Carregando...'
                  : `${lancamentos.length} lançamento${lancamentos.length !== 1 ? 's' : ''}`}
              </CardTitle>
              {filtrosAtivos && (
                <Badge variant="secondary">Filtros ativos</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : lancamentos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">Nenhum lançamento encontrado</p>
                <p className="text-sm">
                  {filtrosAtivos
                    ? 'Tente ajustar os filtros ou limpar para ver todos'
                    : 'Crie seu primeiro lançamento clicando no botão acima'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {lancamentos.map((lancamento) => (
                  <LancamentoCard
                    key={lancamento.id}
                    lancamento={lancamento}
                    onClick={() => handleLancamentoClick(lancamento)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Criação */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
              <DialogDescription>
                Crie um novo lançamento financeiro com partidas dobradas
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Tipo */}
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Descrição */}
              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Ex: Pagamento de fornecedor"
                />
              </div>

              {/* Valor */}
              <div>
                <Label htmlFor="valor">Valor Total *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={formData.valor_total}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_total: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              {/* Datas */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="data_lancamento">Data Lançamento *</Label>
                  <Input
                    id="data_lancamento"
                    type="date"
                    value={formData.data_lancamento}
                    onChange={(e) =>
                      setFormData({ ...formData, data_lancamento: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="data_competencia">Data Competência *</Label>
                  <Input
                    id="data_competencia"
                    type="date"
                    value={formData.data_competencia}
                    onChange={(e) =>
                      setFormData({ ...formData, data_competencia: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="data_vencimento">Data Vencimento</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) =>
                      setFormData({ ...formData, data_vencimento: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Partidas Dobradas */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Partidas Dobradas</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Conta Débito *</Label>
                    <PlanoContasSelector
                      value={formData.conta_debito_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, conta_debito_id: value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Conta Crédito *</Label>
                    <PlanoContasSelector
                      value={formData.conta_credito_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, conta_credito_id: value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Conta Bancária */}
              <div>
                <Label htmlFor="conta_bancaria">Conta Bancária</Label>
                <Select
                  value={formData.conta_bancaria_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, conta_bancaria_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.apelido || conta.nome} - {formatarMoeda(conta.saldo_atual)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateLancamento} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Lançamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Detalhes */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Lançamento</DialogTitle>
            </DialogHeader>

            {selectedLancamento && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium capitalize">{selectedLancamento.tipo}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium capitalize">{selectedLancamento.status}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Total</Label>
                    <p className="font-medium text-lg">
                      {formatarMoeda(selectedLancamento.valor_total)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor Pago</Label>
                    <p className="font-medium text-lg">
                      {formatarMoeda(selectedLancamento.valor_pago)}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="font-medium">{selectedLancamento.descricao}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-muted-foreground">Data Lançamento</Label>
                    <p className="font-medium">
                      {formatarData(selectedLancamento.data_lancamento)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data Competência</Label>
                    <p className="font-medium">
                      {formatarData(selectedLancamento.data_competencia)}
                    </p>
                  </div>
                  {selectedLancamento.data_vencimento && (
                    <div>
                      <Label className="text-muted-foreground">Data Vencimento</Label>
                      <p className="font-medium">
                        {formatarData(selectedLancamento.data_vencimento)}
                      </p>
                    </div>
                  )}
                </div>

                {selectedLancamento.cliente && (
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{selectedLancamento.cliente.name}</p>
                  </div>
                )}

                {selectedLancamento.conta_bancaria && (
                  <div>
                    <Label className="text-muted-foreground">Conta Bancária</Label>
                    <p className="font-medium">
                      {selectedLancamento.conta_bancaria.apelido ||
                        selectedLancamento.conta_bancaria.nome}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
