'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Save,
  FileSpreadsheet,
  Cloud,
  CloudRain,
  Sun,
  Plus,
  X,
  Upload,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Obra } from '@/types/obra'
import {
  ClimaTempo,
  ClimaCondicao,
  StatusAtividade,
  TipoContratacao,
} from '@/types/rdo'
import { PhotoUpload } from '@/components/rdo/PhotoUpload'

interface PhotoFile {
  file: File
  preview: string
  descricao?: string
  local?: string
}

interface AtividadeForm {
  descricao: string
  status: StatusAtividade
  local?: string
  progresso: number
}

interface MaoObraForm {
  tipo: string
  quantidade: number
  tipo_contratacao: TipoContratacao
}

export default function NovoRDOPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [obra, setObra] = useState<Obra | null>(null)
  const [numeroRelatorio, setNumeroRelatorio] = useState(1)

  // Form data
  const [dataRelatorio, setDataRelatorio] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [climaManhaTempo, setClimaManhaTempo] = useState<ClimaTempo>('claro')
  const [climaManhaCondicao, setClimaManhaCondicao] = useState<ClimaCondicao>('praticavel')
  const [climaNoiteTempo, setClimaNoiteTempo] = useState<ClimaTempo>('claro')
  const [climaNoiteCondicao, setClimaNoiteCondicao] = useState<ClimaCondicao>('praticavel')
  const [indicePluviometrico, setIndicePluviometrico] = useState('')
  const [observacoesGerais, setObservacoesGerais] = useState('')

  // Mão de obra
  const [maoObra, setMaoObra] = useState<MaoObraForm[]>([
    { tipo: 'ajudante', quantidade: 0, tipo_contratacao: 'propria' },
    { tipo: 'eletricista', quantidade: 0, tipo_contratacao: 'propria' },
    { tipo: 'encanador', quantidade: 0, tipo_contratacao: 'propria' },
    { tipo: 'pedreiro', quantidade: 0, tipo_contratacao: 'propria' },
  ])

  // Atividades
  const [atividades, setAtividades] = useState<AtividadeForm[]>([])
  const [novaAtividade, setNovaAtividade] = useState('')

  // Fotos
  const [photos, setPhotos] = useState<PhotoFile[]>([])

  useEffect(() => {
    if (params.id) {
      loadObra()
      loadProximoNumero()
    }
  }, [params.id])

  async function loadObra() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('obras')
        .select('*')
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

  async function loadProximoNumero() {
    try {
      const { data, error } = await supabase
        .rpc('get_proximo_numero_rdo', { p_obra_id: params.id })

      if (error) throw error
      setNumeroRelatorio(data || 1)
    } catch (error: any) {
      console.error('Erro ao obter próximo número:', error)
    }
  }

  function getDiaSemana(data: string): string {
    const dias = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado']
    return dias[new Date(data).getDay()]
  }

  function adicionarAtividade() {
    if (!novaAtividade.trim()) return

    setAtividades([
      ...atividades,
      {
        descricao: novaAtividade,
        status: 'em_andamento',
        progresso: 0,
      },
    ])
    setNovaAtividade('')
  }

  function removerAtividade(index: number) {
    setAtividades(atividades.filter((_, i) => i !== index))
  }

  function atualizarMaoObra(index: number, campo: keyof MaoObraForm, valor: any) {
    const nova = [...maoObra]
    nova[index] = { ...nova[index], [campo]: valor }
    setMaoObra(nova)
  }

  async function handleSubmit(e: React.FormEvent, statusFinal: 'rascunho' | 'finalizado' = 'rascunho') {
    e.preventDefault()

    if (!user) {
      toast.error('Você precisa estar logado')
      return
    }

    try {
      setSaving(true)

      // Criar RDO principal
      const { data: rdo, error: rdoError } = await supabase
        .from('rdos')
        .insert({
          obra_id: params.id,
          numero_relatorio: numeroRelatorio,
          data_relatorio: dataRelatorio,
          dia_semana: getDiaSemana(dataRelatorio),
          clima_manha_tempo: climaManhaTempo,
          clima_manha_condicao: climaManhaCondicao,
          clima_noite_tempo: climaNoiteTempo,
          clima_noite_condicao: climaNoiteCondicao,
          indice_pluviometrico: indicePluviometrico ? parseFloat(indicePluviometrico) : null,
          observacoes_gerais: observacoesGerais || null,
          status: statusFinal,
          created_by: user.id,
        })
        .select()
        .single()

      if (rdoError) throw rdoError

      // Inserir mão de obra (apenas os com quantidade > 0)
      const maoObraData = maoObra
        .filter((m) => m.quantidade > 0)
        .map((m) => ({
          rdo_id: rdo.id,
          tipo: m.tipo,
          quantidade: m.quantidade,
          tipo_contratacao: m.tipo_contratacao,
        }))

      if (maoObraData.length > 0) {
        const { error: maoObraError } = await supabase
          .from('rdo_mao_obra')
          .insert(maoObraData)

        if (maoObraError) throw maoObraError
      }

      // Inserir atividades
      if (atividades.length > 0) {
        const atividadesData = atividades.map((a, index) => ({
          rdo_id: rdo.id,
          descricao: a.descricao,
          status: a.status,
          local: a.local || null,
          progresso: a.progresso,
          ordem: index,
        }))

        const { error: atividadesError } = await supabase
          .from('rdo_atividades')
          .insert(atividadesData)

        if (atividadesError) throw atividadesError
      }

      // Upload de fotos
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i]
          const fileExt = photo.file.name.split('.').pop()
          const fileName = `${rdo.id}/${Date.now()}-${i}.${fileExt}`

          // Upload para Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('rdo-fotos')
            .upload(fileName, photo.file)

          if (uploadError) {
            console.error('Erro ao fazer upload da foto:', uploadError)
            continue // Continua mesmo se uma foto falhar
          }

          // Obter URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('rdo-fotos')
            .getPublicUrl(fileName)

          // Inserir registro da foto
          await supabase.from('rdo_fotos').insert({
            rdo_id: rdo.id,
            foto_url: publicUrl,
            descricao: photo.descricao || null,
            local: photo.local || null,
            ordem: i,
            tamanho_bytes: photo.file.size,
            mime_type: photo.file.type,
          })
        }
      }

      toast.success(`RDO ${statusFinal === 'finalizado' ? 'criado' : 'salvo como rascunho'} com sucesso!`)
      router.push(`/dashboard/obra/${params.id}/rdo/${rdo.id}`)
    } catch (error: any) {
      console.error('Erro ao criar RDO:', error)
      toast.error('Erro ao criar RDO')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredSetor="gestao_obra">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Carregando...</p>
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
              <Link href={`/dashboard/obra/${params.id}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-2">Novo RDO</h1>
              <p className="text-muted-foreground">
                {obra.nome} - Relatório n° {numeroRelatorio}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'finalizado')} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Data e identificação do relatório</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data do Relatório *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    value={dataRelatorio}
                    onChange={(e) => setDataRelatorio(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {getDiaSemana(dataRelatorio)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Número do Relatório</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    value={numeroRelatorio}
                    onChange={(e) => setNumeroRelatorio(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Condições Climáticas */}
          <Card>
            <CardHeader>
              <CardTitle>Condições Climáticas</CardTitle>
              <CardDescription>Registre as condições do tempo durante o dia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Manhã */}
              <div>
                <h3 className="font-medium mb-3">Manhã</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tempo</label>
                    <select
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={climaManhaTempo}
                      onChange={(e) => setClimaManhaTempo(e.target.value as ClimaTempo)}
                    >
                      <option value="claro">☀️ Claro</option>
                      <option value="nublado">☁️ Nublado</option>
                      <option value="chuvoso">🌧️ Chuvoso</option>
                      <option value="tempestade">⛈️ Tempestade</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Condição</label>
                    <select
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={climaManhaCondicao}
                      onChange={(e) => setClimaManhaCondicao(e.target.value as ClimaCondicao)}
                    >
                      <option value="praticavel">✅ Praticável</option>
                      <option value="impraticavel">⛔ Impraticável</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Noite */}
              <div>
                <h3 className="font-medium mb-3">Noite</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tempo</label>
                    <select
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={climaNoiteTempo}
                      onChange={(e) => setClimaNoiteTempo(e.target.value as ClimaTempo)}
                    >
                      <option value="claro">☀️ Claro</option>
                      <option value="nublado">☁️ Nublado</option>
                      <option value="chuvoso">🌧️ Chuvoso</option>
                      <option value="tempestade">⛈️ Tempestade</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Condição</label>
                    <select
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={climaNoiteCondicao}
                      onChange={(e) => setClimaNoiteCondicao(e.target.value as ClimaCondicao)}
                    >
                      <option value="praticavel">✅ Praticável</option>
                      <option value="impraticavel">⛔ Impraticável</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Índice Pluviométrico (mm)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={indicePluviometrico}
                      onChange={(e) => setIndicePluviometrico(e.target.value)}
                      placeholder="250"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mão de Obra */}
          <Card>
            <CardHeader>
              <CardTitle>Mão de Obra</CardTitle>
              <CardDescription>Quantidade de trabalhadores presentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {maoObra.map((item, index) => (
                <div key={index} className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block capitalize">
                      {item.tipo}
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={item.quantidade}
                      onChange={(e) =>
                        atualizarMaoObra(index, 'quantidade', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Tipo</label>
                    <select
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={item.tipo_contratacao}
                      onChange={(e) =>
                        atualizarMaoObra(index, 'tipo_contratacao', e.target.value)
                      }
                    >
                      <option value="propria">Própria</option>
                      <option value="terceirizada">Terceirizada</option>
                    </select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Atividades */}
          <Card>
            <CardHeader>
              <CardTitle>Atividades Executadas</CardTitle>
              <CardDescription>Registre todas as atividades realizadas no dia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Adicionar atividade */}
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 rounded-md border border-input bg-background"
                  placeholder="Descreva a atividade..."
                  value={novaAtividade}
                  onChange={(e) => setNovaAtividade(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      adicionarAtividade()
                    }
                  }}
                />
                <Button type="button" onClick={adicionarAtividade}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Lista de atividades */}
              {atividades.length > 0 ? (
                <div className="space-y-2">
                  {atividades.map((atividade, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-md border border-border"
                    >
                      <div className="flex-1">
                        <p className="text-sm">{atividade.descricao}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {atividade.status === 'iniciada' && 'Iniciada'}
                          {atividade.status === 'em_andamento' && 'Em Andamento'}
                          {atividade.status === 'concluida' && 'Concluída'}
                          {atividade.status === 'pausada' && 'Pausada'}
                          {atividade.status === 'cancelada' && 'Cancelada'}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerAtividade(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade adicionada
                </p>
              )}
            </CardContent>
          </Card>

          {/* Fotos */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos da Obra</CardTitle>
              <CardDescription>Adicione fotos para documentar o andamento da obra</CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoUpload photos={photos} onPhotosChange={setPhotos} maxPhotos={20} />
            </CardContent>
          </Card>

          {/* Observações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Gerais</CardTitle>
              <CardDescription>Informações adicionais sobre o dia de trabalho</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full px-3 py-2 rounded-md border border-input bg-background min-h-[120px]"
                placeholder="Descreva observações gerais, ocorrências, materiais recebidos, etc..."
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/obra/${params.id}`)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => handleSubmit(e, 'rascunho')}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Rascunho
                </>
              )}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Finalizar RDO
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
