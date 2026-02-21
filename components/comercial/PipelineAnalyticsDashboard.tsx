'use client'

import { usePipelineAnalytics } from '@/hooks/usePipelineAnalytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp, TrendingDown, DollarSign, Target, Users, AlertCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d']

export function PipelineAnalyticsDashboard() {
  const {
    stageMetrics,
    conversionRates,
    stageDurations,
    performance,
    ownerPerformance,
    churnAnalysis,
    lostReasons,
    loading,
  } = usePipelineAnalytics()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negócios Ativos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance?.active_deals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(performance?.active_pipeline_value || 0)} em pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {performance?.win_rate_30d || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {performance?.won_deals_30d || 0} negócios ganhos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn (30d)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {performance?.churn_rate_30d || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {performance?.lost_deals_30d || 0} negócios perdidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(performance?.won_value_30d || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ticket médio: {formatCurrency(performance?.avg_won_deal_value || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funil de Conversão e Tempo por Estágio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil de Vendas */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Vendas</CardTitle>
            <CardDescription>Quantidade de deals por estágio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage_name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => [value, 'Deals']}
                  labelFormatter={(label) => `Estágio: ${label}`}
                />
                <Legend />
                <Bar dataKey="deals_count" fill="#8884d8" name="Negócios" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tempo Médio por Estágio */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo Médio por Estágio</CardTitle>
            <CardDescription>Dias que deals permanecem em cada estágio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageDurations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage_name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => [`${value} dias`, 'Média']}
                  labelFormatter={(label) => `Estágio: ${label}`}
                />
                <Legend />
                <Bar dataKey="avg_days" fill="#82ca9d" name="Dias Médios" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Conversão e Valor por Estágio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxa de Conversão por Estágio */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conversão por Estágio</CardTitle>
            <CardDescription>% de deals que avançam para próxima etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage_name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'Conversão']}
                  labelFormatter={(label) => `Estágio: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="conversion_rate"
                  stroke="#8884d8"
                  name="Taxa de Conversão (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Valor Total por Estágio */}
        <Card>
          <CardHeader>
            <CardTitle>Valor Total por Estágio</CardTitle>
            <CardDescription>Valor total de deals em cada estágio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage_name" angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), 'Valor']}
                  labelFormatter={(label) => `Estágio: ${label}`}
                />
                <Legend />
                <Bar dataKey="total_value" fill="#0088FE" name="Valor Total" />
                <Bar dataKey="weighted_value" fill="#00C49F" name="Valor Ponderado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance por Responsável */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Responsável</CardTitle>
          <CardDescription>Top performers dos últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ownerPerformance.slice(0, 5).map((owner, index) => (
              <div key={owner.owner_id} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{owner.owner_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {owner.won_deals_30d} deals ganhos • {owner.active_deals} ativos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(owner.won_value_30d || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Taxa: {owner.win_rate_30d}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full transition-all"
                      style={{ width: `${owner.win_rate_30d}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Churn e Motivos de Perda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência de Churn */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Churn</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={churnAnalysis.slice(0, 6).reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short' })}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, '']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                />
                <Legend />
                <Line type="monotone" dataKey="churn_rate" stroke="#FF8042" name="Taxa de Churn (%)" strokeWidth={2} />
                <Line type="monotone" dataKey="reactivation_rate" stroke="#00C49F" name="Taxa de Reativação (%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Principais Motivos de Perda */}
        <Card>
          <CardHeader>
            <CardTitle>Principais Motivos de Perda</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {lostReasons.length > 0 ? (
              <div className="space-y-3">
                {lostReasons.map((reason, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{reason.lost_reason}</span>
                      <span className="text-muted-foreground">{reason.percentage}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all"
                          style={{ width: `${reason.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {reason.count} deals
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum motivo de perda registrado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
