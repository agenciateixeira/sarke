'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Archive, FileText, Calendar, DollarSign, MapPin, Building2, Loader2, Eye } from 'lucide-react'
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
  tipo_obra: string | null
  valor_contrato: number | null
  data_inicio: string | null
  data_termino_real: string | null
  arquivado_em: string
  motivo_arquivamento: string | null
  clients: {
    name: string
  } | null
}

const statusLabels: Record<string, string> = {
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const statusColors: Record<string, string> = {
  concluida: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export default function MemorialPage() {
  const [obras, setObras] = useState<MemorialObra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarObrasArquivadas()
  }, [])

  async function carregarObrasArquivadas() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('memorial_obras')
        .select(`
          *,
          clients:cliente_id (
            name
          )
        `)
        .order('arquivado_em', { ascending: false })

      if (error) throw error

      setObras(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar memorial:', error)
      toast.error('Erro ao carregar obras arquivadas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Memorial de Obras"
          description="Arquivo histórico de obras concluídas e canceladas"
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                <Archive className="mr-1 h-3 w-3" />
                {obras.length} {obras.length === 1 ? 'Obra' : 'Obras'} Arquivadas
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
        ) : obras.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma obra arquivada</CardTitle>
              <CardDescription>
                As obras concluídas ou canceladas aparecerão aqui automaticamente quando arquivadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  Quando uma obra for marcada como concluída ou cancelada, ela será arquivada no memorial
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {obras.map((obra) => (
              <Card key={obra.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{obra.nome}</CardTitle>
                      <CardDescription className="mt-1">
                        {obra.clients?.name || 'Cliente não informado'}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[obra.status] || 'bg-gray-100'}>
                      {statusLabels[obra.status] || obra.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {obra.tipo_obra && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="line-clamp-1">{obra.tipo_obra}</span>
                    </div>
                  )}

                  {(obra.cidade || obra.estado) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="line-clamp-1">
                        {[obra.cidade, obra.estado].filter(Boolean).join(' - ')}
                      </span>
                    </div>
                  )}

                  {obra.valor_contrato && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold">{formatCurrency(obra.valor_contrato)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Arquivado em{' '}
                      {new Date(obra.arquivado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {obra.motivo_arquivamento && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {obra.motivo_arquivamento}
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <Link href={`/dashboard/memorial/${obra.id}`}>
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
