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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Wallet,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  ArrowUpRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ContaBancariaCard } from '@/components/erp/ContaBancariaCard'
import { LancamentoCard } from '@/components/erp/LancamentoCard'
import { formatarMoeda, formatarData } from '@/types/erp'
import type { ContaBancaria, LancamentoComRelacoes } from '@/types/erp'
import { toast } from 'sonner'

export default function BancosPage() {
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [extratoModalOpen, setExtratoModalOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)

  const [selectedConta, setSelectedConta] = useState<ContaBancaria | null>(null)
  const [contaToArchive, setContaToArchive] = useState<string | null>(null)
  const [extrato, setExtrato] = useState<LancamentoComRelacoes[]>([])
  const [loadingExtrato, setLoadingExtrato] = useState(false)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [mostrarInativas, setMostrarInativas] = useState(false)

  // Formulário
  const [formData, setFormData] = useState({
    tipo: 'conta_corrente' as ContaBancaria['tipo'],
    nome: '',
    apelido: '',
    banco_codigo: '',
    banco_nome: '',
    agencia: '',
    numero_conta: '',
    saldo_inicial: '',
    observacoes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    total_contas: 0,
    saldo_total: 0,
    contas_positivas: 0,
    contas_negativas: 0,
  })

  useEffect(() => {
    fetchContas()
  }, [filtroTipo, mostrarInativas])

  async function fetchContas() {
    try {
      setLoading(true)

      let query = supabase
        .from('contas_bancarias')
        .select('*')
        .order('saldo_atual', { ascending: false })

      if (!mostrarInativas) {
        query = query.eq('ativa', true)
      }

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }

      const { data, error } = await query

      if (error) throw error

      const contasData = (data as ContaBancaria[]) || []
      setContas(contasData)

      // Calcular stats
      const saldoTotal = contasData
        .filter((c) => c.ativa)
        .reduce((acc, c) => acc + c.saldo_atual, 0)
      const positivas = contasData.filter((c) => c.ativa && c.saldo_atual > 0).length
      const negativas = contasData.filter((c) => c.ativa && c.saldo_atual < 0).length

      setStats({
        total_contas: contasData.filter((c) => c.ativa).length,
        saldo_total: saldoTotal,
        contas_positivas: positivas,
        contas_negativas: negativas,
      })
    } catch (error) {
      console.error('Erro ao buscar contas:', error)
      toast.error('Erro ao carregar contas bancárias')
    } finally {
      setLoading(false)
    }
  }

  async function fetchExtrato(contaId: string) {
    try {
      setLoadingExtrato(true)

      const { data, error } = await supabase
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
        .eq('conta_bancaria_id', contaId)
        .order('data_lancamento', { ascending: false })
        .limit(20)

      if (error) throw error

      setExtrato((data as any) || [])
    } catch (error) {
      console.error('Erro ao buscar extrato:', error)
      toast.error('Erro ao carregar extrato')
    } finally {
      setLoadingExtrato(false)
    }
  }

  async function handleCreateConta() {
    try {
      if (!formData.nome.trim()) {
        toast.error('Nome da conta é obrigatório')
        return
      }

      setSubmitting(true)

      const { data, error } = await supabase
        .from('contas_bancarias')
        .insert([
          {
            tipo: formData.tipo,
            nome: formData.nome,
            apelido: formData.apelido || null,
            banco_codigo: formData.banco_codigo || null,
            banco_nome: formData.banco_nome || null,
            agencia: formData.agencia || null,
            numero_conta: formData.numero_conta || null,
            saldo_inicial: parseFloat(formData.saldo_inicial) || 0,
            saldo_atual: parseFloat(formData.saldo_inicial) || 0,
            observacoes: formData.observacoes || null,
            ativa: true,
          },
        ])
        .select()

      if (error) throw error

      toast.success('Conta bancária criada com sucesso!')
      setCreateModalOpen(false)
      resetForm()
      fetchContas()
    } catch (error: any) {
      console.error('Erro ao criar conta:', error)
      toast.error(error.message || 'Erro ao criar conta bancária')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditConta() {
    try {
      if (!selectedConta) return
      if (!formData.nome.trim()) {
        toast.error('Nome da conta é obrigatório')
        return
      }

      setSubmitting(true)

      const { error } = await supabase
        .from('contas_bancarias')
        .update({
          nome: formData.nome,
          apelido: formData.apelido || null,
          banco_codigo: formData.banco_codigo || null,
          banco_nome: formData.banco_nome || null,
          agencia: formData.agencia || null,
          numero_conta: formData.numero_conta || null,
          observacoes: formData.observacoes || null,
        })
        .eq('id', selectedConta.id)

      if (error) throw error

      toast.success('Conta bancária atualizada!')
      setEditModalOpen(false)
      setSelectedConta(null)
      resetForm()
      fetchContas()
    } catch (error: any) {
      console.error('Erro ao editar conta:', error)
      toast.error(error.message || 'Erro ao editar conta bancária')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArchiveConta() {
    try {
      if (!contaToArchive) return

      const conta = contas.find((c) => c.id === contaToArchive)
      if (!conta) return

      setSubmitting(true)

      const { error } = await supabase
        .from('contas_bancarias')
        .update({ ativa: !conta.ativa })
        .eq('id', contaToArchive)

      if (error) throw error

      toast.success(conta.ativa ? 'Conta desativada!' : 'Conta reativada!')
      setArchiveDialogOpen(false)
      setContaToArchive(null)
      fetchContas()
    } catch (error: any) {
      console.error('Erro ao arquivar conta:', error)
      toast.error(error.message || 'Erro ao alterar status da conta')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormData({
      tipo: 'conta_corrente',
      nome: '',
      apelido: '',
      banco_codigo: '',
      banco_nome: '',
      agencia: '',
      numero_conta: '',
      saldo_inicial: '',
      observacoes: '',
    })
  }

  function handleContaClick(conta: ContaBancaria) {
    setSelectedConta(conta)
    fetchExtrato(conta.id)
    setExtratoModalOpen(true)
  }

  function handleEditClick(conta: ContaBancaria) {
    setSelectedConta(conta)
    setFormData({
      tipo: conta.tipo,
      nome: conta.nome,
      apelido: conta.apelido || '',
      banco_codigo: conta.banco_codigo || '',
      banco_nome: conta.banco_nome || '',
      agencia: conta.agencia || '',
      numero_conta: conta.numero_conta || '',
      saldo_inicial: conta.saldo_inicial.toString(),
      observacoes: conta.observacoes || '',
    })
    setEditModalOpen(true)
  }

  function handleArchiveClick(contaId: string) {
    setContaToArchive(contaId)
    setArchiveDialogOpen(true)
  }

  const tipoLabels: Record<string, string> = {
    conta_corrente: 'Conta Corrente',
    poupanca: 'Poupança',
    caixa: 'Caixa',
    carteira_digital: 'Carteira Digital',
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Bancos e Caixas"
          description="Gestão de contas bancárias, caixas e extratos"
          actions={
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          }
        />

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Contas
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.total_contas}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Contas ativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.saldo_total >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {loading ? '...' : formatarMoeda(stats.saldo_total)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Todas as contas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Positivo
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : stats.contas_positivas}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Contas no azul</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Negativo
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loading ? '...' : stats.contas_negativas}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Contas no vermelho</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Tipo de Conta</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="carteira_digital">Carteira Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant={mostrarInativas ? 'default' : 'outline'}
                  onClick={() => setMostrarInativas(!mostrarInativas)}
                >
                  {mostrarInativas ? 'Ocultar' : 'Mostrar'} Inativas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Contas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {loading
                ? 'Carregando...'
                : `${contas.length} conta${contas.length !== 1 ? 's' : ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : contas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">Nenhuma conta cadastrada</p>
                <p className="text-sm mb-4">
                  Crie sua primeira conta bancária para começar
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Conta
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {contas.map((conta) => (
                  <ContaBancariaCard
                    key={conta.id}
                    conta={conta}
                    onClick={() => handleContaClick(conta)}
                    onEdit={() => handleEditClick(conta)}
                    onArchive={() => handleArchiveClick(conta.id)}
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
              <DialogTitle>Nova Conta Bancária</DialogTitle>
              <DialogDescription>
                Cadastre uma nova conta bancária, caixa ou carteira digital
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Tipo */}
              <div>
                <Label htmlFor="tipo">Tipo de Conta *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="carteira_digital">Carteira Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nome e Apelido */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="nome">Nome da Conta *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Banco do Brasil - Empresarial"
                  />
                </div>
                <div>
                  <Label htmlFor="apelido">Apelido</Label>
                  <Input
                    id="apelido"
                    value={formData.apelido}
                    onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                    placeholder="Ex: BB Principal"
                  />
                </div>
              </div>

              {/* Dados do Banco */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="banco_codigo">Código do Banco</Label>
                  <Input
                    id="banco_codigo"
                    value={formData.banco_codigo}
                    onChange={(e) => setFormData({ ...formData, banco_codigo: e.target.value })}
                    placeholder="Ex: 001"
                  />
                </div>
                <div>
                  <Label htmlFor="banco_nome">Nome do Banco</Label>
                  <Input
                    id="banco_nome"
                    value={formData.banco_nome}
                    onChange={(e) => setFormData({ ...formData, banco_nome: e.target.value })}
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>
              </div>

              {/* Agência e Conta */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="Ex: 1234-5"
                  />
                </div>
                <div>
                  <Label htmlFor="numero_conta">Número da Conta</Label>
                  <Input
                    id="numero_conta"
                    value={formData.numero_conta}
                    onChange={(e) => setFormData({ ...formData, numero_conta: e.target.value })}
                    placeholder="Ex: 12345-6"
                  />
                </div>
              </div>

              {/* Saldo Inicial */}
              <div>
                <Label htmlFor="saldo_inicial">Saldo Inicial</Label>
                <Input
                  id="saldo_inicial"
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData({ ...formData, saldo_inicial: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
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
              <Button onClick={handleCreateConta} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Conta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Conta Bancária</DialogTitle>
              <DialogDescription>Alterar dados da conta bancária</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Mesmo formulário da criação, mas sem saldo inicial */}
              <div>
                <Label htmlFor="edit_tipo">Tipo de Conta *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conta_corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="carteira_digital">Carteira Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit_nome">Nome da Conta *</Label>
                  <Input
                    id="edit_nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_apelido">Apelido</Label>
                  <Input
                    id="edit_apelido"
                    value={formData.apelido}
                    onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit_banco_codigo">Código do Banco</Label>
                  <Input
                    id="edit_banco_codigo"
                    value={formData.banco_codigo}
                    onChange={(e) => setFormData({ ...formData, banco_codigo: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_banco_nome">Nome do Banco</Label>
                  <Input
                    id="edit_banco_nome"
                    value={formData.banco_nome}
                    onChange={(e) => setFormData({ ...formData, banco_nome: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="edit_agencia">Agência</Label>
                  <Input
                    id="edit_agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_numero_conta">Número da Conta</Label>
                  <Input
                    id="edit_numero_conta"
                    value={formData.numero_conta}
                    onChange={(e) => setFormData({ ...formData, numero_conta: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_observacoes">Observações</Label>
                <Textarea
                  id="edit_observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button onClick={handleEditConta} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Extrato */}
        <Dialog open={extratoModalOpen} onOpenChange={setExtratoModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                Extrato - {selectedConta?.apelido || selectedConta?.nome}
              </DialogTitle>
              <DialogDescription>
                Últimos 20 lançamentos desta conta
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Saldo Atual */}
              {selectedConta && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Saldo Atual</p>
                        <p
                          className={`text-3xl font-bold ${
                            selectedConta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatarMoeda(selectedConta.saldo_atual)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                        <p className="text-lg font-medium">
                          {formatarMoeda(selectedConta.saldo_inicial)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de Lançamentos */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loadingExtrato ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : extrato.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum lançamento nesta conta</p>
                  </div>
                ) : (
                  extrato.map((lancamento) => (
                    <LancamentoCard key={lancamento.id} lancamento={lancamento} />
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Arquivar */}
        <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {contas.find((c) => c.id === contaToArchive)?.ativa
                  ? 'Desativar conta?'
                  : 'Reativar conta?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {contas.find((c) => c.id === contaToArchive)?.ativa
                  ? 'A conta será ocultada das visualizações principais, mas os lançamentos serão mantidos.'
                  : 'A conta voltará a aparecer nas visualizações principais.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveConta} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  )
}
