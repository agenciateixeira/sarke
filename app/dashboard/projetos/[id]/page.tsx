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
} from 'lucide-react'
import { ProjetoCompleto, etapaLabels, etapaCores, areaLabels, formatarFrente } from '@/types/projeto'
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
  const [activeTab, setActiveTab] = useState('informacoes')

  useEffect(() => {
    loadProjeto()
  }, [params.id])

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
          <TabsList>
            <TabsTrigger value="informacoes">Informações</TabsTrigger>
            <TabsTrigger value="planejamento">
              <Palette className="h-4 w-4 mr-2" />
              Planejamento
            </TabsTrigger>
            <TabsTrigger value="planta_baixa">
              <FileText className="h-4 w-4 mr-2" />
              Planta Baixa
            </TabsTrigger>
            <TabsTrigger value="3d">
              <Box className="h-4 w-4 mr-2" />
              3D
            </TabsTrigger>
            <TabsTrigger value="executivo">
              <Building2 className="h-4 w-4 mr-2" />
              Executivo
            </TabsTrigger>
            <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
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
                    <p className="text-sm mt-1">
                      <Badge variant="outline">{areaLabels[projeto.area]}</Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Frente</label>
                    <p className="text-sm mt-1">
                      <Badge variant="outline">{formatarFrente(projeto.frente)}</Badge>
                    </p>
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

          {/* Outras Abas - Placeholder */}
          <TabsContent value="planejamento">
            <Card>
              <CardHeader>
                <CardTitle>Planejamento</CardTitle>
                <CardDescription>Formulário inicial, visita técnica, briefing e referências</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Conteúdo em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planta_baixa">
            <Card>
              <CardHeader>
                <CardTitle>Planta Baixa</CardTitle>
                <CardDescription>Conceito, estudos, análise normativa e versões</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Conteúdo em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="3d">
            <Card>
              <CardHeader>
                <CardTitle>Modelo 3D</CardTitle>
                <CardDescription>Modelagem, renderização, VR e vídeos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Conteúdo em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="executivo">
            <Card>
              <CardHeader>
                <CardTitle>Projeto Executivo</CardTitle>
                <CardDescription>Detalhamentos ARQ e INT, memorial técnico</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Conteúdo em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="arquivos">
            <Card>
              <CardHeader>
                <CardTitle>Arquivos do Projeto</CardTitle>
                <CardDescription>Documentos, DWGs, renders e outros arquivos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Conteúdo em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Timeline do Projeto</CardTitle>
                <CardDescription>Histórico de eventos e mudanças</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Conteúdo em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
