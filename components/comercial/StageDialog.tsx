'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PipelineStage } from '@/types/pipeline'
import { Loader2 } from 'lucide-react'

interface StageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stage?: PipelineStage
  onSave: (data: { name: string; description?: string; color: string }) => Promise<void>
}

const PRESET_COLORS = [
  '#6B7280', // Gray
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
]

export function StageDialog({ open, onOpenChange, stage, onSave }: StageDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  })

  useEffect(() => {
    if (stage) {
      setFormData({
        name: stage.name,
        description: stage.description || '',
        color: stage.color,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
      })
    }
  }, [stage, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving stage:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stage ? 'Editar Estágio' : 'Novo Estágio'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome do Estágio *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Negociação"
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
              placeholder="Descrição opcional do estágio..."
              rows={2}
            />
          </div>

          {/* Cor */}
          <div>
            <Label>Cor do Estágio</Label>
            <div className="flex items-center gap-2 mt-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className="w-10 h-10 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: formData.color === color ? '#000' : 'transparent',
                  }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-sm text-muted-foreground">{formData.color}</span>
            </div>
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
              {stage ? 'Salvar Alterações' : 'Criar Estágio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
