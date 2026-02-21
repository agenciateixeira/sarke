'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClientType } from '@/types/crm'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface QuickClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientCreated?: (clientId: string, clientName: string) => void
}

export function QuickClientDialog({ open, onOpenChange, onClientCreated }: QuickClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'pessoa_fisica' as ClientType,
  })

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        type: 'pessoa_fisica' as ClientType,
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          type: formData.type,
          status: 'prospect', // Novo cliente começa como prospect
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Cliente criado com sucesso!')
      onClientCreated?.(data.id, data.name)
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error creating client:', error)
      toast.error('Erro ao criar cliente', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="quick-name">Nome *</Label>
            <Input
              id="quick-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome completo ou razão social"
              required
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div>
            <Label htmlFor="quick-type">Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: ClientType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="quick-email">E-mail</Label>
            <Input
              id="quick-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="cliente@exemplo.com"
            />
          </div>

          {/* Telefone */}
          <div>
            <Label htmlFor="quick-phone">Telefone</Label>
            <Input
              id="quick-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Cadastro rápido:</strong> Preencha os dados básicos agora. Você poderá adicionar mais informações depois na página de Clientes.
            </p>
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
              Criar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
