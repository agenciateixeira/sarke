'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TipoCronograma, StatusCronograma, UnidadeTempo } from '@/types/cronograma'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Building, Briefcase, ClipboardList } from 'lucide-react'
import Link from 'next/link'

export default function NovoCronogramaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState<any[]>([])
  const [projetos, setProjetos] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'geral' as TipoCronograma,
    obra_id: '',
    project_id: '',
    data_inicio: '',
    data_fim: '',
    status: 'planejamento' as StatusCronograma,
    unidade_tempo: 'dias' as UnidadeTempo,
    exibir_caminho_critico: true,
    exibir_folgas: true,
    responsavel_id: '',
  })

  useEffect(() => {
    loadOptions()
  }, [])

  async function loadOptions() {
    try {
      // Carregar obras
      const { data: obrasData, error: obrasError } = await supabase
        .from('obras')
        .select('id, nome')
        .order('nome')

      if (obrasError) throw obrasError
      setObras(obrasData || [])

      // Carregar projetos
      const { data: projetosData, error: projetosError } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (projetosError) throw projetosError
      setProjetos(projetosData || [])

      // Carregar usuários (gerentes e admins)
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('role', ['admin', 'gerente'])
        .order('name')

      if (usuariosError) throw usuariosError
      setUsuarios(usuariosData || [])
    } catch (error) {
      console.error('Erro ao carregar opções:', error)
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Limpar obra_id se tipo não for 'obra'
      if (field === 'tipo' && value !== 'obra') {
        updated.obra_id = ''
      }

      // Limpar project_id se tipo não for 'projeto'
      if (field === 'tipo' && value !== 'projeto') {
        updated.project_id = ''
      }

      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validações
    if (!formData.nome.trim()) {
      toast.error('Nome do cronograma é obrigatório')
      return
    }

    if (!formData.data_inicio) {
      toast.error('Data de início é obrigatória')
      return
    }

    if (!formData.data_fim) {
      toast.error('Data de fim é obrigatória')
      return
    }

    if (new Date(formData.data_fim) <= new Date(formData.data_inicio)) {
      toast.error('Data de fim deve ser posterior à data de início')
      return
    }

    if (formData.tipo === 'obra' && !formData.obra_id) {
      toast.error('Selecione uma obra para cronograma do tipo Obra')
      return
    }

    if (formData.tipo === 'projeto' && !formData.project_id) {
      toast.error('Selecione um projeto para cronograma do tipo Projeto')
      return
    }

    try {
      setLoading(true)

      const cronogramaData: any = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        obra_id: formData.tipo === 'obra' ? formData.obra_id : null,
        project_id: formData.tipo === 'projeto' ? formData.project_id : null,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        status: formData.status,
        unidade_tempo: formData.unidade_tempo,
        exibir_caminho_critico: formData.exibir_caminho_critico,
        exibir_folgas: formData.exibir_folgas,
        responsavel_id: formData.responsavel_id || null,
        progresso_percentual: 0,
        created_by: user?.id,
      }

      const { data, error } = await supabase
        .from('cronogramas')
        .insert(cronogramaData)
        .select()
        .single()

      if (error) throw error

      toast.success('Cronograma criado com sucesso!')
      router.push(`/dashboard/cronograma/${data.id}`)
    } catch (error: any) {
      console.error('Erro ao criar cronograma:', error)
      toast.error(error.message || 'Erro ao criar cronograma')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredSetor="cronograma">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/cronograma">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Novo Cronograma</h1>
            <p className="text-muted-foreground">
              Crie um cronograma integrado para obra, projeto ou geral
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Defina o nome, tipo e vinculação do cronograma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">
                      Nome do Cronograma <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      placeholder="Ex: Cronograma Residência João Silva"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">
                      Tipo <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="tipo"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={formData.tipo}
                      onChange={(e) => handleChange('tipo', e.target.value)}
                    >
                      <option value="geral">Geral</option>
                      <option value="obra">Obra</option>
                      <option value="projeto">Projeto</option>
                    </select>
                  </div>
                </div>

                {/* Vinculação condicional */}
                {formData.tipo === 'obra' && (
                  <div className="space-y-2">
                    <Label htmlFor="obra_id">
                      Obra <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <select
                        id="obra_id"
                        className="flex-1 px-3 py-2 rounded-md border border-input bg-background"
                        value={formData.obra_id}
                        onChange={(e) => handleChange('obra_id', e.target.value)}
                      >
                        <option value="">Selecione uma obra</option>
                        {obras.map((obra) => (
                          <option key={obra.id} value={obra.id}>
                            {obra.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formData.tipo === 'projeto' && (
                  <div className="space-y-2">
                    <Label htmlFor="project_id">
                      Projeto <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <select
                        id="project_id"
                        className="flex-1 px-3 py-2 rounded-md border border-input bg-background"
                        value={formData.project_id}
                        onChange={(e) => handleChange('project_id', e.target.value)}
                      >
                        <option value="">Selecione um projeto</option>
                        {projetos.map((projeto) => (
                          <option key={projeto.id} value={projeto.id}>
                            {projeto.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => handleChange('descricao', e.target.value)}
                    placeholder="Descrição detalhada do cronograma..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Prazos */}
            <Card>
              <CardHeader>
                <CardTitle>Prazos</CardTitle>
                <CardDescription>Defina as datas de início e término do cronograma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="data_inicio">
                      Data de Início <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => handleChange('data_inicio', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_fim">
                      Data de Término <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => handleChange('data_fim', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unidade_tempo">Unidade de Tempo</Label>
                    <select
                      id="unidade_tempo"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={formData.unidade_tempo}
                      onChange={(e) => handleChange('unidade_tempo', e.target.value)}
                    >
                      <option value="horas">Horas</option>
                      <option value="dias">Dias</option>
                      <option value="semanas">Semanas</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Responsável e Configurações */}
            <Card>
              <CardHeader>
                <CardTitle>Responsável e Configurações</CardTitle>
                <CardDescription>Defina o responsável e opções de visualização</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="responsavel_id">Responsável</Label>
                    <select
                      id="responsavel_id"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={formData.responsavel_id}
                      onChange={(e) => handleChange('responsavel_id', e.target.value)}
                    >
                      <option value="">Selecione um responsável</option>
                      {usuarios.map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status Inicial</Label>
                    <select
                      id="status"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                    >
                      <option value="planejamento">Planejamento</option>
                      <option value="ativo">Ativo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="exibir_caminho_critico"
                      checked={formData.exibir_caminho_critico}
                      onChange={(e) => handleChange('exibir_caminho_critico', e.target.checked)}
                      className="rounded border-input"
                    />
                    <Label htmlFor="exibir_caminho_critico" className="cursor-pointer">
                      Exibir caminho crítico
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="exibir_folgas"
                      checked={formData.exibir_folgas}
                      onChange={(e) => handleChange('exibir_folgas', e.target.checked)}
                      className="rounded border-input"
                    />
                    <Label htmlFor="exibir_folgas" className="cursor-pointer">
                      Exibir folgas das atividades
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/cronograma">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Cronograma
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
