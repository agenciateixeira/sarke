'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Zap, Clock, TrendingUp, TrendingDown, FileText, RefreshCw, AlertCircle } from 'lucide-react'
import { useAutomations } from '@/hooks/useAutomations'
import { Skeleton } from '@/components/ui/skeleton'

export function AutomationReports() {
  const { rules, stats, loading, toggleAutomation, refetch } = useAutomations()

  // Mapear rules reais com estatísticas
  const automationsWithStats = rules.map(rule => {
    const stat = stats.find(s =>
      s.automation_name.toLowerCase().includes(rule.name.toLowerCase())
    )

    return {
      ...rule,
      executions: stat?.total_executions || 0,
      successfulExecutions: stat?.successful_executions || 0,
      failedExecutions: stat?.failed_executions || 0,
      lastExecution: stat?.last_execution || null,
    }
  })

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'stage_change':
        return <Zap className="h-4 w-4" />
      case 'value_change':
        return <TrendingUp className="h-4 w-4" />
      case 'field_update':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTriggerLabel = (triggerType: string) => {
    switch (triggerType) {
      case 'stage_change':
        return 'Mudança de Etapa'
      case 'value_change':
        return 'Mudança de Valor'
      case 'field_update':
        return 'Atualização de Campo'
      default:
        return triggerType
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

  const totalExecutions = automationsWithStats.reduce((sum, a) => sum + a.executions, 0)
  const activeRules = automationsWithStats.filter(a => a.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Visualize estatísticas e execuções das automações
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Automações</p>
              <p className="text-2xl font-bold">{rules.length}</p>
            </div>
            <Zap className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Automações Ativas</p>
              <p className="text-2xl font-bold">{activeRules}</p>
            </div>
            <Zap className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Execuções (Total)</p>
              <p className="text-2xl font-bold">{totalExecutions}</p>
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
      ) : automationsWithStats.length > 0 ? (
        <div className="space-y-4">
          {automationsWithStats.map(automation => (
            <Card key={automation.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      automation.is_active
                        ? 'bg-blue-100 dark:bg-blue-900/20'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {getTriggerIcon(automation.trigger_type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{automation.name}</h3>
                      <Badge variant="outline" className="mt-1">
                        {getTriggerLabel(automation.trigger_type)}
                      </Badge>
                    </div>
                  </div>

                  {automation.description && (
                    <p className="text-muted-foreground mb-4">
                      {automation.description}
                    </p>
                  )}

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {automation.lastExecution
                          ? `Última: ${formatDate(automation.lastExecution)}`
                          : 'Nunca executada'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4" />
                      <span>{automation.executions} execuções</span>
                    </div>
                    {automation.failedExecutions > 0 && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{automation.failedExecutions} erros</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                      {automation.is_active ? 'Ativa' : 'Pausada'}
                    </Badge>
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={() => toggleAutomation(automation.id, automation.is_active)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma automação criada</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira automação na aba "Configurações"
          </p>
        </Card>
      )}
    </div>
  )
}
