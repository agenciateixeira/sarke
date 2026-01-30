'use client'

import { useState, useEffect } from 'react'
import { Client, ClientType, ClientStatus, EstadoCivil, ESTADO_CIVIL_LABELS } from '@/types/crm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, FileText, MapPin, TrendingUp, Loader2, Building2, UserCircle } from 'lucide-react'

interface ClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSave: (client: any) => Promise<{ error: string | null }>
}

export function ClientDialog({ open, onOpenChange, client, onSave }: ClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('geral')
  const [formData, setFormData] = useState({
    // Informações Gerais
    name: '',
    email: '',
    phone: '',
    type: 'pessoa_fisica' as ClientType,
    status: 'active' as ClientStatus,
    notes: '',

    // Documentos - Pessoa Física
    cpf_cnpj: '',
    rg: '',
    estado_civil: undefined as EstadoCivil | undefined,
    profissao: '',

    // Documentos - Pessoa Jurídica
    razao_social: '',
    representante_legal: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    website: '',

    // Endereço
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zip: '',

    // Pipeline
    estimated_value: '',
    probability: '',
    pipeline_notes: '',
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        type: client.type || 'pessoa_fisica',
        status: client.status || 'active',
        notes: client.notes || '',

        cpf_cnpj: client.cpf_cnpj || '',
        rg: client.rg || '',
        estado_civil: client.estado_civil,
        profissao: client.profissao || '',

        razao_social: client.razao_social || '',
        representante_legal: client.representante_legal || '',
        inscricao_estadual: client.inscricao_estadual || '',
        inscricao_municipal: client.inscricao_municipal || '',
        website: client.website || '',

        address_street: client.address_street || '',
        address_number: client.address_number || '',
        address_complement: client.address_complement || '',
        address_neighborhood: client.address_neighborhood || '',
        address_city: client.address_city || '',
        address_state: client.address_state || '',
        address_zip: client.address_zip || '',

        estimated_value: client.estimated_value ? String(client.estimated_value) : '',
        probability: client.probability ? String(client.probability) : '',
        pipeline_notes: client.notes || '',
      })
    } else {
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        type: 'pessoa_fisica',
        status: 'active',
        notes: '',
        cpf_cnpj: '',
        rg: '',
        estado_civil: undefined,
        profissao: '',
        razao_social: '',
        representante_legal: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        website: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        address_zip: '',
        estimated_value: '',
        probability: '',
        pipeline_notes: '',
      })
    }
    setActiveTab('geral')
  }, [client, open])

  // Formatadores
  const formatCurrency = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    const amount = Number(numbers) / 100
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const parseCurrency = (value: string): number => {
    const numbers = value.replace(/\D/g, '')
    return Number(numbers) / 100
  }

  const handleCurrencyChange = (value: string) => {
    setFormData({ ...formData, estimated_value: formatCurrency(value) })
  }

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
  }

  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
  }

  const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 14)
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5')
  }

  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 8)
    return numbers.replace(/(\d{5})(\d{0,3})/, '$1-$2')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Preparar dados para envio
    const dataToSave = {
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      type: formData.type,
      status: formData.status,
      notes: formData.notes || undefined,

      cpf_cnpj: formData.cpf_cnpj || undefined,
      rg: formData.rg || undefined,
      estado_civil: formData.estado_civil,
      profissao: formData.profissao || undefined,

      razao_social: formData.razao_social || undefined,
      representante_legal: formData.representante_legal || undefined,
      inscricao_estadual: formData.inscricao_estadual || undefined,
      inscricao_municipal: formData.inscricao_municipal || undefined,
      website: formData.website || undefined,

      address_street: formData.address_street || undefined,
      address_number: formData.address_number || undefined,
      address_complement: formData.address_complement || undefined,
      address_neighborhood: formData.address_neighborhood || undefined,
      address_city: formData.address_city || undefined,
      address_state: formData.address_state || undefined,
      address_zip: formData.address_zip || undefined,

      estimated_value: formData.estimated_value ? parseCurrency(formData.estimated_value) : undefined,
      probability: formData.probability ? Number(formData.probability) : undefined,
    }

    const { error } = await onSave(dataToSave)

    setLoading(false)

    if (!error) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {client ? 'Atualize as informações do cliente' : 'Cadastre um novo cliente no sistema'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="border-b px-6">
              <TabsList className="grid w-full grid-cols-4 bg-transparent">
                <TabsTrigger
                  value="geral"
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Informações Gerais</span>
                  <span className="sm:hidden">Geral</span>
                </TabsTrigger>
                <TabsTrigger
                  value="documentos"
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <FileText className="h-4 w-4" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger
                  value="endereco"
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <MapPin className="h-4 w-4" />
                  Endereço
                </TabsTrigger>
                <TabsTrigger
                  value="pipeline"
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <TrendingUp className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 max-h-[calc(90vh-280px)]">
              <div className="px-6 py-6">
                {/* ABA: INFORMAÇÕES GERAIS */}
                <TabsContent value="geral" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">Dados Principais</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Nome Completo <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: João Silva"
                          required
                          className="mt-1.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="type" className="text-sm font-medium">
                          Tipo <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value: ClientType) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pessoa_fisica">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Pessoa Física
                              </div>
                            </SelectItem>
                            <SelectItem value="pessoa_juridica">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Pessoa Jurídica
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="status" className="text-sm font-medium">
                          Status <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: ClientStatus) => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                Ativo
                              </span>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-gray-400" />
                                Inativo
                              </span>
                            </SelectItem>
                            <SelectItem value="prospect">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                Prospect
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          className="mt-1.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                          className="mt-1.5"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="notes" className="text-sm font-medium">Observações</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={4}
                          placeholder="Informações adicionais sobre o cliente..."
                          className="mt-1.5 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA: DOCUMENTOS */}
                <TabsContent value="documentos" className="mt-0 space-y-6">
                  {formData.type === 'pessoa_fisica' ? (
                    // Documentos Pessoa Física
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">Documentos Pessoais</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cpf_cnpj" className="text-sm font-medium">CPF</Label>
                          <Input
                            id="cpf_cnpj"
                            value={formData.cpf_cnpj}
                            onChange={(e) => setFormData({ ...formData, cpf_cnpj: formatCPF(e.target.value) })}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="rg" className="text-sm font-medium">RG</Label>
                          <Input
                            id="rg"
                            value={formData.rg}
                            onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                            placeholder="00.000.000-0"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="estado_civil" className="text-sm font-medium">Estado Civil</Label>
                          <Select
                            value={formData.estado_civil}
                            onValueChange={(value: EstadoCivil) => setFormData({ ...formData, estado_civil: value })}
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ESTADO_CIVIL_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="profissao" className="text-sm font-medium">Profissão</Label>
                          <Input
                            id="profissao"
                            value={formData.profissao}
                            onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                            placeholder="Ex: Engenheiro, Médico..."
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Documentos Pessoa Jurídica
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">Documentos da Empresa</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cpf_cnpj" className="text-sm font-medium">CNPJ</Label>
                          <Input
                            id="cpf_cnpj"
                            value={formData.cpf_cnpj}
                            onChange={(e) => setFormData({ ...formData, cpf_cnpj: formatCNPJ(e.target.value) })}
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="razao_social" className="text-sm font-medium">Razão Social</Label>
                          <Input
                            id="razao_social"
                            value={formData.razao_social}
                            onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                            placeholder="Nome legal da empresa"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="representante_legal" className="text-sm font-medium">
                            Representante Legal
                          </Label>
                          <Input
                            id="representante_legal"
                            value={formData.representante_legal}
                            onChange={(e) => setFormData({ ...formData, representante_legal: e.target.value })}
                            placeholder="Nome do representante"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="inscricao_estadual" className="text-sm font-medium">
                            Inscrição Estadual
                          </Label>
                          <Input
                            id="inscricao_estadual"
                            value={formData.inscricao_estadual}
                            onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                            placeholder="IE"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="inscricao_municipal" className="text-sm font-medium">
                            Inscrição Municipal
                          </Label>
                          <Input
                            id="inscricao_municipal"
                            value={formData.inscricao_municipal}
                            onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                            placeholder="IM"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                          <Input
                            id="website"
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            placeholder="https://exemplo.com.br"
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ABA: ENDEREÇO */}
                <TabsContent value="endereco" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">Localização</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-4">
                        <Label htmlFor="address_street" className="text-sm font-medium">Rua</Label>
                        <Input
                          id="address_street"
                          value={formData.address_street}
                          onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                          placeholder="Nome da rua"
                          className="mt-1.5"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="address_number" className="text-sm font-medium">Número</Label>
                        <Input
                          id="address_number"
                          value={formData.address_number}
                          onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                          placeholder="Nº"
                          className="mt-1.5"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label htmlFor="address_complement" className="text-sm font-medium">
                          Complemento
                        </Label>
                        <Input
                          id="address_complement"
                          value={formData.address_complement}
                          onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                          placeholder="Apto, Bloco, etc."
                          className="mt-1.5"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label htmlFor="address_neighborhood" className="text-sm font-medium">
                          Bairro
                        </Label>
                        <Input
                          id="address_neighborhood"
                          value={formData.address_neighborhood}
                          onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                          placeholder="Nome do bairro"
                          className="mt-1.5"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label htmlFor="address_city" className="text-sm font-medium">Cidade</Label>
                        <Input
                          id="address_city"
                          value={formData.address_city}
                          onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                          placeholder="Nome da cidade"
                          className="mt-1.5"
                        />
                      </div>

                      <div className="md:col-span-1">
                        <Label htmlFor="address_state" className="text-sm font-medium">Estado</Label>
                        <Input
                          id="address_state"
                          value={formData.address_state}
                          onChange={(e) => setFormData({ ...formData, address_state: e.target.value.toUpperCase() })}
                          placeholder="UF"
                          maxLength={2}
                          className="mt-1.5"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="address_zip" className="text-sm font-medium">CEP</Label>
                        <Input
                          id="address_zip"
                          value={formData.address_zip}
                          onChange={(e) => setFormData({ ...formData, address_zip: formatCEP(e.target.value) })}
                          placeholder="00000-000"
                          maxLength={9}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA: PIPELINE */}
                <TabsContent value="pipeline" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">Oportunidade de Negócio</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="estimated_value" className="text-sm font-medium">
                          Valor Estimado (R$)
                        </Label>
                        <div className="relative mt-1.5">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            R$
                          </span>
                          <Input
                            id="estimated_value"
                            value={formData.estimated_value}
                            onChange={(e) => handleCurrencyChange(e.target.value)}
                            placeholder="0,00"
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Valor potencial do negócio
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="probability" className="text-sm font-medium">
                          Probabilidade de Fechamento (%)
                        </Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="probability"
                            type="number"
                            min="0"
                            max="100"
                            value={formData.probability}
                            onChange={(e) => {
                              const value = Math.min(100, Math.max(0, Number(e.target.value)))
                              setFormData({ ...formData, probability: String(value) })
                            }}
                            placeholder="0"
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            %
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Chance de fechar o negócio (0-100%)
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="pipeline_notes" className="text-sm font-medium">
                          Observações de Negociação
                        </Label>
                        <Textarea
                          id="pipeline_notes"
                          value={formData.pipeline_notes}
                          onChange={(e) => setFormData({ ...formData, pipeline_notes: e.target.value })}
                          rows={6}
                          placeholder="Detalhes sobre a negociação, interesses do cliente, próximos passos..."
                          className="mt-1.5 resize-none"
                        />
                      </div>

                      {formData.estimated_value && formData.probability && (
                        <div className="md:col-span-2 p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              Valor Ponderado
                            </span>
                            <span className="text-lg font-bold text-primary">
                              R$ {(parseCurrency(formData.estimated_value) * (Number(formData.probability) / 100))
                                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Valor estimado x probabilidade de fechamento
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <div className="flex w-full justify-between items-center">
              <p className="text-xs text-muted-foreground">
                <span className="text-red-500">*</span> Campos obrigatórios
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {client ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
