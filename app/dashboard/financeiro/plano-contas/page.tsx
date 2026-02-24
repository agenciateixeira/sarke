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
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, List, ChevronRight, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { PlanoContas, PlanoContasComFilhos } from '@/types/erp'

export default function PlanoContasPage() {
  const [contas, setContas] = useState<PlanoContasComFilhos[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [contaEditando, setContaEditando] = useState<PlanoContas | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    tipo: 'despesa',
    natureza: 'debito',
    pai_id: '',
    aceita_lancamento: true,
    ativa: true,
  })

  useEffect(() => {
    fetchContas()
  }, [])

  async function fetchContas() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('plano_contas')
        .select('*')
        .order('codigo')

      if (error) throw error

      // Construir árvore hierárquica
      const arvore = construirArvore(data || [])
      setContas(arvore)
    } catch (error) {
      console.error('Erro ao buscar plano de contas:', error)
      toast.error('Erro ao carregar plano de contas')
    } finally {
      setLoading(false)
    }
  }

  function construirArvore(contas: PlanoContas[]): PlanoContasComFilhos[] {
    const map = new Map<string, PlanoContasComFilhos>()
    const raizes: PlanoContasComFilhos[] = []

    // Criar mapa de todas as contas
    contas.forEach((conta) => {
      map.set(conta.id, { ...conta, filhos: [] })
    })

    // Construir relacionamentos pai-filho
    contas.forEach((conta) => {
      const node = map.get(conta.id)!
      if (conta.pai_id && map.has(conta.pai_id)) {
        const pai = map.get(conta.pai_id)!
        if (!pai.filhos) pai.filhos = []
        pai.filhos.push(node)
      } else {
        raizes.push(node)
      }
    })

    return raizes
  }

  function toggleNode(id: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function abrirModal(conta?: PlanoContas, pai?: PlanoContas) {
    if (conta) {
      setContaEditando(conta)
      setFormData({
        codigo: conta.codigo,
        nome: conta.nome,
        descricao: conta.descricao || '',
        tipo: conta.tipo,
        natureza: conta.natureza,
        pai_id: conta.pai_id || '',
        aceita_lancamento: conta.aceita_lancamento,
        ativa: conta.ativa,
      })
    } else {
      setContaEditando(null)

      // Se está criando subconta, gerar código sugerido
      let codigoSugerido = ''
      if (pai) {
        codigoSugerido = pai.codigo + '.1'
      } else {
        codigoSugerido = '1'
      }

      setFormData({
        codigo: codigoSugerido,
        nome: '',
        descricao: '',
        tipo: pai?.tipo || 'despesa',
        natureza: pai?.natureza || 'debito',
        pai_id: pai?.id || '',
        aceita_lancamento: true,
        ativa: true,
      })
    }
    setModalAberto(true)
  }

  async function salvarConta() {
    try {
      if (!formData.codigo || !formData.nome) {
        toast.error('Preencha código e nome')
        return
      }

      const nivel = formData.codigo.split('.').length

      const dados = {
        codigo: formData.codigo,
        nivel,
        nome: formData.nome,
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        natureza: formData.natureza,
        pai_id: formData.pai_id || null,
        aceita_lancamento: formData.aceita_lancamento,
        ativa: formData.ativa,
      }

      if (contaEditando) {
        const { error } = await supabase
          .from('plano_contas')
          .update(dados)
          .eq('id', contaEditando.id)

        if (error) throw error
        toast.success('Conta atualizada com sucesso!')
      } else {
        const { error } = await supabase.from('plano_contas').insert(dados)

        if (error) throw error
        toast.success('Conta criada com sucesso!')
      }

      setModalAberto(false)
      fetchContas()
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error)
      toast.error(error.message || 'Erro ao salvar conta')
    }
  }

  async function excluirConta(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return

    try {
      const { error } = await supabase.from('plano_contas').delete().eq('id', id)

      if (error) throw error
      toast.success('Conta excluída')
      fetchContas()
    } catch (error: any) {
      console.error('Erro ao excluir conta:', error)
      toast.error(error.message || 'Erro ao excluir conta. Pode ter lançamentos vinculados.')
    }
  }

  function renderConta(conta: PlanoContasComFilhos, nivel: number = 0) {
    const isExpanded = expandedNodes.has(conta.id)
    const hasFilhos = conta.filhos && conta.filhos.length > 0

    return (
      <div key={conta.id}>
        <div
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          style={{ marginLeft: `${nivel * 24}px` }}
        >
          <div className="flex-1 flex items-center gap-3">
            {hasFilhos ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => toggleNode(conta.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {conta.codigo}
                </Badge>
                <span className="font-medium">{conta.nome}</span>
                {!conta.aceita_lancamento && (
                  <Badge variant="secondary" className="text-xs">
                    Sintética
                  </Badge>
                )}
                {!conta.ativa && (
                  <Badge variant="destructive" className="text-xs">
                    Inativa
                  </Badge>
                )}
              </div>
              {conta.descricao && (
                <p className="text-xs text-muted-foreground">{conta.descricao}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={
                    conta.tipo === 'receita'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : conta.tipo === 'despesa'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  }
                >
                  {conta.tipo}
                </Badge>
                <Badge variant="outline">Natureza: {conta.natureza}</Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => abrirModal(undefined, conta)}>
              <Plus className="h-3 w-3 mr-1" />
              Subconta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => abrirModal(conta)}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => excluirConta(conta.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {isExpanded && hasFilhos && (
          <div className="mt-1 space-y-1">
            {conta.filhos!.map((filho) => renderConta(filho, nivel + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Plano de Contas"
          description="Configure a estrutura contábil da sua empresa"
          actions={
            <Button onClick={() => abrirModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          }
        />

        {/* Cards Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Contas
              </CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contas.reduce((acc, c) => acc + 1 + (c.filhos?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {contas.filter((c) => c.tipo === 'receita').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {contas.filter((c) => c.tipo === 'despesa').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Patrimônio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {contas.filter((c) => c.tipo === 'ativo' || c.tipo === 'passivo' || c.tipo === 'patrimonio').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Árvore de Contas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estrutura Contábil</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : contas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conta cadastrada</p>
                <Button className="mt-4" onClick={() => abrirModal()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Conta
                </Button>
              </div>
            ) : (
              <div className="space-y-1">{contas.map((conta) => renderConta(conta))}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {contaEditando ? 'Editar Conta' : 'Nova Conta Contábil'}
            </DialogTitle>
            <DialogDescription>
              Configure a conta seguindo o padrão contábil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código *</Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ex: 1.1.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use pontos para hierarquia (1.1, 1.1.1, etc)
                </p>
              </div>
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Caixa Geral"
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional da conta"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="passivo">Passivo</SelectItem>
                    <SelectItem value="patrimonio">Patrimônio Líquido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Natureza *</Label>
                <Select
                  value={formData.natureza}
                  onValueChange={(value) => setFormData({ ...formData, natureza: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.aceita_lancamento}
                onCheckedChange={(aceita_lancamento) =>
                  setFormData({ ...formData, aceita_lancamento })
                }
              />
              <Label>Aceita lançamentos (conta analítica)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.ativa}
                onCheckedChange={(ativa) => setFormData({ ...formData, ativa })}
              />
              <Label>Conta ativa</Label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarConta} disabled={!formData.codigo || !formData.nome}>
                {contaEditando ? 'Atualizar' : 'Criar'} Conta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
