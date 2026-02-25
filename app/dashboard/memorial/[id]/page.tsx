'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Archive,
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Loader2,
  FileText,
  User
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

export default function MemorialObraPage() {
  const params = useParams()
  const router = useRouter()
  const [obra, setObra] = useState<MemorialObra | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      carregarObra(params.id as string)
    }
  }, [params.id])

  async function carregarObra(id: string) {
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
        .eq('id', id)
        .single()

      if (error) throw error

      setObra(data)
    } catch (error: any) {
      console.error('Erro ao carregar obra do memorial:', error)
      toast.error('Erro ao carregar obra')
      router.push('/dashboard/memorial')
    } finally {
      setLoading(false)
    }
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
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title={obra.nome}
          description="Obra arquivada no memorial"
          actions={
            <Link href="/dashboard/memorial">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          }
        />

        {/* Status e Informações Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card de Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Status</span>
                <Badge className={statusColors[obra.status] || 'bg-gray-100'}>
                  <Archive className="mr-1 h-3 w-3" />
                  {statusLabels[obra.status] || obra.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              {obra.motivo_arquivamento && (
                <div>
                  <p className="text-sm text-muted-foreground">Motivo do Arquivamento</p>
                  <p className="font-medium">{obra.motivo_arquivamento}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-lg">
                {obra.clients?.name || 'Cliente não informado'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações da Obra */}
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

            {obra.valor_contrato && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor do Contrato</p>
                  <p className="font-semibold text-green-600">{formatCurrency(obra.valor_contrato)}</p>
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
          </CardContent>
        </Card>

        {/* Descrição */}
        {obra.descricao && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Descrição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{obra.descricao}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  )
}
