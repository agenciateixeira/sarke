'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  AlertCircle,
  Clock,
  CreditCard,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ContaBancariaCard } from '@/components/erp/ContaBancariaCard'
import { LancamentoCard } from '@/components/erp/LancamentoCard'
import { formatarMoeda } from '@/types/erp'
import type { ContaBancaria, LancamentoComRelacoes, CartaoCredito, FaturaCartao } from '@/types/erp'
import Link from 'next/link'

interface DashboardStats {
  receita_mes: number
  despesa_mes: number
  saldo_liquido: number
  contas_receber: number
  contas_pagar: number
  lancamentos_atrasados: number
  vencimentos_proximos: number
  variacao_receita_percentual: number
  variacao_despesa_percentual: number
  gastos_cartoes_mes: number
  faturas_cartao_pendentes: number
}

export default function FinanceiroPage() {
  const [stats, setStats] = useState<DashboardStats>({
    receita_mes: 0,
    despesa_mes: 0,
    saldo_liquido: 0,
    contas_receber: 0,
    contas_pagar: 0,
    lancamentos_atrasados: 0,
    vencimentos_proximos: 0,
    variacao_receita_percentual: 0,
    variacao_despesa_percentual: 0,
    gastos_cartoes_mes: 0,
    faturas_cartao_pendentes: 0,
  })
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([])
  const [lancamentosRecentes, setLancamentosRecentes] = useState<LancamentoComRelacoes[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const hoje = new Date().toISOString().split('T')[0]
      const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0]

      // Buscar resumo do mês
      const { data: resumo } = await supabase.rpc('resumo_mes', {
        p_mes: new Date().getMonth() + 1,
        p_ano: new Date().getFullYear(),
      })

      // Buscar contas bancárias
      const { data: contasData } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('ativa', true)
        .order('saldo_atual', { ascending: false })

      // Buscar lançamentos recentes
      const { data: lancamentosData } = await supabase
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
        .limit(8)

      // Contas a receber (status pendente ou parcial, tipo receita)
      const { data: contasReceber, count: countReceber } = await supabase
        .from('lancamentos')
        .select('valor_total, valor_pago', { count: 'exact' })
        .eq('tipo', 'receita')
        .in('status', ['pendente', 'parcial'])

      // Contas a pagar (status pendente ou parcial, tipo despesa)
      const { data: contasPagar, count: countPagar } = await supabase
        .from('lancamentos')
        .select('valor_total, valor_pago', { count: 'exact' })
        .eq('tipo', 'despesa')
        .in('status', ['pendente', 'parcial'])

      // Lançamentos atrasados
      const { count: atrasados } = await supabase
        .from('lancamentos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'atrasado')

      // Vencimentos próximos (7 dias)
      const proximosDias = new Date()
      proximosDias.setDate(proximosDias.getDate() + 7)
      const { count: proximos } = await supabase
        .from('lancamentos')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pendente', 'parcial'])
        .gte('data_vencimento', hoje)
        .lte('data_vencimento', proximosDias.toISOString().split('T')[0])

      // Calcular totais de contas a receber/pagar
      const totalReceber = contasReceber?.reduce(
        (acc, l) => acc + (l.valor_total - l.valor_pago),
        0
      ) || 0
      const totalPagar = contasPagar?.reduce(
        (acc, l) => acc + (l.valor_total - l.valor_pago),
        0
      ) || 0

      // Buscar cartões de crédito ativos
      const { data: cartoesData } = await supabase
        .from('cartoes_credito')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      // Buscar faturas do mês atual
      const mesAtual = new Date().getMonth() + 1
      const anoAtual = new Date().getFullYear()

      const { data: faturasMes } = await supabase
        .from('faturas_cartao')
        .select('valor_total')
        .eq('mes_referencia', mesAtual)
        .eq('ano_referencia', anoAtual)

      // Buscar faturas pendentes
      const { data: faturasPendentes } = await supabase
        .from('faturas_cartao')
        .select('valor_total, valor_pago')
        .in('status', ['pendente', 'parcial'])

      const totalGastosCartoesMes = faturasMes?.reduce((acc, f) => acc + f.valor_total, 0) || 0
      const totalFaturasPendentes = faturasPendentes?.reduce(
        (acc, f) => acc + (f.valor_total - (f.valor_pago || 0)),
        0
      ) || 0

      setStats({
        receita_mes: resumo?.[0]?.receita_total || 0,
        despesa_mes: resumo?.[0]?.despesa_total || 0,
        saldo_liquido: resumo?.[0]?.saldo_liquido || 0,
        contas_receber: totalReceber,
        contas_pagar: totalPagar,
        lancamentos_atrasados: atrasados || 0,
        vencimentos_proximos: proximos || 0,
        variacao_receita_percentual: 0, // TODO: calcular variação mês anterior
        variacao_despesa_percentual: 0, // TODO: calcular variação mês anterior
        gastos_cartoes_mes: totalGastosCartoesMes,
        faturas_cartao_pendentes: totalFaturasPendentes,
      })

      setContas((contasData as ContaBancaria[]) || [])
      setCartoes((cartoesData as CartaoCredito[]) || [])
      setLancamentosRecentes((lancamentosData as any) || [])
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const alertas = [
    stats.lancamentos_atrasados > 0 && {
      icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      msg: `${stats.lancamentos_atrasados} lançamento${stats.lancamentos_atrasados > 1 ? 's' : ''} atrasado${stats.lancamentos_atrasados > 1 ? 's' : ''}`,
      href: '/dashboard/financeiro/lancamentos',
      color: 'text-red-600',
    },
    stats.vencimentos_proximos > 0 && {
      icon: <Clock className="h-4 w-4 text-orange-500" />,
      msg: `${stats.vencimentos_proximos} vencimento${stats.vencimentos_proximos > 1 ? 's' : ''} nos próximos 7 dias`,
      href: '/dashboard/financeiro/lancamentos',
      color: 'text-orange-600',
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; msg: string; href: string; color: string }>

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Financeiro - ERP"
          description="Gestão financeira completa, receitas, despesas e fluxo de caixa"
          actions={
            <Link href="/dashboard/financeiro/lancamentos">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </Link>
          }
        />

        {/* Alertas */}
        {!loading && alertas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {alertas.map((alerta, i) => (
              <Link key={i} href={alerta.href}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors text-xs font-medium cursor-pointer">
                  {alerta.icon}
                  <span className={alerta.color}>{alerta.msg}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Link href="/dashboard/financeiro/lancamentos?tipo=receita">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita do Mês
                </CardTitle>
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? '...' : formatarMoeda(stats.receita_mes)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  Ver lançamentos <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/financeiro/lancamentos?tipo=despesa">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesa do Mês
                </CardTitle>
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {loading ? '...' : formatarMoeda(stats.despesa_mes)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  Ver lançamentos <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Líquido
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
                <Wallet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.saldo_liquido >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {loading ? '...' : formatarMoeda(stats.saldo_liquido)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Resultado do mês</p>
            </CardContent>
          </Card>

          <Link href="/dashboard/financeiro/contas-receber">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Contas a Receber
                </CardTitle>
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : formatarMoeda(stats.contas_receber)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  Ver detalhes <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Cards de Cartões de Crédito */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/financeiro/cartoes">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gastos com Cartões (Mês)
                </CardTitle>
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600">
                  <CreditCard className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {loading ? '...' : formatarMoeda(stats.gastos_cartoes_mes)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  Ver cartões <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/financeiro/cartoes">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faturas Pendentes
                </CardTitle>
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {loading ? '...' : formatarMoeda(stats.faturas_cartao_pendentes)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  Gerenciar <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Contas Bancárias + Contas a Pagar */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Contas Bancárias */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  Contas Bancárias
                </CardTitle>
                <Link
                  href="/dashboard/financeiro/bancos"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  Ver todas <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : contas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma conta bancária cadastrada</p>
                    <Button variant="outline" size="sm" className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Conta
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {contas.slice(0, 4).map((conta) => (
                      <ContaBancariaCard key={conta.id} conta={conta} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumo Contas a Pagar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  A Receber
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {loading ? '...' : formatarMoeda(stats.contas_receber)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  A Pagar
                </div>
                <span className="text-sm font-semibold text-red-600">
                  {loading ? '...' : formatarMoeda(stats.contas_pagar)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Atrasados
                </div>
                <span
                  className={`text-sm font-semibold ${
                    stats.lancamentos_atrasados > 0 ? 'text-red-600' : 'text-muted-foreground'
                  }`}
                >
                  {loading ? '...' : stats.lancamentos_atrasados}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Vencimentos (7 dias)
                </div>
                <span className="text-sm font-semibold text-orange-600">
                  {loading ? '...' : stats.vencimentos_proximos}
                </span>
              </div>

              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Acesso rápido
                </p>
                <Link
                  href="/dashboard/financeiro/lancamentos"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1"
                >
                  <DollarSign className="h-4 w-4" /> Lançamentos
                </Link>
                <Link
                  href="/dashboard/financeiro/relatorios"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1"
                >
                  <TrendingUp className="h-4 w-4" /> Relatórios
                </Link>
                <Link
                  href="/dashboard/financeiro/bancos"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1"
                >
                  <Wallet className="h-4 w-4" /> Bancos e Caixas
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lançamentos Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Lançamentos Recentes
            </CardTitle>
            <Link
              href="/dashboard/financeiro/lancamentos"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : lancamentosRecentes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum lançamento registrado</p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lançamento
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {lancamentosRecentes.slice(0, 6).map((lancamento) => (
                  <LancamentoCard key={lancamento.id} lancamento={lancamento} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
