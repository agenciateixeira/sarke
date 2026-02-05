'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Wrench,
  FileText,
  TrendingUp,
  Award,
  Calendar,
  Globe,
  CreditCard,
  Shield,
} from 'lucide-react'
import { EmpresaParceira, StatusEmpresa } from '@/types/empresa'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusColors: Record<StatusEmpresa, string> = {
  ativa: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inativa: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  bloqueada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const statusLabels: Record<StatusEmpresa, string> = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  bloqueada: 'Bloqueada',
}

export default function EmpresaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [empresa, setEmpresa] = useState<EmpresaParceira | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadEmpresa()
    }
  }, [params.id])

  async function loadEmpresa() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('empresas_parceiras')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      setEmpresa(data)
    } catch (error: any) {
      console.error('Erro ao carregar empresa:', error)
      toast.error('Erro ao carregar empresa')
      router.push('/dashboard/obra/empresas')
    } finally {
      setLoading(false)
    }
  }

  function getInitials(nome: string) {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
        }`}
      />
    ))
  }

  if (loading) {
    return (
      <ProtectedRoute requiredSetor="gestao_obra">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Carregando empresa...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!empresa) {
    return null
  }

  return (
    <ProtectedRoute requiredSetor="gestao_obra">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/obra/empresas">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <Avatar className="h-20 w-20">
              {empresa.logo_url && <AvatarImage src={empresa.logo_url} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(empresa.nome)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold truncate">{empresa.nome}</h1>
                <Badge className={statusColors[empresa.status]}>
                  {statusLabels[empresa.status]}
                </Badge>
              </div>
              {empresa.especialidade_principal && (
                <p className="text-muted-foreground text-lg">
                  {empresa.especialidade_principal.replace(/_/g, ' ')}
                </p>
              )}
              {empresa.numero_avaliacoes > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    {renderStars(empresa.avaliacao_media)}
                  </div>
                  <span className="text-lg font-semibold">
                    {empresa.avaliacao_media.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({empresa.numero_avaliacoes} avaliações)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/obra/empresas/${empresa.id}/editar`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
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
              <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
              <Star className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {empresa.avaliacao_media.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                {empresa.numero_avaliacoes} avaliações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Obras Executadas</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{empresa.total_obras_executadas}</div>
              <p className="text-xs text-muted-foreground">Total histórico</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusLabels[empresa.status]}</div>
              <p className="text-xs text-muted-foreground">
                {empresa.status === 'ativa' ? 'Apta para contratar' : 'Não disponível'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cadastro</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(new Date(empresa.created_at), 'dd/MM/yy', { locale: ptBR })}
              </div>
              <p className="text-xs text-muted-foreground">Data de cadastro</p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        {empresa.status === 'ativa' && (
          <div className="space-y-2">
            {empresa.seguro_vencimento &&
              new Date(empresa.seguro_vencimento) < new Date() && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">Seguro vencido</p>
                        <p className="text-sm">
                          Venceu em{' '}
                          {format(new Date(empresa.seguro_vencimento), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            {empresa.certidao_vencimento &&
              new Date(empresa.certidao_vencimento) < new Date() && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">Certidão vencida</p>
                        <p className="text-sm">
                          Venceu em{' '}
                          {format(new Date(empresa.certidao_vencimento), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        )}

        {/* Tabs de Conteúdo */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
            <TabsTrigger value="obras">Obras</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          </TabsList>

          {/* Aba Informações */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {empresa.cnpj && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CNPJ</p>
                      <p className="text-lg">{empresa.cnpj}</p>
                    </div>
                  )}

                  {empresa.inscricao_estadual && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Inscrição Estadual
                      </p>
                      <p className="text-lg">{empresa.inscricao_estadual}</p>
                    </div>
                  )}

                  {empresa.inscricao_municipal && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Inscrição Municipal
                      </p>
                      <p className="text-lg">{empresa.inscricao_municipal}</p>
                    </div>
                  )}

                  {empresa.site && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Site</p>
                      <a
                        href={empresa.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg text-primary hover:underline flex items-center gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        {empresa.site}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contatos */}
              <Card>
                <CardHeader>
                  <CardTitle>Contatos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {empresa.responsavel && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Responsável</p>
                      <p className="text-lg flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {empresa.responsavel}
                      </p>
                    </div>
                  )}

                  {empresa.telefone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                      <p className="text-lg flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {empresa.telefone}
                      </p>
                    </div>
                  )}

                  {empresa.celular && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Celular</p>
                      <p className="text-lg flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {empresa.celular}
                      </p>
                    </div>
                  )}

                  {empresa.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">E-mail</p>
                      <p className="text-lg flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {empresa.email}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Endereço */}
              <Card>
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {empresa.endereco && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Logradouro</p>
                      <p className="text-lg flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1" />
                        {empresa.endereco}
                        {empresa.numero && `, ${empresa.numero}`}
                      </p>
                    </div>
                  )}

                  {empresa.complemento && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Complemento</p>
                      <p className="text-lg">{empresa.complemento}</p>
                    </div>
                  )}

                  {empresa.bairro && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bairro</p>
                      <p className="text-lg">{empresa.bairro}</p>
                    </div>
                  )}

                  {(empresa.cidade || empresa.estado) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cidade/Estado</p>
                      <p className="text-lg">
                        {empresa.cidade}
                        {empresa.cidade && empresa.estado && ' - '}
                        {empresa.estado}
                      </p>
                    </div>
                  )}

                  {empresa.cep && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CEP</p>
                      <p className="text-lg">{empresa.cep}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dados Bancários */}
              <Card>
                <CardHeader>
                  <CardTitle>Dados Bancários</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {empresa.banco && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Banco</p>
                      <p className="text-lg flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {empresa.banco}
                      </p>
                    </div>
                  )}

                  {empresa.agencia && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Agência</p>
                      <p className="text-lg">{empresa.agencia}</p>
                    </div>
                  )}

                  {empresa.conta && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Conta</p>
                      <p className="text-lg">{empresa.conta}</p>
                    </div>
                  )}

                  {empresa.pix && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">PIX</p>
                      <p className="text-lg">{empresa.pix}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Observações */}
            {(empresa.observacoes_gerais ||
              empresa.pontos_fortes ||
              empresa.pontos_atencao) && (
              <div className="grid gap-4 md:grid-cols-3">
                {empresa.observacoes_gerais && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Observações Gerais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {empresa.observacoes_gerais}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {empresa.pontos_fortes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        Pontos Fortes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {empresa.pontos_fortes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {empresa.pontos_atencao && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-5 w-5" />
                        Pontos de Atenção
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {empresa.pontos_atencao}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Aba Serviços */}
          <TabsContent value="servicos">
            <Card>
              <CardHeader>
                <CardTitle>Serviços Oferecidos</CardTitle>
                <CardDescription>Lista completa de serviços que a empresa executa</CardDescription>
              </CardHeader>
              <CardContent>
                {empresa.servicos && empresa.servicos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {empresa.servicos.map((servico) => (
                      <Badge key={servico} variant="secondary" className="text-sm py-2 px-4">
                        <Wrench className="h-4 w-4 mr-2" />
                        {servico.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum serviço cadastrado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Obras */}
          <TabsContent value="obras">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Obras</CardTitle>
                <CardDescription>Obras em que a empresa participou</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em desenvolvimento</p>
                  <p className="text-sm">
                    Lista de obras com serviços executados, valores e avaliações
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Equipe */}
          <TabsContent value="equipe">
            <Card>
              <CardHeader>
                <CardTitle>Equipe Técnica</CardTitle>
                <CardDescription>
                  Profissionais vinculados à empresa (engenheiros, técnicos, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em desenvolvimento</p>
                  <p className="text-sm">
                    Lista de profissionais com qualificações e certificações
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Equipamentos */}
          <TabsContent value="equipamentos">
            <Card>
              <CardHeader>
                <CardTitle>Equipamentos</CardTitle>
                <CardDescription>Equipamentos e maquinário disponível</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em desenvolvimento</p>
                  <p className="text-sm">
                    Lista de equipamentos com modelos e disponibilidade
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Avaliações */}
          <TabsContent value="avaliacoes">
            <Card>
              <CardHeader>
                <CardTitle>Avaliações</CardTitle>
                <CardDescription>
                  Histórico de avaliações recebidas em obras anteriores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Em desenvolvimento</p>
                  <p className="text-sm">
                    Lista de avaliações com feedbacks detalhados e critérios
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}
