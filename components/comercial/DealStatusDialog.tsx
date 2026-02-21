'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, TrophyIcon, XCircle } from 'lucide-react'
import { Deal } from '@/types/pipeline'

interface DealStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal?: Deal
  onUpdateStatus: (dealId: string, status: 'won' | 'lost', lostReason?: string) => Promise<void>
}

const LOST_REASONS = [
  { value: 'preco', label: 'Preço muito alto' },
  { value: 'concorrente', label: 'Fechou com concorrente' },
  { value: 'orcamento', label: 'Sem orçamento' },
  { value: 'timing', label: 'Timing inadequado' },
  { value: 'requisitos', label: 'Não atende os requisitos' },
  { value: 'sem_resposta', label: 'Cliente não responde' },
  { value: 'desistiu', label: 'Cliente desistiu do projeto' },
  { value: 'outros', label: 'Outros motivos' },
]

export function DealStatusDialog({ open, onOpenChange, deal, onUpdateStatus }: DealStatusDialogProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'won' | 'lost'>('won')
  const [lostReason, setLostReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!deal) return

    setLoading(true)

    try {
      const finalReason = lostReason === 'outros'
        ? customReason
        : LOST_REASONS.find(r => r.value === lostReason)?.label

      await onUpdateStatus(deal.id, status, status === 'lost' ? finalReason : undefined)

      onOpenChange(false)

      // Reset form
      setStatus('won')
      setLostReason('')
      setCustomReason('')
    } catch (error) {
      console.error('Error updating deal status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!deal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Status do Negócio</DialogTitle>
          <DialogDescription>
            Como você gostaria de marcar este negócio?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Deal */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm mb-1">{deal.title}</h4>
            {deal.client && (
              <p className="text-xs text-muted-foreground">Cliente: {deal.client.name}</p>
            )}
            {deal.value && (
              <p className="text-xs text-muted-foreground mt-1">
                Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
              </p>
            )}
          </div>

          {/* Seleção de Status */}
          <div className="space-y-3">
            <Label>Resultado do Negócio *</Label>
            <RadioGroup value={status} onValueChange={(value: 'won' | 'lost') => setStatus(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="won" id="won" />
                <Label htmlFor="won" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrophyIcon className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold">Negócio Ganho</p>
                    <p className="text-xs text-muted-foreground">Cliente fechou o contrato</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="lost" id="lost" />
                <Label htmlFor="lost" className="flex items-center gap-2 cursor-pointer flex-1">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold">Negócio Perdido</p>
                    <p className="text-xs text-muted-foreground">Cliente não fechou</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Motivo da Perda - apenas se status for 'lost' */}
          {status === 'lost' && (
            <div className="space-y-3">
              <Label htmlFor="lost-reason">Motivo da Perda *</Label>
              <RadioGroup value={lostReason} onValueChange={setLostReason}>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {LOST_REASONS.map((reason) => (
                    <div key={reason.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={reason.value} id={reason.value} />
                      <Label htmlFor={reason.value} className="cursor-pointer text-sm font-normal">
                        {reason.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              {/* Campo customizado para "Outros" */}
              {lostReason === 'outros' && (
                <div className="mt-3">
                  <Label htmlFor="custom-reason">Descreva o motivo *</Label>
                  <Textarea
                    id="custom-reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Explique porque o negócio foi perdido..."
                    rows={3}
                    required
                    className="mt-1.5"
                  />
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (status === 'lost' && (!lostReason || (lostReason === 'outros' && !customReason)))}
              className={status === 'won' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {status === 'won' ? 'Marcar como Ganho' : 'Marcar como Perdido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
