'use client'

import { Obra } from '@/types/obra'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Building2, DollarSign, Calendar, MapPin, Ruler, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface ClientObrasProps {
  obras: Obra[]
  clientId: string
  refetch: () => Promise<void>
}

const STATUS_LABELS: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const TIPO_LABELS: Record<string, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  industrial: 'Industrial',
  reforma: 'Reforma',
}

export function ClientObras({ obras, clientId, refetch }: ClientObrasProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      planejamento: 'outline',
      em_andamento: 'default',
      pausada: 'secondary',
      concluida: 'secondary',
      cancelada: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {STATUS_LABELS[status] || status}
      </Badge>
    )
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planejamento: 'text-blue-500',
      em_andamento: 'text-green-500',
      pausada: 'text-yellow-500',
      concluida: 'text-gray-500',
      cancelada: 'text-red-500',
    }
    return colors[status] || 'text-gray-500'
  }

  const totalValue = obras.reduce((sum, o) => sum + (o.valor_contrato || 0), 0)
  const activeObras = obras.filter(o => o.status === 'em_andamento')
  const avgProgress = obras.length > 0
    ? obras.reduce((sum, o) => sum + o.progresso_percentual, 0) / obras.length
    : 0

  if (obras.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhuma obra cadastrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Este cliente ainda não possui obras em andamento
          </p>
          <Link href="/dashboard/obra">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Obra
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Obras</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{obras.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obras Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeObras.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Obras List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Todas as Obras</h3>
          <Link href="/dashboard/obra">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Obra
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {obras.map((obra) => (
            <Card key={obra.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{obra.nome}</CardTitle>
                    {obra.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {obra.descricao}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(obra.status)}
                      {obra.tipo_obra && (
                        <Badge variant="outline">
                          {TIPO_LABELS[obra.tipo_obra]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/obra/${obra.id}`}>
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progresso */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progresso</span>
                    <span className={`text-sm font-semibold ${getStatusColor(obra.status)}`}>
                      {obra.progresso_percentual}%
                    </span>
                  </div>
                  <Progress value={obra.progresso_percentual} className="h-2" />
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  {obra.valor_contrato && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Valor</p>
                        <p className="font-semibold">{formatCurrency(obra.valor_contrato)}</p>
                      </div>
                    </div>
                  )}

                  {(obra.area_construida || obra.area_terreno) && (
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Área</p>
                        <p className="font-semibold">
                          {obra.area_construida || obra.area_terreno} m²
                        </p>
                      </div>
                    </div>
                  )}

                  {obra.data_inicio && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Início</p>
                        <p className="font-semibold">{formatDate(obra.data_inicio)}</p>
                      </div>
                    </div>
                  )}

                  {obra.data_previsao_termino && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Previsão</p>
                        <p className="font-semibold">
                          {formatDate(obra.data_previsao_termino)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {(obra.endereco || obra.cidade) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {obra.endereco && <>{obra.endereco}, </>}
                      {obra.cidade && obra.estado && `${obra.cidade}, ${obra.estado}`}
                    </span>
                  </div>
                )}

                {obra.engenheiro && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Engenheiro:</span>
                    <span className="font-medium">{obra.engenheiro.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
