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
  TrendingUp,
  AlertCircle,
  Calendar,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LancamentoCard } from '@/components/erp/LancamentoCard'
import { formatarMoeda, calcularDiasRestantes } from '@/types/erp'
import type {
  LancamentoComRelacoes,
  AgingReceber,
  ResumoContasReceber,
  TopDevedor,
} from '@/types/erp'
import Link from 'next/link'

export default function ContasReceberPage() {
  const [contasReceber, setContasReceber] = useState<LancamentoComRelacoes[]>([])
  const [aging, setAging] = useState<AgingReceber | null>(null)
  const [resumo, setResumo] = useState<ResumoContasReceber | null>(null)
  const [topDevedores, setTopDevedores] = useState<TopDevedor[]>([])
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

      // Buscar contas a receber da view
      let query = supabase.from('vw_contas_receber').select('*')

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
            cliente:clients(id, name),
            projeto:projetos(id, nome),
            obra:obras(id, nome)
          `
          )
          .in('id', ids)

        setContasReceber((lancamentos as any) || [])
      } else {
        setContasReceber([])
      }

      // Buscar aging
      const { data: agingData } = await supabase.rpc('calcular_aging_receber')
      if (agingData && agingData.length > 0) {
        setAging(agingData[0])
      }

      // Buscar resumo
      const { data: resumoData } = await supabase.rpc('resumo_contas_receber')
      if (resumoData && resumoData.length > 0) {
        setResumo(resumoData[0])
      }

      // Buscar top devedores
      const { data: devedoresData } = await supabase.rpc('top_devedores', { p_limite: 5 })
      setTopDevedores(devedoresData || [])
    } catch (error) {
      console.error('Erro ao buscar contas a receber:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Contas a Receber"
          description="Gestão de recebíveis, análise de vencimentos e inadimplência"
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
                Total a Receber
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : formatarMoeda(resumo?.total_receber || 0)}
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
              <div className="text-2xl font-bold text-red-600">
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
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
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
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatarMoeda(resumo?.ticket_medio || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Por título</p>
            </CardContent>
          </Card>
        </div>

        {/* Aging de Recebíveis */}
        {aging && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aging de Recebíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">A Vencer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <Progress
                        value={(aging.a_vencer / aging.total_receber) * 100}
                        className="h-2"
                      />
                    </div>
                    <span className="text-sm font-bold text-green-600 w-24 text-right">
                      {formatarMoeda(aging.a_vencer)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">0-30 dias</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48">
                      <Progress
                        value={(aging.vencido_0_30 / aging.total_receber) * 100}
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
                        value={(aging.vencido_31_60 / aging.total_receber) * 100}
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
                        value={(aging.vencido_61_90 / aging.total_receber) * 100}
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
                        value={(aging.vencido_91_180 / aging.total_receber) * 100}
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
                        value={(aging.vencido_acima_180 / aging.total_receber) * 100}
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
          {/* Lista de Contas a Receber */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Títulos a Receber</CardTitle>
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
                ) : contasReceber.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum título a receber</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {contasReceber.map((conta) => (
                      <LancamentoCard key={conta.id} lancamento={conta} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Devedores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Maiores Devedores</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : topDevedores.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum devedor
                </div>
              ) : (
                <div className="space-y-3">
                  {topDevedores.map((devedor, index) => (
                    <div
                      key={devedor.cliente_id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">
                              #{index + 1}
                            </span>
                            <p className="font-medium text-sm truncate">
                              {devedor.cliente_nome}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {devedor.quantidade_titulos} título
                            {devedor.quantidade_titulos > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-red-600">
                          {formatarMoeda(devedor.valor_total_em_aberto)}
                        </span>
                        {devedor.dias_medio_atraso > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {Math.round(devedor.dias_medio_atraso)} dias atraso
                          </Badge>
                        )}
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
