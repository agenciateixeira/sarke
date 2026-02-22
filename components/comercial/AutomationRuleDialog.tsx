'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AutomationRule,
  AutomationRuleFormData,
  AutomationTriggerType,
  AutomationActionType,
  Temperature,
  BusinessType,
  LeadSource,
  DealStatus,
} from '@/types/pipeline'
import { Loader2 } from 'lucide-react'
import { usePipeline } from '@/hooks/usePipeline'
import { supabase } from '@/lib/supabase'

interface AutomationRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: AutomationRule
  onSubmit: (data: AutomationRuleFormData) => Promise<void>
}

const TRIGGER_TYPES: { value: AutomationTriggerType; label: string; description: string }[] = [
  { value: 'stage_changed', label: 'Mudança de Etapa', description: 'Quando o deal muda de etapa' },
  { value: 'time_in_stage', label: 'Tempo na Etapa', description: 'Após X dias na mesma etapa' },
  { value: 'inactivity', label: 'Inatividade', description: 'Sem atividades há X dias' },
  { value: 'temperature_changed', label: 'Mudança de Temperatura', description: 'Quando temperatura muda' },
  { value: 'value_changed', label: 'Mudança de Valor', description: 'Quando valor do deal muda' },
  { value: 'scheduled', label: 'Agendado', description: 'Execução diária/semanal' },
]

const ACTION_TYPES: { value: AutomationActionType; label: string; description: string }[] = [
  { value: 'move_to_stage', label: 'Mover para Etapa', description: 'Move o deal para outra etapa' },
  { value: 'create_task', label: 'Criar Tarefa', description: 'Cria uma tarefa no deal' },
  { value: 'send_notification', label: 'Enviar Notificação', description: 'Notifica usuários específicos' },
  { value: 'change_temperature', label: 'Alterar Temperatura', description: 'Muda a temperatura do lead' },
  { value: 'archive_deal', label: 'Arquivar Deal', description: 'Arquiva o deal automaticamente' },
  { value: 'assign_owner', label: 'Atribuir Responsável', description: 'Atribui um novo responsável' },
]

