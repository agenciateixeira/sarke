'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
} from 'lucide-react'
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
import { exportarCronogramaExcel, importarCronogramaExcel, AtividadeImportada } from '@/lib/cronogramaExcel'
import { generateCronogramaPDF } from '@/lib/cronogramaPdf'

interface CronogramaObraViewProps {
  obraId: string
  obraNome?: string
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

  useEffect(() => {
    loadCronograma()
    loadEmpresasParceiras()
  }, [obraId])

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

      const atividadesImportadas = await importarCronogramaExcel(file)

      if (atividadesImportadas.length === 0) {
        toast.error('Nenhuma atividade encontrada no arquivo')
        return
      }

      // Inserir atividades no banco
      const atividadesParaInserir = atividadesImportadas.map((ativ, index) => {
        const data = new Date(ativ.data_prevista)
        const mes = format(data, 'MMMM', { locale: ptBR })
        const diaSemana = format(data, 'EEEE', { locale: ptBR })

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

      const { error } = await supabase
        .from('cronograma_obra_atividades')
        .insert(atividadesParaInserir)

      if (error) throw error

      toast.success(`${atividadesImportadas.length} atividades importadas com sucesso!`)
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

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setAtividadeDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
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

      <Card>
        <CardHeader>
          <CardTitle>Cronograma de Atividades</CardTitle>
          <CardDescription>
            {atividades.length} atividade{atividades.length !== 1 ? 's' : ''} programada{atividades.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {atividades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atividade cadastrada. Importe do Excel ou adicione manualmente.
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left font-medium border-r">Mes</th>
                    <th className="p-2 text-left font-medium border-r">Dia Semana</th>
                    <th className="p-2 text-left font-medium border-r">Data</th>
                    <th className="p-2 text-left font-medium border-r">Descricao Servico</th>
                    <th className="p-2 text-left font-medium border-r">Observacao</th>
                    <th className="p-2 text-left font-medium border-r">Empresa</th>
                    <th className="p-2 text-left font-medium border-r">Status</th>
                    <th className="p-2 text-center font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {atividades.map((atividade) => (
                    <tr
                      key={atividade.id}
                      className={`border-t hover:bg-muted/50 ${
                        atividade.status === 'atrasado' ? 'bg-red-50 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="p-2 border-r">{atividade.mes}</td>
                      <td className="p-2 border-r">{atividade.dia_semana}</td>
                      <td className="p-2 border-r">
                        {atividade.data_prevista
                          ? format(new Date(atividade.data_prevista), 'dd/MM/yyyy')
                          : '-'}
                      </td>
                      <td className="p-2 border-r font-medium">{atividade.descricao_servico}</td>
                      <td className="p-2 border-r text-muted-foreground text-xs">
                        {atividade.observacao || '-'}
                      </td>
                      <td className="p-2 border-r text-xs">
                        {(atividade as any).empresa_parceira?.nome || '-'}
                      </td>
                      <td className="p-2 border-r">
                        <Badge variant={getStatusVariant(atividade.status)}>
                          {getStatusLabel(atividade.status)}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => abrirEditarAtividade(atividade)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setAtividadeToDelete(atividade.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'realizado':
      return 'default'
    case 'em_andamento':
      return 'secondary'
    case 'atrasado':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    realizado: 'Realizado',
    em_andamento: 'Em Andamento',
    atrasado: 'Atrasado',
    cancelado: 'Cancelado',
  }
  return labels[status] || status
}
