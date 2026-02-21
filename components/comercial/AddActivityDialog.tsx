'use client'

import { useState } from 'react'
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
import { ActivityType, DealActivityFormData } from '@/types/pipeline'
import { Phone, Mail, Calendar, FileText, CheckCircle2 } from 'lucide-react'

interface AddActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: DealActivityFormData) => Promise<void>
}

const activityTypes: { value: ActivityType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'note', label: 'Nota', icon: FileText },
  { value: 'call', label: 'Ligação', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Reunião', icon: Calendar },
  { value: 'task', label: 'Tarefa', icon: CheckCircle2 },
]

export function AddActivityDialog({ open, onOpenChange, onSubmit }: AddActivityDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<DealActivityFormData>({
    type: 'note',
    title: '',
    description: '',
    due_date: undefined,
    duration_minutes: undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevenir que o evento suba para o form pai (DealDialog)
    setLoading(true)

    try {
      await onSubmit(formData)
      onOpenChange(false)
      // Reset form
      setFormData({
        type: 'note',
        title: '',
        description: '',
        due_date: undefined,
        duration_minutes: undefined,
      })
    } catch (error) {
      console.error('Error submitting activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedType = activityTypes.find(t => t.type === formData.type)
  const SelectedIcon = selectedType?.icon || FileText

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Atividade</DialogTitle>
          <DialogDescription>
            Registre uma nova interação, nota ou tarefa neste negócio
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Atividade */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Atividade</Label>
            <Select
              value={formData.type}
              onValueChange={(value: ActivityType) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map(({ value, label, icon: Icon }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder={
                formData.type === 'note'
                  ? 'Ex: Cliente demonstrou interesse em...'
                  : formData.type === 'call'
                  ? 'Ex: Ligação para apresentar proposta'
                  : formData.type === 'email'
                  ? 'Ex: Email com documentação solicitada'
                  : formData.type === 'meeting'
                  ? 'Ex: Reunião de alinhamento'
                  : 'Ex: Enviar proposta comercial'
              }
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Detalhes sobre a atividade..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          {/* Duração (para calls e meetings) */}
          {(formData.type === 'call' || formData.type === 'meeting') && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Ex: 30"
                value={formData.duration_minutes || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    duration_minutes: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>
          )}

          {/* Data de vencimento (para tasks) */}
          {formData.type === 'task' && (
            <div className="space-y-2">
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="datetime-local"
                value={formData.due_date || ''}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.title}>
              {loading ? 'Salvando...' : 'Adicionar Atividade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
