'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClientType } from '@/types/crm'
import { Loader2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface QuickClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientCreated?: (clientId: string, clientName: string) => void
}

interface CNPJData {
  nome?: string
  fantasia?: string
  email?: string
  telefone?: string
  cnpj?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
}

export function QuickClientDialog({ open, onOpenChange, onClientCreated }: QuickClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [searchingCNPJ, setSearchingCNPJ] = useState(false)
  const [cnpj, setCnpj] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'pessoa_fisica' as ClientType,
  })

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setCnpj('')
      setFormData({
        name: '',
        email: '',
        phone: '',
        type: 'pessoa_fisica' as ClientType,
      })
    }
  }, [open])

  // Função para buscar dados do CNPJ
  const searchCNPJ = async () => {
    const cleanCNPJ = cnpj.replace(/\D/g, '')

    if (cleanCNPJ.length !== 14) {
      toast.error('CNPJ inválido. Digite 14 números.')
      return
    }

    setSearchingCNPJ(true)

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)

      if (!response.ok) {
        throw new Error('CNPJ não encontrado')
      }

      const data: CNPJData = await response.json()

      // Preencher formulário com dados da API
      setFormData({
        name: data.nome || data.fantasia || '',
        email: data.email || '',
        phone: data.telefone || '',
        type: 'pessoa_juridica',
      })

      toast.success('Dados preenchidos automaticamente!')
    } catch (error: any) {
      console.error('Error fetching CNPJ:', error)
      toast.error('Erro ao buscar CNPJ. Verifique o número e tente novamente.')
    } finally {
      setSearchingCNPJ(false)
    }
  }

  // Máscara para CNPJ
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18)
  }

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

          {/* CNPJ - Apenas para Pessoa Jurídica */}
          {formData.type === 'pessoa_juridica' && (
            <div>
              <Label htmlFor="quick-cnpj">CNPJ</Label>
              <div className="flex gap-2">
                <Input
                  id="quick-cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={searchCNPJ}
                  disabled={searchingCNPJ || cnpj.replace(/\D/g, '').length !== 14}
                >
                  {searchingCNPJ ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Digite o CNPJ e clique na lupa para buscar os dados automaticamente
              </p>
            </div>
          )}

          {/* Nome */}
          <div>
            <Label htmlFor="quick-name">Nome *</Label>
            <Input
              id="quick-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome completo ou razão social"
              required
              autoFocus={formData.type === 'pessoa_fisica'}
            />
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
