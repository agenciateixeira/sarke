'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  Search,
  Filter,
  Briefcase,
  Home,
  Building2,
  Factory,
  TrendingUp,
  Clock,
  CheckCircle2,
  Palette,
  Box,
  FileText,
} from 'lucide-react'
import { ProjetoCompleto, areaLabels, etapaLabels, etapaCores, formatarFrente } from '@/types/projeto'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

const areaIcons = {
  residencial: Home,
  comercial: Building2,
  corporativo: Factory,
}

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<ProjetoCompleto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterArea, setFilterArea] = useState<string>('todos')

  const stats = {
    total: projetos.length,
    em_andamento: projetos.filter((p) => p.status_geral === 'em_andamento').length,
    concluidos: projetos.filter((p) => p.status_geral === 'completo').length,
    progresso_medio:
      projetos.length > 0
        ? Math.round(projetos.reduce((acc, p) => acc + p.progresso_percentual, 0) / projetos.length)
        : 0,
  }

  useEffect(() => {
    loadProjetos()
  }, [])

  async function loadProjetos() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projetos_completo')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setProjetos(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar projetos:', error)
      toast.error('Erro ao carregar projetos')
    } finally {
      setLoading(false)
    }
  }

  const projetosFiltrados = projetos.filter((projeto) => {
    const matchSearch =
      projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projeto.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchArea = filterArea === 'todos' || projeto.area === filterArea

    return matchSearch && matchArea
  })

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Projetos"
            description="Gestão de projetos de arquitetura e interiores"
          />
          <Button asChild>
            <Link href="/dashboard/projetos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Link>
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.em_andamento} em andamento</p>
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
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.concluidos}</div>
              <p className="text-xs text-muted-foreground">Projetos finalizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Por Área</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Residencial:</span>
                  <span className="font-medium">
                    {projetos.filter((p) => p.area === 'residencial').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comercial:</span>
                  <span className="font-medium">
                    {projetos.filter((p) => p.area === 'comercial').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Corporativo:</span>
                  <span className="font-medium">
                    {projetos.filter((p) => p.area === 'corporativo').length}
                  </span>
                </div>
              </div>
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
                  placeholder="Buscar projetos..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  className="px-3 py-2 rounded-md border border-input bg-background"
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                >
                  <option value="todos">Todas as Áreas</option>
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="corporativo">Corporativo</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Projetos */}
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Carregando projetos...</p>
              </div>
            </CardContent>
          </Card>
        ) : projetosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">
                  {searchTerm || filterArea !== 'todos'
                    ? 'Nenhum projeto encontrado'
                    : 'Nenhum projeto cadastrado'}
                </p>
                <p className="text-sm mb-4">
                  {searchTerm || filterArea !== 'todos'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Crie seu primeiro projeto para começar'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projetosFiltrados.map((projeto) => {
              const AreaIcon = areaIcons[projeto.area]

              return (
                <Link key={projeto.id} href={`/dashboard/projetos/${projeto.id}`}>
                  <Card className="hover:border-primary/50 transition-all h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <AreaIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-1 truncate">{projeto.nome}</CardTitle>
                            <CardDescription className="truncate">
                              {projeto.cliente_nome || 'Sem cliente'}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={etapaCores[projeto.etapa_atual]}>
                          {etapaLabels[projeto.etapa_atual]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Área e Frente */}
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{areaLabels[projeto.area]}</Badge>
                        <Badge variant="outline">{formatarFrente(projeto.frente)}</Badge>
                      </div>

                      {/* Progresso */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progresso Geral</span>
                          <span className="font-semibold">{projeto.progresso_percentual}%</span>
                        </div>
                        <Progress value={projeto.progresso_percentual} />
                      </div>

                      {/* Etapas */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <Palette
                            className={`h-4 w-4 mx-auto mb-1 ${
                              projeto.planejamento_status === 'concluido'
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}
                          />
                          <div className="text-muted-foreground">Plano</div>
                        </div>
                        <div className="text-center">
                          <FileText
                            className={`h-4 w-4 mx-auto mb-1 ${
                              projeto.planta_baixa_status === 'concluido'
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}
                          />
                          <div className="text-muted-foreground">Planta</div>
                        </div>
                        <div className="text-center">
                          <Box
                            className={`h-4 w-4 mx-auto mb-1 ${
                              projeto.modelo_3d_status === 'concluido'
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}
                          />
                          <div className="text-muted-foreground">3D</div>
                        </div>
                        <div className="text-center">
                          <FileText
                            className={`h-4 w-4 mx-auto mb-1 ${
                              projeto.executivo_status === 'concluido'
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}
                          />
                          <div className="text-muted-foreground">Exec</div>
                        </div>
                      </div>

                      {/* Datas */}
                      {projeto.data_previsao_entrega && (
                        <div className="flex items-center gap-2 text-sm border-t pt-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Entrega:</span>
                          <span className="font-medium">
                            {format(new Date(projeto.data_previsao_entrega), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
