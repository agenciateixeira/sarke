'use client'

import { useEffect, useState } from 'react'
import { usePipelineAutomations } from '@/hooks/usePipelineAutomations'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { CheckCircle2, XCircle, MinusCircle, Undo2, Loader2, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AutomationLog } from '@/types/pipeline'

interface AutomationLogsViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruleId?: string
  ruleName?: string
}

export function AutomationLogsViewer({ open, onOpenChange, ruleId, ruleName }: AutomationLogsViewerProps) {
  const { logs, actions, loading, fetchLogs, fetchActions, undoAction } = usePipelineAutomations()
  const [undoAlertOpen, setUndoAlertOpen] = useState(false)
  const [actionToUndo, setActionToUndo] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (open) {
      fetchLogs(undefined, 100) // Buscar últimos 100 logs
      fetchActions()
    }
  }, [open])

  const filteredLogs = ruleId ? logs.filter(log => log.rule_id === ruleId) : logs

  const getActionForLog = (logId: string) => {
    return actions.find(action => action.log_id === logId)
  }

  const handleUndo = (actionId: string) => {
    setActionToUndo(actionId)
    setUndoAlertOpen(true)
  }

  const confirmUndo = async () => {
    if (actionToUndo) {
      await undoAction(actionToUndo)
      setUndoAlertOpen(false)
      setActionToUndo(undefined)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'skipped':
        return <MinusCircle className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600">Sucesso</Badge>
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>
      case 'skipped':
        return <Badge variant="secondary">Ignorado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Histórico de Execuções {ruleName && `- ${ruleName}`}
          </DialogTitle>
          <DialogDescription>
            Visualize todas as execuções de automações e desfaça ações se necessário
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <Activity className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma execução registrada</p>
            <p className="text-sm">As automações aparecerão aqui quando forem executadas</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Executado</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const action = getActionForLog(log.id)
                  const canUndo = action && action.can_undo && !action.undone_at

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {log.trigger_data?.deal_title || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.trigger_data?.trigger_type || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {action && (
                          <Badge variant="secondary">
                            {action.action_type.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.status === 'success' && log.action_result && (
                          <div className="text-sm">
                            {JSON.stringify(log.action_result, null, 2)
                              .split('\n')
                              .slice(0, 2)
                              .join(' ')
                              .substring(0, 100)}
                          </div>
                        )}
                        {log.status === 'failed' && log.error_message && (
                          <p className="text-sm text-red-600">{log.error_message}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(log.executed_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canUndo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUndo(action.id)}
                            title="Desfazer esta ação"
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                        {action && action.undone_at && (
                          <Badge variant="outline" className="text-xs">
                            Desfeito
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>

      {/* Confirmação de desfazer ação */}
      <AlertDialog open={undoAlertOpen} onOpenChange={setUndoAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desfazer</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desfazer esta ação de automação?
              Esta ação tentará reverter as mudanças feitas pela automação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUndo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
