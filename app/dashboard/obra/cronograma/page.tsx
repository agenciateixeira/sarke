'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Building,
  Eye,
  Search,
  Filter,
  DollarSign,
  Clock,
  FileSpreadsheet,
} from 'lucide-react'
import { CronogramaObraCompleto, CronogramaObraStatus } from '@/types/cronograma-obra'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

const statusColors: Record<CronogramaObraStatus, string> = {
  ativo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pausado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  concluido: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const statusLabels: Record<CronogramaObraStatus, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
}

export default function CronogramaObraPage() {
  const [cronogramas, setCronogramas] = useState<CronogramaObraCompleto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<CronogramaObraStatus | 'todos'>('todos')

  const stats = {
    total: cronogramas.length,
    ativos: cronogramas.filter((c) => c.status === 'ativo').length,
    concluidos: cronogramas.filter((c) => c.status === 'concluido').length,
    progresso_medio:
      cronogramas.length > 0
        ? Math.round(
            cronogramas.reduce((acc, c) => acc + c.progresso_real, 0) / cronogramas.length
          )
        : 0,
    custo_total: cronogramas.reduce((acc, c) => acc + (c.custo_total_materiais || 0), 0),
  }

  useEffect(() => {
    loadCronogramas()
  }, [])

  async function loadCronogramas() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cronograma_obras_completo')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setCronogramas(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar cronogramas:', error)
      toast.error('Erro ao carregar cronogramas')
    } finally {
      setLoading(false)
    }
  }

  const cronogramasFiltrados = cronogramas.filter((cronograma) => {
    const matchSearch =
      cronograma.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cronograma.obra_nome?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus = filterStatus === 'todos' || cronograma.status === filterStatus

    return matchSearch && matchStatus
  })

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Cronogramas de Obras"
          description="Gestao de cronogramas baseados no modelo Excel"
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Cronogramas</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.ativos} ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progresso Medio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.progresso_medio}%</div>
              <Progress value={stats.progresso_medio} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluidos</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.concluidos}</div>
              <p className="text-xs text-muted-foreground">Obras finalizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(stats.custo_total)}
              </div>
              <p className="text-xs text-muted-foreground">Todos os cronogramas</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar cronogramas..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  className="px-3 py-2 rounded-md border border-input bg-background"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as CronogramaObraStatus | 'todos')}
                >
                  <option value="todos">Todos os Status</option>
                  <option value="ativo">Ativo</option>
                  <option value="pausado">Pausado</option>
                  <option value="concluido">Concluido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Carregando cronogramas...</p>
              </div>
            </CardContent>
          </Card>
        ) : cronogramasFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">
                  {searchTerm || filterStatus !== 'todos'
                    ? 'Nenhum cronograma encontrado'
                    : 'Nenhum cronograma cadastrado'}
                </p>
                <p className="text-sm mb-4">
                  {searchTerm || filterStatus !== 'todos'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Crie cronogramas nas obras para visualizar aqui'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cronogramasFiltrados.map((cronograma) => (
              <Card key={cronograma.id} className="hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Building className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-1 truncate">{cronograma.nome}</CardTitle>
                        <CardDescription className="truncate">{cronograma.obra_nome}</CardDescription>
                      </div>
                    </div>
                    <Badge className={statusColors[cronograma.status]}>
                      {statusLabels[cronograma.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{cronograma.progresso_real}%</span>
                    </div>
                    <Progress value={cronograma.progresso_real} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Atividades</div>
                      <div className="font-semibold">{cronograma.total_atividades}</div>
                      <div className="text-xs text-green-600">{cronograma.atividades_concluidas} concluidas</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Atrasadas</div>
                      <div className="font-semibold text-red-600">{cronograma.atividades_atrasadas}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custo Total:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(cronograma.custo_total_materiais || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor Pago:</span>
                      <span className="font-medium text-green-600">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(cronograma.valor_pago_materiais || 0)}
                      </span>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/dashboard/obra/cronograma/${cronograma.obra_id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Cronograma
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
