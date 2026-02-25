'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Archive,
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Loader2,
  FileText,
  User,
  Download,
  Image as ImageIcon,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Package,
  CalendarDays,
  Users
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface MemorialObra {
  id: string
  obra_original_id: string
  nome: string
  descricao: string | null
  status: string
  cliente_id: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  tipo_obra: string | null
  valor_contrato: number | null
  area_construida: number | null
  area_terreno: number | null
  data_inicio: string | null
  data_previsao_termino: string | null
  data_termino_real: string | null
  duracao_meses: number | null
  progresso_percentual: number | null
  arquivado_em: string
  motivo_arquivamento: string | null
  clients: {
    name: string
    email: string | null
    phone: string | null
  } | null
}

interface MemorialEmpresa {
  id: string
  empresa_nome: string
  empresa_cnpj: string | null
  tipo_servico: string
  data_inicio: string | null
  data_fim: string | null
  valor_contrato: number | null
  status: string | null
}

interface MemorialCaixa {
  id: string
  tipo: string
  categoria: string | null
  descricao: string
  valor: number
  data: string
  forma_pagamento: string | null
}

interface MemorialMaterial {
  id: string
  categoria: string | null
  item: string
  descricao: string | null
  unidade: string | null
  quantidade: number | null
  valor_unitario: number | null
  valor_total: number | null
  fornecedor: string | null
}

interface MemorialFoto {
  id: string
  titulo: string | null
  descricao: string | null
  url: string
  data_foto: string | null
}

interface MemorialDocumento {
  id: string
  titulo: string
  descricao: string | null
  tipo: string | null
  url: string
}

