'use client'

import { useState } from 'react'
import { useTemplates } from '@/hooks/useTemplates'
import type { CommunicationTemplate, TemplateType } from '@/types/pipeline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  MoreVertical,
  Loader2,
  Edit,
  Trash2,
  Copy,
  Mail,
  MessageSquare,
  Smartphone,
  FileText,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TemplateDialog } from './TemplateDialog'

// Mapeamento de ícones e labels
const typeIcons: Record<TemplateType, any> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Smartphone,
}

const typeLabels: Record<TemplateType, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

const categoryLabels: Record<string, string> = {
  follow_up: 'Follow-up',
  proposal: 'Proposta',
  reminder: 'Lembrete',
  welcome: 'Boas-vindas',
  thank_you: 'Agradecimento',
  negotiation: 'Negociação',
  closing: 'Fechamento',
  other: 'Outro',
}

export function TemplatesManager() {
  const {
    templates,
    loading,
    toggleTemplate,
    deleteTemplate,
    duplicateTemplate,
  } = useTemplates()

  const [activeTab, setActiveTab] = useState<string>('all')
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<CommunicationTemplate | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | undefined>(undefined)

  const handleToggle = async (templateId: string, currentState: boolean) => {
    await toggleTemplate(templateId, !currentState)
  }

  const handleDelete = (template: CommunicationTemplate) => {
    setTemplateToDelete(template)
    setDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete.id)
      setDeleteAlertOpen(false)
      setTemplateToDelete(undefined)
    }
  }

  const handleDuplicate = async (templateId: string) => {
    await duplicateTemplate(templateId)
  }

  const handleCreate = () => {
    setEditingTemplate(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (template: CommunicationTemplate) => {
    setEditingTemplate(template)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingTemplate(undefined)
  }

  // Filtrar templates por tipo
  const filteredTemplates = activeTab === 'all'
    ? templates
    : templates.filter(t => t.type === activeTab)

  // Estatísticas
  const stats = {
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    email: templates.filter(t => t.type === 'email').length,
    whatsapp: templates.filter(t => t.type === 'whatsapp').length,
    sms: templates.filter(t => t.type === 'sms').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Templates de Comunicação</h1>
            <p className="text-muted-foreground mt-1">
              Crie templates reutilizáveis para email, WhatsApp e SMS
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.active} ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.email}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.whatsapp}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  SMS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.sms}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Mais Usado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium truncate">
                  {templates.sort((a, b) => b.usage_count - a.usage_count)[0]?.name || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {templates.sort((a, b) => b.usage_count - a.usage_count)[0]?.usage_count || 0} envios
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs e Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>Templates Cadastrados</CardTitle>
              <CardDescription>
                Gerencie seus templates de comunicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">
                    Todos
                    <Badge variant="secondary" className="ml-2">{stats.total}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="email">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                    <Badge variant="secondary" className="ml-2">{stats.email}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                    <Badge variant="secondary" className="ml-2">{stats.whatsapp}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="sms">
                    <Smartphone className="h-4 w-4 mr-2" />
                    SMS
                    <Badge variant="secondary" className="ml-2">{stats.sms}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Nenhum template encontrado
                      </p>
                      <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Template
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Ativo</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-center">Variáveis</TableHead>
                          <TableHead className="text-center">Usos</TableHead>
                          <TableHead>Última Atualização</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTemplates.map(template => {
                          const TypeIcon = typeIcons[template.type]

                          return (
                            <TableRow key={template.id}>
                              <TableCell>
                                <Switch
                                  checked={template.is_active}
                                  onCheckedChange={() => handleToggle(template.id, template.is_active)}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{template.name}</p>
                                  {template.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {template.description}
                                    </p>
                                  )}
                                  {template.is_default && (
                                    <Badge variant="outline" className="mt-1">Padrão</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="gap-1">
                                  <TypeIcon className="h-3 w-3" />
                                  {typeLabels[template.type]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {template.category && (
                                  <Badge variant="secondary">
                                    {categoryLabels[template.category] || template.category}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {template.available_variables.length}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium">{template.usage_count}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(template.updated_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(template)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDelete(template)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de criação/edição */}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        template={editingTemplate}
      />
    </>
  )
}
