'use client'

import { useState } from 'react'
import { usePipelineAutomations } from '@/hooks/usePipelineAutomations'
import { AutomationRuleDialog } from './AutomationRuleDialog'
import { AutomationLogsViewer } from './AutomationLogsViewer'
import {
  AutomationRule,
  AutomationTriggerType,
  AutomationActionType,
} from '@/types/pipeline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  MoreVertical,
  Loader2,
  Edit,
  Trash2,
  Activity,
  Clock,
  TrendingUp,
  Thermometer,
  DollarSign,
  Calendar,
  Zap,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Mapeamento de ícones e labels
const triggerIcons: Record<AutomationTriggerType, any> = {
  stage_changed: TrendingUp,
  time_in_stage: Clock,
  inactivity: Activity,
  temperature_changed: Thermometer,
  value_changed: DollarSign,
  scheduled: Calendar,
}

const triggerLabels: Record<AutomationTriggerType, string> = {
  stage_changed: 'Mudança de Etapa',
  time_in_stage: 'Tempo na Etapa',
  inactivity: 'Inatividade',
  temperature_changed: 'Mudança de Temperatura',
  value_changed: 'Mudança de Valor',
  scheduled: 'Agendado',
}

const actionLabels: Record<AutomationActionType, string> = {
  move_to_stage: 'Mover para Etapa',
  create_task: 'Criar Tarefa',
  send_notification: 'Enviar Notificação',
  change_temperature: 'Alterar Temperatura',
  archive_deal: 'Arquivar Deal',
  assign_owner: 'Atribuir Responsável',
  send_email: 'Enviar Email',
}

export function AutomationRulesManager() {
  const { rules, stats, loading, toggleRule, deleteRule, createRule, updateRule } = usePipelineAutomations()
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | undefined>(undefined)
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AutomationRule | undefined>(undefined)
  const [selectedRuleForLogs, setSelectedRuleForLogs] = useState<{ id: string; name: string } | undefined>(undefined)

  const handleToggle = async (ruleId: string, currentState: boolean) => {
    await toggleRule(ruleId, !currentState)
  }

  const handleDelete = (rule: AutomationRule) => {
    setRuleToDelete(rule)
    setDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (ruleToDelete) {
      await deleteRule(ruleToDelete.id)
      setDeleteAlertOpen(false)
      setRuleToDelete(undefined)
    }
  }

  const getRuleStats = (ruleId: string) => {
    return stats.find(s => s.rule_id === ruleId)
  }

  const handleCreateRule = () => {
    setSelectedRule(undefined)
    setRuleDialogOpen(true)
  }

  const handleEditRule = (rule: AutomationRule) => {
    setSelectedRule(rule)
    setRuleDialogOpen(true)
  }

  const handleViewLogs = (rule: AutomationRule) => {
    setSelectedRuleForLogs({ id: rule.id, name: rule.name })
    setLogsDialogOpen(true)
  }

  const handleSubmitRule = async (data: any) => {
    if (selectedRule) {
      await updateRule(selectedRule.id, data)
    } else {
      await createRule(data)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Automações de Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Configure regras inteligentes para automatizar seu processo de vendas
            </p>
          </div>
          <Button onClick={handleCreateRule}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Regras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {rules.filter(r => r.is_active).length} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Execuções Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((acc, s) => acc + s.success_count, 0)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {stats.reduce((acc, s) => acc + s.failed_count, 0)} falhas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.length > 0
                ? Math.round(
                    (stats.reduce((acc, s) => acc + s.success_count, 0) /
                      stats.reduce((acc, s) => acc + s.success_count + s.failed_count, 0)) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Nas últimas execuções</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ações Desfeitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((acc, s) => acc + s.undone_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Regras */}
      <Card>
        <CardHeader>
          <CardTitle>Regras Configuradas</CardTitle>
          <CardDescription>
            Gerencie suas regras de automação e acompanhe o desempenho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma regra de automação configurada
              </p>
              <Button onClick={handleCreateRule}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Regra
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Ativa</TableHead>
                  <TableHead>Nome da Regra</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="text-center">Execuções</TableHead>
                  <TableHead className="text-center">Sucesso</TableHead>
                  <TableHead>Última Execução</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(rule => {
                  const TriggerIcon = triggerIcons[rule.trigger_type]
                  const ruleStats = getRuleStats(rule.id)

                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggle(rule.id, rule.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <TriggerIcon className="h-3 w-3" />
                          {triggerLabels[rule.trigger_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {actionLabels[rule.action_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {ruleStats?.execution_count || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 font-medium">
                          {ruleStats?.success_count || 0}
                        </span>
                        {ruleStats && ruleStats.failed_count > 0 && (
                          <span className="text-red-600 ml-1">
                            / {ruleStats.failed_count}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.last_execution_at ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(rule.last_execution_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRule(rule)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewLogs(rule)}>
                              <Activity className="h-4 w-4 mr-2" />
                              Ver Logs
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(rule)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </div>
      </div>

      {/* Dialog components */}
      <AutomationRuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        rule={selectedRule}
        onSubmit={handleSubmitRule}
      />

      <AutomationLogsViewer
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        ruleId={selectedRuleForLogs?.id}
        ruleName={selectedRuleForLogs?.name}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a regra "{ruleToDelete?.name}"?
              Esta ação não pode ser desfeita e todos os logs relacionados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