const statusLabels: Record<string, string> = {
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const statusColors: Record<string, string> = {
  concluida: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export default function MemorialObraPage() {
  const params = useParams()
  const router = useRouter()

  const [obra, setObra] = useState<MemorialObra | null>(null)
  const [empresas, setEmpresas] = useState<MemorialEmpresa[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MemorialCaixa[]>([])
  const [materiais, setMateriais] = useState<MemorialMaterial[]>([])
  const [fotos, setFotos] = useState<MemorialFoto[]>([])
  const [documentos, setDocumentos] = useState<MemorialDocumento[]>([])
  const [loading, setLoading] = useState(true)

  const totalEntradas = movimentacoes
    .filter((m) => m.tipo === 'entrada')
    .reduce((sum, m) => sum + Number(m.valor), 0)

  const totalSaidas = movimentacoes
    .filter((m) => m.tipo === 'saida')
    .reduce((sum, m) => sum + Number(m.valor), 0)

  const saldoFinal = totalEntradas - totalSaidas

  const totalOrcamento = materiais.reduce((sum, m) => sum + (Number(m.valor_total) || 0), 0)

  useEffect(() => {
    if (params.id) {
      carregarDadosCompletos(params.id as string)
    }
  }, [params.id])

  async function carregarDadosCompletos(id: string) {
    try {
      setLoading(true)

      // Carregar obra
      const { data: obraData, error: obraError } = await supabase
        .from('memorial_obras')
        .select(`
          *,
          clients:cliente_id (
            name,
            email,
            phone
          )
        `)
        .eq('id', id)
        .single()

      if (obraError) throw obraError
      setObra(obraData)

      // Carregar empresas parceiras
      const { data: empresasData } = await supabase
        .from('memorial_obra_empresas')
        .select('*')
        .eq('memorial_obra_id', id)
        .order('data_inicio', { ascending: false })

      setEmpresas(empresasData || [])

      // Carregar movimentações financeiras
      const { data: caixaData } = await supabase
        .from('memorial_caixa_obra')
        .select('*')
        .eq('memorial_obra_id', id)
        .order('data', { ascending: false })

      setMovimentacoes(caixaData || [])

      // Carregar materiais
      const { data: materiaisData } = await supabase
        .from('memorial_orcamento_materiais')
        .select('*')
        .eq('memorial_obra_id', id)
        .order('item', { ascending: true })

      setMateriais(materiaisData || [])

      // Carregar fotos
      const { data: fotosData } = await supabase
        .from('memorial_obra_fotos')
        .select('*')
        .eq('memorial_obra_id', id)
        .order('data_foto', { ascending: false })

      setFotos(fotosData || [])

      // Carregar documentos
      const { data: docsData } = await supabase
        .from('memorial_obra_documentos')
        .select('*')
        .eq('memorial_obra_id', id)
        .order('created_at', { ascending: false })

      setDocumentos(docsData || [])

    } catch (error: any) {
      console.error('Erro ao carregar memorial:', error)
      toast.error('Erro ao carregar memorial da obra')
      router.push('/dashboard/memorial')
    } finally {
      setLoading(false)
    }
  }

  function handleExportarPDF() {
    toast.success('Preparando PDF para impressão...')
    setTimeout(() => {
      window.print()
    }, 500)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col gap-6 p-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  if (!obra) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col gap-6 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Obra não encontrada</CardTitle>
              <CardDescription>
                A obra que você está procurando não foi encontrada no memorial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/memorial">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para Memorial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #memorial-print-content,
          #memorial-print-content * {
            visibility: visible;
          }
          #memorial-print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hide {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          @page {
            margin: 2cm;
          }
        }
      `}</style>

      <div className="flex flex-col gap-6 p-6" id="memorial-print-content">
        {/* Cabeçalho de Impressão com Logo */}
        <div className="hidden print:block mb-8 border-b-2 border-gray-300 pb-4">
          <div className="flex items-center justify-between">
            <img src="/logo.png" alt="Sarke" className="h-16" />
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900">{obra.nome}</h1>
              <p className="text-gray-600">Memorial Descritivo da Obra</p>
            </div>
          </div>
        </div>

        <div className="print-hide">
          <PageHeader
            title={obra.nome}
            description="Memorial Descritivo - Relatório Executivo da Obra"
            actions={
              <div className="flex gap-2">
                <Button onClick={handleExportarPDF} variant="default">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
                <Link href="/dashboard/memorial">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                </Link>
              </div>
            }
          />
        </div>

        {/* Resumo Executivo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={statusColors[obra.status] || 'bg-gray-100'}>
                <Archive className="mr-1 h-3 w-3" />
                {statusLabels[obra.status] || obra.status}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Valor Contratado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(obra.valor_contrato)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalSaidas)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(saldoFinal)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com Informações Detalhadas */}
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="materiais">Materiais</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          {/* Tab Geral */}
          <TabsContent value="geral" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium text-lg">{obra.clients?.name || 'Não informado'}</p>
                </div>
                {obra.clients?.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">{obra.clients.email}</p>
                  </div>
                )}
                {obra.clients?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{obra.clients.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações da Obra</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {obra.tipo_obra && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Obra</p>
                      <p className="font-medium">{obra.tipo_obra}</p>
                    </div>
                  </div>
                )}

                {(obra.cidade || obra.estado) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Localização</p>
                      <p className="font-medium">
                        {[obra.cidade, obra.estado].filter(Boolean).join(' - ')}
                      </p>
                      {obra.endereco && <p className="text-sm text-muted-foreground">{obra.endereco}</p>}
                      {obra.cep && <p className="text-sm text-muted-foreground">CEP: {obra.cep}</p>}
                    </div>
                  </div>
                )}

                {obra.area_construida && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Área Construída</p>
                      <p className="font-medium">{obra.area_construida} m²</p>
                    </div>
                  </div>
                )}

                {obra.area_terreno && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Área do Terreno</p>
                      <p className="font-medium">{obra.area_terreno} m²</p>
                    </div>
                  </div>
                )}

                {obra.duracao_meses && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duração</p>
                      <p className="font-medium">{obra.duracao_meses} meses</p>
                    </div>
                  </div>
                )}

                {obra.data_inicio && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Início</p>
                      <p className="font-medium">
                        {new Date(obra.data_inicio).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}

                {obra.data_termino_real && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Término</p>
                      <p className="font-medium">
                        {new Date(obra.data_termino_real).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Archive className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Arquivado em</p>
                    <p className="font-medium">
                      {new Date(obra.arquivado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {obra.descricao && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Descrição da Obra
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{obra.descricao}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Empresas */}
          <TabsContent value="empresas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Empresas Parceiras
                </CardTitle>
                <CardDescription>
                  {empresas.length} {empresas.length === 1 ? 'empresa trabalhou' : 'empresas trabalharam'} nesta obra
                </CardDescription>
              </CardHeader>
              <CardContent>
                {empresas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma empresa parceira registrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empresas.map((empresa) => (
                        <TableRow key={empresa.id}>
                          <TableCell className="font-medium">{empresa.empresa_nome}</TableCell>
                          <TableCell>{empresa.empresa_cnpj || '-'}</TableCell>
                          <TableCell>{empresa.tipo_servico}</TableCell>
                          <TableCell>
                            {empresa.data_inicio && new Date(empresa.data_inicio).toLocaleDateString('pt-BR')}
                            {empresa.data_fim && ` - ${new Date(empresa.data_fim).toLocaleDateString('pt-BR')}`}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(empresa.valor_contrato)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{empresa.status || 'Concluído'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Financeiro */}
          <TabsContent value="financeiro" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Total de Entradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalEntradas)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Total de Saídas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalSaidas)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Saldo Final
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(saldoFinal)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Movimentações Financeiras</CardTitle>
                <CardDescription>
                  {movimentacoes.length} {movimentacoes.length === 1 ? 'movimentação registrada' : 'movimentações registradas'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {movimentacoes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma movimentação financeira registrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Forma de Pagamento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimentacoes.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            <Badge variant={mov.tipo === 'entrada' ? 'default' : 'destructive'}>
                              {mov.tipo === 'entrada' ? (
                                <><TrendingUp className="mr-1 h-3 w-3" /> Entrada</>
                              ) : (
                                <><TrendingDown className="mr-1 h-3 w-3" /> Saída</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{mov.categoria || '-'}</TableCell>
                          <TableCell>{mov.descricao}</TableCell>
                          <TableCell>{mov.forma_pagamento || '-'}</TableCell>
                          <TableCell className={`text-right font-semibold ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                            {mov.tipo === 'entrada' ? '+' : '-'} {formatCurrency(mov.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Materiais */}
          <TabsContent value="materiais">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orçamento de Materiais
                </CardTitle>
                <CardDescription>
                  Total orçado: <span className="font-semibold">{formatCurrency(totalOrcamento)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {materiais.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum material orçado
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Unid</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materiais.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.item}</TableCell>
                          <TableCell>{material.categoria || '-'}</TableCell>
                          <TableCell>{material.descricao || '-'}</TableCell>
                          <TableCell>{material.quantidade || '-'}</TableCell>
                          <TableCell>{material.unidade || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(material.valor_unitario)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(material.valor_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Fotos */}
          <TabsContent value="fotos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Galeria de Fotos
                </CardTitle>
                <CardDescription>
                  {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'} da obra
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fotos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma foto registrada
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fotos.map((foto) => (
                      <div key={foto.id} className="group relative aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={foto.url}
                          alt={foto.titulo || 'Foto da obra'}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {foto.titulo && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
                            <p className="text-white text-xs font-medium truncate">{foto.titulo}</p>
                            {foto.data_foto && (
                              <p className="text-white/70 text-xs">
                                {new Date(foto.data_foto).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Documentos */}
          <TabsContent value="documentos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos
                </CardTitle>
                <CardDescription>
                  {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'} arquivados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documentos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum documento registrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documentos.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.titulo}</p>
                            {doc.descricao && (
                              <p className="text-sm text-muted-foreground">{doc.descricao}</p>
                            )}
                            {doc.tipo && (
                              <Badge variant="outline" className="mt-1">
                                {doc.tipo}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rodapé de Impressão */}
        <div className="hidden print:block mt-8 pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-600">
          <p>Documento gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p className="mt-1">Sarke - Sistema de Gerenciamento de Obras</p>
        </div>
      </div>
    </ProtectedRoute>
  )
}
