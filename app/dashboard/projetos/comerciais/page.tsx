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
  Building2,
  Clock,
  CheckCircle2,
  Palette,
  Box,
  FileText,
} from 'lucide-react'
import { ProjetoCompleto, etapaLabels, etapaCores, formatarFrente } from '@/types/projeto'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function ProjetosComerciaisPage() {
  const [projetos, setProjetos] = useState<ProjetoCompleto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadProjetos()
  }, [])

  async function loadProjetos() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projetos_completo')
        .select('*')
        .eq('area', 'comercial')
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
    return (
      projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projeto.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Projetos Comerciais"
            description="Projetos da área comercial"
          />
          <Button asChild>
            <Link href="/dashboard/projetos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Link>
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projetos.length}</div>
              <p className="text-xs text-muted-foreground">Projetos comerciais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projetos.filter((p) => p.status_geral === 'em_andamento').length}
              </div>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {projetos.filter((p) => p.status_geral === 'completo').length}
              </div>
              <p className="text-xs text-muted-foreground">Finalizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar projetos..."
                className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Projetos */}
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Carregando projetos...</p>
              </div>
            </CardContent>
          </Card>
        ) : projetosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhum projeto encontrado' : 'Nenhum projeto comercial cadastrado'}
                </p>
                <p className="text-sm mb-4">
                  {searchTerm ? 'Tente ajustar o termo de busca' : 'Crie seu primeiro projeto comercial'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projetosFiltrados.map((projeto) => (
              <Link key={projeto.id} href={`/dashboard/projetos/${projeto.id}`}>
                <Card className="hover:border-primary/50 transition-all h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Building2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
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
                    {/* Frente */}
                    <div className="flex items-center gap-2 text-sm">
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
                        <Building2
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
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
