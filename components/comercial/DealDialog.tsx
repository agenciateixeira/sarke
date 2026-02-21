'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { TagInput } from '@/components/ui/tag-input'
import {
  Deal,
  DealFormData,
  PipelineStage,
  LeadSource,
  BusinessType,
  ServiceType,
  Temperature,
  Urgency
} from '@/types/pipeline'
import { Loader2, Flame, Snowflake, ThermometerSun } from 'lucide-react'
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

// Opções para os selects
const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'evento', label: 'Evento/Feira' },
  { value: 'cold_call', label: 'Ligação Fria' },
  { value: 'email_marketing', label: 'Email Marketing' },
  { value: 'parceria', label: 'Parceria' },
  { value: 'retorno', label: 'Cliente Retornando' },
  { value: 'outros', label: 'Outros' },
]

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'residencial', label: 'Residencial' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'publico', label: 'Público' },
]

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'projeto_arquitetonico', label: 'Projeto Arquitetônico' },
  { value: 'gestao_obra', label: 'Gestão de Obra' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'regularizacao', label: 'Regularização' },
  { value: 'reformas', label: 'Reformas' },
  { value: 'acompanhamento', label: 'Acompanhamento' },
  { value: 'outros', label: 'Outros' },
]

const TEMPERATURES: { value: Temperature; label: string; icon: any; color: string }[] = [
  { value: 'quente', label: 'Quente', icon: Flame, color: 'text-red-500' },
  { value: 'morno', label: 'Morno', icon: ThermometerSun, color: 'text-yellow-500' },
  { value: 'frio', label: 'Frio', icon: Snowflake, color: 'text-blue-500' },
]

const URGENCIES: { value: Urgency; label: string; color: string }[] = [
  { value: 'alta', label: 'Alta', color: 'destructive' },
  { value: 'media', label: 'Média', color: 'default' },
  { value: 'baixa', label: 'Baixa', color: 'secondary' },
]

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
    // Novos campos
    lead_source: undefined,
    lead_source_detail: '',
    business_type: undefined,
    service_type: undefined,
    temperature: 'morno',
    urgency: 'media',
    next_follow_up_date: '',
    tags: [],
    notes: '',
    competitors: '',
    decision_deadline: '',
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
        lead_source: deal.lead_source,
        lead_source_detail: deal.lead_source_detail || '',
        business_type: deal.business_type,
        service_type: deal.service_type,
        temperature: deal.temperature || 'morno',
        urgency: deal.urgency || 'media',
        next_follow_up_date: deal.next_follow_up_date || '',
        tags: deal.tags || [],
        notes: deal.notes || '',
        competitors: deal.competitors || '',
        decision_deadline: deal.decision_deadline || '',
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
        lead_source: undefined,
        lead_source_detail: '',
        business_type: undefined,
        service_type: undefined,
        temperature: 'morno',
        urgency: 'media',
        next_follow_up_date: '',
        tags: [],
        notes: '',
        competitors: '',
        decision_deadline: '',
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? 'Editar Negócio' : 'Novo Negócio'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basico">Informações Básicas</TabsTrigger>
              <TabsTrigger value="qualificacao">Qualificação</TabsTrigger>
              <TabsTrigger value="followup">Follow-up & Notas</TabsTrigger>
            </TabsList>

            {/* ABA 1: INFORMAÇÕES BÁSICAS */}
            <TabsContent value="basico" className="space-y-4">
              {/* Título */}
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Projeto residencial família Silva"
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
                  <Label htmlFor="probability">Probabilidade (%) *</Label>
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
                <Label htmlFor="expected_close_date">Data prevista de fechamento *</Label>
                <Input
                  id="expected_close_date"
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  required
                />
              </div>
            </TabsContent>

            {/* ABA 2: QUALIFICAÇÃO */}
            <TabsContent value="qualificacao" className="space-y-4">
              {/* Origem do Lead */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="lead_source">Origem do Lead *</Label>
                  <Select
                    value={formData.lead_source}
                    onValueChange={(value) => setFormData({ ...formData, lead_source: value as LeadSource })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo condicional para Indicação */}
                {formData.lead_source === 'indicacao' && (
                  <div>
                    <Label htmlFor="lead_source_detail">Quem indicou? *</Label>
                    <Input
                      id="lead_source_detail"
                      value={formData.lead_source_detail}
                      onChange={(e) => setFormData({ ...formData, lead_source_detail: e.target.value })}
                      placeholder="Nome de quem indicou"
                      required
                    />
                  </div>
                )}

                {/* Campo condicional para Outros */}
                {formData.lead_source === 'outros' && (
                  <div>
                    <Label htmlFor="lead_source_detail">Especifique a origem *</Label>
                    <Input
                      id="lead_source_detail"
                      value={formData.lead_source_detail}
                      onChange={(e) => setFormData({ ...formData, lead_source_detail: e.target.value })}
                      placeholder="De onde veio este lead?"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Tipo de Negócio e Serviço */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_type">Tipo de Negócio</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({ ...formData, business_type: value as BusinessType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="service_type">Tipo de Serviço</Label>
                  <Select
                    value={formData.service_type}
                    onValueChange={(value) => setFormData({ ...formData, service_type: value as ServiceType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Temperatura e Urgência */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Temperatura do Lead</Label>
                  <div className="flex gap-2 mt-2">
                    {TEMPERATURES.map(temp => {
                      const Icon = temp.icon
                      return (
                        <Button
                          key={temp.value}
                          type="button"
                          variant={formData.temperature === temp.value ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => setFormData({ ...formData, temperature: temp.value })}
                        >
                          <Icon className={`h-4 w-4 mr-2 ${temp.color}`} />
                          {temp.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label>Urgência</Label>
                  <div className="flex gap-2 mt-2">
                    {URGENCIES.map(urg => (
                      <Button
                        key={urg.value}
                        type="button"
                        variant={formData.urgency === urg.value ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setFormData({ ...formData, urgency: urg.value })}
                      >
                        {urg.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prazo de decisão e Concorrentes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="decision_deadline">Prazo de Decisão</Label>
                  <Input
                    id="decision_deadline"
                    type="date"
                    value={formData.decision_deadline}
                    onChange={(e) => setFormData({ ...formData, decision_deadline: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="competitors">Concorrentes</Label>
                  <Input
                    id="competitors"
                    value={formData.competitors}
                    onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
                    placeholder="Ex: Empresa A, Empresa B"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: FOLLOW-UP & NOTAS */}
            <TabsContent value="followup" className="space-y-4">
              {/* Próximo Follow-up */}
              <div>
                <Label htmlFor="next_follow_up_date">Próximo Follow-up</Label>
                <Input
                  id="next_follow_up_date"
                  type="date"
                  value={formData.next_follow_up_date}
                  onChange={(e) => setFormData({ ...formData, next_follow_up_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Agende a data do próximo contato com o cliente
                </p>
              </div>

              {/* Notas */}
              <div>
                <Label htmlFor="notes">Notas e Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotações importantes sobre este negócio..."
                  rows={5}
                />
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags</Label>
                <TagInput
                  value={formData.tags || []}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  placeholder="Digite uma tag e pressione Enter..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione tags para organizar e filtrar negócios (ex: urgente, vip, desconto)
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-6 border-t mt-6">
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
