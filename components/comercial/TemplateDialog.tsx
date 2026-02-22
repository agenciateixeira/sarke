'use client'

import { useState, useEffect } from 'react'
import { useTemplates } from '@/hooks/useTemplates'
import type { CommunicationTemplate, TemplateType, TemplateCategory } from '@/types/pipeline'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, X, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: CommunicationTemplate
  onSuccess?: () => void
}

const typeLabels: Record<TemplateType, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

const categoryOptions: { value: TemplateCategory; label: string }[] = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'reminder', label: 'Lembrete' },
  { value: 'welcome', label: 'Boas-vindas' },
  { value: 'thank_you', label: 'Agradecimento' },
  { value: 'negotiation', label: 'Negociação' },
  { value: 'closing', label: 'Fechamento' },
  { value: 'other', label: 'Outro' },
]

export function TemplateDialog({ open, onOpenChange, template, onSuccess }: TemplateDialogProps) {
  const { createTemplate, updateTemplate, variables, previewTemplate } = useTemplates()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TemplateType>('email')
  const [category, setCategory] = useState<TemplateCategory>('follow_up')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isDefault, setIsDefault] = useState(false)
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])

  // Preview state
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewBody, setPreviewBody] = useState('')
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description || '')
      setType(template.type)
      setCategory(template.category || 'follow_up')
      setSubject(template.subject || '')
      setBody(template.body)
      setIsActive(template.is_active)
      setIsDefault(template.is_default)
      setSelectedVariables(template.available_variables || [])
    } else {
      resetForm()
    }
  }, [template, open])

  // Update preview when body/subject changes
  useEffect(() => {
    if (activeTab === 'preview' && body) {
      updatePreview()
    }
  }, [activeTab, body, subject, previewVariables])

  const resetForm = () => {
    setName('')
    setDescription('')
    setType('email')
    setCategory('follow_up')
    setSubject('')
    setBody('')
    setIsActive(true)
    setIsDefault(false)
    setSelectedVariables([])
    setPreviewVariables({})
    setActiveTab('edit')
  }

  const updatePreview = () => {
    const tempTemplate: CommunicationTemplate = {
      id: 'preview',
      name: name,
      type: type,
      subject: subject,
      body: body,
      available_variables: selectedVariables,
      is_active: isActive,
      is_default: isDefault,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const preview = previewTemplate(tempTemplate, previewVariables)
    preview.then((result) => {
      setPreviewSubject(result.subject || '')
      setPreviewBody(result.body)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!body.trim()) {
      toast.error('Corpo é obrigatório')
      return
    }

    if (type === 'email' && !subject.trim()) {
      toast.error('Assunto é obrigatório para emails')
      return
    }

    setLoading(true)

    try {
      const templateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        category,
        subject: type === 'email' ? subject.trim() : undefined,
        body: body.trim(),
        available_variables: selectedVariables,
        is_active: isActive,
        is_default: isDefault,
      }

      if (template) {
        await updateTemplate(template.id, templateData)
      } else {
        await createTemplate(templateData)
      }

      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error saving template:', error)
    } finally {
      setLoading(false)
    }
  }

  const insertVariable = (variableKey: string) => {
    const placeholder = `{{${variableKey}}}`
    setBody((prev) => prev + placeholder)

    if (!selectedVariables.includes(variableKey)) {
      setSelectedVariables((prev) => [...prev, variableKey])
    }
  }

  const removeVariable = (variableKey: string) => {
    setSelectedVariables((prev) => prev.filter((v) => v !== variableKey))
  }

  const variablesByCategory = variables.reduce((acc, variable) => {
    if (!acc[variable.variable_category]) {
      acc[variable.variable_category] = []
    }
    acc[variable.variable_category].push(variable)
    return acc
  }, {} as Record<string, typeof variables>)

  // Generate sample preview variables
  useEffect(() => {
    const sampleVars: Record<string, string> = {}
    selectedVariables.forEach((varKey) => {
      const variable = variables.find((v) => v.variable_key === varKey)
      if (variable && variable.example_value) {
        sampleVars[varKey] = variable.example_value
      } else {
        sampleVars[varKey] = `[${varKey}]`
      }
    })
    setPreviewVariables(sampleVars)
  }, [selectedVariables, variables])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Edite as informações do template de comunicação'
              : 'Crie um novo template reutilizável para email, WhatsApp ou SMS'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Editar</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Email de Boas-vindas"
                    required
                  />
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">{typeLabels.email}</SelectItem>
                      <SelectItem value="whatsapp">{typeLabels.whatsapp}</SelectItem>
                      <SelectItem value="sms">{typeLabels.sms}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional do template"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assunto (apenas para email) */}
              {type === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Assunto do email"
                    required
                  />
                </div>
              )}

              {/* Corpo */}
              <div className="space-y-2">
                <Label htmlFor="body">Corpo da Mensagem *</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Digite o conteúdo do template. Use {{variavel}} para inserir variáveis dinâmicas."
                  rows={10}
                  className="font-mono text-sm"
                  required
                />
              </div>

              {/* Variáveis Selecionadas */}
              {selectedVariables.length > 0 && (
                <div className="space-y-2">
                  <Label>Variáveis Utilizadas</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedVariables.map((varKey) => {
                      const variable = variables.find((v) => v.variable_key === varKey)
                      return (
                        <Badge key={varKey} variant="secondary" className="gap-1">
                          {variable?.variable_label || varKey}
                          <button
                            type="button"
                            onClick={() => removeVariable(varKey)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Variáveis Disponíveis */}
              <div className="space-y-2">
                <Label>Variáveis Disponíveis</Label>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {Object.entries(variablesByCategory).map(([categoryName, vars]) => (
                        <div key={categoryName}>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                            {categoryName}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {vars.map((variable) => (
                              <Button
                                key={variable.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => insertVariable(variable.variable_key)}
                                className="text-xs"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {variable.variable_label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Switches */}
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Ativo
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                  <Label htmlFor="is_default" className="cursor-pointer">
                    Template Padrão
                  </Label>
                </div>
              </div>

              <DialogFooter>
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
                  {template ? 'Atualizar' : 'Criar'} Template
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview do Template</CardTitle>
                <CardDescription>
                  Visualização com valores de exemplo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {type === 'email' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Assunto</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">{previewSubject || subject || '(sem assunto)'}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Corpo</Label>
                  <div className="p-4 bg-muted rounded-md min-h-[200px] whitespace-pre-wrap">
                    {previewBody || body || '(corpo vazio)'}
                  </div>
                </div>

                {selectedVariables.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Valores de Exemplo</Label>
                    <div className="p-3 bg-muted rounded-md space-y-1">
                      {selectedVariables.map((varKey) => {
                        const variable = variables.find((v) => v.variable_key === varKey)
                        return (
                          <div key={varKey} className="text-xs">
                            <span className="font-mono text-primary">{'{{' + varKey + '}}'}</span>
                            {' → '}
                            <span className="text-muted-foreground">
                              {variable?.example_value || `[${varKey}]`}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('edit')}
              >
                Voltar para Edição
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
