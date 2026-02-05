'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Download,
  Edit,
  FileSpreadsheet,
  Calendar,
  Cloud,
  CloudRain,
  Sun,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Image as ImageIcon,
  Droplets,
} from 'lucide-react'
import { RDO, RDOMaoObra, RDOAtividade, RDOFoto, StatusRDO, StatusAtividade } from '@/types/rdo'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { generateRDOPDF } from '@/lib/rdoPdf'

const statusColors: Record<StatusRDO, string> = {
  rascunho: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  finalizado: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  aprovado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
}

const statusLabels: Record<StatusRDO, string> = {
  rascunho: 'Rascunho',
  finalizado: 'Finalizado',
  aprovado: 'Aprovado',
}

const atividadeStatusColors: Record<StatusAtividade, string> = {
  iniciada: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  em_andamento: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  concluida: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pausada: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const atividadeStatusLabels: Record<StatusAtividade, string> = {
  iniciada: 'Iniciada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  pausada: 'Pausada',
  cancelada: 'Cancelada',
}

const climaIcons: Record<string, any> = {
  claro: Sun,
  nublado: Cloud,
  chuvoso: CloudRain,
  tempestade: CloudRain,
}

const climaLabels: Record<string, string> = {
  claro: 'Claro',
  nublado: 'Nublado',
  chuvoso: 'Chuvoso',
  tempestade: 'Tempestade',
}

export default function RDODetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rdo, setRdo] = useState<RDO | null>(null)
  const [maoObra, setMaoObra] = useState<RDOMaoObra[]>([])
  const [atividades, setAtividades] = useState<RDOAtividade[]>([])
  const [fotos, setFotos] = useState<RDOFoto[]>([])

  useEffect(() => {
    if (params.rdoId) {
      loadRDO()
    }
  }, [params.rdoId])

  async function loadRDO() {
    try {
      setLoading(true)

      // Carregar RDO principal com obra
      const { data: rdoData, error: rdoError } = await supabase
        .from('rdos')
        .select(`
          *,
          obra:obras(id, nome, endereco, cidade, estado)
        `)
        .eq('id', params.rdoId)
        .single()

      if (rdoError) throw rdoError

      setRdo(rdoData)

      // Carregar mão de obra
      const { data: maoObraData, error: maoObraError } = await supabase
        .from('rdo_mao_obra')
        .select('*')
        .eq('rdo_id', params.rdoId)

      if (maoObraError) throw maoObraError
      setMaoObra(maoObraData || [])

      // Carregar atividades
      const { data: atividadesData, error: atividadesError } = await supabase
        .from('rdo_atividades')
        .select('*')
        .eq('rdo_id', params.rdoId)
        .order('ordem')

      if (atividadesError) throw atividadesError
      setAtividades(atividadesData || [])

      // Carregar fotos
      const { data: fotosData, error: fotosError } = await supabase
        .from('rdo_fotos')
        .select('*')
        .eq('rdo_id', params.rdoId)
        .order('ordem')

      if (fotosError) throw fotosError
      setFotos(fotosData || [])
    } catch (error: any) {
      console.error('Erro ao carregar RDO:', error)
      toast.error('Erro ao carregar RDO')
      router.push(`/dashboard/obra/${params.id}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportPDF() {
    if (!rdo) return

    try {
      toast.info('Gerando PDF...')
      await generateRDOPDF({
        rdo,
        maoObra,
        atividades,
        fotos,
      })
      toast.success('PDF gerado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF')
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredSetor="gestao_obra">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Carregando RDO...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!rdo) {
    return null
  }

  const ClimaManhaIcon = climaIcons[rdo.clima_manha_tempo || 'claro']
  const ClimaNoiteIcon = climaIcons[rdo.clima_noite_tempo || 'claro']
  const totalTrabalhadores = maoObra.reduce((sum, m) => sum + m.quantidade, 0)

  return (
    <ProtectedRoute requiredSetor="gestao_obra">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/dashboard/obra/${params.id}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">RDO n° {rdo.numero_relatorio}</h1>
                <Badge className={statusColors[rdo.status]}>
                  {statusLabels[rdo.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(rdo.data_relatorio), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </span>
                <span>•</span>
                <span>{rdo.dia_semana}</span>
              </div>
              {rdo.obra && (
                <p className="text-sm text-muted-foreground mt-1">
                  {rdo.obra.nome}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/obra/${params.id}/rdo/${rdo.id}/editar`}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
            <Button onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clima</CardTitle>
              <ClimaManhaIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {climaLabels[rdo.clima_manha_tempo || 'claro']}
              </div>
              <p className="text-xs text-muted-foreground">
                {rdo.clima_manha_condicao === 'praticavel' ? '✅ Praticável' : '⛔ Impraticável'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trabalhadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTrabalhadores}</div>
              <p className="text-xs text-muted-foreground">
                {maoObra.length} tipos diferentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atividades</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{atividades.length}</div>
              <p className="text-xs text-muted-foreground">
                {atividades.filter((a) => a.status === 'concluida').length} concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fotos</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fotos.length}</div>
              <p className="text-xs text-muted-foreground">Registros fotográficos</p>
            </CardContent>
          </Card>
        </div>

        {/* Condições Climáticas */}
        <Card>
          <CardHeader>
            <CardTitle>Condições Climáticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Manhã */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ClimaManhaIcon className="h-5 w-5" />
                  Manhã
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tempo:</span>
                    <span className="font-medium capitalize">
                      {climaLabels[rdo.clima_manha_tempo || 'claro']}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Condição:</span>
                    <span className="font-medium">
                      {rdo.clima_manha_condicao === 'praticavel'
                        ? '✅ Praticável'
                        : '⛔ Impraticável'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Noite */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ClimaNoiteIcon className="h-5 w-5" />
                  Noite
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tempo:</span>
                    <span className="font-medium capitalize">
                      {climaLabels[rdo.clima_noite_tempo || 'claro']}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Condição:</span>
                    <span className="font-medium">
                      {rdo.clima_noite_condicao === 'praticavel'
                        ? '✅ Praticável'
                        : '⛔ Impraticável'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {rdo.indice_pluviometrico && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Índice Pluviométrico:</span>
                  <span className="text-sm">{rdo.indice_pluviometrico} mm</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mão de Obra */}
        {maoObra.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mão de Obra</CardTitle>
              <CardDescription>Trabalhadores presentes no dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {maoObra.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium capitalize">{item.tipo}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.tipo_contratacao === 'propria' ? 'Própria' : 'Terceirizada'}
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-primary">{item.quantidade}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Atividades */}
        {atividades.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Atividades Executadas</CardTitle>
              <CardDescription>{atividades.length} atividades registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {atividades.map((atividade, index) => (
                  <div
                    key={atividade.id}
                    className="flex items-start gap-3 p-4 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{atividade.descricao}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="secondary"
                          className={atividadeStatusColors[atividade.status]}
                        >
                          {atividadeStatusLabels[atividade.status]}
                        </Badge>
                        {atividade.local && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {atividade.local}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fotos */}
        {fotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
              <CardDescription>{fotos.length} fotos anexadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fotos.map((foto) => (
                  <div key={foto.id} className="space-y-2">
                    <div className="aspect-video rounded-lg border overflow-hidden bg-muted">
                      <img
                        src={foto.foto_url}
                        alt={foto.descricao || 'Foto da obra'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {foto.descricao && (
                      <p className="text-sm text-muted-foreground">{foto.descricao}</p>
                    )}
                    {foto.local && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {foto.local}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações Gerais */}
        {rdo.observacoes_gerais && (
          <Card>
            <CardHeader>
              <CardTitle>Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {rdo.observacoes_gerais}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metadados */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Criado em {format(new Date(rdo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              {rdo.updated_at !== rdo.created_at && (
                <>
                  <span>•</span>
                  <span>
                    Atualizado em {format(new Date(rdo.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
