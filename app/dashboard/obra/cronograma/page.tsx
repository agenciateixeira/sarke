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
  Calendar,
  TrendingUp,
  AlertCircle,
  Building,
  Briefcase,
  Eye,
  Edit,
  Search,
  Filter,
  Users,
} from 'lucide-react'
import { Cronograma, StatusCronograma, TipoCronograma } from '@/types/cronograma'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

const statusColors: Record<StatusCronograma, string> = {
  planejamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ativo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pausado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  concluido: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const statusLabels: Record<StatusCronograma, string> = {
  planejamento: 'Planejamento',
  ativo: 'Ativo',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const tipoLabels: Record<TipoCronograma, string> = {
  obra: 'Obra',
  projeto: 'Projeto',
  geral: 'Geral',
}

const tipoIcons: Record<TipoCronograma, React.ElementType> = {
  obra: Building,
  projeto: Briefcase,
  geral: ClipboardList,
}

export default function CronogramaPage() {
  const { user } = useAuth()
  const [cronogramas, setCronogramas] = useState<Cronograma[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusCronograma | 'todos'>('todos')
  const [filterTipo, setFilterTipo] = useState<TipoCronograma | 'todos'>('todos')

  // Estatísticas
  const stats = {
    total: cronogramas.length,
    ativos: cronogramas.filter((c) => c.status === 'ativo').length,
    pausados: cronogramas.filter((c) => c.status === 'pausado').length,
    atrasados: cronogramas.filter((c) => {
      if (c.status !== 'ativo') return false
      return new Date(c.data_fim) < new Date()
    }).length,
    progresso_medio:
      cronogramas.length > 0
        ? Math.round(
            cronogramas.reduce((acc, c) => acc + c.progresso_percentual, 0) / cronogramas.length
          )
        : 0,
  }

  useEffect(() => {
    loadCronogramas()
  }, [])

  async function loadCronogramas() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cronogramas')
        .select(
          `
          *,
          obra:obras(id, nome),
          projeto:projects(id, name),
          responsavel:profiles!cronogramas_responsavel_id_fkey(id, name)
        `
        )
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

  // Filtrar cronogramas
  const cronogramasFiltrados = cronogramas.filter((cronograma) => {
    const matchSearch =
      cronograma.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cronograma.descricao?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus = filterStatus === 'todos' || cronograma.status === filterStatus
    const matchTipo = filterTipo === 'todos' || cronograma.tipo === filterTipo

    return matchSearch && matchStatus && matchTipo
  })

  function getDiasRestantes(dataFim: string): number {
    return differenceInDays(new Date(dataFim), new Date())
  }

  function getProgressColor(progresso: number) {
    if (progresso < 30) return 'bg-red-500'
    if (progresso < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <ProtectedRoute requiredSetor="cronograma">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Cronograma"
          description="Gestão integrada de cronogramas de obras e projetos"
          actions={
            <Button asChild>
              <Link href="/dashboard/cronograma/novo">
                <Plus className="mr-2 h-4 w-4" />
                Novo Cronograma
              </Link>
            </Button>
          }
        />

        {/* Cards de Estatísticas */}
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
              <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.progresso_medio}%</div>
              <Progress value={stats.progresso_medio} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pausados</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pausados}</div>
              <p className="text-xs text-muted-foreground">Requerem atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.atrasados}</div>
              <p className="text-xs text-muted-foreground">Prazo excedido</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
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
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value as TipoCronograma | 'todos')}
                >
                  <option value="todos">Todos os Tipos</option>
                  <option value="obra">Obras</option>
                  <option value="projeto">Projetos</option>
                  <option value="geral">Gerais</option>
                </select>

                <select
                  className="px-3 py-2 rounded-md border border-input bg-background"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as StatusCronograma | 'todos')}
                >
                  <option value="todos">Todos os Status</option>
                  <option value="planejamento">Planejamento</option>
                  <option value="ativo">Ativo</option>
                  <option value="pausado">Pausado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Cronogramas */}
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
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">
                  {searchTerm || filterStatus !== 'todos' || filterTipo !== 'todos'
                    ? 'Nenhum cronograma encontrado'
                    : 'Nenhum cronograma cadastrado'}
                </p>
                <p className="text-sm mb-4">
                  {searchTerm || filterStatus !== 'todos' || filterTipo !== 'todos'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Comece criando seu primeiro cronograma integrado'}
                </p>
                {!searchTerm && filterStatus === 'todos' && filterTipo === 'todos' && (
                  <Button asChild>
                    <Link href="/dashboard/cronograma/novo">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Cronograma
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cronogramasFiltrados.map((cronograma) => {
              const TipoIcon = tipoIcons[cronograma.tipo]
              const diasRestantes = getDiasRestantes(cronograma.data_fim)
              const estaAtrasado =
                cronograma.status === 'ativo' && new Date(cronograma.data_fim) < new Date()

              return (
                <Card
                  key={cronograma.id}
                  className="hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <TipoIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg mb-1 truncate">
                            {cronograma.nome}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {cronograma.descricao || 'Sem descrição'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={statusColors[cronograma.status]}>
                        {statusLabels[cronograma.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Vinculação */}
                    {cronograma.tipo === 'obra' && cronograma.obra && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Obra:</span>
                        <span className="font-medium truncate">{cronograma.obra.nome}</span>
                      </div>
                    )}
                    {cronograma.tipo === 'projeto' && cronograma.projeto && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Projeto:</span>
                        <span className="font-medium truncate">{cronograma.projeto.name}</span>
                      </div>
                    )}

                    {/* Progresso */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-semibold">{cronograma.progresso_percentual}%</span>
                      </div>
                      <Progress
                        value={cronograma.progresso_percentual}
                        className={getProgressColor(cronograma.progresso_percentual)}
                      />
                    </div>

                    {/* Datas */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(cronograma.data_inicio), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}{' '}
                          -{' '}
                          {format(new Date(cronograma.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>

                      {cronograma.status === 'ativo' && (
                        <div
                          className={`flex items-center gap-2 ${estaAtrasado ? 'text-red-600' : 'text-muted-foreground'}`}
                        >
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            {estaAtrasado
                              ? `Atrasado ${Math.abs(diasRestantes)} dias`
                              : `${diasRestantes} dias restantes`}
                          </span>
                        </div>
                      )}

                      {cronograma.responsavel && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="truncate">{cronograma.responsavel.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/dashboard/cronograma/${cronograma.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Cronograma
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/cronograma/${cronograma.id}/editar`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
