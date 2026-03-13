'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  GripVertical,
  EditIcon,
  X,
  CheckSquare,
  Square,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CronogramaObra,
  CronogramaObraAtividade,
  CronogramaObraCompleto,
  AtividadeStatus,
  AtividadePrioridade,
} from '@/types/cronograma-obra'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { exportarCronogramaExcel } from '@/lib/cronogramaExcel'
import { importarCronogramaExcelV2, AtividadeImportada, ResultadoImportacao } from '@/lib/cronogramaExcelV2'
import { generateCronogramaPDF } from '@/lib/cronogramaPdf'

interface CronogramaObraViewProps {
  obraId: string
  obraNome?: string
}

// Componente para linha sortable (drag and drop)
function SortableAtividadeRow({
  atividade,
  modoEdicao,
  selecionada,
  onToggleSelecao,
  onEdit,
  onDelete,
  onStatusChange,
  getTarjaClass,
  getStatusColor,
  getStatusLabel,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: atividade.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Mapear prioridade para cores e labels
  const prioridadeColors: Record<string, string> = {
    baixa: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
    alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-400',
    urgente: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
  }

  const prioridadeLabels: Record<string, string> = {
    baixa: 'Baixa',
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente',
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`
        border-t hover:bg-muted/50
        ${getTarjaClass(atividade.status, atividade.data_prevista)}
        ${selecionada ? 'bg-blue-50 dark:bg-blue-950/30' : ''}
        ${isDragging ? 'shadow-lg' : ''}
      `}
    >
      {modoEdicao && (
        <>
          <td className="p-2 text-center">
            <button
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </td>
          <td className="p-2 text-center">
            <Checkbox
              checked={selecionada}
              onCheckedChange={() => onToggleSelecao(atividade.id)}
            />
          </td>
        </>
      )}

      <td className="p-2 border-r">
        {atividade.data_prevista
          ? format(new Date(atividade.data_prevista), 'dd/MM/yyyy')
          : '-'}
      </td>

      <td className="p-2 border-r font-medium">{atividade.descricao_servico}</td>

      <td className="p-2 border-r text-xs">
        {(atividade as any).empresa_parceira?.nome || '-'}
      </td>

      <td className="p-2 border-r">
        {modoEdicao ? (
          <Badge className={getStatusColor(atividade.status)}>
            {getStatusLabel(atividade.status)}
          </Badge>
        ) : (
          <Select
            value={atividade.status}
            onValueChange={(novoStatus) => onStatusChange(atividade.id, novoStatus)}
          >
            <SelectTrigger className={`h-7 w-full border-none ${getStatusColor(atividade.status)}`}>
              <SelectValue>
                {getStatusLabel(atividade.status)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="atrasada">Atrasada</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        )}
      </td>

      <td className="p-2 border-r">
        <Badge variant="outline" className={prioridadeColors[atividade.prioridade || 'normal']}>
          {prioridadeLabels[atividade.prioridade || 'normal']}
        </Badge>
      </td>

      <td className="p-2 border-r text-muted-foreground text-xs">
        {atividade.observacao || '-'}
      </td>

      {!modoEdicao && (
        <td className="p-2 text-center">
          <div className="flex gap-1 justify-center">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onEdit(atividade)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onDelete(atividade.id)}
            >
              <Trash2 className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  )
}

export function CronogramaObraView({ obraId, obraNome }: CronogramaObraViewProps) {
  const [loading, setLoading] = useState(true)
  const [cronograma, setCronograma] = useState<CronogramaObraCompleto | null>(null)
  const [atividades, setAtividades] = useState<CronogramaObraAtividade[]>([])
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false)
  const [empresasParceiras, setEmpresasParceiras] = useState<any[]>([])
  const [novaAtividade, setNovaAtividade] = useState({
    data_prevista: '',
    descricao_servico: '',
    observacao: '',
    empresa_parceira_id: '',
    status: 'pendente' as AtividadeStatus,
    prioridade: 'normal' as AtividadePrioridade,
  })
  const [editandoAtividade, setEditandoAtividade] = useState<CronogramaObraAtividade | null>(null)
  const [atividadeToDelete, setAtividadeToDelete] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [empresasVinculadas, setEmpresasVinculadas] = useState<any[]>([])
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false)
  const [quantidadePeriodos, setQuantidadePeriodos] = useState(1)
  const [novoVinculo, setNovoVinculo] = useState({
    empresa_id: '',
    valor_contratado: '',
    observacoes: '',
    periodos: [{ data_inicio_prevista: '', data_fim_prevista: '' }],
  })
  const [editandoVinculo, setEditandoVinculo] = useState<any | null>(null)
  const [vinculoToDelete, setVinculoToDelete] = useState<string | null>(null)

  // Novos estados para modo de edição e seleção múltipla
  const [modoEdicao, setModoEdicao] = useState(false)
  const [atividadesSelecionadas, setAtividadesSelecionadas] = useState<Set<string>>(new Set())
  const [salvandoOrdem, setSalvandoOrdem] = useState(false)
  const [deletandoMultiplas, setDeletandoMultiplas] = useState(false)

  // Configuração do drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadCronograma()
    loadEmpresasParceiras()
  }, [obraId])

  useEffect(() => {
    if (cronograma?.id) {
      loadEmpresasVinculadas()
    }
  }, [cronograma?.id])

  async function loadEmpresasParceiras() {
    try {
      const { data, error } = await supabase
        .from('empresas_parceiras')
        .select('id, nome')
        .order('nome')

      if (error) throw error
      setEmpresasParceiras(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar empresas parceiras:', error)
    }
  }

  async function loadCronograma() {
    try {
      setLoading(true)

      const { data: cronogramaData, error: cronogramaError } = await supabase
        .from('cronograma_obras_completo')
        .select('*')
        .eq('obra_id', obraId)
        .single()

      if (cronogramaError) {
        if (cronogramaError.code === 'PGRST116') {
          setCronograma(null)
          return
        }
        throw cronogramaError
      }

      setCronograma(cronogramaData)

      const { data: atividadesData, error: atividadesError } = await supabase
        .from('cronograma_obra_atividades')
        .select(`
          *,
          empresa_parceira:empresas_parceiras(id, nome)
        `)
        .eq('cronograma_id', cronogramaData.id)
        .order('data_prevista', { ascending: true })

      if (atividadesError) throw atividadesError
      setAtividades(atividadesData || [])
    } catch (error: any) {
      console.error('Erro ao carregar cronograma:', error)
      toast.error('Erro ao carregar cronograma')
    } finally {
      setLoading(false)
    }
  }

  async function criarCronograma() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('cronograma_obras')
        .insert({
          obra_id: obraId,
          nome: 'Cronograma Principal',
          status: 'ativo',
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Cronograma criado com sucesso!')
      loadCronograma()
    } catch (error: any) {
      console.error('Erro ao criar cronograma:', error)
      toast.error('Erro ao criar cronograma')
    }
  }

  async function adicionarAtividade() {
    try {
      if (!cronograma) {
        toast.error('Cronograma não encontrado')
        return
      }

      if (!novaAtividade.data_prevista || !novaAtividade.descricao_servico) {
        toast.error('Preencha os campos obrigatórios')
        return
      }

      const user = (await supabase.auth.getUser()).data.user

      // Extrair mês e dia da semana da data
      const data = new Date(novaAtividade.data_prevista)
      const mes = format(data, 'MMMM', { locale: ptBR })
      const diaSemana = format(data, 'EEEE', { locale: ptBR })

      const { error } = await supabase.from('cronograma_obra_atividades').insert({
        cronograma_id: cronograma.id,
        mes: mes,
        dia_semana: diaSemana,
        data_prevista: novaAtividade.data_prevista,
        descricao_servico: novaAtividade.descricao_servico,
        observacao: novaAtividade.observacao || null,
        empresa_parceira_id: novaAtividade.empresa_parceira_id || null,
        status: novaAtividade.status,
        prioridade: novaAtividade.prioridade,
        created_by: user?.id,
      })

      if (error) throw error

      toast.success('Atividade adicionada com sucesso!')
      setAtividadeDialogOpen(false)
      setNovaAtividade({
        data_prevista: '',
        descricao_servico: '',
        observacao: '',
        empresa_parceira_id: '',
        status: 'pendente',
        prioridade: 'normal',
      })
      loadCronograma()
    } catch (error: any) {
      console.error('Erro ao adicionar atividade:', error)
      toast.error('Erro ao adicionar atividade')
    }
  }

  async function atualizarAtividade() {
    try {
      if (!editandoAtividade) return

      if (!novaAtividade.data_prevista || !novaAtividade.descricao_servico) {
        toast.error('Preencha os campos obrigatórios')
        return
      }

      const data = new Date(novaAtividade.data_prevista)
      const mes = format(data, 'MMMM', { locale: ptBR })
      const diaSemana = format(data, 'EEEE', { locale: ptBR })

      const { error } = await supabase
        .from('cronograma_obra_atividades')
        .update({
          mes: mes,
          dia_semana: diaSemana,
          data_prevista: novaAtividade.data_prevista,
          descricao_servico: novaAtividade.descricao_servico,
          observacao: novaAtividade.observacao || null,
          empresa_parceira_id: novaAtividade.empresa_parceira_id || null,
          status: novaAtividade.status,
          prioridade: novaAtividade.prioridade,
        })
        .eq('id', editandoAtividade.id)

      if (error) throw error

      toast.success('Atividade atualizada com sucesso!')
      setAtividadeDialogOpen(false)
      setEditandoAtividade(null)
      setNovaAtividade({
        data_prevista: '',
        descricao_servico: '',
        observacao: '',
        empresa_parceira_id: '',
        status: 'pendente',
        prioridade: 'normal',
      })
      loadCronograma()
    } catch (error: any) {
      console.error('Erro ao atualizar atividade:', error)
      toast.error('Erro ao atualizar atividade')
    }
  }

  async function atualizarStatusAtividade(atividadeId: string, novoStatus: string) {
    try {
      const { error } = await supabase
        .from('cronograma_obra_atividades')
        .update({ status: novoStatus })
        .eq('id', atividadeId)

      if (error) throw error

      toast.success('Status atualizado!')
      loadCronograma()
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  async function deletarAtividade() {
    if (!atividadeToDelete) return

    try {
      const { error } = await supabase
        .from('cronograma_obra_atividades')
        .delete()
        .eq('id', atividadeToDelete)

      if (error) throw error

      toast.success('Atividade excluída com sucesso!')
      setAtividadeToDelete(null)
      loadCronograma()
    } catch (error: any) {
      console.error('Erro ao excluir atividade:', error)
      toast.error('Erro ao excluir atividade')
    }
  }

  function abrirEditarAtividade(atividade: CronogramaObraAtividade) {
    setEditandoAtividade(atividade)
    setNovaAtividade({
      data_prevista: atividade.data_prevista,
      descricao_servico: atividade.descricao_servico,
      observacao: atividade.observacao || '',
      empresa_parceira_id: atividade.empresa_parceira_id || '',
      status: atividade.status,
      prioridade: atividade.prioridade,
    })
    setAtividadeDialogOpen(true)
  }

  function fecharDialogAtividade() {
    setAtividadeDialogOpen(false)
    setEditandoAtividade(null)
    setNovaAtividade({
      data_prevista: '',
      descricao_servico: '',
      observacao: '',
      empresa_parceira_id: '',
      status: 'pendente',
      prioridade: 'normal',
    })
  }

  // ===== FUNÇÕES DO MODO DE EDIÇÃO =====
  function toggleModoEdicao() {
    setModoEdicao(!modoEdicao)
    setAtividadesSelecionadas(new Set()) // Limpar seleção ao sair do modo edição
  }

  function toggleSelecao(atividadeId: string) {
    const novaSelecao = new Set(atividadesSelecionadas)
    if (novaSelecao.has(atividadeId)) {
      novaSelecao.delete(atividadeId)
    } else {
      novaSelecao.add(atividadeId)
    }
    setAtividadesSelecionadas(novaSelecao)
  }

  function selecionarTodas() {
    if (atividadesSelecionadas.size === atividades.length) {
      // Se todas estão selecionadas, desselecionar todas
      setAtividadesSelecionadas(new Set())
    } else {
      // Selecionar todas
      const todasIds = new Set(atividades.map(a => a.id))
      setAtividadesSelecionadas(todasIds)
    }
  }

  async function deletarSelecionadas() {
    if (atividadesSelecionadas.size === 0) {
      toast.error('Nenhuma atividade selecionada')
      return
    }

    try {
      setDeletandoMultiplas(true)

      // Deletar todas as atividades selecionadas
      const { error } = await supabase
        .from('cronograma_obra_atividades')
        .delete()
        .in('id', Array.from(atividadesSelecionadas))

      if (error) throw error

      toast.success(`${atividadesSelecionadas.size} atividades excluídas com sucesso!`)
      setAtividadesSelecionadas(new Set())
      setModoEdicao(false)
      loadCronograma()
    } catch (error: any) {
      console.error('Erro ao excluir atividades:', error)
      toast.error('Erro ao excluir atividades selecionadas')
    } finally {
      setDeletandoMultiplas(false)
    }
  }

  // Função para lidar com o fim do drag and drop
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = atividades.findIndex((item) => item.id === active.id)
    const newIndex = atividades.findIndex((item) => item.id === over.id)

    const novasAtividades = arrayMove(atividades, oldIndex, newIndex)
    setAtividades(novasAtividades) // Atualizar UI imediatamente

    try {
      setSalvandoOrdem(true)

      // Atualizar ordem no banco de dados
      const updates = novasAtividades.map((atividade, index) => ({
        id: atividade.id,
        ordem: index,
      }))

      // Fazer update batch
      for (const update of updates) {
        await supabase
          .from('cronograma_obra_atividades')
          .update({ ordem: update.ordem })
          .eq('id', update.id)
      }

      toast.success('Ordem das atividades atualizada')
    } catch (error) {
      console.error('Erro ao salvar nova ordem:', error)
      toast.error('Erro ao salvar nova ordem')
      loadCronograma() // Recarregar em caso de erro
    } finally {
      setSalvandoOrdem(false)
    }
  }

  // ===== FUNÇÕES DE EMPRESAS PARCEIRAS =====
  async function loadEmpresasVinculadas() {
    if (!cronograma?.id) return

    try {
      const { data, error } = await supabase
        .from('cronograma_empresa_vinculos')
        .select(`
          *,
          empresa:empresas_parceiras(id, nome, telefone, email, servicos)
        `)
        .eq('cronograma_id', cronograma.id)
        .order('data_inicio_prevista', { ascending: true })

      if (error) throw error
      setEmpresasVinculadas(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar empresas vinculadas:', error)
    }
  }

  async function vincularEmpresa() {
    if (!cronograma?.id || !novoVinculo.empresa_id) {
      toast.error('Selecione uma empresa')
      return
    }

    // Validar se todos os períodos têm datas preenchidas
    const periodosValidos = novoVinculo.periodos.filter(
      p => p.data_inicio_prevista && p.data_fim_prevista
    )

    if (periodosValidos.length === 0) {
      toast.error('Preencha pelo menos um período com data de início e fim')
      return
    }

    try {
      if (editandoVinculo) {
        // Modo edição: atualizar vínculo existente
        const vinculoData = {
          cronograma_id: cronograma.id,
          empresa_id: novoVinculo.empresa_id,
          data_inicio_prevista: novoVinculo.periodos[0]?.data_inicio_prevista || null,
          data_fim_prevista: novoVinculo.periodos[0]?.data_fim_prevista || null,
          valor_contratado: novoVinculo.valor_contratado ? parseFloat(novoVinculo.valor_contratado) : null,
          observacoes: novoVinculo.observacoes || null,
        }

        const { error } = await supabase
          .from('cronograma_empresa_vinculos')
          .update(vinculoData)
          .eq('id', editandoVinculo.id)

        if (error) throw error
        toast.success('Vínculo atualizado com sucesso!')
      } else {
        // Modo criação: criar um vínculo para cada período
        const vinculosParaInserir = periodosValidos.map((periodo, index) => ({
          cronograma_id: cronograma.id,
          empresa_id: novoVinculo.empresa_id,
          data_inicio_prevista: periodo.data_inicio_prevista,
          data_fim_prevista: periodo.data_fim_prevista,
          valor_contratado: novoVinculo.valor_contratado ? parseFloat(novoVinculo.valor_contratado) / periodosValidos.length : null,
          observacoes: `${novoVinculo.observacoes || ''}${periodosValidos.length > 1 ? ` - Período ${index + 1} de ${periodosValidos.length}` : ''}`.trim(),
          status: 'pendente',
          valor_executado: 0,
          valor_pago: 0,
          percentual_conclusao: 0,
        }))

        const { error } = await supabase
          .from('cronograma_empresa_vinculos')
          .insert(vinculosParaInserir)

        if (error) throw error
        toast.success(`${periodosValidos.length} período(s) vinculado(s) com sucesso!`)
      }

      fecharDialogEmpresa()
      loadEmpresasVinculadas()
    } catch (error: any) {
      console.error('Erro ao vincular empresa:', error)
      toast.error('Erro ao vincular empresa')
    }
  }

  async function atualizarStatusVinculo(vinculoId: string, novoStatus: string) {
    try {
      const { error } = await supabase
        .from('cronograma_empresa_vinculos')
        .update({ status: novoStatus })
        .eq('id', vinculoId)

      if (error) throw error

      toast.success('Status do vínculo atualizado!')
      loadEmpresasVinculadas()
    } catch (error: any) {
      console.error('Erro ao atualizar status do vínculo:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  async function deletarVinculo() {
    if (!vinculoToDelete) return

    try {
      const { error } = await supabase
        .from('cronograma_empresa_vinculos')
        .delete()
        .eq('id', vinculoToDelete)

      if (error) throw error

      toast.success('Vínculo removido com sucesso!')
      setVinculoToDelete(null)
      loadEmpresasVinculadas()
    } catch (error: any) {
      console.error('Erro ao excluir vínculo:', error)
      toast.error('Erro ao excluir vínculo')
    }
  }

  function abrirEditarVinculo(vinculo: any) {
    setEditandoVinculo(vinculo)
    setQuantidadePeriodos(1)
    setNovoVinculo({
      empresa_id: vinculo.empresa_id,
      valor_contratado: vinculo.valor_contratado?.toString() || '',
      observacoes: vinculo.observacoes || '',
      periodos: [{
        data_inicio_prevista: vinculo.data_inicio_prevista || '',
        data_fim_prevista: vinculo.data_fim_prevista || '',
      }],
    })
    setEmpresaDialogOpen(true)
  }

  function fecharDialogEmpresa() {
    setEmpresaDialogOpen(false)
    setEditandoVinculo(null)
    setQuantidadePeriodos(1)
    setNovoVinculo({
      empresa_id: '',
      valor_contratado: '',
      observacoes: '',
      periodos: [{ data_inicio_prevista: '', data_fim_prevista: '' }],
    })
  }

  function handleQuantidadePeriodosChange(quantidade: number) {
    setQuantidadePeriodos(quantidade)
    const novosPeriodos = Array.from({ length: quantidade }, (_, i) =>
      novoVinculo.periodos[i] || { data_inicio_prevista: '', data_fim_prevista: '' }
    )
    setNovoVinculo({ ...novoVinculo, periodos: novosPeriodos })
  }

  function updatePeriodo(index: number, field: 'data_inicio_prevista' | 'data_fim_prevista', value: string) {
    const novosPeriodos = [...novoVinculo.periodos]
    novosPeriodos[index] = { ...novosPeriodos[index], [field]: value }
    setNovoVinculo({ ...novoVinculo, periodos: novosPeriodos })
  }

  // ===== FUNÇÕES DE EXPORTAÇÃO =====
  async function handleExportarExcel() {
    if (!cronograma) return

    try {
      setExporting(true)
      exportarCronogramaExcel({
        cronograma,
        atividades,
        obraNome,
      })
      toast.success('Excel exportado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao exportar Excel:', error)
      toast.error('Erro ao exportar Excel')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportarPDF() {
    if (!cronograma) return

    try {
      setExporting(true)
      toast.info('Gerando PDF...')
      await generateCronogramaPDF({
        cronograma,
        atividades,
        obraNome,
      })
      toast.success('PDF gerado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF')
    } finally {
      setExporting(false)
    }
  }

  // ===== FUNÇÃO DE IMPORTAÇÃO =====
  async function handleImportarExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Resetar input
    event.target.value = ''

    if (!cronograma) {
      toast.error('Crie um cronograma antes de importar atividades')
      return
    }

    try {
      setImporting(true)
      toast.info('Importando Excel...')

      // Usar a nova versão V2 que corrige o problema de múltiplas tarefas por dia
      const resultado = await importarCronogramaExcelV2(file)

      // Mostrar avisos se houver
      if (resultado.avisos.length > 0) {
        resultado.avisos.forEach(aviso => console.log('Aviso:', aviso))
      }

      if (resultado.cronograma.totalImportado === 0) {
        toast.error('Nenhuma atividade encontrada no arquivo')
        return
      }

      // ===== VALIDAR EMPRESAS PARCEIRAS =====
      let empresasNaoCadastradas: string[] = []
      if (resultado.empresasNaoCadastradas && resultado.empresasNaoCadastradas.length > 0) {
        // Buscar empresas cadastradas no sistema
        const { data: empresasCadastradas, error: errorEmpresas } = await supabase
          .from('empresas_parceiras')
          .select('nome')
          .eq('status', 'ativa')

        if (!errorEmpresas && empresasCadastradas) {
          const nomesCadastrados = empresasCadastradas.map(e => e.nome.toUpperCase())

          // Filtrar empresas da planilha que não estão cadastradas
          empresasNaoCadastradas = resultado.empresasNaoCadastradas.filter(
            empresa => !nomesCadastrados.includes(empresa.toUpperCase())
          )
        }
      }

      // Inserir atividades do cronograma no banco
      const atividadesParaInserir = resultado.cronograma.atividades.map((ativ, index) => {
        const data = new Date(ativ.data_prevista)
        // Usar mês e dia da semana da planilha se disponível, senão calcular
        const mes = ativ.mes || format(data, 'MMMM', { locale: ptBR })
        const diaSemana = ativ.dia_semana || format(data, 'EEEE', { locale: ptBR })

        return {
          cronograma_id: cronograma.id,
          mes,
          dia_semana: diaSemana,
          data_prevista: ativ.data_prevista,
          descricao_servico: ativ.descricao_servico,
          observacao: ativ.observacao || null,
          status: (ativ.status as AtividadeStatus) || 'pendente',
          prioridade: (ativ.prioridade as AtividadePrioridade) || 'normal',
          ordem: atividades.length + index,
        }
      })

      const { error: errorCronograma } = await supabase
        .from('cronograma_obra_atividades')
        .insert(atividadesParaInserir)

      if (errorCronograma) throw errorCronograma

      // Se houver caixa de obra, processar também
      let mensagemCaixa = ''
      if (resultado.caixaObra && resultado.caixaObra.totalImportado > 0) {
        try {
          // Inserir itens do caixa da obra (materiais/serviços)
          const materiaisParaInserir = resultado.caixaObra.materiais.map(mat => ({
            obra_id: obraId,
            local: mat.servico || null,
            item: mat.descricao_material || mat.servico || 'Item importado',
            descricao: mat.descricao_material || '',
            quantidade: mat.quantidade || null,
            medida: mat.medida || null,
            valor_total: mat.valor_total || mat.valor_unitario || 0,
            valor_pago: 0, // Por padrão, nada pago ainda
            forma_pagamento: null,
            responsavel_sarke: mat.responsavel || null,
            status_obra: 'PENDENTE',
            status_pagamento: 'A PAGAR',
            observacoes: null,
            ordem: 0,
          }))

          const { error: errorCaixa } = await supabase
            .from('obra_orcamento_materiais')
            .insert(materiaisParaInserir)

          if (!errorCaixa) {
            mensagemCaixa = ` e ${resultado.caixaObra.totalImportado} itens no caixa da obra`
          } else {
            console.error('Erro ao importar caixa da obra:', errorCaixa)
            mensagemCaixa = ' (erro ao importar caixa da obra)'
          }
        } catch (err) {
          console.error('Erro ao processar caixa da obra:', err)
        }
      }

      // ===== MENSAGEM DE SUCESSO COM DETALHES =====
      let mensagemFinal = `✅ ${resultado.cronograma.totalImportado} atividades importadas${mensagemCaixa}!`

      // Se houver empresas não cadastradas, avisar
      if (empresasNaoCadastradas.length > 0) {
        toast.warning(
          mensagemFinal,
          {
            description: (
              <div className="space-y-2">
                <p>De {resultado.cronograma.totalLinhas} linhas processadas</p>
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded">
                  <p className="font-semibold text-red-700 dark:text-red-400 text-sm">
                    ⚠️ {empresasNaoCadastradas.length} empresa(s) não cadastrada(s):
                  </p>
                  <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-300 mt-1">
                    {empresasNaoCadastradas.map(emp => (
                      <li key={emp}>{emp}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-2 italic">
                    Cadastre estas empresas em "Empresas Parceiras" para melhor controle
                  </p>
                </div>
              </div>
            ),
            duration: 10000 // Mostrar por 10 segundos para dar tempo de ler
          }
        )

        // Também logar no console para referência
        console.warn('Empresas não cadastradas:', empresasNaoCadastradas)
      } else {
        toast.success(
          mensagemFinal,
          {
            description: `De ${resultado.cronograma.totalLinhas} linhas processadas`
          }
        )
      }

      loadCronograma()
    } catch (error: any) {
      console.error('Erro ao importar Excel:', error)
      toast.error('Erro ao importar Excel', {
        description: error.message,
      })
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando cronograma...</p>
        </div>
      </div>
    )
  }

  if (!cronograma) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cronograma da Obra</CardTitle>
          <CardDescription>
            Nenhum cronograma encontrado para esta obra. Crie um novo cronograma ou importe do Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button onClick={criarCronograma} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />
              Criar Cronograma
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleExportarExcel}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Template Excel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Baixe o template para preencher off-line e depois crie um cronograma para importar
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cronograma.progresso_real}%</div>
            <Progress value={cronograma.progresso_real} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {cronograma.atividades_concluidas} de {cronograma.total_atividades} atividades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cronograma.atividades_em_andamento}</div>
            <p className="text-xs text-muted-foreground">Atividades em execução</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {cronograma.atividades_atrasadas}
            </div>
            <p className="text-xs text-muted-foreground">Atividades com atraso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(cronograma.custo_total_materiais || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cronograma.valor_pago_materiais || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => setAtividadeDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
        <Button variant="outline" onClick={() => setEmpresaDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Vincular Empresa
        </Button>
        <Button variant="outline" asChild disabled={importing}>
          <label className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            {importing ? 'Importando...' : 'Importar Excel'}
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleImportarExcel}
              disabled={importing}
            />
          </label>
        </Button>
        <Button variant="outline" onClick={handleExportarExcel} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </Button>
        <Button variant="outline" onClick={handleExportarPDF} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Gerando...' : 'Exportar PDF'}
        </Button>
      </div>

      {/* Card de Empresas Parceiras Vinculadas */}
      {empresasVinculadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Empresas Parceiras Vinculadas</CardTitle>
            <CardDescription>
              {empresasVinculadas.length} empresa{empresasVinculadas.length !== 1 ? 's' : ''} vinculada{empresasVinculadas.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left font-medium border-r">Empresa</th>
                    <th className="p-2 text-left font-medium border-r">Serviços</th>
                    <th className="p-2 text-left font-medium border-r">Data Início</th>
                    <th className="p-2 text-left font-medium border-r">Data Fim</th>
                    <th className="p-2 text-left font-medium border-r">Valor Contratado</th>
                    <th className="p-2 text-left font-medium border-r">Status</th>
                    <th className="p-2 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {empresasVinculadas.map((vinculo) => (
                    <tr
                      key={vinculo.id}
                      className={`border-t hover:bg-muted/50 ${getTarjaClass(vinculo.status, vinculo.data_fim_prevista)}`}
                    >
                        <td className="p-2 border-r font-medium">{vinculo.empresa?.nome || '-'}</td>
                      <td className="p-2 border-r text-xs text-muted-foreground">
                        {vinculo.empresa?.servicos?.slice(0, 3).join(', ') || '-'}
                        {vinculo.empresa?.servicos?.length > 3 && ' ...'}
                      </td>
                      <td className="p-2 border-r">
                        {vinculo.data_inicio_prevista
                          ? format(new Date(vinculo.data_inicio_prevista), 'dd/MM/yyyy')
                          : '-'}
                      </td>
                      <td className="p-2 border-r">
                        {vinculo.data_fim_prevista
                          ? format(new Date(vinculo.data_fim_prevista), 'dd/MM/yyyy')
                          : '-'}
                      </td>
                      <td className="p-2 border-r">
                        {vinculo.valor_contratado
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vinculo.valor_contratado)
                          : '-'}
                      </td>
                      <td className="p-2 border-r">
                        <Select
                          value={vinculo.status}
                          onValueChange={(novoStatus) => atualizarStatusVinculo(vinculo.id, novoStatus)}
                        >
                          <SelectTrigger className={`h-7 w-full border-none ${getVinculoStatusColor(vinculo.status)}`}>
                            <SelectValue>
                              {getVinculoStatusLabel(vinculo.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                            <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                            <SelectItem value="contratada">Contratada</SelectItem>
                            <SelectItem value="em_execucao">Em Execução</SelectItem>
                            <SelectItem value="concluida">Concluída</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEditarVinculo(vinculo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVinculoToDelete(vinculo.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cronograma de Atividades</CardTitle>
            <CardDescription>
              {atividades.length} atividade{atividades.length !== 1 ? 's' : ''} programada{atividades.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Botões do modo de edição */}
            {modoEdicao && atividadesSelecionadas.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deletarSelecionadas}
                disabled={deletandoMultiplas}
              >
                {deletandoMultiplas ? (
                  <>Excluindo...</>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir {atividadesSelecionadas.size} selecionada{atividadesSelecionadas.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
            <Button
              variant={modoEdicao ? "secondary" : "outline"}
              size="sm"
              onClick={toggleModoEdicao}
            >
              {modoEdicao ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Sair do Modo Edição
                </>
              ) : (
                <>
                  <EditIcon className="h-4 w-4 mr-2" />
                  Modo Edição
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {atividades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atividade cadastrada. Importe do Excel ou adicione manualmente.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="border rounded-lg overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {modoEdicao && (
                        <>
                          <th className="p-2 text-center font-medium w-10">
                            <GripVertical className="h-4 w-4 mx-auto text-gray-400" />
                          </th>
                          <th className="p-2 text-center font-medium w-10">
                            <Checkbox
                              checked={atividadesSelecionadas.size === atividades.length && atividades.length > 0}
                              onCheckedChange={selecionarTodas}
                            />
                          </th>
                        </>
                      )}
                      <th className="p-2 text-left font-medium border-r">Data</th>
                      <th className="p-2 text-left font-medium border-r">Descrição Serviço</th>
                      <th className="p-2 text-left font-medium border-r">Empresa</th>
                      <th className="p-2 text-left font-medium border-r">Status</th>
                      <th className="p-2 text-left font-medium border-r">Prioridade</th>
                      <th className="p-2 text-left font-medium border-r">Observação</th>
                      {!modoEdicao && (
                        <th className="p-2 text-center font-medium">Ações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext
                      items={atividades.map(a => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {atividades.map((atividade) => (
                        <SortableAtividadeRow
                          key={atividade.id}
                          atividade={atividade}
                          modoEdicao={modoEdicao}
                          selecionada={atividadesSelecionadas.has(atividade.id)}
                          onToggleSelecao={toggleSelecao}
                          onEdit={abrirEditarAtividade}
                          onDelete={setAtividadeToDelete}
                          onStatusChange={atualizarStatusAtividade}
                          getTarjaClass={getTarjaClass}
                          getStatusColor={getStatusColor}
                          getStatusLabel={getStatusLabel}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
                {salvandoOrdem && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 text-center text-sm text-blue-600 dark:text-blue-400">
                    Salvando nova ordem...
                  </div>
                )}
              </div>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nova/Editar Atividade */}
      <Dialog open={atividadeDialogOpen} onOpenChange={fecharDialogAtividade}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editandoAtividade ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
            <DialogDescription>
              {editandoAtividade
                ? 'Atualize os dados da atividade'
                : 'Adicione uma nova atividade ao cronograma da obra'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="data_prevista">Data Prevista *</Label>
              <Input
                id="data_prevista"
                type="date"
                value={novaAtividade.data_prevista}
                onChange={(e) =>
                  setNovaAtividade({ ...novaAtividade, data_prevista: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao_servico">Descrição do Serviço *</Label>
              <Input
                id="descricao_servico"
                placeholder="Ex: Fundação, Alvenaria, Reboco..."
                value={novaAtividade.descricao_servico}
                onChange={(e) =>
                  setNovaAtividade({ ...novaAtividade, descricao_servico: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                placeholder="Observações adicionais..."
                value={novaAtividade.observacao}
                onChange={(e) =>
                  setNovaAtividade({ ...novaAtividade, observacao: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="empresa_parceira">Empresa Parceira (Opcional)</Label>
              <Select
                value={novaAtividade.empresa_parceira_id || undefined}
                onValueChange={(value) =>
                  setNovaAtividade({ ...novaAtividade, empresa_parceira_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma empresa selecionada" />
                </SelectTrigger>
                <SelectContent>
                  {empresasParceiras.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={novaAtividade.status}
                  onValueChange={(value) =>
                    setNovaAtividade({ ...novaAtividade, status: value as AtividadeStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={novaAtividade.prioridade}
                  onValueChange={(value) =>
                    setNovaAtividade({
                      ...novaAtividade,
                      prioridade: value as AtividadePrioridade,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharDialogAtividade}>
              Cancelar
            </Button>
            <Button onClick={editandoAtividade ? atualizarAtividade : adicionarAtividade}>
              {editandoAtividade ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Vincular Empresa */}
      <Dialog open={empresaDialogOpen} onOpenChange={setEmpresaDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoVinculo ? 'Editar Vínculo' : 'Vincular Empresa ao Cronograma'}</DialogTitle>
            <DialogDescription>
              Defina as datas que a empresa irá atuar na obra e o valor contratado
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 px-1">
            <div className="grid gap-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Select
                value={novoVinculo.empresa_id}
                onValueChange={(value) => setNovoVinculo({ ...novoVinculo, empresa_id: value })}
                disabled={!!editandoVinculo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresasParceiras.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editandoVinculo && (
              <div className="grid gap-2">
                <Label htmlFor="quantidade_periodos">Essa empresa vai atuar quantas vezes no cronograma? *</Label>
                <Select
                  value={quantidadePeriodos.toString()}
                  onValueChange={(value) => handleQuantidadePeriodosChange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a quantidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'vez' : 'vezes'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-3">
              <Label className="text-base font-semibold">
                Períodos de Atuação {quantidadePeriodos > 1 && `(${quantidadePeriodos} períodos)`}
              </Label>

              <div className={`grid gap-3 ${quantidadePeriodos > 5 ? 'max-h-[400px] overflow-y-auto pr-2' : ''}`}>
                {novoVinculo.periodos.map((periodo, index) => (
                  <div key={index} className="grid gap-2 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {quantidadePeriodos > 1 ? `Período ${index + 1}` : 'Período de Atuação'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor={`data_inicio_${index}`} className="text-xs">Data de Início *</Label>
                        <Input
                          id={`data_inicio_${index}`}
                          type="date"
                          value={periodo.data_inicio_prevista}
                          onChange={(e) => updatePeriodo(index, 'data_inicio_prevista', e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor={`data_fim_${index}`} className="text-xs">Data de Fim *</Label>
                        <Input
                          id={`data_fim_${index}`}
                          type="date"
                          value={periodo.data_fim_prevista}
                          onChange={(e) => updatePeriodo(index, 'data_fim_prevista', e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valor">Valor Contratado Total (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={novoVinculo.valor_contratado}
                onChange={(e) => setNovoVinculo({ ...novoVinculo, valor_contratado: e.target.value })}
              />
              {quantidadePeriodos > 1 && novoVinculo.valor_contratado && (
                <p className="text-xs text-muted-foreground">
                  Valor por período: R$ {(parseFloat(novoVinculo.valor_contratado) / quantidadePeriodos).toFixed(2)}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais sobre o contrato..."
                value={novoVinculo.observacoes}
                onChange={(e) => setNovoVinculo({ ...novoVinculo, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fecharDialogEmpresa}>
              Cancelar
            </Button>
            <Button onClick={vincularEmpresa}>
              {editandoVinculo ? 'Salvar Alterações' : 'Vincular Empresa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog - Excluir Vínculo */}
      <AlertDialog open={!!vinculoToDelete} onOpenChange={(o) => { if (!o) setVinculoToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta empresa do cronograma? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletarVinculo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog - Excluir Atividade */}
      <AlertDialog open={!!atividadeToDelete} onOpenChange={(o) => { if (!o) setAtividadeToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletarAtividade}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pendente: 'bg-gray-500 text-white hover:bg-gray-600',
    em_andamento: 'bg-blue-500 text-white hover:bg-blue-600',
    realizado: 'bg-green-500 text-white hover:bg-green-600',
    atrasado: 'bg-red-500 text-white hover:bg-red-600',
    cancelado: 'bg-orange-500 text-white hover:bg-orange-600',
  }
  return colors[status] || 'bg-gray-400 text-white'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    realizado: 'Realizado',
    atrasado: 'Atrasado',
    cancelado: 'Cancelado',
  }
  return labels[status] || status
}

function getVinculoStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pendente: 'bg-gray-500 text-white hover:bg-gray-600',
    proposta_enviada: 'bg-purple-500 text-white hover:bg-purple-600',
    em_negociacao: 'bg-yellow-500 text-white hover:bg-yellow-600',
    contratada: 'bg-blue-500 text-white hover:bg-blue-600',
    em_execucao: 'bg-cyan-500 text-white hover:bg-cyan-600',
    concluida: 'bg-green-500 text-white hover:bg-green-600',
    cancelada: 'bg-red-500 text-white hover:bg-red-600',
  }
  return colors[status] || 'bg-gray-400 text-white'
}

function getVinculoStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    proposta_enviada: 'Proposta Enviada',
    em_negociacao: 'Em Negociação',
    contratada: 'Contratada',
    em_execucao: 'Em Execução',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
  }
  return labels[status] || status
}

function getTarjaClass(status: string, dataPrevista?: string): string {
  // Realizado: tarja verde
  if (status === 'realizado') {
    return 'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500'
  }

  // Cancelado: tarja laranja
  if (status === 'cancelado') {
    return 'bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500'
  }

  // Verifica se está atrasado (data passou e não está realizado nem cancelado)
  if (dataPrevista && new Date(dataPrevista) < new Date()) {
    return 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500'
  }

  // Em andamento ou pendente sem atraso: sem tarja (branco)
  return ''
}
