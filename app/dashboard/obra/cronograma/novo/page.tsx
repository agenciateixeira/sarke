'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CronogramaObraStatus } from '@/types/cronograma-obra'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Building } from 'lucide-react'
import Link from 'next/link'

export default function NovoCronogramaObraPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [obras, setObras] = useState<any[]>([])
  const [loadingObras, setLoadingObras] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    obra_id: '',
    data_inicio: '',
    data_fim_prevista: '',
    status: 'ativo' as CronogramaObraStatus,
  })

  useEffect(() => {
    loadObras()
  }, [])

  async function loadObras() {
    try {
      setLoadingObras(true)
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, endereco')
        .order('nome')

      if (error) throw error
      setObras(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar obras:', error)
      toast.error('Erro ao carregar obras')
    } finally {
      setLoadingObras(false)
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validações
    if (!formData.nome.trim()) {
      toast.error('Nome do cronograma é obrigatório')
      return
    }

    if (!formData.obra_id) {
      toast.error('Selecione uma obra')
      return
    }

    if (formData.data_inicio && formData.data_fim_prevista) {
      if (new Date(formData.data_fim_prevista) <= new Date(formData.data_inicio)) {
        toast.error('Data de fim prevista deve ser posterior à data de início')
        return
      }
    }

    try {
      setLoading(true)

      // Verificar se já existe cronograma para esta obra (UNIQUE constraint)
      const { data: existente } = await supabase
        .from('cronograma_obras')
        .select('id')
        .eq('obra_id', formData.obra_id)
        .single()

      if (existente) {
        toast.error('Já existe um cronograma para esta obra')
        return
      }

      const cronogramaData: any = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        obra_id: formData.obra_id,
        data_inicio: formData.data_inicio || null,
        data_fim_prevista: formData.data_fim_prevista || null,
        status: formData.status,
        progresso_percentual: 0,
        created_by: user?.id,
      }

      const { data, error } = await supabase
        .from('cronograma_obras')
        .insert(cronogramaData)
        .select()
        .single()

      if (error) throw error

      toast.success('Cronograma criado com sucesso!')
      router.push(`/dashboard/obra/cronograma/${formData.obra_id}`)
    } catch (error: any) {
      console.error('Erro ao criar cronograma:', error)

      if (error.code === '23505') {
        toast.error('Já existe um cronograma para esta obra')
      } else {
        toast.error(error.message || 'Erro ao criar cronograma')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/obra/cronograma">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Novo Cronograma de Obra</h1>
            <p className="text-muted-foreground">
              Crie um cronograma baseado no modelo Excel para uma obra específica
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
                <CardDescription>Defina o nome e vincule o cronograma a uma obra</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      required
                      disabled={loadingObras}
                    >
                      <option value="">
                        {loadingObras ? 'Carregando obras...' : 'Selecione uma obra'}
                      </option>
                      {obras.map((obra) => (
                        <option key={obra.id} value={obra.id}>
                          {obra.nome} {obra.endereco ? `- ${obra.endereco}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cada obra pode ter apenas um cronograma
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome do Cronograma <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    placeholder="Ex: Cronograma de Execução - Residência João Silva"
                    required
                  />
                </div>

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
                <CardDescription>Defina as datas de início e término previsto (opcional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="data_inicio">Data de Início</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => handleChange('data_inicio', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_fim_prevista">Data de Término Prevista</Label>
                    <Input
                      id="data_fim_prevista"
                      type="date"
                      value={formData.data_fim_prevista}
                      onChange={(e) => handleChange('data_fim_prevista', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
                <CardDescription>Status inicial do cronograma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status Inicial</Label>
                  <select
                    id="status"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as CronogramaObraStatus)}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild disabled={loading}>
                <Link href="/dashboard/obra/cronograma">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={loading || loadingObras}>
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