export function AutomationRuleDialog({ open, onOpenChange, rule, onSubmit }: AutomationRuleDialogProps) {
  const { stages } = usePipeline()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState<AutomationRuleFormData>({
    name: '',
    description: '',
    is_active: true,
    trigger_type: 'stage_changed',
    conditions: {},
    action_type: 'create_task',
    action_params: {},
    priority: 100,
  })

  // Carregar dados da regra existente
  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description,
        is_active: rule.is_active,
        trigger_type: rule.trigger_type,
        conditions: rule.conditions,
        action_type: rule.action_type,
        action_params: rule.action_params,
        priority: rule.priority,
      })
    } else {
      // Reset form
      setFormData({
        name: '',
        description: '',
        is_active: true,
        trigger_type: 'stage_changed',
        conditions: {},
        action_type: 'create_task',
        action_params: {},
        priority: 100,
      })
    }
  }, [rule, open])

  // Buscar usuários do sistema
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .order('name')

      if (!error && data) {
        setUsers(data)
      }
    }

    if (open) {
      fetchUsers()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting automation rule:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderConditionsFields = () => {
    switch (formData.trigger_type) {
      case 'stage_changed':
        return (
          <div className="space-y-2">
            <Label>Executar Quando Chegar em Qual Etapa?</Label>
            <Select
              value={formData.conditions.stage_id || 'all'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  conditions: {
                    ...formData.conditions,
                    stage_id: value === 'all' ? undefined : value,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as etapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer Mudança de Etapa</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    Quando chegar em: {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha "Qualquer" para executar em toda mudança ou selecione uma etapa específica
            </p>
          </div>
        )

      case 'time_in_stage':
        return (
          <div className="space-y-2">
            <Label>Dias na Etapa</Label>
            <Input
              type="number"
              placeholder="Ex: 7"
              value={formData.conditions.days_in_stage || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  conditions: {
                    ...formData.conditions,
                    days_in_stage: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Executar após X dias na mesma etapa
            </p>
          </div>
        )

      case 'inactivity':
        return (
          <div className="space-y-2">
            <Label>Dias Sem Atividade</Label>
            <Input
              type="number"
              placeholder="Ex: 14"
              value={formData.conditions.days_without_activity || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  conditions: {
                    ...formData.conditions,
                    days_without_activity: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Executar após X dias sem nenhuma atividade
            </p>
          </div>
        )

      default:
        return null
    }
  }

  const renderActionFields = () => {
    switch (formData.action_type) {
      case 'move_to_stage':
        return (
          <div className="space-y-2">
            <Label>Etapa de Destino *</Label>
            <Select
              value={formData.action_params.target_stage_id || ''}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  action_params: { ...formData.action_params, target_stage_id: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'create_task':
        return (
          <>
            <div className="space-y-2">
              <Label>Título da Tarefa *</Label>
              <Input
                placeholder="Ex: Follow-up necessário"
                value={formData.action_params.title || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    action_params: { ...formData.action_params, title: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes da tarefa..."
                value={formData.action_params.description || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    action_params: { ...formData.action_params, description: e.target.value },
                  })
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Atribuir Para</Label>
              <Select
                value={formData.action_params.assign_to || 'owner'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    action_params: {
                      ...formData.action_params,
                      assign_to: value === 'owner' ? undefined : value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    👤 Responsável do Deal (padrão)
                  </SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      👨‍💼 {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Por padrão, atribui ao responsável do deal. Ou escolha uma pessoa específica.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.action_params.priority || 'normal'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    action_params: { ...formData.action_params, priority: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Baixa</SelectItem>
                  <SelectItem value="normal">🟡 Normal</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="urgent">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vencimento (dias)</Label>
              <Input
                type="number"
                placeholder="Ex: 3"
                value={formData.action_params.due_days || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    action_params: {
                      ...formData.action_params,
                      due_days: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Tarefa vencerá em X dias a partir da execução
              </p>
            </div>
          </>
        )

      case 'change_temperature':
        return (
          <div className="space-y-2">
            <Label>Nova Temperatura *</Label>
            <Select
              value={formData.action_params.temperature || ''}
              onValueChange={(value: Temperature) =>
                setFormData({
                  ...formData,
                  action_params: { ...formData.action_params, temperature: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a temperatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quente">🔥 Quente</SelectItem>
                <SelectItem value="morno">☀️ Morno</SelectItem>
                <SelectItem value="frio">❄️ Frio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )

      case 'send_notification':
        return (
          <div className="space-y-2">
            <Label>Mensagem da Notificação *</Label>
            <Textarea
              placeholder="Ex: Este deal está inativo há muito tempo"
              value={formData.action_params.message || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  action_params: { ...formData.action_params, message: e.target.value },
                })
              }
              rows={3}
            />
          </div>
        )

      case 'archive_deal':
        return (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Esta ação arquivará automaticamente o deal quando as condições forem atendidas.
              Nenhum parâmetro adicional é necessário.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar Regra' : 'Nova Regra'} de Automação</DialogTitle>
          <DialogDescription>
            Configure quando e como a automação deve ser executada
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informações Básicas</h3>

            <div className="space-y-2">
              <Label>Nome da Regra *</Label>
              <Input
                placeholder="Ex: Arquivar deals inativos"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o que esta regra faz..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label className="cursor-pointer">Regra ativa</Label>
            </div>
          </div>

          {/* Trigger */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Quando Executar (Trigger)</h3>

            <div className="space-y-2">
              <Label>Tipo de Trigger *</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value: AutomationTriggerType) =>
                  setFormData({ ...formData, trigger_type: value, conditions: {} })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderConditionsFields()}
          </div>

          {/* Action */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">O que Fazer (Ação)</h3>

            <div className="space-y-2">
              <Label>Tipo de Ação *</Label>
              <Select
                value={formData.action_type}
                onValueChange={(value: AutomationActionType) =>
                  setFormData({ ...formData, action_type: value, action_params: {} })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderActionFields()}
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Input
              type="number"
              placeholder="100"
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value ? parseInt(e.target.value) : 100,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Regras com menor prioridade executam primeiro (padrão: 100)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : rule ? (
                'Salvar Alterações'
              ) : (
                'Criar Regra'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
