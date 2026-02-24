'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { CreditCard, Plus, Edit, Trash2, Upload, TrendingDown, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { CartaoCreditoCard } from '@/components/erp/CartaoCreditoCard'
import {
  type CartaoCredito,
  type CartaoBandeira,
  BANDEIRA_LABELS,
  calcularLimiteDisponivel,
  formatarMoeda,
} from '@/types/erp'

export default function CartoesPage() {
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [cartaoEditando, setCartaoEditando] = useState<CartaoCredito | null>(null)
  const [alertExcluirAberto, setAlertExcluirAberto] = useState(false)
  const [cartaoParaExcluir, setCartaoParaExcluir] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    bandeira: 'Visa' as CartaoBandeira,
    ultimos_digitos: '',
    limite_total: 0,
    dia_vencimento: 10,
    dia_fechamento: 5,
    portador: '',
    observacoes: '',
  })

  useEffect(() => {
    carregarCartoes()
  }, [])

  async function carregarCartoes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cartoes_credito')
        .select('*')
        .order('nome')

      if (error) throw error
      setCartoes(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar cartões:', error)
      toast.error('Erro ao carregar cartões')
    } finally {
      setLoading(false)
    }
  }

  function abrirModalNovo() {
    setCartaoEditando(null)
    setFormData({
      nome: '',
      bandeira: 'Visa',
      ultimos_digitos: '',
      limite_total: 0,
      dia_vencimento: 10,
      dia_fechamento: 5,
      portador: '',
      observacoes: '',
    })
    setModalAberto(true)
  }

  function abrirModalEditar(cartao: CartaoCredito) {
    setCartaoEditando(cartao)
    setFormData({
      nome: cartao.nome,
      bandeira: (cartao.bandeira || 'Visa') as CartaoBandeira,
      ultimos_digitos: cartao.ultimos_digitos || '',
      limite_total: cartao.limite_total,
      dia_vencimento: cartao.dia_vencimento,
      dia_fechamento: cartao.dia_fechamento,
      portador: cartao.portador || '',
      observacoes: cartao.observacoes || '',
    })
    setModalAberto(true)
  }

  async function salvarCartao() {
    try {
      if (!formData.nome || formData.limite_total <= 0) {
        toast.error('Preencha nome e limite total')
        return
      }

      if (cartaoEditando) {
        // Atualizar
        const { error } = await supabase
          .from('cartoes_credito')
          .update({
            nome: formData.nome,
            bandeira: formData.bandeira,
            ultimos_digitos: formData.ultimos_digitos || null,
            limite_total: formData.limite_total,
            dia_vencimento: formData.dia_vencimento,
            dia_fechamento: formData.dia_fechamento,
            portador: formData.portador || null,
            observacoes: formData.observacoes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cartaoEditando.id)

        if (error) throw error
        toast.success('Cartão atualizado com sucesso!')
      } else {
        // Criar
        const { error } = await supabase.from('cartoes_credito').insert({
          nome: formData.nome,
          bandeira: formData.bandeira,
          ultimos_digitos: formData.ultimos_digitos || null,
          limite_total: formData.limite_total,
          limite_disponivel: formData.limite_total, // Inicia com limite total
          dia_vencimento: formData.dia_vencimento,
          dia_fechamento: formData.dia_fechamento,
          portador: formData.portador || null,
          observacoes: formData.observacoes || null,
          ativo: true,
        })

        if (error) throw error
        toast.success('Cartão cadastrado com sucesso!')
      }

      setModalAberto(false)
      carregarCartoes()
    } catch (error: any) {
      console.error('Erro ao salvar cartão:', error)
      toast.error(error.message || 'Erro ao salvar cartão')
    }
  }

  function abrirAlertExcluir(id: string) {
    setCartaoParaExcluir(id)
    setAlertExcluirAberto(true)
  }

  async function confirmarExclusao() {
    if (!cartaoParaExcluir) return

    try {
      const { error } = await supabase.from('cartoes_credito').delete().eq('id', cartaoParaExcluir)

      if (error) throw error
      toast.success('Cartão excluído com sucesso!')
      carregarCartoes()
    } catch (error: any) {
      console.error('Erro ao excluir cartão:', error)
      toast.error(error.message || 'Erro ao excluir cartão')
    } finally {
      setAlertExcluirAberto(false)
      setCartaoParaExcluir(null)
    }
  }

  async function toggleAtivo(cartao: CartaoCredito) {
    try {
      const { error } = await supabase
        .from('cartoes_credito')
        .update({
          ativo: !cartao.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cartao.id)

      if (error) throw error
      toast.success(cartao.ativo ? 'Cartão desativado' : 'Cartão ativado')
      carregarCartoes()
    } catch (error: any) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status')
    }
  }

  function getLimiteColor(percentual: number): string {
    if (percentual >= 50) return 'text-green-600'
    if (percentual >= 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Cartões de Crédito"
          description="Gerencie os cartões de crédito da empresa"
        />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Cartões</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cartoes.length}</div>
              <p className="text-xs text-muted-foreground">
                {cartoes.filter((c) => c.ativo).length} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Limite Total</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatarMoeda(cartoes.reduce((sum, c) => sum + c.limite_total, 0))}
              </div>
              <p className="text-xs text-muted-foreground">Todos os cartões</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Limite Disponível</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatarMoeda(cartoes.reduce((sum, c) => sum + c.limite_disponivel, 0))}
              </div>
              <p className="text-xs text-muted-foreground">Para usar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilizado</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatarMoeda(
                  cartoes.reduce((sum, c) => sum + (c.limite_total - c.limite_disponivel), 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Em faturas pendentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={abrirModalNovo}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cartão
          </Button>
          <Link href="/dashboard/financeiro/cartoes/importar-fatura">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar Fatura
            </Button>
          </Link>
        </div>

        {/* Lista de Cartões */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Cartões Cadastrados</h3>
            <Link href="/dashboard/financeiro/cartoes/analise">
              <Button variant="outline" size="sm">
                Ver Análise de Gastos
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : cartoes.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Nenhum cartão cadastrado</p>
                  <p className="text-sm mt-2">Cadastre seu primeiro cartão de crédito</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cartoes.map((cartao) => {
                const percentualDisponivel = calcularLimiteDisponivel(cartao)
                return (
                  <div key={cartao.id} className="relative group">
                    <CartaoCreditoCard cartao={cartao} onClick={() => abrirModalEditar(cartao)} />

                    {/* Action buttons */}
                    <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirModalEditar(cartao)
                        }}
                        className="h-8 w-8 p-0 shadow-lg"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirAlertExcluir(cartao.id)
                        }}
                        className="h-8 w-8 p-0 shadow-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Info card below */}
                    <Card className="mt-4">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">Limite Total</div>
                            <div className="font-semibold">{formatarMoeda(cartao.limite_total)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Disponível</div>
                            <div className={`font-semibold ${getLimiteColor(percentualDisponivel)}`}>
                              {formatarMoeda(cartao.limite_disponivel)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">% Disponível</div>
                            <div className={`font-semibold ${getLimiteColor(percentualDisponivel)}`}>
                              {percentualDisponivel.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Vencimento</div>
                            <div className="font-semibold">Dia {cartao.dia_vencimento}</div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <Badge
                            variant={cartao.ativo ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => toggleAtivo(cartao)}
                          >
                            {cartao.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>

                          <div className="text-xs text-muted-foreground">
                            Fechamento: dia {cartao.dia_fechamento}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Criar/Editar */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {cartaoEditando ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
              </DialogTitle>
              <DialogDescription>
                {cartaoEditando
                  ? 'Atualize as informações do cartão'
                  : 'Cadastre um novo cartão de crédito'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Cartão *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Nubank Corporativo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bandeira">Bandeira</Label>
                  <Select
                    value={formData.bandeira}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bandeira: value as CartaoBandeira })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BANDEIRA_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ultimos_digitos">Últimos 4 dígitos</Label>
                  <Input
                    id="ultimos_digitos"
                    placeholder="1234"
                    maxLength={4}
                    value={formData.ultimos_digitos}
                    onChange={(e) =>
                      setFormData({ ...formData, ultimos_digitos: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limite">Limite Total *</Label>
                <Input
                  id="limite"
                  type="number"
                  step="0.01"
                  placeholder="10000.00"
                  value={formData.limite_total}
                  onChange={(e) =>
                    setFormData({ ...formData, limite_total: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dia_fechamento">Dia Fechamento</Label>
                  <Input
                    id="dia_fechamento"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_fechamento}
                    onChange={(e) =>
                      setFormData({ ...formData, dia_fechamento: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dia_vencimento">Dia Vencimento</Label>
                  <Input
                    id="dia_vencimento"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_vencimento}
                    onChange={(e) =>
                      setFormData({ ...formData, dia_vencimento: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="portador">Portador / Responsável</Label>
                <Input
                  id="portador"
                  placeholder="Nome do colaborador"
                  value={formData.portador}
                  onChange={(e) => setFormData({ ...formData, portador: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  placeholder="Notas adicionais"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarCartao}>
                {cartaoEditando ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Excluir */}
        <AlertDialog open={alertExcluirAberto} onOpenChange={setAlertExcluirAberto}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir cartão de crédito?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O cartão será excluído permanentemente do sistema,
                mas as faturas e compras já registradas serão mantidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmarExclusao} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  )
}
