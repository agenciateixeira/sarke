'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Edit,
  Trash2,
  Image as ImageIcon,
  FileText,
  ClipboardCheck,
  ListChecks,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { Obra, StatusObra, TipoObra } from '@/types/obra'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { ObraFormDialog } from '@/components/obra/ObraFormDialog'
import { RDOList } from '@/components/rdo/RDOList'
import { CronogramaObraCompleto } from '@/types/cronograma-obra'

const statusColors: Record<StatusObra, string> = {
  planejamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  em_andamento: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pausada: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  concluida: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const statusLabels: Record<StatusObra, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const tipoObraLabels: Record<TipoObra, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  industrial: 'Industrial',
  reforma: 'Reforma',
}

export default function ObraDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cronograma, setCronograma] = useState<CronogramaObraCompleto | null>(null)

  useEffect(() => {
    if (params.id) {
      loadObra()
      loadCronograma()
    }
  }, [params.id])

  async function loadObra() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('obras')
        .select(
          `
          *,
          cliente:clients(id, name, email, phone)
        `
        )
        .eq('id', params.id)
        .single()

      if (error) throw error

      setObra(data)
    } catch (error: any) {
      console.error('Erro ao carregar obra:', error)
      toast.error('Erro ao carregar obra')
      router.push('/dashboard/obra')
    } finally {
      setLoading(false)
    }
  }

  async function loadCronograma() {
    try {
      const { data, error } = await supabase
        .from('cronograma_obras_completo')
        .select('*')
        .eq('obra_id', params.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setCronograma(null)
          return
        }
        throw error
      }

      setCronograma(data)
    } catch (error: any) {
      console.error('Erro ao carregar cronograma:', error)
    }
  }

  function handleEdit() {
    setDialogOpen(true)
  }

  function handleObraSuccess() {
    loadObra()
  }

  if (loading) {
    return (
      <ProtectedRoute requiredSetor="gestao_obra">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Carregando obra...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!obra) {
    return null
  }

  return (
    <ProtectedRoute requiredSetor="gestao_obra">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/obra">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold truncate">{obra.nome}</h1>
                <Badge className={statusColors[obra.status]}>{statusLabels[obra.status]}</Badge>
              </div>
              {obra.descricao && (
                <p className="text-muted-foreground">{obra.descricao}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progresso</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{obra.progresso_percentual}%</div>
              <Progress value={obra.progresso_percentual} className="mt-2" />
            </CardContent>
          </Card>

          {obra.valor_contrato && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                  }).format(obra.valor_contrato)}
                </div>
                <p className="text-xs text-muted-foreground">Valor do contrato</p>
              </CardContent>
            </Card>
          )}

          {obra.data_inicio && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data de Início</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {format(new Date(obra.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
                <p className="text-xs text-muted-foreground">Início da obra</p>
              </CardContent>
            </Card>
          )}

          {obra.data_previsao_termino && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Previsão</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {format(new Date(obra.data_previsao_termino), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(obra.data_previsao_termino) < new Date() ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Prazo excedido
                    </span>
                  ) : (
                    'Término previsto'
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs de Conteúdo */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="medicoes">Medições</TabsTrigger>
            <TabsTrigger value="etapas">Etapas</TabsTrigger>
            <TabsTrigger value="rdo">RDO</TabsTrigger>
          </TabsList>

          {/* Aba Informações */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {obra.cliente && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                      <p className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {obra.cliente.name}
                      </p>
                    </div>
                  )}

                  {obra.tipo_obra && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tipo de Obra</p>
                      <p className="text-lg flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {tipoObraLabels[obra.tipo_obra]}
                      </p>
                    </div>
                  )}

                  {(obra.area_construida || obra.area_terreno) && (
                    <div className="grid grid-cols-2 gap-4">
                      {obra.area_construida && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Área Construída
                          </p>
                          <p className="text-lg">{obra.area_construida} m²</p>
                        </div>
                      )}
                      {obra.area_terreno && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Área do Terreno
                          </p>
                          <p className="text-lg">{obra.area_terreno} m²</p>
                        </div>
                      )}
                    </div>
                  )}

                  {obra.duracao_meses && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Duração</p>
                      <p className="text-lg">{obra.duracao_meses} meses</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Localização */}
              <Card>
                <CardHeader>
                  <CardTitle>Localização</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {obra.endereco && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                      <p className="text-lg flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1" />
                        {obra.endereco}
                      </p>
                    </div>
                  )}

                  {(obra.cidade || obra.estado) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cidade/Estado</p>
                      <p className="text-lg">
                        {obra.cidade}
                        {obra.cidade && obra.estado && ' - '}
                        {obra.estado}
                      </p>
                    </div>
                  )}

                  {obra.cep && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CEP</p>
                      <p className="text-lg">{obra.cep}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumo do Cronograma */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Cronograma
                    {cronograma && (
                      <Link href={`/dashboard/obra/cronograma/${obra.id}`}>
                        <Button variant="ghost" size="sm">
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cronograma ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-semibold">{cronograma.progresso_real}%</span>
                        </div>
                        <Progress value={cronograma.progresso_real} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Atividades</p>
                          <p className="text-2xl font-bold">{cronograma.total_atividades}</p>
                          <p className="text-xs text-green-600">
                            {cronograma.atividades_concluidas} concluidas
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Atrasadas</p>
                          <p className="text-2xl font-bold text-red-600">
                            {cronograma.atividades_atrasadas}
                          </p>
                        </div>
                      </div>

                      <div className="border-t pt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Custo Total:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              notation: 'compact',
                            }).format(cronograma.custo_total_materiais || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pago:</span>
                          <span className="font-medium text-green-600">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              notation: 'compact',
                            }).format(cronograma.valor_pago_materiais || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-3">Nenhum cronograma criado</p>
                      <Link href={`/dashboard/obra/${obra.id}`}>
                        <Button size="sm" variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Criar Cronograma
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Observações */}
            {obra.observacoes && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{obra.observacoes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba Cronograma */}
          <TabsContent value="cronograma">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Cronograma</CardTitle>
                <CardDescription>
                  Visualização rápida do andamento do cronograma desta obra
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cronograma ? (
                  <div className="space-y-6">
                    {/* Progresso */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Progresso Geral</p>
                          <p className="text-3xl font-bold">{cronograma.progresso_real}%</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                      <Progress value={cronograma.progresso_real} className="h-3" />
                    </div>

                    {/* Estatísticas em Grid */}
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Em Andamento */}
                      <div className="flex items-center gap-3 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Em Andamento</p>
                          <p className="text-2xl font-bold">{cronograma.atividades_em_andamento}</p>
                        </div>
                      </div>

                      {/* Atrasadas */}
                      <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 dark:bg-red-950/20">
                        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Atrasadas</p>
                          <p className="text-2xl font-bold text-red-600">
                            {cronograma.atividades_atrasadas}
                          </p>
                        </div>
                      </div>

                      {/* Concluídas */}
                      <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                          <ClipboardCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Concluídas</p>
                          <p className="text-2xl font-bold text-green-600">
                            {cronograma.atividades_concluidas}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Custos */}
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Informações Financeiras</h3>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Custo Total:</span>
                          <span className="text-lg font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(cronograma.custo_total_materiais || 0)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Valor Pago:</span>
                          <span className="text-lg font-bold text-green-600">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(cronograma.valor_pago_materiais || 0)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm text-muted-foreground">Saldo:</span>
                          <span className="text-lg font-bold text-orange-600">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(cronograma.saldo_materiais || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Atalho */}
                    <div className="pt-4">
                      <Button className="w-full" size="lg" asChild>
                        <Link href={`/dashboard/obra/cronograma/${obra.id}`}>
                          <FileSpreadsheet className="mr-2 h-5 w-5" />
                          Ver Cronograma Completo
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-lg font-semibold mb-2">Nenhum cronograma criado</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Crie um cronograma para esta obra e acompanhe o progresso das atividades
                    </p>
                    <Button size="lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Cronograma
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Empresas */}
          <TabsContent value="empresas">
            <Card>
              <CardHeader>
                <CardTitle>Empresas Parceiras</CardTitle>
                <CardDescription>
                  Empresas que participaram ou estão participando desta obra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em desenvolvimento</p>
                  <p className="text-sm mb-4">
                    Sistema de gestão de empresas parceiras em implementação
                  </p>
                  <p className="text-xs">
                    Em breve você poderá ver todas as empresas que trabalharam nesta obra,
                    <br />
                    com telefones, serviços executados e avaliações.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Fotos */}
          <TabsContent value="fotos">
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em breve!</p>
                  <p className="text-sm">Galeria de fotos da obra em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Documentos */}
          <TabsContent value="documentos">
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em breve!</p>
                  <p className="text-sm">Gestão de documentos da obra em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Medições */}
          <TabsContent value="medicoes">
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em breve!</p>
                  <p className="text-sm">Sistema de medições da obra em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Etapas */}
          <TabsContent value="etapas">
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em breve!</p>
                  <p className="text-sm">Gestão de etapas da obra em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba RDO */}
          <TabsContent value="rdo">
            <RDOList obraId={obra.id} />
          </TabsContent>
        </Tabs>

        {/* Modal de Edição */}
        <ObraFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          obra={obra}
          onSuccess={handleObraSuccess}
        />
      </div>
    </ProtectedRoute>
  )
}
