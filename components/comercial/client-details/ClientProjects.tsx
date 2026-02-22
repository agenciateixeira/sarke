'use client'

import { ArchitectureProject, PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FolderOpen, DollarSign, Calendar, Ruler } from 'lucide-react'
import Link from 'next/link'

interface ClientProjectsProps {
  projects: ArchitectureProject[]
  clientId: string
  refetch: () => Promise<void>
}

export function ClientProjects({ projects, clientId, refetch }: ClientProjectsProps) {
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
      prospeccao: 'outline',
      orcamento: 'outline',
      aprovado: 'default',
      em_andamento: 'default',
      em_obra: 'default',
      concluido: 'secondary',
      cancelado: 'destructive',
      pausado: 'secondary',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] || status}
      </Badge>
    )
  }

  const totalValue = projects.reduce((sum, p) => sum + (p.final_value || p.estimated_value || 0), 0)
  const activeProjects = projects.filter(p =>
    ['em_andamento', 'em_obra', 'aprovado'].includes(p.status)
  )

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum projeto cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Este cliente ainda não possui projetos de arquitetura
          </p>
          <Link href="/dashboard/projetos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Projeto
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
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
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

      {/* Projects List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Todos os Projetos</h3>
          <Link href="/dashboard/projetos/novo">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(project.status)}
                      {project.project_type && (
                        <Badge variant="outline">
                          {PROJECT_TYPE_LABELS[project.project_type]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/projetos/${project.id}/editar`}>
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {(project.final_value || project.estimated_value) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {project.final_value ? 'Valor Final' : 'Valor Estimado'}
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(project.final_value || project.estimated_value || 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {project.area_m2 && (
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Área</p>
                        <p className="font-semibold">{project.area_m2} m²</p>
                      </div>
                    </div>
                  )}

                  {project.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Início</p>
                        <p className="font-semibold">{formatDate(project.start_date)}</p>
                      </div>
                    </div>
                  )}

                  {project.estimated_end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Previsão</p>
                        <p className="font-semibold">
                          {formatDate(project.estimated_end_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
