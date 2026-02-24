'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  TrendingDown,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LancamentoCard } from '@/components/erp/LancamentoCard'
import { formatarMoeda, formatarData } from '@/types/erp'
import type {
  LancamentoComRelacoes,
  AgingPagar,
  ResumoContasPagar,
  ProjecaoFluxoCaixa,
} from '@/types/erp'
import Link from 'next/link'

export default function ContasPagarPage() {
  const [contasPagar, setContasPagar] = useState<LancamentoComRelacoes[]>([])
  const [aging, setAging] = useState<AgingPagar | null>(null)
  const [resumo, setResumo] = useState<ResumoContasPagar | null>(null)
  const [projecao, setProjecao] = useState<ProjecaoFluxoCaixa[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroVencimento, setFiltroVencimento] = useState<string>('todos')

  useEffect(() => {
    fetchData()
  }, [filtroStatus, filtroVencimento])

  async function fetchData() {
    try {
      setLoading(true)

      // Buscar contas a pagar da view
      let query = supabase.from('vw_contas_pagar').select('*')

      // Aplicar filtros
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      if (filtroVencimento === 'vencidas') {
        query = query.lt('dias_para_vencimento', 0)
      } else if (filtroVencimento === 'vencer_7dias') {
        query = query.gte('dias_para_vencimento', 0).lte('dias_para_vencimento', 7)
      } else if (filtroVencimento === 'vencer_30dias') {
        query = query.gte('dias_para_vencimento', 8).lte('dias_para_vencimento', 30)
      }

      const { data: contas, error } = await query

      if (error) throw error

      // Buscar detalhes completos dos lançamentos
      if (contas && contas.length > 0) {
        const ids = contas.map((c: any) => c.id)
        const { data: lancamentos } = await supabase
          .from('lancamentos')
          .select(
            `
            *,
            fornecedor:empresas_parceiras(id, nome),
            projeto:projetos(id, nome),
            obra:obras(id, nome)
          `
          )
          .in('id', ids)

        setContasPagar((lancamentos as any) || [])
      } else {
        setContasPagar([])
      }

      // Buscar aging
      const { data: agingData } = await supabase.rpc('calcular_aging_pagar')
      if (agingData && agingData.length > 0) {
        setAging(agingData[0])
      }

      // Buscar resumo
      const { data: resumoData } = await supabase.rpc('resumo_contas_pagar')
      if (resumoData && resumoData.length > 0) {
        setResumo(resumoData[0])
      }

      // Buscar projeção de fluxo (próximos 30 dias)
      const { data: projecaoData } = await supabase.rpc('projecao_fluxo_caixa', {
        p_dias_futuro: 30,
      })
      setProjecao(projecaoData || [])
    } catch (error) {
      console.error('Erro ao buscar contas a pagar:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular próximos vencimentos (7 dias)
  const proximosVencimentos = projecao
    .filter((p) => p.despesas_previstas > 0)
    .slice(0, 7)

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Contas a Pagar"
          description="Gestão de pagamentos, vencimentos e fluxo de caixa"
          actions={
            <Link href="/dashboard/financeiro/lancamentos">
              <Button>
                <DollarSign className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </Link>
          }
        />

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total a Pagar
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loading ? '...' : formatarMoeda(resumo?.total_pagar || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {resumo?.quantidade_total || 0} título{resumo?.quantidade_total !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Títulos Vencidos
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {loading ? '...' : formatarMoeda(resumo?.total_vencido || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {resumo?.quantidade_vencidas || 0} título{resumo?.quantidade_vencidas !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A Vencer
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {loading ? '...' : formatarMoeda(resumo?.total_a_vencer || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Futuro</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatarMoeda(resumo?.ticket_medio || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Por título</p>
            </CardContent>
          </Card>
        </div>

        {/* Aging de Pagáveis */}
        {aging && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aging de Pagáveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">A Vencer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <Progress
                        value={(aging.a_vencer / aging.total_pagar) * 100}
                        className="h-2 [&>div]:bg-blue-500"
                      />
                    </div>
                    <span className="text-sm font-bold text-blue-600 w-24 text-right">
                      {formatarMoeda(aging.a_vencer)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">0-30 dias</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <Progress
                        value={(aging.vencido_0_30 / aging.total_pagar) * 100}
                        className="h-2 [&>div]:bg-yellow-500"
                      />
                    </div>
                    <span className="text-sm font-bold text-yellow-600 w-24 text-right">
                      {formatarMoeda(aging.vencido_0_30)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">31-60 dias</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <Progress
                        value={(aging.vencido_31_60 / aging.total_pagar) * 100}
                        className="h-2 [&>div]:bg-orange-500"
                      />
                    </div>
                    <span className="text-sm font-bold text-orange-600 w-24 text-right">
                      {formatarMoeda(aging.vencido_31_60)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">61-90 dias</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <Progress
                        value={(aging.vencido_61_90 / aging.total_pagar) * 100}
                        className="h-2 [&>div]:bg-red-500"
                      />
                    </div>
                    <span className="text-sm font-bold text-red-600 w-24 text-right">
                      {formatarMoeda(aging.vencido_61_90)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">91-180 dias</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <Progress
                        value={(aging.vencido_91_180 / aging.total_pagar) * 100}
                        className="h-2 [&>div]:bg-red-600"
                      />
                    </div>
                    <span className="text-sm font-bold text-red-700 w-24 text-right">
                      {formatarMoeda(aging.vencido_91_180)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">&gt; 180 dias</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <Progress
                        value={(aging.vencido_acima_180 / aging.total_pagar) * 100}
                        className="h-2 [&>div]:bg-red-800"
                      />
                    </div>
                    <span className="text-sm font-bold text-red-900 w-24 text-right">
                      {formatarMoeda(aging.vencido_acima_180)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Lista de Contas a Pagar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Títulos a Pagar</CardTitle>
                <div className="flex gap-2">
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtroVencimento} onValueChange={setFiltroVencimento}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="vencidas">Vencidas</SelectItem>
                      <SelectItem value="vencer_7dias">Vence em 7 dias</SelectItem>
                      <SelectItem value="vencer_30dias">Vence em 30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : contasPagar.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum título a pagar</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {contasPagar.map((conta) => (
                      <LancamentoCard key={conta.id} lancamento={conta} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Próximos Vencimentos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Próximos Vencimentos (7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : proximosVencimentos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum vencimento próximo
                </div>
              ) : (
                <div className="space-y-3">
                  {proximosVencimentos.map((item) => (
                    <div
                      key={item.data}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {formatarData(item.data)}
                          </span>
                        </div>
                        <Badge
                          variant={
                            item.despesas_previstas > item.receitas_previstas
                              ? 'destructive'
                              : 'default'
                          }
                          className="text-xs"
                        >
                          {item.despesas_previstas > item.receitas_previstas
                            ? 'Déficit'
                            : 'Superávit'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Despesas:</span>
                        <span className="font-bold text-red-600">
                          {formatarMoeda(item.despesas_previstas)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Receitas:</span>
                        <span className="font-medium text-green-600">
                          {formatarMoeda(item.receitas_previstas)}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Saldo:</span>
                        <span
                          className={`text-sm font-bold ${
                            item.saldo_acumulado >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatarMoeda(item.saldo_acumulado)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
