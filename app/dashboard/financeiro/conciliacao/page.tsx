'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Link2,
  Sparkles,
  Eye,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  formatarMoeda,
  formatarData,
  type TransacaoBancariaComRelacoes,
  type SugestaoConciliacao,
  type RegraAplicavel,
  type ContaBancaria,
  CONCILIACAO_STATUS_LABELS,
  CONCILIACAO_STATUS_COLORS,
} from '@/types/erp'

export default function ConciliacaoBancariaPage() {
  const [transacoes, setTransacoes] = useState<TransacaoBancariaComRelacoes[]>([])
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [contaSelecionada, setContaSelecionada] = useState<string>('todas')
  const [statusFiltro, setStatusFiltro] = useState<string>('pendente')

  // Modal de sugestões
  const [modalSugestoes, setModalSugestoes] = useState(false)
  const [transacaoSelecionada, setTransacaoSelecionada] =
    useState<TransacaoBancariaComRelacoes | null>(null)
  const [sugestoes, setSugestoes] = useState<SugestaoConciliacao[]>([])
  const [regrasAplicaveis, setRegrasAplicaveis] = useState<RegraAplicavel[]>([])
  const [loadingSugestoes, setLoadingSugestoes] = useState(false)

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    conciliadas: 0,
    ignoradas: 0,
    valor_pendente: 0,
  })

  useEffect(() => {
    fetchData()
  }, [contaSelecionada, statusFiltro])

  async function fetchData() {
    try {
      setLoading(true)

      // Buscar contas bancárias
      const { data: contasData } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('ativa', true)
        .order('nome')

      setContas(contasData || [])

      // Buscar transações
      let query = supabase
        .from('transacoes_bancarias')
        .select(
          `
          *,
          conta_bancaria:contas_bancarias(id, nome, banco_nome),
          lancamento:lancamentos(id, descricao, valor_total, status)
        `
        )
        .order('data_transacao', { ascending: false })

      if (contaSelecionada !== 'todas') {
        query = query.eq('conta_bancaria_id', contaSelecionada)
      }

      if (statusFiltro !== 'todos') {
        query = query.eq('status_conciliacao', statusFiltro)
      }

      const { data: transacoesData, error } = await query

      if (error) throw error

      setTransacoes((transacoesData as any) || [])

      // Calcular estatísticas
      const total = transacoesData?.length || 0
      const pendentes =
        transacoesData?.filter((t: any) => t.status_conciliacao === 'pendente').length || 0
      const conciliadas =
        transacoesData?.filter((t: any) => t.status_conciliacao === 'conciliado').length || 0
      const ignoradas =
        transacoesData?.filter((t: any) => t.status_conciliacao === 'ignorado').length || 0
      const valor_pendente = transacoesData
        ?.filter((t: any) => t.status_conciliacao === 'pendente')
        .reduce((sum: number, t: any) => sum + (t.valor || 0), 0)

      setStats({
        total,
        pendentes,
        conciliadas,
        ignoradas,
        valor_pendente: valor_pendente || 0,
      })
    } catch (error) {
      console.error('Erro ao buscar transações:', error)
      toast.error('Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }

  async function abrirSugestoes(transacao: TransacaoBancariaComRelacoes) {
    setTransacaoSelecionada(transacao)
    setModalSugestoes(true)
    setLoadingSugestoes(true)

    try {
      // Buscar sugestões de conciliação
      const { data: sugestoesData } = await supabase.rpc('sugerir_conciliacao', {
        p_transacao_id: transacao.id,
        p_limite: 10,
      })

      setSugestoes(sugestoesData || [])

      // Buscar regras aplicáveis
      const { data: regrasData } = await supabase.rpc('buscar_regras_aplicaveis', {
        p_transacao_id: transacao.id,
      })

      setRegrasAplicaveis(regrasData || [])
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error)
      toast.error('Erro ao buscar sugestões')
    } finally {
      setLoadingSugestoes(false)
    }
  }

  async function conciliarManual(transacaoId: string, lancamentoId: string) {
    try {
      const { error } = await supabase.rpc('conciliar_transacao', {
        p_transacao_id: transacaoId,
        p_lancamento_id: lancamentoId,
      })

      if (error) throw error

      toast.success('Transação conciliada com sucesso!')
      setModalSugestoes(false)
      fetchData()
    } catch (error: any) {
      console.error('Erro ao conciliar:', error)
      toast.error(error.message || 'Erro ao conciliar transação')
    }
  }

  async function aplicarRegra(transacaoId: string, regraId: string) {
    try {
      const { error } = await supabase.rpc('aplicar_regra_categorizacao', {
        p_transacao_id: transacaoId,
        p_regra_id: regraId,
      })

      if (error) throw error

      toast.success('Regra aplicada e transação conciliada automaticamente!')
      setModalSugestoes(false)
      fetchData()
    } catch (error: any) {
      console.error('Erro ao aplicar regra:', error)
      toast.error(error.message || 'Erro ao aplicar regra')
    }
  }

  async function ignorarTransacao(transacaoId: string) {
    try {
      const { error } = await supabase
        .from('transacoes_bancarias')
        .update({ status_conciliacao: 'ignorado' })
        .eq('id', transacaoId)

      if (error) throw error

      toast.success('Transação ignorada')
      setModalSugestoes(false)
      fetchData()
    } catch (error) {
      console.error('Erro ao ignorar transação:', error)
      toast.error('Erro ao ignorar transação')
    }
  }

  async function desconciliar(transacaoId: string) {
    try {
      const { error } = await supabase.rpc('desconciliar_transacao', {
        p_transacao_id: transacaoId,
      })

      if (error) throw error

      toast.success('Conciliação desfeita')
      fetchData()
    } catch (error: any) {
      console.error('Erro ao desconciliar:', error)
      toast.error(error.message || 'Erro ao desconciliar')
    }
  }

  async function conciliacaoAutomatica() {
    try {
      setLoading(true)

      const { data, error } = await supabase.rpc('processar_conciliacao_automatica', {
        p_score_minimo: 95,
      })

      if (error) throw error

      const total = data?.length || 0
      const sucesso = data?.filter((r: any) => r.resultado.includes('Conciliado')).length || 0

      toast.success(`Conciliação automática: ${sucesso}/${total} transações conciliadas`)
      fetchData()
    } catch (error: any) {
      console.error('Erro na conciliação automática:', error)
      toast.error(error.message || 'Erro na conciliação automática')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Conciliação Bancária"
          description="Concilie transações bancárias com lançamentos contábeis"
          actions={
            <Button onClick={conciliacaoAutomatica} disabled={loading}>
              <Sparkles className="mr-2 h-4 w-4" />
              Conciliação Automática
            </Button>
          }
        />

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Transações
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatarMoeda(stats.valor_pendente)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conciliadas
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.conciliadas}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0
                  ? `${((stats.conciliadas / stats.total) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ignoradas
              </CardTitle>
              <XCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.ignoradas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Conta Bancária" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as contas</SelectItem>
                    {contas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome} {conta.banco_nome && `- ${conta.banco_nome}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="conciliado">Conciliado</SelectItem>
                    <SelectItem value="ignorado">Ignorado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Transações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transações Bancárias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : transacoes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transação encontrada</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {transacoes.map((transacao) => (
                  <div
                    key={transacao.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {transacao.tipo === 'credito' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <p className="font-medium">{transacao.descricao}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatarData(transacao.data_transacao)}</span>
                          <span>•</span>
                          <span>{transacao.conta_bancaria?.nome}</span>
                          {transacao.documento && (
                            <>
                              <span>•</span>
                              <span>Doc: {transacao.documento}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            transacao.tipo === 'credito' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatarMoeda(transacao.valor)}
                        </p>
                        <Badge
                          className={
                            CONCILIACAO_STATUS_COLORS[transacao.status_conciliacao] + ' mt-1'
                          }
                        >
                          {CONCILIACAO_STATUS_LABELS[transacao.status_conciliacao]}
                        </Badge>
                      </div>
                    </div>

                    {transacao.lancamento && (
                      <div className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950 text-sm mb-3">
                        <Link2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 dark:text-green-300">
                          Conciliado com: {transacao.lancamento.descricao}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {transacao.status_conciliacao === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirSugestoes(transacao)}
                          >
                            <Eye className="mr-2 h-3 w-3" />
                            Ver Sugestões
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => ignorarTransacao(transacao.id)}
                          >
                            <XCircle className="mr-2 h-3 w-3" />
                            Ignorar
                          </Button>
                        </>
                      )}

                      {transacao.status_conciliacao === 'conciliado' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => desconciliar(transacao.id)}
                        >
                          Desconciliar
                        </Button>
                      )}

                      {transacao.status_conciliacao === 'ignorado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            supabase
                              .from('transacoes_bancarias')
                              .update({ status_conciliacao: 'pendente' })
                              .eq('id', transacao.id)
                              .then(() => fetchData())
                          }
                        >
                          Reativar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Sugestões */}
      <Dialog open={modalSugestoes} onOpenChange={setModalSugestoes}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conciliar Transação</DialogTitle>
            <DialogDescription>
              {transacaoSelecionada && (
                <>
                  <div className="mt-2 p-3 rounded-lg bg-muted">
                    <p className="font-medium">{transacaoSelecionada.descricao}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span>{formatarData(transacaoSelecionada.data_transacao)}</span>
                      <span
                        className={
                          transacaoSelecionada.tipo === 'credito'
                            ? 'text-green-600 font-bold'
                            : 'text-red-600 font-bold'
                        }
                      >
                        {formatarMoeda(transacaoSelecionada.valor)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingSugestoes ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sugestões de Conciliação */}
              {sugestoes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Sugestões de Lançamentos</h4>
                  <div className="space-y-2">
                    {sugestoes.map((sugestao) => (
                      <div
                        key={sugestao.lancamento_id}
                        className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() =>
                          transacaoSelecionada &&
                          conciliarManual(transacaoSelecionada.id, sugestao.lancamento_id)
                        }
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium">{sugestao.descricao}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {sugestao.motivo}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={sugestao.score >= 80 ? 'default' : 'secondary'}
                              className="mb-1"
                            >
                              Score: {sugestao.score}
                            </Badge>
                            <p className="text-sm font-bold">
                              {formatarMoeda(sugestao.valor_total)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regras Aplicáveis */}
              {regrasAplicaveis.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Regras de Categorização</h4>
                  <div className="space-y-2">
                    {regrasAplicaveis.map((regra) => (
                      <div
                        key={regra.regra_id}
                        className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() =>
                          transacaoSelecionada &&
                          aplicarRegra(transacaoSelecionada.id, regra.regra_id)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{regra.regra_nome}</p>
                            <p className="text-xs text-muted-foreground mt-1">{regra.motivo}</p>
                            {regra.conta_nome && (
                              <p className="text-xs text-muted-foreground">
                                Conta: {regra.conta_nome}
                              </p>
                            )}
                          </div>
                          <Badge>Prioridade: {regra.prioridade}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sugestoes.length === 0 && regrasAplicaveis.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma sugestão ou regra encontrada</p>
                  <p className="text-sm mt-2">
                    Você pode criar um lançamento manualmente ou configurar uma regra de
                    categorização
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
