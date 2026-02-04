'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Plus,
  Building,
  Phone,
  Mail,
  MapPin,
  Star,
  Search,
  Filter,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
} from 'lucide-react'
import { EmpresaParceira, StatusEmpresa } from '@/types/empresa'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'

const statusColors: Record<StatusEmpresa, string> = {
  ativa: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inativa: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  bloqueada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const statusLabels: Record<StatusEmpresa, string> = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  bloqueada: 'Bloqueada',
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<EmpresaParceira[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusEmpresa | 'todas'>('todas')
  const [filterServico, setFilterServico] = useState<string>('todos')

  // Lista de serviços únicos
  const [servicosDisponiveis, setServicosDisponiveis] = useState<string[]>([])

  // Estatísticas
  const stats = {
    total: empresas.length,
    ativas: empresas.filter((e) => e.status === 'ativa').length,
    avaliacao_media:
      empresas.length > 0
        ? (
            empresas.reduce((acc, e) => acc + e.avaliacao_media, 0) / empresas.length
          ).toFixed(1)
        : '0.0',
    obras_em_execucao: empresas.reduce((acc, e) => acc + e.total_obras_executadas, 0),
  }

  useEffect(() => {
    loadEmpresas()
  }, [])

  async function loadEmpresas() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('empresas_parceiras')
        .select('*')
        .order('nome')

      if (error) throw error

      setEmpresas(data || [])

      // Extrair serviços únicos
      const servicos = new Set<string>()
      data?.forEach((empresa) => {
        empresa.servicos?.forEach((servico: string) => servicos.add(servico))
      })
      setServicosDisponiveis(Array.from(servicos).sort())
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error)
      toast.error('Erro ao carregar empresas')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar empresas
  const empresasFiltradas = empresas.filter((empresa) => {
    const matchSearch =
      empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.cidade?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus = filterStatus === 'todas' || empresa.status === filterStatus

    const matchServico =
      filterServico === 'todos' || empresa.servicos?.includes(filterServico)

    return matchSearch && matchStatus && matchServico
  })

  function getInitials(nome: string) {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
        }`}
      />
    ))
  }

  return (
    <ProtectedRoute requiredSetor="gestao_obra">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Empresas Parceiras"
          description="Gestão de empresas prestadoras de serviço e fornecedores"
          actions={
            <Button asChild>
              <Link href="/dashboard/obra/empresas/novo">
                <Plus className="mr-2 h-4 w-4" />
                Nova Empresa
              </Link>
            </Button>
          }
        />

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.ativas} ativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
              <Star className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avaliacao_media}</div>
              <div className="flex items-center gap-1 mt-1">
                {renderStars(parseFloat(stats.avaliacao_media))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ativas}</div>
              <p className="text-xs text-muted-foreground">Aptas para contratar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Obras Executadas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.obras_em_execucao}</div>
              <p className="text-xs text-muted-foreground">Total histórico</p>
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
                  placeholder="Buscar empresas..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  className="px-3 py-2 rounded-md border border-input bg-background"
                  value={filterServico}
                  onChange={(e) => setFilterServico(e.target.value)}
                >
                  <option value="todos">Todos os Serviços</option>
                  {servicosDisponiveis.map((servico) => (
                    <option key={servico} value={servico}>
                      {servico.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>

                <select
                  className="px-3 py-2 rounded-md border border-input bg-background"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as StatusEmpresa | 'todas')}
                >
                  <option value="todas">Todos os Status</option>
                  <option value="ativa">Ativas</option>
                  <option value="inativa">Inativas</option>
                  <option value="bloqueada">Bloqueadas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Empresas */}
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Carregando empresas...</p>
              </div>
            </CardContent>
          </Card>
        ) : empresasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">
                  {searchTerm || filterStatus !== 'todas' || filterServico !== 'todos'
                    ? 'Nenhuma empresa encontrada'
                    : 'Nenhuma empresa cadastrada'}
                </p>
                <p className="text-sm mb-4">
                  {searchTerm || filterStatus !== 'todas' || filterServico !== 'todos'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Comece cadastrando suas empresas parceiras'}
                </p>
                {!searchTerm && filterStatus === 'todas' && filterServico === 'todos' && (
                  <Button asChild>
                    <Link href="/dashboard/obra/empresas/novo">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Empresa
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {empresasFiltradas.map((empresa) => (
              <Card
                key={empresa.id}
                className="hover:border-primary/50 transition-all cursor-pointer group"
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      {empresa.logo_url && <AvatarImage src={empresa.logo_url} />}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(empresa.nome)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg truncate">{empresa.nome}</CardTitle>
                        <Badge className={statusColors[empresa.status]}>
                          {statusLabels[empresa.status]}
                        </Badge>
                      </div>
                      {empresa.especialidade_principal && (
                        <CardDescription className="mt-1">
                          {empresa.especialidade_principal.replace(/_/g, ' ')}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Avaliação */}
                  {empresa.numero_avaliacoes > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {renderStars(empresa.avaliacao_media)}
                      </div>
                      <span className="text-sm font-semibold">{empresa.avaliacao_media.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({empresa.numero_avaliacoes} avaliações)
                      </span>
                    </div>
                  )}

                  {/* Informações de contato */}
                  <div className="space-y-2 text-sm">
                    {empresa.responsavel && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="truncate">{empresa.responsavel}</span>
                      </div>
                    )}

                    {empresa.telefone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{empresa.telefone}</span>
                      </div>
                    )}

                    {empresa.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{empresa.email}</span>
                      </div>
                    )}

                    {(empresa.cidade || empresa.estado) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {empresa.cidade}
                          {empresa.cidade && empresa.estado && ' - '}
                          {empresa.estado}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Serviços */}
                  {empresa.servicos && empresa.servicos.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {empresa.servicos.slice(0, 3).map((servico) => (
                        <Badge key={servico} variant="outline" className="text-xs">
                          {servico.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {empresa.servicos.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{empresa.servicos.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Alertas */}
                  {empresa.status === 'ativa' && (
                    <>
                      {empresa.seguro_vencimento &&
                        new Date(empresa.seguro_vencimento) < new Date() && (
                          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
                            <AlertCircle className="h-4 w-4" />
                            <span>Seguro vencido</span>
                          </div>
                        )}
                      {empresa.certidao_vencimento &&
                        new Date(empresa.certidao_vencimento) < new Date() && (
                          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
                            <AlertCircle className="h-4 w-4" />
                            <span>Certidão vencida</span>
                          </div>
                        )}
                    </>
                  )}

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/dashboard/obra/empresas/${empresa.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/obra/empresas/${empresa.id}/editar`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
