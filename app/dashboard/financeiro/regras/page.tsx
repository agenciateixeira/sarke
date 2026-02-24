'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Sparkles, Plus, Edit, Trash2, TrendingUp, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { RegraCateorizacao, PlanoContas, ContaBancaria } from '@/types/erp'

export default function RegrasAutomacaoPage() {
  const [regras, setRegras] = useState<RegraCateorizacao[]>([])
  const [contas, setContas] = useState<PlanoContas[]>([])
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [regraEditando, setRegraEditando] = useState<RegraCateorizacao | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    ativa: true,
    prioridade: 0,
    descricao_contem: '',
    valor_minimo: '',
    valor_maximo: '',
    tipo_transacao: 'ambos',
    conta_bancaria_id: '',
    conta_id: '',
    observacao_padrao: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)

      // Buscar regras
      const { data: regrasData } = await supabase
        .from('regras_categorizacao')
        .select('*')
        .order('prioridade', { ascending: false })

      setRegras(regrasData || [])

      // Buscar plano de contas (só folhas)
      const { data: contasData } = await supabase
        .from('plano_contas')
        .select('*')
        .eq('aceita_lancamento', true)
        .eq('ativa', true)
        .order('codigo')

      setContas(contasData || [])

      // Buscar contas bancárias
      const { data: bancariasData } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('ativa', true)
        .order('nome')

      setContasBancarias(bancariasData || [])
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(regra?: RegraCateorizacao) {
    if (regra) {
      setRegraEditando(regra)
      setFormData({
        nome: regra.nome,
        ativa: regra.ativa,
        prioridade: regra.prioridade,
        descricao_contem: regra.descricao_contem?.join(', ') || '',
        valor_minimo: regra.valor_minimo?.toString() || '',
        valor_maximo: regra.valor_maximo?.toString() || '',
        tipo_transacao: regra.tipo_transacao || 'ambos',
        conta_bancaria_id: regra.conta_bancaria_id || '',
        conta_id: regra.conta_id || '',
        observacao_padrao: regra.observacao_padrao || '',
      })
    } else {
      setRegraEditando(null)
      setFormData({
        nome: '',
        ativa: true,
        prioridade: 0,
        descricao_contem: '',
        valor_minimo: '',
        valor_maximo: '',
        tipo_transacao: 'ambos',
        conta_bancaria_id: '',
        conta_id: '',
        observacao_padrao: '',
      })
    }
    setModalAberto(true)
  }

  async function salvarRegra() {
    try {
      const palavrasChave = formData.descricao_contem
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)

      const dados = {
        nome: formData.nome,
        ativa: formData.ativa,
        prioridade: formData.prioridade,
        descricao_contem: palavrasChave.length > 0 ? palavrasChave : null,
        valor_minimo: formData.valor_minimo ? parseFloat(formData.valor_minimo) : null,
        valor_maximo: formData.valor_maximo ? parseFloat(formData.valor_maximo) : null,
        tipo_transacao: formData.tipo_transacao || null,
        conta_bancaria_id: formData.conta_bancaria_id || null,
        conta_id: formData.conta_id || null,
        observacao_padrao: formData.observacao_padrao || null,
      }

      if (regraEditando) {
        const { error } = await supabase
          .from('regras_categorizacao')
          .update(dados)
          .eq('id', regraEditando.id)

        if (error) throw error
        toast.success('Regra atualizada com sucesso!')
      } else {
        const { error } = await supabase.from('regras_categorizacao').insert(dados)

        if (error) throw error
        toast.success('Regra criada com sucesso!')
      }

      setModalAberto(false)
      fetchData()
    } catch (error: any) {
      console.error('Erro ao salvar regra:', error)
      toast.error(error.message || 'Erro ao salvar regra')
    }
  }

  async function excluirRegra(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return

    try {
      const { error } = await supabase.from('regras_categorizacao').delete().eq('id', id)

      if (error) throw error
      toast.success('Regra excluída')
      fetchData()
    } catch (error: any) {
      console.error('Erro ao excluir regra:', error)
      toast.error(error.message || 'Erro ao excluir regra')
    }
  }

  async function toggleAtiva(id: string, ativa: boolean) {
    try {
      const { error } = await supabase
        .from('regras_categorizacao')
        .update({ ativa: !ativa })
        .eq('id', id)

      if (error) throw error
      toast.success(ativa ? 'Regra desativada' : 'Regra ativada')
      fetchData()
    } catch (error: any) {
      console.error('Erro ao alterar regra:', error)
      toast.error(error.message || 'Erro ao alterar regra')
    }
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Regras de Automação"
          description="Configure regras para categorização automática de transações bancárias"
          actions={
            <Button onClick={() => abrirModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Regra
            </Button>
          }
        />

        {/* Cards Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Regras
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regras.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Regras Ativas
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {regras.filter((r) => r.ativa).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Aplicações
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {regras.reduce((sum, r) => sum + r.total_aplicacoes, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Regras */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regras Configuradas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : regras.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma regra configurada</p>
                <Button className="mt-4" onClick={() => abrirModal()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Regra
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {regras.map((regra) => (
                  <div
                    key={regra.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{regra.nome}</h4>
                          <Badge variant="outline">Prioridade: {regra.prioridade}</Badge>
                          {regra.ativa ? (
                            <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          {regra.descricao_contem && (
                            <p>
                              <span className="font-medium">Palavras-chave:</span>{' '}
                              {regra.descricao_contem.join(', ')}
                            </p>
                          )}
                          {(regra.valor_minimo || regra.valor_maximo) && (
                            <p>
                              <span className="font-medium">Valor:</span>{' '}
                              {regra.valor_minimo && `Mín: R$ ${regra.valor_minimo}`}
                              {regra.valor_minimo && regra.valor_maximo && ' | '}
                              {regra.valor_maximo && `Máx: R$ ${regra.valor_maximo}`}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Aplicações:</span>{' '}
                            {regra.total_aplicacoes || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => abrirModal(regra)}>
                        <Edit className="mr-2 h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleAtiva(regra.id, regra.ativa)}
                      >
                        {regra.ativa ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => excluirRegra(regra.id)}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {regraEditando ? 'Editar Regra' : 'Nova Regra de Automação'}
            </DialogTitle>
            <DialogDescription>
              Configure as condições e ações para categorização automática
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome da Regra</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Recebimentos de PIX"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={formData.prioridade}
                  onChange={(e) =>
                    setFormData({ ...formData, prioridade: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maior número = maior prioridade
                </p>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={formData.ativa}
                  onCheckedChange={(ativa) => setFormData({ ...formData, ativa })}
                />
                <Label>Regra ativa</Label>
              </div>
            </div>

            <div>
              <Label>Palavras-chave na descrição (separadas por vírgula)</Label>
              <Input
                value={formData.descricao_contem}
                onChange={(e) => setFormData({ ...formData, descricao_contem: e.target.value })}
                placeholder="PIX, PAGAMENTO, SALARIO"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Mínimo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_minimo}
                  onChange={(e) => setFormData({ ...formData, valor_minimo: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor Máximo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_maximo}
                  onChange={(e) => setFormData({ ...formData, valor_maximo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Transação</Label>
                <Select
                  value={formData.tipo_transacao}
                  onValueChange={(value) => setFormData({ ...formData, tipo_transacao: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambos">Ambos</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta Bancária (opcional)</Label>
                <Select
                  value={formData.conta_bancaria_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, conta_bancaria_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {contasBancarias.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Conta Contábil</Label>
              <Select
                value={formData.conta_id}
                onValueChange={(value) => setFormData({ ...formData, conta_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.codigo} - {conta.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observação Padrão (opcional)</Label>
              <Textarea
                value={formData.observacao_padrao}
                onChange={(e) => setFormData({ ...formData, observacao_padrao: e.target.value })}
                placeholder="Texto que será adicionado às observações do lançamento"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarRegra} disabled={!formData.nome || !formData.conta_id}>
                {regraEditando ? 'Atualizar' : 'Criar'} Regra
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
