'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Clock, TrendingUp, TrendingDown, FileText, RefreshCw } from 'lucide-react'
import { useAutomations } from '@/hooks/useAutomations'
import { Skeleton } from '@/components/ui/skeleton'

export function AutomationReports() {
  const { stats, loading, refetch } = useAutomations()

  // Mapear automações hardcoded com dados reais
  const automations = [
    {
      id: '1',
      name: 'Mudança Automática de Etapa - Valor Reduzido',
      description: 'Quando o valor do deal diminui, move automaticamente para Negociação.',
      trigger: 'Valor Reduzido',
      type: 'stage_change',
      enabled: true,
    },
    {
      id: '2',
      name: 'Mudança Automática de Etapa - Valor Aumentado',
      description: 'Quando o valor do deal aumenta, move automaticamente para Fechamento.',
      trigger: 'Valor Aumentado',
      type: 'stage_change',
      enabled: true,
    },
    {
      id: '3',
      name: 'Criar Projeto - Valor Aumentado',
      description: 'Cria automaticamente um projeto "Preparar Fechamento" quando o valor aumenta.',
      trigger: 'Valor Aumentado',
      type: 'project_creation',
      enabled: true,
    },
    {
      id: '4',
      name: 'Criar Projeto - Valor Reduzido',
      description: 'Cria automaticamente um projeto "Revisar Negociação" quando o valor diminui.',
      trigger: 'Valor Reduzido',
      type: 'project_creation',
      enabled: true,
    },
  ].map(auto => {
    // Encontrar estatísticas reais para esta automação
    const stat = stats.find(s => s.automation_name === auto.name)
    return {
      ...auto,
      executions: stat?.total_executions || 0,
      lastExecution: stat?.last_execution || null,
    }
  })

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'Mudança de Valor':
        return <Zap className="h-4 w-4" />
      case 'Valor Aumentado':
        return <TrendingUp className="h-4 w-4" />
      case 'Valor Reduzido':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Visualize estatísticas e execuções das automações
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Automações</p>
              <p className="text-2xl font-bold">{automations.length}</p>
            </div>
            <Zap className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Automações Ativas</p>
              <p className="text-2xl font-bold">
                {automations.filter(a => a.enabled).length}
              </p>
            </div>
            <Zap className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Execuções (Total)</p>
              <p className="text-2xl font-bold">
                {automations.reduce((sum, a) => sum + a.executions, 0)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Automation List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6">
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map(automation => (
            <Card key={automation.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      {getTriggerIcon(automation.trigger)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{automation.name}</h3>
                      <Badge variant="outline" className="mt-1">
                        {automation.trigger}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-muted-foreground mb-4">
                    {automation.description}
                  </p>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {automation.lastExecution
                          ? `Última execução: ${formatDate(automation.lastExecution)}`
                          : 'Nunca executada'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span>{automation.executions} execuções</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={automation.enabled ? 'default' : 'secondary'}>
                    {automation.enabled ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {automations.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma execução registrada</h3>
          <p className="text-muted-foreground">
            As automações ainda não foram executadas. Mude o valor de um deal para testá-las.
          </p>
        </Card>
      )}
    </div>
  )
}
