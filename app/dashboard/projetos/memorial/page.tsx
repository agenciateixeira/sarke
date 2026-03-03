'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Archive, Palette, Calendar, DollarSign, MapPin, Building2, Loader2, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface MemorialProjeto {
  id: string
  projeto_original_id: string
  nome: string
  descricao: string | null
  status: string
  cliente_id: string | null
  area: string | null
  tipo_especifico: string | null
  frente: string[] | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  valor_contrato: number | null
  data_inicio: string | null
  data_entrega_real: string | null
  etapa_final: string | null
  arquivado_em: string
  motivo_arquivamento: string | null
  clients: {
    name: string
  } | null
}

const statusLabels: Record<string, string> = {
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const statusColors: Record<string, string> = {
  concluido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

const areaLabels: Record<string, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  corporativo: 'Corporativo',
}

const frenteLabels: Record<string, string> = {
  arq: 'Arquitetura',
  int: 'Interiores',
}

export default function MemorialProjetosPage() {
  const [projetos, setProjetos] = useState<MemorialProjeto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarProjetosArquivados()
  }, [])

  async function carregarProjetosArquivados() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('memorial_projetos')
        .select(`
          *,
          clients:cliente_id (
            name
          )
        `)
        .order('arquivado_em', { ascending: false })

      if (error) throw error

      setProjetos(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar memorial:', error)
      toast.error('Erro ao carregar projetos arquivados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Memorial de Projetos"
          description="Arquivo histórico de projetos concluídos e cancelados"
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                <Archive className="mr-1 h-3 w-3" />
                {projetos.length} {projetos.length === 1 ? 'Projeto' : 'Projetos'} Arquivados
              </Badge>
            </div>
          }
        />

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : projetos.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum projeto arquivado</CardTitle>
              <CardDescription>
                Os projetos concluídos ou cancelados aparecerão aqui quando arquivados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  Quando um projeto for marcado como concluído ou cancelado, você poderá arquivá-lo no memorial
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projetos.map((projeto) => (
              <Card key={projeto.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{projeto.nome}</CardTitle>
                      <CardDescription className="mt-1">
                        {projeto.clients?.name || 'Cliente não informado'}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[projeto.status] || 'bg-gray-100'}>
                      {statusLabels[projeto.status] || projeto.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projeto.area && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="line-clamp-1">
                        {areaLabels[projeto.area] || projeto.area}
                        {projeto.tipo_especifico && ` · ${projeto.tipo_especifico}`}
                      </span>
                    </div>
                  )}

                  {projeto.frente && projeto.frente.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Palette className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="line-clamp-1">
                        {projeto.frente.map(f => frenteLabels[f] || f).join(' + ')}
                      </span>
                    </div>
                  )}

                  {(projeto.cidade || projeto.estado) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="line-clamp-1">
                        {[projeto.cidade, projeto.estado].filter(Boolean).join(' - ')}
                      </span>
                    </div>
                  )}

                  {projeto.valor_contrato && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold">{formatCurrency(projeto.valor_contrato)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Arquivado em{' '}
                      {new Date(projeto.arquivado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {projeto.motivo_arquivamento && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {projeto.motivo_arquivamento}
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Link href={`/dashboard/projetos/memorial/${projeto.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
