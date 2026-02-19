'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Ruler,
  Square,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle2,
} from 'lucide-react'
import { Obra } from '@/types/obra'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { differenceInDays, differenceInMonths } from 'date-fns'

interface ObraMedicoesViewProps {
  obra: Obra
}

export function ObraMedicoesView({ obra }: ObraMedicoesViewProps) {
  // Cálculos de progresso
  const progressoAtual = obra.progresso_percentual || 0
  const tempoDecorrido = obra.data_inicio
    ? differenceInDays(new Date(), new Date(obra.data_inicio))
    : 0
  const tempoTotal = obra.data_inicio && obra.data_previsao_termino
    ? differenceInDays(new Date(obra.data_previsao_termino), new Date(obra.data_inicio))
    : 0
  const progressoEsperado = tempoTotal > 0 ? (tempoDecorrido / tempoTotal) * 100 : 0

  // Áreas
  const areaConstruida = obra.area_construida || 0
  const areaTerreno = obra.area_terreno || 0
  const taxaOcupacao = areaTerreno > 0 ? (areaConstruida / areaTerreno) * 100 : 0

  // Valores
  const valorContrato = obra.valor_contrato || 0
  const valorExecutado = (valorContrato * progressoAtual) / 100
  const valorRestante = valorContrato - valorExecutado

  // Status do cronograma
  const statusCronograma = progressoAtual >= progressoEsperado ? 'adiantado' : 'atrasado'
  const diferencaProgresso = Math.abs(progressoAtual - progressoEsperado)

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Progresso Atual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Atual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressoAtual.toFixed(1)}%</div>
            <Progress value={progressoAtual} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {statusCronograma === 'adiantado' ? (
                <span className="text-green-600">
                  {diferencaProgresso.toFixed(1)}% adiantado
                </span>
              ) : (
                <span className="text-orange-600">
                  {diferencaProgresso.toFixed(1)}% atrasado
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Área Construída */}
        {areaConstruida > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Área Construída</CardTitle>
              <Square className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{areaConstruida.toLocaleString('pt-BR')} m²</div>
              {areaTerreno > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa de ocupação: {taxaOcupacao.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Área do Terreno */}
        {areaTerreno > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Área do Terreno</CardTitle>
              <Ruler className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{areaTerreno.toLocaleString('pt-BR')} m²</div>
              {areaConstruida > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Área livre: {(areaTerreno - areaConstruida).toLocaleString('pt-BR')} m²
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Duração */}
        {obra.duracao_meses && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duração Prevista</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{obra.duracao_meses} meses</div>
              {obra.data_inicio && (
                <p className="text-xs text-muted-foreground mt-1">
                  {differenceInMonths(new Date(), new Date(obra.data_inicio))} meses decorridos
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Medições Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle>Medições Detalhadas</CardTitle>
          <CardDescription>
            Informações detalhadas sobre as medições e progresso da obra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Progresso x Cronograma */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Progresso x Cronograma</h3>
                <Badge
                  variant={statusCronograma === 'adiantado' ? 'default' : 'secondary'}
                  className={
                    statusCronograma === 'adiantado'
                      ? 'bg-green-600'
                      : 'bg-orange-600 text-white'
                  }
                >
                  {statusCronograma === 'adiantado' ? (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Adiantado
                    </>
                  ) : (
                    'Atrasado'
                  )}
                </Badge>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso Esperado:</span>
                  <span className="font-medium">{progressoEsperado.toFixed(1)}%</span>
                </div>
                <Progress value={progressoEsperado} className="h-2 bg-muted" />

                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Progresso Real:</span>
                  <span className="font-medium">{progressoAtual.toFixed(1)}%</span>
                </div>
                <Progress
                  value={progressoAtual}
                  className={`h-2 ${statusCronograma === 'adiantado' ? 'bg-green-100' : 'bg-orange-100'}`}
                />
              </div>
            </div>

            {/* Medições Físicas */}
            {(areaConstruida > 0 || areaTerreno > 0) && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Medições Físicas</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {areaConstruida > 0 && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Square className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Área Construída</span>
                      </div>
                      <p className="text-2xl font-bold">{areaConstruida.toLocaleString('pt-BR')} m²</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Área total edificada
                      </p>
                    </div>
                  )}

                  {areaTerreno > 0 && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Ruler className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Área do Terreno</span>
                      </div>
                      <p className="text-2xl font-bold">{areaTerreno.toLocaleString('pt-BR')} m²</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Área total do lote
                      </p>
                    </div>
                  )}

                  {areaConstruida > 0 && areaTerreno > 0 && (
                    <>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Taxa de Ocupação</span>
                        </div>
                        <p className="text-2xl font-bold">{taxaOcupacao.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Razão área construída / terreno
                        </p>
                      </div>

                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Square className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Área Livre</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {(areaTerreno - areaConstruida).toLocaleString('pt-BR')} m²
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Área não edificada
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Medições Financeiras */}
            {valorContrato > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Medições Financeiras</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Valor Contrato</span>
                    </div>
                    <p className="text-xl font-bold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(valorContrato)}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Valor Executado</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(valorExecutado)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progressoAtual.toFixed(1)}% do contrato
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Valor Restante</span>
                    </div>
                    <p className="text-xl font-bold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(valorRestante)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(100 - progressoAtual).toFixed(1)}% do contrato
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cronograma */}
            {obra.data_inicio && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Cronograma</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Data de Início</span>
                    </div>
                    <p className="text-lg font-bold">
                      {format(new Date(obra.data_inicio), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tempoDecorrido} dias decorridos
                    </p>
                  </div>

                  {obra.data_previsao_termino && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Previsão de Término</span>
                      </div>
                      <p className="text-lg font-bold">
                        {format(new Date(obra.data_previsao_termino), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.max(0, differenceInDays(new Date(obra.data_previsao_termino), new Date()))} dias restantes
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
