'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, TrendingUp, User, ShoppingCart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatarMoeda, type GastoPorPortador } from '@/types/erp'

export default function AnaliseCartaoPage() {
  const [gastos, setGastos] = useState<GastoPorPortador[]>([])
  const [loading, setLoading] = useState(false)
  const [dataInicio, setDataInicio] = useState(() => {
    const hoje = new Date()
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return primeiroDia.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => {
    const hoje = new Date()
    return hoje.toISOString().split('T')[0]
  })

  async function gerarAnalise() {
    if (!dataInicio || !dataFim) {
      toast.error('Selecione o período')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.rpc('gastos_por_portador', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
      })

      if (error) throw error

      setGastos(data || [])

      if (!data || data.length === 0) {
        toast.info('Nenhum gasto encontrado no período')
      } else {
        toast.success(`Análise gerada! ${data.length} portadores com gastos`)
      }
    } catch (error: any) {
      console.error('Erro ao gerar análise:', error)
      toast.error(error.message || 'Erro ao gerar análise')
    } finally {
      setLoading(false)
    }
  }

  const totalGeral = gastos.reduce((sum, g) => sum + g.valor_total, 0)

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/financeiro/cartoes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <PageHeader
            title="Análise de Gastos por Portador"
            description="Visualize os gastos com cartão de crédito por colaborador"
          />
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período de Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="data-inicio">Data Início</Label>
                <Input
                  id="data-inicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="flex-1">
                <Label htmlFor="data-fim">Data Fim</Label>
                <Input
                  id="data-fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>

              <Button onClick={gerarAnalise} disabled={loading}>
                {loading ? 'Gerando...' : 'Gerar Análise'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {gastos.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(totalGeral)}</div>
                <p className="text-xs text-muted-foreground">Todos os portadores</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portadores Ativos</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{gastos.length}</div>
                <p className="text-xs text-muted-foreground">Com compras no período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Compras</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {gastos.reduce((sum, g) => sum + g.total_compras, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Todas as transações</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de Análise */}
        {gastos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Portador</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Portador</TableHead>
                    <TableHead className="text-center">Nº Compras</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Valor Médio</TableHead>
                    <TableHead className="text-center">% do Total</TableHead>
                    <TableHead>Categoria Mais Gasta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos
                    .sort((a, b) => b.valor_total - a.valor_total)
                    .map((gasto, index) => {
                      const percentual = (gasto.valor_total / totalGeral) * 100
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{gasto.portador}</TableCell>
                          <TableCell className="text-center">{gasto.total_compras}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatarMoeda(gasto.valor_total)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatarMoeda(gasto.valor_medio)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={
                                percentual >= 30
                                  ? 'text-red-600 font-semibold'
                                  : percentual >= 15
                                    ? 'text-yellow-600'
                                    : 'text-muted-foreground'
                              }
                            >
                              {percentual.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {gasto.categoria_mais_gasta || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">💡 Insights</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • Maior gasto: <strong>{gastos[0]?.portador}</strong> com{' '}
                    <strong>{formatarMoeda(gastos[0]?.valor_total)}</strong>
                  </li>
                  <li>
                    • Ticket médio geral:{' '}
                    <strong>
                      {formatarMoeda(
                        totalGeral / gastos.reduce((sum, g) => sum + g.total_compras, 0)
                      )}
                    </strong>
                  </li>
                  <li>
                    • Portadores representam mais de 30% dos gastos:{' '}
                    <strong className="text-red-600">
                      {gastos.filter((g) => (g.valor_total / totalGeral) * 100 >= 30).length}
                    </strong>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && gastos.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nenhum gasto encontrado</p>
                <p className="text-sm mt-2">Selecione um período e clique em "Gerar Análise"</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
