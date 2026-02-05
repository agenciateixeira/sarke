'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  FileSpreadsheet,
  Calendar,
  Eye,
  Download,
  Edit,
  Cloud,
  CloudRain,
  Sun,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { RDOCompleto, StatusRDO } from '@/types/rdo'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

interface RDOListProps {
  obraId: string
}

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

const climaIcons: Record<string, any> = {
  claro: Sun,
  nublado: Cloud,
  chuvoso: CloudRain,
  tempestade: CloudRain,
}

export function RDOList({ obraId }: RDOListProps) {
  const [rdos, setRdos] = useState<RDOCompleto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRDOs()
  }, [obraId])

  async function loadRDOs() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('rdos_completo')
        .select('*')
        .eq('obra_id', obraId)
        .order('data_relatorio', { ascending: false })

      if (error) throw error

      setRdos(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar RDOs:', error)
      toast.error('Erro ao carregar RDOs')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p>Carregando RDOs...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (rdos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">Nenhum RDO cadastrado</p>
            <p className="text-sm mb-4">
              Comece criando o primeiro relatório diário desta obra
            </p>
            <Button asChild>
              <Link href={`/dashboard/obra/${obraId}/rdo/novo`}>
                <Plus className="mr-2 h-4 w-4" />
                Novo RDO
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Relatórios Diários de Obra</h3>
          <p className="text-sm text-muted-foreground">
            {rdos.length} relatório{rdos.length !== 1 ? 's' : ''} cadastrado{rdos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/obra/${obraId}/rdo/novo`}>
            <Plus className="mr-2 h-4 w-4" />
            Novo RDO
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {rdos.map((rdo) => {
          const ClimaIcon = climaIcons[rdo.clima_manha_tempo || 'claro']

          return (
            <Card key={rdo.id} className="hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">
                        RDO n° {rdo.numero_relatorio}
                      </CardTitle>
                      <Badge className={statusColors[rdo.status]}>
                        {statusLabels[rdo.status]}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(rdo.data_relatorio), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                      <span>•</span>
                      <span>{rdo.dia_semana}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Resumo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <ClimaIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{rdo.clima_manha_tempo}</p>
                      <p className="text-xs text-muted-foreground">Clima</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{rdo.total_trabalhadores || 0}</p>
                      <p className="text-xs text-muted-foreground">Trabalhadores</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {rdo.atividades_concluidas}/{rdo.total_atividades}
                      </p>
                      <p className="text-xs text-muted-foreground">Atividades</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{rdo.total_fotos}</p>
                      <p className="text-xs text-muted-foreground">Fotos</p>
                    </div>
                  </div>
                </div>

                {/* Observações (preview) */}
                {rdo.observacoes_gerais && (
                  <div className="text-sm text-muted-foreground">
                    <p className="line-clamp-2">{rdo.observacoes_gerais}</p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/obra/${obraId}/rdo/${rdo.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </Link>
                  </Button>

                  {rdo.status === 'rascunho' && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/obra/${obraId}/rdo/${rdo.id}/editar`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                  )}

                  <Button variant="ghost" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </Button>

                  <div className="ml-auto text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(rdo.created_at), 'HH:mm', { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
