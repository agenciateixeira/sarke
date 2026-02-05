'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { PhotoUpload } from '@/components/rdo/PhotoUpload'
import type { RDO, RDOMaoObra, RDOAtividade, RDOFoto } from '@/types/rdo'

interface PhotoFile {
  file: File
  preview: string
  descricao?: string
  local?: string
}

export default function EditarRDOPage() {
  const params = useParams()
  const router = useRouter()
  const obraId = params.id as string
  const rdoId = params.rdoId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [obraNome, setObraNome] = useState('')

  // RDO data
  const [dataRelatorio, setDataRelatorio] = useState('')
  const [climaManhaTempo, setClimaManhaTempo] = useState('claro')
  const [climaManhaCondicao, setClimaManhaCondicao] = useState('praticavel')
  const [climaNoiteTempo, setClimaNoiteTempo] = useState('claro')
  const [climaNoiteCondicao, setClimaNoiteCondicao] = useState('praticavel')
  const [indicePluviometrico, setIndicePluviometrico] = useState('')
  const [observacoesGerais, setObservacoesGerais] = useState('')

  // Mão de obra
  const [maoObraData, setMaoObraData] = useState<RDOMaoObra[]>([])

  // Atividades
  const [atividades, setAtividades] = useState<RDOAtividade[]>([])

  // Fotos (existentes e novas)
  const [fotosExistentes, setFotosExistentes] = useState<RDOFoto[]>([])
  const [fotosNovas, setFotosNovas] = useState<PhotoFile[]>([])

  useEffect(() => {
    loadData()
  }, [rdoId])

  async function loadData() {
    try {
      setLoading(true)

      // Carregar RDO
      const { data: rdo, error: rdoError } = await supabase
        .from('rdos')
        .select('*, obra:obras(nome)')
        .eq('id', rdoId)
        .single()

      if (rdoError) throw rdoError

      setObraNome(rdo.obra?.nome || '')
      setDataRelatorio(rdo.data_relatorio)
      setClimaManhaTempo(rdo.clima_manha_tempo || 'claro')
      setClimaManhaCondicao(rdo.clima_manha_condicao || 'praticavel')
      setClimaNoiteTempo(rdo.clima_noite_tempo || 'claro')
      setClimaNoiteCondicao(rdo.clima_noite_condicao || 'praticavel')
      setIndicePluviometrico(rdo.indice_pluviometrico?.toString() || '')
      setObservacoesGerais(rdo.observacoes_gerais || '')

      // Carregar mão de obra
      const { data: maoObra } = await supabase
        .from('rdo_mao_obra')
        .select('*')
        .eq('rdo_id', rdoId)

      if (maoObra) setMaoObraData(maoObra)

      // Carregar atividades
      const { data: atividadesData } = await supabase
        .from('rdo_atividades')
        .select('*')
        .eq('rdo_id', rdoId)
        .order('ordem')

      if (atividadesData) setAtividades(atividadesData)

      // Carregar fotos
      const { data: fotos } = await supabase
        .from('rdo_fotos')
        .select('*')
        .eq('rdo_id', rdoId)
        .order('ordem')

      if (fotos) setFotosExistentes(fotos)

      setLoading(false)
    } catch (error: any) {
      console.error('Erro ao carregar RDO:', error)
      toast.error('Erro ao carregar RDO')
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)

      // Atualizar RDO
      const { error: rdoError } = await supabase
        .from('rdos')
        .update({
          data_relatorio: dataRelatorio,
          clima_manha_tempo: climaManhaTempo,
          clima_manha_condicao: climaManhaCondicao,
          clima_noite_tempo: climaNoiteTempo,
          clima_noite_condicao: climaNoiteCondicao,
          indice_pluviometrico: indicePluviometrico ? parseFloat(indicePluviometrico) : null,
          observacoes_gerais: observacoesGerais || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rdoId)

      if (rdoError) throw rdoError

      // Deletar e recriar mão de obra
      await supabase.from('rdo_mao_obra').delete().eq('rdo_id', rdoId)

      if (maoObraData.length > 0) {
        const maoObraInsert = maoObraData.map((m) => ({
          rdo_id: rdoId,
          tipo: m.tipo,
          quantidade: m.quantidade,
          tipo_contratacao: m.tipo_contratacao,
        }))

        await supabase.from('rdo_mao_obra').insert(maoObraInsert)
      }

      // Deletar e recriar atividades
      await supabase.from('rdo_atividades').delete().eq('rdo_id', rdoId)

      if (atividades.length > 0) {
        const atividadesInsert = atividades.map((a, index) => ({
          rdo_id: rdoId,
          descricao: a.descricao,
          status: a.status,
          ordem: index,
        }))

        await supabase.from('rdo_atividades').insert(atividadesInsert)
      }

      // Upload de novas fotos
      if (fotosNovas.length > 0) {
        for (let i = 0; i < fotosNovas.length; i++) {
          const photo = fotosNovas[i]
          const fileExt = photo.file.name.split('.').pop()
          const fileName = `${rdoId}/${Date.now()}-${i}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('rdo-fotos')
            .upload(fileName, photo.file)

          if (uploadError) throw uploadError

          const {
            data: { publicUrl },
          } = supabase.storage.from('rdo-fotos').getPublicUrl(fileName)

          await supabase.from('rdo_fotos').insert({
            rdo_id: rdoId,
            foto_url: publicUrl,
            descricao: photo.descricao || null,
            local: photo.local || null,
            ordem: fotosExistentes.length + i,
            tamanho_bytes: photo.file.size,
            mime_type: photo.file.type,
          })
        }
      }

      toast.success('RDO atualizado com sucesso!')
      router.push(`/dashboard/obra/${obraId}/rdo/${rdoId}`)
    } catch (error: any) {
      console.error('Erro ao salvar RDO:', error)
      toast.error('Erro ao salvar RDO')
    } finally {
      setSaving(false)
    }
  }

  async function deletarFotoExistente(fotoId: string, fotoUrl: string) {
    try {
      // Extrair o path do storage da URL
      const urlParts = fotoUrl.split('/rdo-fotos/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage.from('rdo-fotos').remove([filePath])
      }

      // Deletar do banco
      await supabase.from('rdo_fotos').delete().eq('id', fotoId)

      setFotosExistentes((prev) => prev.filter((f) => f.id !== fotoId))
      toast.success('Foto removida')
    } catch (error) {
      console.error('Erro ao deletar foto:', error)
      toast.error('Erro ao deletar foto')
    }
  }

  function addMaoObra() {
    setMaoObraData([
      ...maoObraData,
      {
        id: crypto.randomUUID(),
        rdo_id: rdoId,
        tipo: 'pedreiro',
        quantidade: 1,
        tipo_contratacao: 'propria',
        created_at: new Date().toISOString(),
      },
    ])
  }

  function removeMaoObra(index: number) {
    setMaoObraData(maoObraData.filter((_, i) => i !== index))
  }

  function updateMaoObra(index: number, field: keyof RDOMaoObra, value: any) {
    const updated = [...maoObraData]
    updated[index] = { ...updated[index], [field]: value }
    setMaoObraData(updated)
  }

  function addAtividade() {
    setAtividades([
      ...atividades,
      {
        id: crypto.randomUUID(),
        rdo_id: rdoId,
        descricao: '',
        status: 'em_andamento',
        ordem: atividades.length,
        created_at: new Date().toISOString(),
      },
    ])
  }

  function removeAtividade(index: number) {
    setAtividades(atividades.filter((_, i) => i !== index))
  }

  function updateAtividade(index: number, field: keyof RDOAtividade, value: any) {
    const updated = [...atividades]
    updated[index] = { ...updated[index], [field]: value }
    setAtividades(updated)
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'gerente']}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'gerente']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/obra/${obraId}/rdo/${rdoId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Editar RDO</h1>
              <p className="text-muted-foreground">{obraNome}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Data do Relatório</Label>
              <Input
                type="date"
                value={dataRelatorio}
                onChange={(e) => setDataRelatorio(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Condição Climática */}
        <Card>
          <CardHeader>
            <CardTitle>Condição Climática</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tempo - Manhã</Label>
                <Select value={climaManhaTempo} onValueChange={setClimaManhaTempo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claro">☀️ Claro</SelectItem>
                    <SelectItem value="nublado">☁️ Nublado</SelectItem>
                    <SelectItem value="chuvoso">🌧️ Chuvoso</SelectItem>
                    <SelectItem value="tempestade">⛈️ Tempestade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condição - Manhã</Label>
                <Select value={climaManhaCondicao} onValueChange={setClimaManhaCondicao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="praticavel">Praticável</SelectItem>
                    <SelectItem value="impraticavel">Impraticável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Tempo - Noite</Label>
                <Select value={climaNoiteTempo} onValueChange={setClimaNoiteTempo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claro">☀️ Claro</SelectItem>
                    <SelectItem value="nublado">☁️ Nublado</SelectItem>
                    <SelectItem value="chuvoso">🌧️ Chuvoso</SelectItem>
                    <SelectItem value="tempestade">⛈️ Tempestade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condição - Noite</Label>
                <Select value={climaNoiteCondicao} onValueChange={setClimaNoiteCondicao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="praticavel">Praticável</SelectItem>
                    <SelectItem value="impraticavel">Impraticável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Índice Pluviométrico (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={indicePluviometrico}
                onChange={(e) => setIndicePluviometrico(e.target.value)}
                placeholder="Ex: 12.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Mão de Obra */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mão de Obra</CardTitle>
              <Button onClick={addMaoObra} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {maoObraData.map((item, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Tipo</Label>
                  <Select
                    value={item.tipo}
                    onValueChange={(value) => updateMaoObra(index, 'tipo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pedreiro">Pedreiro</SelectItem>
                      <SelectItem value="servente">Servente</SelectItem>
                      <SelectItem value="eletricista">Eletricista</SelectItem>
                      <SelectItem value="encanador">Encanador</SelectItem>
                      <SelectItem value="pintor">Pintor</SelectItem>
                      <SelectItem value="carpinteiro">Carpinteiro</SelectItem>
                      <SelectItem value="gesseiro">Gesseiro</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) =>
                      updateMaoObra(index, 'quantidade', parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div className="flex-1">
                  <Label>Contratação</Label>
                  <Select
                    value={item.tipo_contratacao}
                    onValueChange={(value) => updateMaoObra(index, 'tipo_contratacao', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propria">Própria</SelectItem>
                      <SelectItem value="terceirizada">Terceirizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeMaoObra(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Atividades */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Atividades Realizadas</CardTitle>
              <Button onClick={addAtividade} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {atividades.map((atividade, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Descrição</Label>
                  <Input
                    value={atividade.descricao}
                    onChange={(e) => updateAtividade(index, 'descricao', e.target.value)}
                    placeholder="Ex: Concretagem da laje do 2º pavimento"
                  />
                </div>
                <div className="w-48">
                  <Label>Status</Label>
                  <Select
                    value={atividade.status}
                    onValueChange={(value) => updateAtividade(index, 'status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciada">Iniciada</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeAtividade(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fotos Existentes */}
        {fotosExistentes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fotos Atuais</CardTitle>
              <CardDescription>Clique em remover para excluir uma foto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {fotosExistentes.map((foto) => (
                  <div key={foto.id} className="relative group">
                    <img
                      src={foto.foto_url}
                      alt={foto.descricao || 'Foto'}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => deletarFotoExistente(foto.id, foto.foto_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {foto.descricao && (
                      <p className="text-sm mt-2 text-muted-foreground">{foto.descricao}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Adicionar Novas Fotos */}
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Novas Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoUpload photos={fotosNovas} onPhotosChange={setFotosNovas} maxPhotos={20} />
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              placeholder="Descreva observações gerais sobre o dia de trabalho..."
              rows={6}
            />
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/obra/${obraId}/rdo/${rdoId}`}>
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  )
}
