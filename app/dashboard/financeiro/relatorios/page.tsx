'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Download,
  Calendar,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/types/erp'
import { toast } from 'sonner'

interface DREData {
  receitas_operacionais: number
  receitas_servicos: number
  receitas_outros: number
  receitas_total: number
  custos_diretos: number
  despesas_administrativas: number
  despesas_comerciais: number
  despesas_pessoal: number
  despesas_operacionais: number
  despesas_total: number
  resultado_bruto: number
  resultado_operacional: number
  resultado_liquido: number
  margem_bruta_percentual: number
  margem_operacional_percentual: number
  margem_liquida_percentual: number
}

interface RentabilidadeCliente {
  cliente_id: string
  cliente_nome: string
  receita_total: number
  custo_total: number
  lucro_bruto: number
  margem_percentual: number
  quantidade_projetos: number
}

interface EvolucaoMensal {
  mes: string
  receitas: number
  despesas: number
  saldo: number
  variacao_receita_percentual: number
  variacao_despesa_percentual: number
}

export default function RelatoriosPage() {
  const [dre, setDre] = useState<DREData | null>(null)
  const [rentabilidade, setRentabilidade] = useState<RentabilidadeCliente[]>([])
  const [evolucao, setEvolucao] = useState<EvolucaoMensal[]>([])
  const [loading, setLoading] = useState(false)

  // Período padrão: mês atual
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0]
  )
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (dataInicio && dataFim) {
      gerarRelatorios()
    }
  }, [])

  async function gerarRelatorios() {
    if (!dataInicio || !dataFim) {
      toast.error('Selecione o período')
      return
    }

    if (dataInicio > dataFim) {
      toast.error('Data inicial não pode ser maior que data final')
      return
    }

    try {
      setLoading(true)

      // Gerar DRE
      const { data: dreData, error: dreError } = await supabase.rpc('gerar_dre', {
        p_data_inicio: dataInicio,
        p_data_fim: dataFim,
      })

      if (dreError) throw dreError
      if (dreData && dreData.length > 0) {
        setDre(dreData[0])
      }

      // Rentabilidade por cliente
      const { data: rentData, error: rentError } = await supabase.rpc(
        'rentabilidade_por_cliente',
        {
          p_data_inicio: dataInicio,
          p_data_fim: dataFim,
          p_limite: 10,
        }
      )

      if (rentError) throw rentError
      setRentabilidade(rentData || [])

      // Evolução mensal (últimos 6 meses)
      const { data: evolData, error: evolError } = await supabase.rpc('evolucao_mensal', {
        p_meses: 6,
      })

      if (evolError) throw evolError
      setEvolucao(evolData || [])

      toast.success('Relatórios gerados com sucesso!')
    } catch (error: any) {
      console.error('Erro ao gerar relatórios:', error)
      toast.error(error.message || 'Erro ao gerar relatórios')
    } finally {
      setLoading(false)
    }
  }

  function formatarPercentual(valor: number): string {
    return `${valor >= 0 ? '+' : ''}${valor.toFixed(2)}%`
  }

  return (
    <ProtectedRoute requiredSetor="financeiro">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Relatórios Financeiros"
          description="DRE, análise de rentabilidade e evolução mensal"
        />

        {/* Seleção de Período */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período de Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <Button onClick={gerarRelatorios} disabled={loading}>
                {loading ? (
                  'Gerando...'
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Gerar Relatórios
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="dre" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dre">DRE</TabsTrigger>
            <TabsTrigger value="rentabilidade">Rentabilidade</TabsTrigger>
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          </TabsList>

          {/* DRE */}
          <TabsContent value="dre" className="space-y-4">
            {dre && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>DRE - Demonstração do Resultado</CardTitle>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Receitas */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Receitas
                      </h3>
                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Receitas de Serviços</span>
                          <span className="font-medium">
                            {formatarMoeda(dre.receitas_servicos)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Outras Receitas</span>
                          <span className="font-medium">{formatarMoeda(dre.receitas_outros)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-green-600 pt-2 border-t">
                          <span>Total de Receitas</span>
                          <span>{formatarMoeda(dre.receitas_total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Custos e Despesas */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        Custos e Despesas
                      </h3>
                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Custos Diretos</span>
                          <span className="font-medium">{formatarMoeda(dre.custos_diretos)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Despesas Administrativas</span>
                          <span className="font-medium">
                            {formatarMoeda(dre.despesas_administrativas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Despesas Comerciais</span>
                          <span className="font-medium">
                            {formatarMoeda(dre.despesas_comerciais)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Despesas com Pessoal</span>
                          <span className="font-medium">{formatarMoeda(dre.despesas_pessoal)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-red-600 pt-2 border-t">
                          <span>Total de Despesas</span>
                          <span>{formatarMoeda(dre.despesas_total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Resultados */}
                    <div className="pt-4 border-t-2">
                      <h3 className="font-semibold mb-3">Resultados</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="text-sm text-muted-foreground">Resultado Bruto</p>
                            <p className="text-xs text-muted-foreground">
                              Margem: {dre.margem_bruta_percentual.toFixed(2)}%
                            </p>
                          </div>
                          <p
                            className={`text-lg font-bold ${
                              dre.resultado_bruto >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatarMoeda(dre.resultado_bruto)}
                          </p>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="text-sm text-muted-foreground">Resultado Operacional</p>
                            <p className="text-xs text-muted-foreground">
                              Margem: {dre.margem_operacional_percentual.toFixed(2)}%
                            </p>
                          </div>
                          <p
                            className={`text-lg font-bold ${
                              dre.resultado_operacional >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatarMoeda(dre.resultado_operacional)}
                          </p>
                        </div>

                        <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10 border-2 border-primary">
                          <div>
                            <p className="font-semibold">Resultado Líquido</p>
                            <p className="text-sm text-muted-foreground">
                              Margem: {dre.margem_liquida_percentual.toFixed(2)}%
                            </p>
                          </div>
                          <p
                            className={`text-2xl font-bold ${
                              dre.resultado_liquido >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatarMoeda(dre.resultado_liquido)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Rentabilidade */}
          <TabsContent value="rentabilidade" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Clientes Mais Lucrativos</CardTitle>
              </CardHeader>
              <CardContent>
                {rentabilidade.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado disponível para o período selecionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rentabilidade.map((item, index) => (
                      <div
                        key={item.cliente_id}
                        className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-muted-foreground">
                                #{index + 1}
                              </span>
                              <h4 className="font-semibold">{item.cliente_nome}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.quantidade_projetos} projeto
                              {item.quantidade_projetos > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${
                                item.lucro_bruto >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {formatarMoeda(item.lucro_bruto)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Margem: {item.margem_percentual.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Receita</p>
                            <p className="font-medium text-green-600">
                              {formatarMoeda(item.receita_total)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Custo</p>
                            <p className="font-medium text-red-600">
                              {formatarMoeda(item.custo_total)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evolução */}
          <TabsContent value="evolucao" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal (Últimos 6 Meses)</CardTitle>
              </CardHeader>
              <CardContent>
                {evolucao.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado disponível</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evolucao.map((item) => (
                      <div
                        key={item.mes}
                        className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">
                            {new Date(item.mes + 'T00:00:00').toLocaleDateString('pt-BR', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </h4>
                          <p
                            className={`text-lg font-bold ${
                              item.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatarMoeda(item.saldo)}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Receitas</p>
                            <p className="font-medium text-green-600">
                              {formatarMoeda(item.receitas)}
                            </p>
                            {item.variacao_receita_percentual !== 0 && (
                              <p
                                className={`text-xs ${
                                  item.variacao_receita_percentual >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {formatarPercentual(item.variacao_receita_percentual)}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Despesas</p>
                            <p className="font-medium text-red-600">
                              {formatarMoeda(item.despesas)}
                            </p>
                            {item.variacao_despesa_percentual !== 0 && (
                              <p
                                className={`text-xs ${
                                  item.variacao_despesa_percentual >= 0
                                    ? 'text-red-600'
                                    : 'text-green-600'
                                }`}
                              >
                                {formatarPercentual(item.variacao_despesa_percentual)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
