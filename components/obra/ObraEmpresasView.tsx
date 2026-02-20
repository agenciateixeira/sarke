'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Building,
  Phone,
  Mail,
  User,
  Calendar,
  DollarSign,
  Star,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ObraEmpresa {
  id: string
  empresa_id: string
  empresa_nome: string
  empresa_telefone?: string
  empresa_celular?: string
  empresa_email?: string
  empresa_logo?: string
  empresa_responsavel?: string
  servico_executado: string
  descricao_servico?: string
  data_inicio?: string
  data_termino?: string
  status: 'aguardando' | 'em_andamento' | 'concluido' | 'cancelado'
  avaliacao?: number
  valor_contratado?: number
  valor_pago?: number
  observacoes_cliente?: string
}

interface ObraEmpresasViewProps {
  obraId: string
}

const statusConfig = {
  aguardando: {
    label: 'Aguardando',
    color: 'bg-gray-500 text-white',
    icon: Clock,
  },
  em_andamento: {
    label: 'Em Andamento',
    color: 'bg-blue-500 text-white',
    icon: Clock,
  },
  concluido: {
    label: 'Concluído',
    color: 'bg-green-500 text-white',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-500 text-white',
    icon: XCircle,
  },
}

export function ObraEmpresasView({ obraId }: ObraEmpresasViewProps) {
  const [empresas, setEmpresas] = useState<ObraEmpresa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEmpresas()
  }, [obraId])

  async function loadEmpresas() {
    try {
      setLoading(true)

      console.log('🔍 Buscando empresas para obra:', obraId)

      // Primeiro, buscar o cronograma da obra
      const { data: cronogramaObra, error: cronogramaObraError } = await supabase
        .from('cronograma_obras')
        .select('id')
        .eq('obra_id', obraId)
        .single()

      console.log('📊 Cronograma encontrado:', cronogramaObra, 'Erro:', cronogramaObraError)

      if (cronogramaObraError && cronogramaObraError.code !== 'PGRST116') {
        throw cronogramaObraError
      }

      const cronogramaId = cronogramaObra?.id

      // Buscar empresas vinculadas via cronograma (vínculos diretos)
      let cronogramaData: any[] = []
      if (cronogramaId) {
        console.log('🔎 Buscando empresas para cronograma_id:', cronogramaId)

        const { data, error: cronogramaError } = await supabase
          .from('cronograma_empresa_vinculos')
          .select(
            `
            id,
            empresa_id,
            data_inicio_prevista,
            data_fim_prevista,
            valor_contratado,
            valor_pago,
            status,
            observacoes,
            empresas_parceiras (
              id,
              nome,
              telefone,
              celular,
              email,
              logo_url,
              responsavel,
              servicos
            )
          `
          )
          .eq('cronograma_id', cronogramaId)

        console.log('📡 Resposta raw da query (vínculos diretos):', { data, error: cronogramaError })

        if (cronogramaError) throw cronogramaError
        cronogramaData = data || []
        console.log('🏢 Empresas do cronograma (vínculos diretos):', cronogramaData)
      }

      // Buscar empresas vinculadas às ATIVIDADES do cronograma
      let atividadesData: any[] = []
      if (cronogramaId) {
        console.log('🔎 Buscando empresas nas atividades do cronograma_id:', cronogramaId)

        const { data, error: atividadesError } = await supabase
          .from('cronograma_obra_atividades')
          .select(
            `
            id,
            empresa_parceira_id,
            data_prevista,
            data_inicio_real,
            data_conclusao_real,
            descricao_servico,
            observacao,
            status,
            empresas_parceiras!cronograma_obra_atividades_empresa_parceira_id_fkey (
              id,
              nome,
              telefone,
              celular,
              email,
              logo_url,
              responsavel,
              servicos
            )
          `
          )
          .eq('cronograma_id', cronogramaId)
          .not('empresa_parceira_id', 'is', null)

        console.log('📡 Resposta raw da query (atividades):', { data, error: atividadesError })

        if (atividadesError) throw atividadesError
        atividadesData = data || []
        console.log('🏗️ Atividades com empresas:', atividadesData)
      }

      // Buscar empresas vinculadas diretamente à obra
      const { data: obraData, error: obraError } = await supabase
        .from('obra_empresas')
        .select(
          `
          id,
          empresa_id,
          servico_executado,
          descricao_servico,
          data_inicio,
          data_termino,
          valor_contratado,
          valor_pago,
          status,
          avaliacao,
          observacoes_cliente,
          empresas_parceiras (
            id,
            nome,
            telefone,
            celular,
            email,
            logo_url,
            responsavel
          )
        `
        )
        .eq('obra_id', obraId)

      if (obraError) throw obraError

      console.log('🏭 Empresas da obra (vínculo direto):', obraData)

      // Combinar dados do cronograma e obra_empresas
      const empresasMap = new Map<string, ObraEmpresa>()

      // Adicionar empresas do vínculo direto (obra_empresas)
      obraData?.forEach((item: any) => {
        if (!item.empresas_parceiras) return

        const key = `${item.empresa_id}-${item.servico_executado}`
        empresasMap.set(key, {
          id: item.id,
          empresa_id: item.empresa_id,
          empresa_nome: item.empresas_parceiras.nome,
          empresa_telefone: item.empresas_parceiras.telefone,
          empresa_celular: item.empresas_parceiras.celular,
          empresa_email: item.empresas_parceiras.email,
          empresa_logo: item.empresas_parceiras.logo_url,
          empresa_responsavel: item.empresas_parceiras.responsavel,
          servico_executado: item.servico_executado,
          descricao_servico: item.descricao_servico,
          data_inicio: item.data_inicio,
          data_termino: item.data_termino,
          status: item.status,
          avaliacao: item.avaliacao,
          valor_contratado: item.valor_contratado,
          valor_pago: item.valor_pago,
          observacoes_cliente: item.observacoes_cliente,
        })
      })

      // Adicionar empresas do cronograma (vínculos diretos - se não existirem ainda)
      cronogramaData?.forEach((item: any) => {
        if (!item.empresas_parceiras) return

        const servico = item.empresas_parceiras.servicos?.[0] || 'Serviços diversos'
        const key = `${item.empresa_id}-${servico}`

        if (!empresasMap.has(key)) {
          empresasMap.set(key, {
            id: item.id,
            empresa_id: item.empresa_id,
            empresa_nome: item.empresas_parceiras.nome,
            empresa_telefone: item.empresas_parceiras.telefone,
            empresa_celular: item.empresas_parceiras.celular,
            empresa_email: item.empresas_parceiras.email,
            empresa_logo: item.empresas_parceiras.logo_url,
            empresa_responsavel: item.empresas_parceiras.responsavel,
            servico_executado: servico,
            data_inicio: item.data_inicio_prevista,
            data_termino: item.data_fim_prevista,
            status:
              item.status === 'realizado'
                ? 'concluido'
                : item.status === 'em_andamento'
                  ? 'em_andamento'
                  : item.status === 'cancelado'
                    ? 'cancelado'
                    : 'aguardando',
            valor_contratado: item.valor_contratado,
            valor_pago: item.valor_pago,
            observacoes_cliente: item.observacoes,
          })
        }
      })

      // Adicionar empresas das ATIVIDADES (agrupar por empresa)
      atividadesData?.forEach((atividade: any) => {
        if (!atividade.empresas_parceiras) return

        const servico = atividade.descricao_servico || 'Serviço não especificado'
        const key = `${atividade.empresa_parceira_id}-atividade`

        // Agrupar atividades pela mesma empresa
        if (!empresasMap.has(key)) {
          empresasMap.set(key, {
            id: atividade.id,
            empresa_id: atividade.empresa_parceira_id,
            empresa_nome: atividade.empresas_parceiras.nome,
            empresa_telefone: atividade.empresas_parceiras.telefone,
            empresa_celular: atividade.empresas_parceiras.celular,
            empresa_email: atividade.empresas_parceiras.email,
            empresa_logo: atividade.empresas_parceiras.logo_url,
            empresa_responsavel: atividade.empresas_parceiras.responsavel,
            servico_executado: servico,
            descricao_servico: atividade.observacao,
            data_inicio: atividade.data_inicio_real || atividade.data_prevista,
            data_termino: atividade.data_conclusao_real,
            status:
              atividade.status === 'realizado'
                ? 'concluido'
                : atividade.status === 'em_andamento'
                  ? 'em_andamento'
                  : atividade.status === 'cancelado'
                    ? 'cancelado'
                    : atividade.status === 'atrasado'
                      ? 'em_andamento'
                      : 'aguardando',
            observacoes_cliente: atividade.observacao,
          })
        }
      })

      const empresasArray = Array.from(empresasMap.values())
      console.log('✅ Total de empresas encontradas:', empresasArray.length, empresasArray)
      setEmpresas(empresasArray)
    } catch (error: any) {
      console.error('❌ Erro ao carregar empresas:', error)
      toast.error('Erro ao carregar empresas da obra')
    } finally {
      setLoading(false)
    }
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
            <p>Carregando empresas...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (empresas.length === 0) {
    return (
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
            <p className="text-lg font-semibold mb-2">Nenhuma empresa vinculada</p>
            <p className="text-sm mb-4">
              Vincule empresas ao cronograma para que apareçam aqui automaticamente
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Empresas Parceiras ({empresas.length})</span>
            <Building className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Empresas que participaram ou estão participando desta obra
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {empresas.map((empresa) => {
          const StatusIcon = statusConfig[empresa.status].icon

          return (
            <Card key={empresa.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      {empresa.empresa_logo && (
                        <AvatarImage src={empresa.empresa_logo} alt={empresa.empresa_nome} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(empresa.empresa_nome)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{empresa.empresa_nome}</CardTitle>
                      <CardDescription className="truncate">
                        {empresa.servico_executado}
                      </CardDescription>
                    </div>
                  </div>

                  <Badge className={statusConfig[empresa.status].color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[empresa.status].label}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Descrição do Serviço */}
                {empresa.descricao_servico && (
                  <div className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3">
                    {empresa.descricao_servico}
                  </div>
                )}

                {/* Informações de Contato */}
                <div className="space-y-2">
                  {empresa.empresa_responsavel && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{empresa.empresa_responsavel}</span>
                    </div>
                  )}

                  {(empresa.empresa_telefone || empresa.empresa_celular) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{empresa.empresa_celular || empresa.empresa_telefone}</span>
                    </div>
                  )}

                  {empresa.empresa_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{empresa.empresa_email}</span>
                    </div>
                  )}
                </div>

                {/* Datas */}
                {(empresa.data_inicio || empresa.data_termino) && (
                  <div className="flex items-center gap-4 text-sm pt-2 border-t">
                    {empresa.data_inicio && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(new Date(empresa.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    )}

                    {empresa.data_termino && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">até</span>
                        <span className="font-medium">
                          {format(new Date(empresa.data_termino), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Valores */}
                {empresa.valor_contratado && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Valor Contratado:
                      </span>
                      <span className="font-semibold">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(empresa.valor_contratado)}
                      </span>
                    </div>

                    {empresa.valor_pago !== undefined && empresa.valor_pago > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Valor Pago:</span>
                        <span className="font-semibold text-green-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(empresa.valor_pago)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Avaliação */}
                {empresa.avaliacao && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{empresa.avaliacao.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">/ 5.0</span>
                  </div>
                )}

                {/* Observações */}
                {empresa.observacoes_cliente && (
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border-l-2 border-primary/20">
                    {empresa.observacoes_cliente}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
