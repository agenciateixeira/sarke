'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Palette,
  Box,
  Building2,
  Clock,
  DollarSign,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  ClipboardCheck,
  Layers,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ProjetoCompleto, etapaLabels, etapaCores, areaLabels, formatarFrente } from '@/types/projeto'
import { Subtask, TeamMember } from '@/types/tasks'
import { ProjectDocumentCategoryWithFiles } from '@/types/documents'
import { SubtaskStageView } from '@/components/tasks/SubtaskStageView'
import { SubtaskFilters } from '@/components/tasks/SubtaskFilters'
import { ProjectTimeline } from '@/components/projetos/ProjectTimeline'
import { DocumentStageView } from '@/components/documents/DocumentStageView'
import { useSubtaskFilters } from '@/hooks/useSubtaskFilters'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function ProjetoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const [projeto, setProjeto] = useState<ProjetoCompleto | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('informacoes')
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [documentCategories, setDocumentCategories] = useState<ProjectDocumentCategoryWithFiles[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  // Filtros para cada etapa
  const planejamentoFilters = useSubtaskFilters(subtasks.filter((s) => s.projeto_etapa === 'planejamento'))
  const plantaBaixaFilters = useSubtaskFilters(subtasks.filter((s) => s.projeto_etapa === 'planta_baixa'))
  const modelo3dFilters = useSubtaskFilters(subtasks.filter((s) => s.projeto_etapa === '3d'))
  const executivoFilters = useSubtaskFilters(subtasks.filter((s) => s.projeto_etapa === 'executivo'))

  useEffect(() => {
    loadProjeto()
    loadTeamMembers()
  }, [params.id])

  useEffect(() => {
    if (projeto?.id && (activeTab === 'planejamento' || activeTab === 'planta_baixa' || activeTab === '3d' || activeTab === 'executivo' || activeTab === 'timeline')) {
      loadSubtasks()
    }
    if (projeto?.id && activeTab === 'arquivos') {
      loadDocumentCategories()
    }
  }, [projeto?.id, activeTab])

  async function loadProjeto() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projetos_completo')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      setProjeto(data)
    } catch (error: any) {
      console.error('Erro ao carregar projeto:', error)
      toast.error('Erro ao carregar projeto')
      router.push('/dashboard/projetos')
    } finally {
      setLoading(false)
    }
  }

  async function loadTeamMembers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name')

      if (error) throw error
      setTeamMembers(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar membros da equipe:', error)
      setTeamMembers([]) // Garantir que sempre tenha um array vazio
    }
  }

  async function loadSubtasks() {
    try {
      setLoadingSubtasks(true)

      // Buscar a tarefa principal do projeto
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projeto?.id)
        .eq('is_project_task', true)
        .single()

      if (taskError) throw taskError
      if (!taskData) return

      // Buscar subtasks da tarefa
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskData.id)
        .order('order_index')

      if (subtasksError) throw subtasksError
      setSubtasks(subtasksData || [])
    } catch (error: any) {
      console.error('Erro ao carregar subtarefas:', error)
      toast.error('Erro ao carregar subtarefas')
    } finally {
      setLoadingSubtasks(false)
    }
  }

  async function handleToggleSubtask(subtaskId: string, isCompleted: boolean) {
    try {
      // Atualização otimista
      setSubtasks(prev => prev.map(s =>
        s.id === subtaskId
          ? { ...s, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }
          : s
      ))

      // Salvar no servidor
      const { error } = await supabase
        .from('subtasks')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', subtaskId)

      if (error) throw error
      toast.success(isCompleted ? 'Subtarefa concluída' : 'Subtarefa reaberta')
    } catch (error: any) {
      console.error('Erro ao atualizar subtarefa:', error)
      toast.error('Erro ao atualizar subtarefa')
      // Em caso de erro, recarregar para restaurar o estado correto
      await loadSubtasks()
    }
  }

  async function loadDocumentCategories() {
    try {
      setLoadingDocuments(true)

      // Buscar categorias com contagem de arquivos
      const { data: categories, error: catError } = await supabase
        .from('project_document_categories')
        .select('*')
        .eq('projeto_id', projeto?.id)
        .order('order_index')

      if (catError) throw catError

      // Buscar todos os arquivos das categorias
      const { data: files, error: filesError } = await supabase
        .from('project_document_files')
        .select('*')
        .eq('projeto_id', projeto?.id)
        .order('uploaded_at', { ascending: false })

      if (filesError) throw filesError

      // Agrupar arquivos por categoria
      const categoriesWithFiles: ProjectDocumentCategoryWithFiles[] = (categories || []).map(cat => ({
        ...cat,
        files: (files || []).filter(f => f.category_id === cat.id),
        file_count: (files || []).filter(f => f.category_id === cat.id).length
      }))

      setDocumentCategories(categoriesWithFiles)
    } catch (error: any) {
      console.error('Erro ao carregar categorias de documentos:', error)
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoadingDocuments(false)
    }
  }

  async function handleUpdateSubtask(subtaskId: string, data: Partial<Subtask>) {
    try {
      // Atualização otimista - atualizar UI imediatamente
      setSubtasks(prev => prev.map(s =>
        s.id === subtaskId ? { ...s, ...data } : s
      ))

      // Salvar no servidor em background
      const { error } = await supabase
        .from('subtasks')
        .update(data)
        .eq('id', subtaskId)

      if (error) throw error

      // Não recarregar tudo, apenas sincronizar silenciosamente
    } catch (error: any) {
      console.error('Erro ao atualizar subtarefa:', error)
      toast.error('Erro ao atualizar subtarefa')
      // Em caso de erro, recarregar para restaurar o estado correto
      await loadSubtasks()
    }
  }

  async function handleReorderSubtasks(subtaskIds: string[]) {
    try {
      // Atualizar ordem das subtasks no banco
      const updates = subtaskIds.map((id, index) => ({
        id,
        order_index: index,
      }))

      // Fazer update em batch
      for (const update of updates) {
        const { error } = await supabase
          .from('subtasks')
          .update({ order_index: update.order_index })
          .eq('id', update.id)

        if (error) throw error
      }

      // Recarregar subtasks para refletir a nova ordem
      await loadSubtasks()
      toast.success('Ordem das tarefas atualizada')
    } catch (error: any) {
      console.error('Erro ao reordenar subtarefas:', error)
      toast.error('Erro ao reordenar tarefas')
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId)

      if (error) throw error
      await loadSubtasks()
      toast.success('Subtarefa excluída')
    } catch (error: any) {
      console.error('Erro ao excluir subtarefa:', error)
      toast.error('Erro ao excluir subtarefa')
    }
  }

  async function handleCreateSubtask(data: {
    title: string
    projeto_etapa: string
    assigned_to?: string
    priority?: string
    due_date?: string
  }) {
    try {
      // Buscar a tarefa principal do projeto
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projeto?.id)
        .eq('is_project_task', true)
        .single()

      if (taskError) throw taskError
      if (!taskData) {
        toast.error('Tarefa principal não encontrada')
        return
      }

      // Buscar maior order_index
      const { data: lastSubtask } = await supabase
        .from('subtasks')
        .select('order_index')
        .eq('task_id', taskData.id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()

      const nextOrderIndex = (lastSubtask?.order_index || 0) + 1

      // Criar subtask
      const { error } = await supabase
        .from('subtasks')
        .insert({
          task_id: taskData.id,
          title: data.title,
          projeto_etapa: data.projeto_etapa,
          assigned_to: data.assigned_to,
          priority: data.priority || 'medium',
          due_date: data.due_date,
          order_index: nextOrderIndex,
        })

      if (error) throw error
      await loadSubtasks()
      toast.success('Subtarefa criada')
    } catch (error: any) {
      console.error('Erro ao criar subtarefa:', error)
      toast.error('Erro ao criar subtarefa')
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true)

      // Deletar projeto (cascade vai deletar tarefas vinculadas automaticamente)
      const { error } = await supabase
        .from('projetos')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      toast.success('Projeto excluído com sucesso!')
      router.push('/dashboard/projetos')
    } catch (error: any) {
      console.error('Erro ao excluir projeto:', error)
      toast.error('Erro ao excluir projeto')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Carregando projeto...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!projeto) {
    return null
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/projetos">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <PageHeader title={projeto.nome} description={projeto.cliente_nome || 'Sem cliente'} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/projetos/${projeto.id}/editar`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O projeto <strong>{projeto.nome}</strong> e todas as
                    tarefas vinculadas serão permanentemente excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? 'Excluindo...' : 'Sim, excluir projeto'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Etapa Atual</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge className={etapaCores[projeto.etapa_atual]}>{etapaLabels[projeto.etapa_atual]}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projeto.progresso_percentual}%</div>
              <Progress value={projeto.progresso_percentual} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor do Contrato</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projeto.valor_contrato
                  ? projeto.valor_contrato.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  : 'Não definido'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Previsão de Entrega</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {projeto.data_previsao_entrega
                  ? format(new Date(projeto.data_previsao_entrega), 'dd/MM/yyyy', { locale: ptBR })
                  : 'Não definida'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-7 bg-pink-50 dark:bg-pink-900/40 border-pink-200 dark:border-pink-700">
            <TabsTrigger
              value="informacoes"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white dark:data-[state=active]:bg-pink-400 dark:data-[state=active]:text-gray-900 hover:bg-pink-100 hover:text-pink-900 dark:hover:bg-pink-700/50 dark:hover:text-white"
            >
              Informações
            </TabsTrigger>
            <TabsTrigger
              value="planejamento"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white dark:data-[state=active]:bg-pink-400 dark:data-[state=active]:text-gray-900 hover:bg-pink-100 hover:text-pink-900 dark:hover:bg-pink-700/50 dark:hover:text-white"
            >
              Planejamento
            </TabsTrigger>
            <TabsTrigger
              value="planta_baixa"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white dark:data-[state=active]:bg-pink-400 dark:data-[state=active]:text-gray-900 hover:bg-pink-100 hover:text-pink-900 dark:hover:bg-pink-700/50 dark:hover:text-white"
            >
              Planta Baixa
            </TabsTrigger>
            <TabsTrigger
              value="3d"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white dark:data-[state=active]:bg-pink-400 dark:data-[state=active]:text-gray-900 hover:bg-pink-100 hover:text-pink-900 dark:hover:bg-pink-700/50 dark:hover:text-white"
            >
              3D
            </TabsTrigger>
            <TabsTrigger
              value="executivo"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white dark:data-[state=active]:bg-pink-400 dark:data-[state=active]:text-gray-900 hover:bg-pink-100 hover:text-pink-900 dark:hover:bg-pink-700/50 dark:hover:text-white"
            >
              Executivo
            </TabsTrigger>
            <TabsTrigger
              value="arquivos"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white dark:data-[state=active]:bg-pink-400 dark:data-[state=active]:text-gray-900 hover:bg-pink-100 hover:text-pink-900 dark:hover:bg-pink-700/50 dark:hover:text-white"
            >
              Arquivos
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white dark:data-[state=active]:bg-pink-400 dark:data-[state=active]:text-gray-900 hover:bg-pink-100 hover:text-pink-900 dark:hover:bg-pink-700/50 dark:hover:text-white"
            >
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Aba Informações */}
          <TabsContent value="informacoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informações Básicas */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Área</label>
                    <div className="text-sm mt-1">
                      <Badge variant="outline">{areaLabels[projeto.area]}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Frente</label>
                    <div className="text-sm mt-1">
                      <Badge variant="outline">{formatarFrente(projeto.frente)}</Badge>
                    </div>
                  </div>
                </div>

                {projeto.descricao && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                    <p className="text-sm mt-1">{projeto.descricao}</p>
                  </div>
                )}

                {/* Localização */}
                {(projeto.endereco || projeto.cidade || projeto.estado) && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Localização
                    </h3>
                    <div className="space-y-2 text-sm">
                      {projeto.endereco && <p>{projeto.endereco}</p>}
                      {(projeto.cidade || projeto.estado) && (
                        <p>
                          {projeto.cidade}
                          {projeto.cidade && projeto.estado && ', '}
                          {projeto.estado}
                          {projeto.cep && ` - CEP: ${projeto.cep}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Dimensões */}
                {(projeto.area_construida || projeto.area_terreno || projeto.area_util) && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Dimensões</h3>
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      {projeto.area_construida && (
                        <div>
                          <span className="text-muted-foreground">Área Construída:</span>
                          <span className="ml-2 font-medium">{projeto.area_construida} m²</span>
                        </div>
                      )}
                      {projeto.area_terreno && (
                        <div>
                          <span className="text-muted-foreground">Área do Terreno:</span>
                          <span className="ml-2 font-medium">{projeto.area_terreno} m²</span>
                        </div>
                      )}
                      {projeto.area_util && (
                        <div>
                          <span className="text-muted-foreground">Área Útil:</span>
                          <span className="ml-2 font-medium">{projeto.area_util} m²</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Equipe */}
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Equipe Responsável
                  </h3>
                  <div className="grid gap-2 md:grid-cols-3 text-sm">
                    {projeto.arquiteto_nome && (
                      <div>
                        <span className="text-muted-foreground">Arquiteto:</span>
                        <span className="ml-2 font-medium">{projeto.arquiteto_nome}</span>
                      </div>
                    )}
                    {projeto.designer_nome && (
                      <div>
                        <span className="text-muted-foreground">Designer:</span>
                        <span className="ml-2 font-medium">{projeto.designer_nome}</span>
                      </div>
                    )}
                    {projeto.coordenador_nome && (
                      <div>
                        <span className="text-muted-foreground">Coordenador:</span>
                        <span className="ml-2 font-medium">{projeto.coordenador_nome}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financeiro */}
                {(projeto.valor_contrato || projeto.valor_recebido) && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financeiro
                    </h3>
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      {projeto.valor_contrato && (
                        <div>
                          <span className="text-muted-foreground">Valor do Contrato:</span>
                          <span className="ml-2 font-medium text-green-600">
                            {projeto.valor_contrato.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        </div>
                      )}
                      {projeto.valor_recebido > 0 && (
                        <div>
                          <span className="text-muted-foreground">Valor Recebido:</span>
                          <span className="ml-2 font-medium text-blue-600">
                            {projeto.valor_recebido.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        </div>
                      )}
                      {projeto.valor_pendente && projeto.valor_pendente > 0 && (
                        <div>
                          <span className="text-muted-foreground">Valor Pendente:</span>
                          <span className="ml-2 font-medium text-orange-600">
                            {projeto.valor_pendente.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Observações */}
                {(projeto.observacoes || projeto.briefing || projeto.conceito || projeto.estilo) && (
                  <div className="space-y-3">
                    {projeto.briefing && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Briefing</label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{projeto.briefing}</p>
                      </div>
                    )}
                    {projeto.conceito && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Conceito</label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{projeto.conceito}</p>
                      </div>
                    )}
                    {projeto.estilo && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Estilo</label>
                        <p className="text-sm mt-1">{projeto.estilo}</p>
                      </div>
                    )}
                    {projeto.observacoes && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Observações</label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{projeto.observacoes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progresso por Etapa */}
            <Card>
              <CardHeader>
                <CardTitle>Progresso por Etapa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Planejamento */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Planejamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{projeto.planejamento_progresso}%</Badge>
                      <Badge className={`${
                        projeto.planejamento_status === 'concluido'
                          ? 'bg-green-100 text-green-800'
                          : projeto.planejamento_status === 'em_andamento'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {projeto.planejamento_status === 'concluido'
                          ? 'Concluído'
                          : projeto.planejamento_status === 'em_andamento'
                            ? 'Em Andamento'
                            : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={projeto.planejamento_progresso} />
                  {(projeto.planejamento_data_inicio || projeto.planejamento_data_fim) && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {projeto.planejamento_data_inicio &&
                        `Início: ${format(new Date(projeto.planejamento_data_inicio), 'dd/MM/yyyy', { locale: ptBR })}`}
                      {projeto.planejamento_data_fim &&
                        ` - Fim: ${format(new Date(projeto.planejamento_data_fim), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </div>
                  )}
                </div>

                {/* Planta Baixa */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Planta Baixa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{projeto.planta_baixa_progresso}%</Badge>
                      <Badge className={`${
                        projeto.planta_baixa_status === 'concluido'
                          ? 'bg-green-100 text-green-800'
                          : projeto.planta_baixa_status === 'em_andamento'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {projeto.planta_baixa_status === 'concluido'
                          ? 'Concluído'
                          : projeto.planta_baixa_status === 'em_andamento'
                            ? 'Em Andamento'
                            : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={projeto.planta_baixa_progresso} />
                  {(projeto.planta_baixa_data_inicio || projeto.planta_baixa_data_fim) && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {projeto.planta_baixa_data_inicio &&
                        `Início: ${format(new Date(projeto.planta_baixa_data_inicio), 'dd/MM/yyyy', { locale: ptBR })}`}
                      {projeto.planta_baixa_data_fim &&
                        ` - Fim: ${format(new Date(projeto.planta_baixa_data_fim), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </div>
                  )}
                </div>

                {/* 3D */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Modelo 3D</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{projeto.modelo_3d_progresso}%</Badge>
                      <Badge className={`${
                        projeto.modelo_3d_status === 'concluido'
                          ? 'bg-green-100 text-green-800'
                          : projeto.modelo_3d_status === 'em_andamento'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {projeto.modelo_3d_status === 'concluido'
                          ? 'Concluído'
                          : projeto.modelo_3d_status === 'em_andamento'
                            ? 'Em Andamento'
                            : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={projeto.modelo_3d_progresso} />
                  {(projeto.modelo_3d_data_inicio || projeto.modelo_3d_data_fim) && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {projeto.modelo_3d_data_inicio &&
                        `Início: ${format(new Date(projeto.modelo_3d_data_inicio), 'dd/MM/yyyy', { locale: ptBR })}`}
                      {projeto.modelo_3d_data_fim &&
                        ` - Fim: ${format(new Date(projeto.modelo_3d_data_fim), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </div>
                  )}
                </div>

                {/* Executivo */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Executivo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{projeto.executivo_progresso}%</Badge>
                      <Badge className={`${
                        projeto.executivo_status === 'concluido'
                          ? 'bg-green-100 text-green-800'
                          : projeto.executivo_status === 'em_andamento'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {projeto.executivo_status === 'concluido'
                          ? 'Concluído'
                          : projeto.executivo_status === 'em_andamento'
                            ? 'Em Andamento'
                            : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={projeto.executivo_progresso} />
                  {(projeto.executivo_data_inicio || projeto.executivo_data_fim) && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {projeto.executivo_data_inicio &&
                        `Início: ${format(new Date(projeto.executivo_data_inicio), 'dd/MM/yyyy', { locale: ptBR })}`}
                      {projeto.executivo_data_fim &&
                        ` - Fim: ${format(new Date(projeto.executivo_data_fim), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Planejamento */}
          <TabsContent value="planejamento">
            {loadingSubtasks ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p className="text-muted-foreground">Carregando subtarefas...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <SubtaskFilters
                      filters={planejamentoFilters.filters}
                      teamMembers={teamMembers}
                      onFiltersChange={planejamentoFilters.setFilters}
                      totalCount={planejamentoFilters.totalCount}
                      filteredCount={planejamentoFilters.filteredCount}
                    />
                  </CardContent>
                </Card>
                <SubtaskStageView
                  subtasks={planejamentoFilters.filteredSubtasks}
                  stageName="Planejamento"
                  stageIcon={<ClipboardCheck className="h-5 w-5" />}
                  teamMembers={teamMembers}
                  onToggleComplete={handleToggleSubtask}
                  onUpdateSubtask={handleUpdateSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                  onCreateSubtask={handleCreateSubtask}
                  onReorderSubtasks={handleReorderSubtasks}
                  projeto_etapa="planejamento"
                />
              </div>
            )}
          </TabsContent>

          {/* Aba Planta Baixa */}
          <TabsContent value="planta_baixa">
            {loadingSubtasks ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p className="text-muted-foreground">Carregando subtarefas...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <SubtaskFilters
                      filters={plantaBaixaFilters.filters}
                      teamMembers={teamMembers}
                      onFiltersChange={plantaBaixaFilters.setFilters}
                      totalCount={plantaBaixaFilters.totalCount}
                      filteredCount={plantaBaixaFilters.filteredCount}
                    />
                  </CardContent>
                </Card>
                <SubtaskStageView
                  subtasks={plantaBaixaFilters.filteredSubtasks}
                  stageName="Planta Baixa"
                  stageIcon={<Layers className="h-5 w-5" />}
                  teamMembers={teamMembers}
                  onToggleComplete={handleToggleSubtask}
                  onUpdateSubtask={handleUpdateSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                  onCreateSubtask={handleCreateSubtask}
                  onReorderSubtasks={handleReorderSubtasks}
                  projeto_etapa="planta_baixa"
                />
              </div>
            )}
          </TabsContent>

          {/* Aba 3D */}
          <TabsContent value="3d">
            {loadingSubtasks ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Box className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p className="text-muted-foreground">Carregando subtarefas...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <SubtaskFilters
                      filters={modelo3dFilters.filters}
                      teamMembers={teamMembers}
                      onFiltersChange={modelo3dFilters.setFilters}
                      totalCount={modelo3dFilters.totalCount}
                      filteredCount={modelo3dFilters.filteredCount}
                    />
                  </CardContent>
                </Card>
                <SubtaskStageView
                  subtasks={modelo3dFilters.filteredSubtasks}
                  stageName="Modelo 3D"
                  stageIcon={<Box className="h-5 w-5" />}
                  teamMembers={teamMembers}
                  onToggleComplete={handleToggleSubtask}
                  onUpdateSubtask={handleUpdateSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                  onCreateSubtask={handleCreateSubtask}
                  onReorderSubtasks={handleReorderSubtasks}
                  projeto_etapa="3d"
                />
              </div>
            )}
          </TabsContent>

          {/* Aba Executivo */}
          <TabsContent value="executivo">
            {loadingSubtasks ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p className="text-muted-foreground">Carregando subtarefas...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <SubtaskFilters
                      filters={executivoFilters.filters}
                      teamMembers={teamMembers}
                      onFiltersChange={executivoFilters.setFilters}
                      totalCount={executivoFilters.totalCount}
                      filteredCount={executivoFilters.filteredCount}
                    />
                  </CardContent>
                </Card>
                <SubtaskStageView
                  subtasks={executivoFilters.filteredSubtasks}
                  stageName="Projeto Executivo"
                  stageIcon={<Building2 className="h-5 w-5" />}
                  teamMembers={teamMembers}
                  onToggleComplete={handleToggleSubtask}
                  onUpdateSubtask={handleUpdateSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                  onCreateSubtask={handleCreateSubtask}
                  onReorderSubtasks={handleReorderSubtasks}
                  projeto_etapa="executivo"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="arquivos">
            <Card>
              <CardHeader>
                <CardTitle>Arquivos do Projeto</CardTitle>
                <CardDescription>Documentos, DWGs, renders e outros arquivos organizados por etapa</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-12">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p className="text-muted-foreground">Carregando documentos...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <DocumentStageView
                      categories={documentCategories.filter(c => c.stage === 'planejamento')}
                      stageName="Planejamento"
                      stageIcon={<ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                      onRefresh={loadDocumentCategories}
                    />
                    <DocumentStageView
                      categories={documentCategories.filter(c => c.stage === 'planta_baixa')}
                      stageName="Planta Baixa"
                      stageIcon={<FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                      onRefresh={loadDocumentCategories}
                    />
                    <DocumentStageView
                      categories={documentCategories.filter(c => c.stage === '3d')}
                      stageName="Modelo 3D"
                      stageIcon={<Box className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
                      onRefresh={loadDocumentCategories}
                    />
                    <DocumentStageView
                      categories={documentCategories.filter(c => c.stage === 'executivo')}
                      stageName="Executivo"
                      stageIcon={<Layers className="h-4 w-4 text-green-600 dark:text-green-400" />}
                      onRefresh={loadDocumentCategories}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            {loadingSubtasks ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                  <p className="text-muted-foreground">Carregando timeline...</p>
                </CardContent>
              </Card>
            ) : (
              <ProjectTimeline
                subtasks={subtasks}
                startDate={projeto.data_inicio}
                endDate={projeto.data_previsao_entrega}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
