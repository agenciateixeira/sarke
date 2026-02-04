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
  Building,
  TrendingUp,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  DollarSign,
  Clock,
  FileText,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
} from 'lucide-react'
import { Obra, StatusObra, TipoObra } from '@/types/obra'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ObraFormDialog } from '@/components/obra/ObraFormDialog'
import Link from 'next/link'

const statusColors: Record<StatusObra, string> = {
  planejamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  em_andamento: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pausada: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  concluida: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const statusLabels: Record<StatusObra, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const tipoObraLabels: Record<TipoObra, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  industrial: 'Industrial',
  reforma: 'Reforma',
}

export default function ObraPage() {
  const { user } = useAuth()
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusObra | 'todas'>('todas')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)

  // Estatísticas
  const stats = {
    total: obras.length,
    em_andamento: obras.filter((o) => o.status === 'em_andamento').length,
    pausadas: obras.filter((o) => o.status === 'pausada').length,
    atrasadas: obras.filter((o) => {
      if (o.status !== 'em_andamento' || !o.data_previsao_termino) return false
      return new Date(o.data_previsao_termino) < new Date()
    }).length,
    progresso_medio:
      obras.length > 0
        ? Math.round(obras.reduce((acc, o) => acc + o.progresso_percentual, 0) / obras.length)
        : 0,
  }

  useEffect(() => {
    loadObras()
  }, [])

  async function loadObras() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('obras')
        .select(
          `
          *,
          cliente:clients(id, name, email, phone)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      setObras(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar obras:', error)
      toast.error('Erro ao carregar obras')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar obras
  const obrasFiltradas = obras.filter((obra) => {
    const matchSearch =
      obra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.cidade?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus = filterStatus === 'todas' || obra.status === filterStatus

    return matchSearch && matchStatus
  })

  function getStatusProgressColor(progresso: number) {
    if (progresso < 30) return 'bg-red-500'
    if (progresso < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  function handleNovaObra() {
    setSelectedObra(null)
    setDialogOpen(true)
  }

  function handleEditarObra(obra: Obra) {
    setSelectedObra(obra)
    setDialogOpen(true)
  }

  function handleDialogClose() {
    setDialogOpen(false)
    setSelectedObra(null)
  }

  function handleObraSuccess() {
    loadObras()
  }

  return (
    <ProtectedRoute requiredSetor="gestao_obra">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Gestão de Obra"
          description="Acompanhamento de obras, progresso e execução"
          actions={
            <Button onClick={handleNovaObra}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Obra
            </Button>
          }
        />

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Obras</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.em_andamento} em andamento
              </p>
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
              <CardTitle className="text-sm font-medium">Obras Pausadas</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pausadas}</div>
              <p className="text-xs text-muted-foreground">Requerem atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.atrasadas}</div>
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
                  placeholder="Buscar obras..."
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
                  onChange={(e) => setFilterStatus(e.target.value as StatusObra | 'todas')}
                >
                  <option value="todas">Todos os Status</option>
                  <option value="planejamento">Planejamento</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="pausada">Pausada</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Obras */}
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Carregando obras...</p>
              </div>
            </CardContent>
          </Card>
        ) : obrasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">
                  {searchTerm || filterStatus !== 'todas'
                    ? 'Nenhuma obra encontrada'
                    : 'Nenhuma obra cadastrada'}
                </p>
                <p className="text-sm mb-4">
                  {searchTerm || filterStatus !== 'todas'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Comece cadastrando sua primeira obra'}
                </p>
                {!searchTerm && filterStatus === 'todas' && (
                  <Button onClick={handleNovaObra}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Obra
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {obrasFiltradas.map((obra) => (
              <Card
                key={obra.id}
                className="hover:border-primary/50 transition-all cursor-pointer group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 truncate">{obra.nome}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {obra.descricao || 'Sem descrição'}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[obra.status]}>
                      {statusLabels[obra.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progresso */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{obra.progresso_percentual}%</span>
                    </div>
                    <Progress
                      value={obra.progresso_percentual}
                      className={getStatusProgressColor(obra.progresso_percentual)}
                    />
                  </div>

                  {/* Informações */}
                  <div className="space-y-2 text-sm">
                    {obra.cliente && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="truncate">{obra.cliente.name}</span>
                      </div>
                    )}

                    {(obra.cidade || obra.estado) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {obra.cidade}
                          {obra.cidade && obra.estado && ' - '}
                          {obra.estado}
                        </span>
                      </div>
                    )}

                    {obra.tipo_obra && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building className="h-4 w-4" />
                        <span>{tipoObraLabels[obra.tipo_obra]}</span>
                      </div>
                    )}

                    {obra.valor_contrato && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(obra.valor_contrato)}
                        </span>
                      </div>
                    )}

                    {obra.data_previsao_termino && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Previsão:{' '}
                          {format(new Date(obra.data_previsao_termino), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/dashboard/obra/${obra.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditarObra(obra)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Cadastro/Edição */}
        <ObraFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          obra={selectedObra}
          onSuccess={handleObraSuccess}
        />
      </div>
    </ProtectedRoute>
  )
}
