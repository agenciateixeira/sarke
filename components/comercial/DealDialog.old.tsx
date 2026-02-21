'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Deal, DealFormData, PipelineStage } from '@/types/pipeline'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  name: string
}

interface DealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal?: Deal
  stages: PipelineStage[]
  onSave: (data: DealFormData) => Promise<void>
}

export function DealDialog({ open, onOpenChange, deal, stages, onSave }: DealDialogProps) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState<DealFormData>({
    title: '',
    description: '',
    client_id: '',
    stage_id: stages[0]?.id || '',
    value: undefined,
    probability: 50,
    expected_close_date: '',
  })

  // Carregar clientes
  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')

      if (data) setClients(data)
    }

    fetchClients()
  }, [])

  // Preencher formulário se for edição
  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title,
        description: deal.description || '',
        client_id: deal.client_id || '',
        stage_id: deal.stage_id,
        value: deal.value,
        probability: deal.probability,
        expected_close_date: deal.expected_close_date || '',
      })
    } else {
      // Reset ao abrir para criar
      setFormData({
        title: '',
        description: '',
        client_id: '',
        stage_id: stages[0]?.id || '',
        value: undefined,
        probability: 50,
        expected_close_date: '',
      })
    }
  }, [deal, stages, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving deal:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{deal ? 'Editar Negócio' : 'Novo Negócio'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Venda de serviço de arquitetura"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes do negócio..."
              rows={3}
            />
          </div>

          {/* Cliente e Estágio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client">Cliente</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stage">Estágio *</Label>
              <Select
                value={formData.stage_id}
                onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor e Probabilidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value || ''}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || undefined })}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label htmlFor="probability">Probabilidade (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 50 })}
              />
            </div>
          </div>

          {/* Data esperada */}
          <div>
            <Label htmlFor="expected_close_date">Data prevista de fechamento</Label>
            <Input
              id="expected_close_date"
              type="date"
              value={formData.expected_close_date}
              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
            />
          </div>

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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {deal ? 'Salvar Alterações' : 'Criar Negócio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
