'use client'

import { useState, useEffect } from 'react'
import { Client, ClientType, ClientStatus, EstadoCivil, ESTADO_CIVIL_LABELS } from '@/types/crm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { User, FileText, MapPin, TrendingUp, Loader2, Building2, UserCircle, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSave: (client: any) => Promise<{ error: string | null }>
}

type Step = 1 | 2 | 3 | 4

export function ClientDialog({ open, onOpenChange, client, onSave }: ClientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [formData, setFormData] = useState({
    // Etapa 1: Dados Principais
    type: '' as '' | ClientType,
    cpf_cnpj: '',
    name: '',
    email: '',
    phone: '',
    status: 'active' as ClientStatus,
    notes: '',

    // Documentos - Pessoa Física
    rg: '',
    estado_civil: undefined as EstadoCivil | undefined,
    profissao: '',

    // Documentos - Pessoa Jurídica
    razao_social: '',
    representante_legal: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    website: '',

    // Etapa 2: Endereço
    address_zip: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',

    // Etapa 3: Documentos Adicionais (já preenchidos acima)

    // Etapa 4: Pipeline
    estimated_value: '',
    probability: '',
    pipeline_notes: '',
  })

  useEffect(() => {
    if (client) {
      setFormData({
        type: client.type || 'pessoa_fisica',
        cpf_cnpj: client.cpf_cnpj || '',
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        status: client.status || 'active',
        notes: client.notes || '',
        rg: client.rg || '',
        estado_civil: client.estado_civil,
        profissao: client.profissao || '',
        razao_social: client.razao_social || '',
        representante_legal: client.representante_legal || '',
        inscricao_estadual: client.inscricao_estadual || '',
        inscricao_municipal: client.inscricao_municipal || '',
        website: client.website || '',
        address_zip: client.address_zip || '',
        address_street: client.address_street || '',
        address_number: client.address_number || '',
        address_complement: client.address_complement || '',
        address_neighborhood: client.address_neighborhood || '',
        address_city: client.address_city || '',
        address_state: client.address_state || '',
        estimated_value: client.estimated_value ? String(client.estimated_value) : '',
        probability: client.probability ? String(client.probability) : '',
        pipeline_notes: client.notes || '',
      })
    } else {
      resetForm()
    }
    setCurrentStep(1)
  }, [client, open])

  const resetForm = () => {
    setFormData({
      type: '',
      cpf_cnpj: '',
      name: '',
      email: '',
      phone: '',
      status: 'active',
      notes: '',
      rg: '',
      estado_civil: undefined,
      profissao: '',
      razao_social: '',
      representante_legal: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      website: '',
      address_zip: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      estimated_value: '',
      probability: '',
      pipeline_notes: '',
    })
  }

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

  const formatDocument = (value: string, type: ClientType | ''): string => {
    if (!type) return value
    return type === 'pessoa_fisica' ? formatCPF(value) : formatCNPJ(value)
  }

  // Buscar dados por CPF
  const buscarCPF = async (cpf: string) => {
    const cpfNumeros = cpf.replace(/\D/g, '')
    if (cpfNumeros.length !== 11) return

    setLoadingDocument(true)
    try {
      // Validar CPF localmente
      if (!validarCPF(cpfNumeros)) {
        toast.error('CPF inválido')
        setLoadingDocument(false)
        return
      }

      // Tentar buscar dados usando API alternativa
      try {
        const response = await fetch(`https://api.invertexto.com/v1/validator?token=10782|pxhGy8hLRKykK2VyT0mGqmH2CvCfZxop&value=${cpfNumeros}`)
        const data = await response.json()

        if (data.valid && data.data?.name) {
          setFormData((prev) => ({
            ...prev,
            name: data.data.name || prev.name,
          }))
          toast.success('CPF válido! Dados encontrados.')
        } else {
          toast.success('CPF válido! Preencha os dados manualmente.')
        }
      } catch (apiError) {
        // Se a API falhar, apenas confirma que o CPF é válido
        toast.success('CPF válido! Preencha os dados manualmente.')
      }
    } catch (error) {
      console.error('Erro ao validar CPF:', error)
      toast.error('Erro ao validar CPF')
    } finally {
      setLoadingDocument(false)
    }
  }

  // Função para validar CPF
  const validarCPF = (cpf: string): boolean => {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

    let soma = 0
    let resto

    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (11 - i)
    }

    resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpf.substring(9, 10))) return false

    soma = 0
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i - 1, i)) * (12 - i)
    }

    resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpf.substring(10, 11))) return false

    return true
  }

  // Buscar dados por CNPJ
  const buscarCNPJ = async (cnpj: string) => {
    const cnpjNumeros = cnpj.replace(/\D/g, '')
    if (cnpjNumeros.length !== 14) return

    setLoadingDocument(true)
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjNumeros}`)
      const data = await response.json()

      if (data.message) {
        toast.info('CNPJ não encontrado')
        setLoadingDocument(false)
        return
      }

      // Preencher dados da empresa
      setFormData((prev) => ({
        ...prev,
        name: data.razao_social || prev.name,
        razao_social: data.razao_social || prev.razao_social,
        email: data.email || prev.email,
        phone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : prev.phone,
        address_street: data.logradouro || prev.address_street,
        address_number: data.numero || prev.address_number,
        address_complement: data.complemento || prev.address_complement,
        address_neighborhood: data.bairro || prev.address_neighborhood,
        address_city: data.municipio || prev.address_city,
        address_state: data.uf || prev.address_state,
        address_zip: data.cep ? formatCEP(data.cep) : prev.address_zip,
      }))

      // Se o CEP foi preenchido mas faltam dados de endereço, buscar no ViaCEP
      if (data.cep && (!data.logradouro || !data.bairro || !data.municipio)) {
        const cepNumeros = data.cep.replace(/\D/g, '')
        await buscarCEPComplementar(cepNumeros)
      }

      toast.success('Dados da empresa preenchidos automaticamente!')
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error)
      toast.error('Erro ao buscar dados do CNPJ')
    } finally {
      setLoadingDocument(false)
    }
  }

  // Buscar CEP complementar (chamado automaticamente pelo CNPJ se necessário)
  const buscarCEPComplementar = async (cepNumeros: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`)
      const data = await response.json()

      if (data.erro) return

      setFormData((prev) => ({
        ...prev,
        address_street: prev.address_street || data.logradouro || '',
        address_neighborhood: prev.address_neighborhood || data.bairro || '',
        address_city: prev.address_city || data.localidade || '',
        address_state: prev.address_state || data.uf || '',
      }))
    } catch (error) {
      console.error('Erro ao buscar CEP complementar:', error)
    }
  }

  // Buscar CEP
  const buscarCEP = async (cep: string) => {
    const cepNumeros = cep.replace(/\D/g, '')
    if (cepNumeros.length !== 8) return

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`)
      const data = await response.json()

      if (data.erro) {
        return
      }

      setFormData((prev) => ({
        ...prev,
        address_street: data.logradouro || prev.address_street,
        address_neighborhood: data.bairro || prev.address_neighborhood,
        address_city: data.localidade || prev.address_city,
        address_state: data.uf || prev.address_state,
      }))

      toast.success('Endereço preenchido automaticamente!')
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
    }
  }

  // Validação de etapas
  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.type && formData.cpf_cnpj && formData.name)
      case 2:
        return !!(formData.address_zip && formData.address_street && formData.address_number &&
                  formData.address_neighborhood && formData.address_city && formData.address_state)
      case 3:
        return true // Documentos são opcionais
      case 4:
        return true // Pipeline é opcional
      default:
        return false
    }
  }

  const nextStep = () => {
    if (!canProceedToNextStep()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const skipStep = () => {
    if (currentStep === 4) {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!canProceedToNextStep() && currentStep !== 4) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)

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
      resetForm()
    }
  }

  const getStepTitle = (step: Step): string => {
    const titles = {
      1: 'Dados Principais',
      2: 'Endereço',
      3: 'Documentos',
      4: 'Pipeline'
    }
    return titles[step]
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
              step < currentStep
                ? 'bg-primary border-primary text-primary-foreground'
                : step === currentStep
                ? 'border-primary text-primary'
                : 'border-muted-foreground/30 text-muted-foreground'
            }`}
          >
            {step < currentStep ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 4 && (
            <div
              className={`w-12 h-0.5 mx-1 ${
                step < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogDescription>
            Etapa {currentStep} de 4: {getStepTitle(currentStep)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
          <div className="px-6 py-6">
            {renderStepIndicator()}

            {/* ETAPA 1: DADOS PRINCIPAIS */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Identificação</h3>
                  </div>

                  {/* Tipo de Pessoa */}
                  <div>
                    <Label className="text-sm font-medium">
                      Tipo de Pessoa <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={formData.type}
                      onValueChange={(value: ClientType) => {
                        setFormData({ ...formData, type: value, cpf_cnpj: '' })
                      }}
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2 border rounded-lg p-4 flex-1 cursor-pointer hover:border-primary transition-colors">
                        <RadioGroupItem value="pessoa_fisica" id="pf" />
                        <Label htmlFor="pf" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Pessoa Física</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">CPF</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-4 flex-1 cursor-pointer hover:border-primary transition-colors">
                        <RadioGroupItem value="pessoa_juridica" id="pj" />
                        <Label htmlFor="pj" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">Pessoa Jurídica</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">CNPJ</p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* CPF/CNPJ */}
                  {formData.type && (
                    <div>
                      <Label htmlFor="cpf_cnpj" className="text-sm font-medium">
                        {formData.type === 'pessoa_fisica' ? 'CPF' : 'CNPJ'} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="cpf_cnpj"
                          value={formData.cpf_cnpj}
                          onChange={(e) =>
                            setFormData({ ...formData, cpf_cnpj: formatDocument(e.target.value, formData.type) })
                          }
                          onBlur={(e) => {
                            const value = e.target.value
                            if (formData.type === 'pessoa_fisica') {
                              buscarCPF(value)
                            } else {
                              buscarCNPJ(value)
                            }
                          }}
                          placeholder={formData.type === 'pessoa_fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                          maxLength={formData.type === 'pessoa_fisica' ? 14 : 18}
                          required
                          className="mt-1.5"
                        />
                        {loadingDocument && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 {formData.type === 'pessoa_fisica'
                          ? 'O CPF será validado após digitar'
                          : 'Todos os dados (empresa e endereço) serão preenchidos automaticamente'}
                      </p>
                    </div>
                  )}

                  {/* Nome */}
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      {formData.type === 'pessoa_juridica' ? 'Razão Social' : 'Nome Completo'}{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={formData.type === 'pessoa_juridica' ? 'Ex: Empresa LTDA' : 'Ex: João Silva'}
                      required
                      className="mt-1.5"
                    />
                  </div>

                  {/* Email e Telefone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  {/* Status */}
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

                  {/* Observações */}
                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">Observações</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Informações adicionais..."
                      className="mt-1.5 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: ENDEREÇO */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Localização</h3>
                  </div>

                  {/* CEP */}
                  <div>
                    <Label htmlFor="address_zip" className="text-sm font-medium">
                      CEP <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address_zip"
                      value={formData.address_zip}
                      onChange={(e) => setFormData({ ...formData, address_zip: formatCEP(e.target.value) })}
                      onBlur={(e) => buscarCEP(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      required
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 O endereço será preenchido automaticamente
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-4">
                      <Label htmlFor="address_street" className="text-sm font-medium">
                        Logradouro <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address_street"
                        value={formData.address_street}
                        onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                        placeholder="Rua, Avenida, etc."
                        required
                        className="mt-1.5"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="address_number" className="text-sm font-medium">
                        Número <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address_number"
                        value={formData.address_number}
                        onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                        placeholder="Nº"
                        required
                        className="mt-1.5"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <Label htmlFor="address_complement" className="text-sm font-medium">Complemento</Label>
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
                        Bairro <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address_neighborhood"
                        value={formData.address_neighborhood}
                        onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                        placeholder="Nome do bairro"
                        required
                        className="mt-1.5"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <Label htmlFor="address_city" className="text-sm font-medium">
                        Cidade <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address_city"
                        value={formData.address_city}
                        onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                        placeholder="Nome da cidade"
                        required
                        className="mt-1.5"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="address_state" className="text-sm font-medium">
                        UF <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address_state"
                        value={formData.address_state}
                        onChange={(e) =>
                          setFormData({ ...formData, address_state: e.target.value.toUpperCase() })
                        }
                        placeholder="SP"
                        maxLength={2}
                        required
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: DOCUMENTOS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {formData.type === 'pessoa_fisica' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">Documentos Adicionais</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <div className="md:col-span-2">
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
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">Documentos da Empresa</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            )}

            {/* ETAPA 4: PIPELINE (OPCIONAL) */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Oportunidade de Negócio (Opcional)</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimated_value" className="text-sm font-medium">Valor Estimado (R$)</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          id="estimated_value"
                          value={formData.estimated_value}
                          onChange={(e) => setFormData({ ...formData, estimated_value: formatCurrency(e.target.value) })}
                          placeholder="0,00"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="probability" className="text-sm font-medium">Probabilidade (%)</Label>
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="pipeline_notes" className="text-sm font-medium">Observações de Negociação</Label>
                      <Textarea
                        id="pipeline_notes"
                        value={formData.pipeline_notes}
                        onChange={(e) => setFormData({ ...formData, pipeline_notes: e.target.value })}
                        rows={4}
                        placeholder="Detalhes sobre a negociação..."
                        className="mt-1.5 resize-none"
                      />
                    </div>

                    {formData.estimated_value && formData.probability && (
                      <div className="md:col-span-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Valor Ponderado</span>
                          <span className="text-xl font-bold text-primary">
                            R${' '}
                            {(
                              parseCurrency(formData.estimated_value) *
                              (Number(formData.probability) / 100)
                            ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer com botões de navegação */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} disabled={loading}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep === 4 && (
                <Button type="button" variant="ghost" onClick={skipStep} disabled={loading}>
                  Pular Etapa
                </Button>
              )}

              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep} disabled={!canProceedToNextStep()}>
                  Próxima Etapa
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {client ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
                </Button>
              )}
            </div>
          </div>

          {currentStep < 4 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              <span className="text-red-500">*</span> Campos obrigatórios
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
