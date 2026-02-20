'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { AreaProjeto, FrenteProjeto } from '@/types/projeto'

interface Cliente {
  id: string
  name: string
  email: string
}

interface User {
  id: string
  name: string
}

export default function NovoProjetoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])

  // Form State
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [area, setArea] = useState<AreaProjeto>('residencial')
  const [frentes, setFrente] = useState<FrenteProjeto[]>(['arq'])
  const [tipoEspecifico, setTipoEspecifico] = useState('')

  // Localização
  const [endereco, setEndereco] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cep, setCep] = useState('')

  // Dimensões
  const [areaConstruida, setAreaConstruida] = useState('')
  const [areaTerreno, setAreaTerreno] = useState('')
  const [areaUtil, setAreaUtil] = useState('')
  const [numeroPavimentos, setNumeroPavimentos] = useState('')
  const [numeroAmbientes, setNumeroAmbientes] = useState('')

  // Datas
  const [dataInicio, setDataInicio] = useState('')
  const [dataPrevisaoEntrega, setDataPrevisaoEntrega] = useState('')
  const [prazoDias, setPrazoDias] = useState('')

  // Financeiro
  const [valorContrato, setValorContrato] = useState('')

  // Equipe
  const [arquitetoId, setArquitetoId] = useState('')
  const [designerId, setDesignerId] = useState('')
  const [coordenadorId, setCoordenadorId] = useState('')

  // Observações
  const [observacoes, setObservacoes] = useState('')
  const [briefing, setBriefing] = useState('')
  const [conceito, setConceito] = useState('')
  const [estilo, setEstilo] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Carregar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clients')
        .select('id, name, email')
        .order('name')

      if (clientesError) throw clientesError
      setClientes(clientesData || [])

      // Carregar usuários (para equipe)
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('role', ['admin', 'gerente', 'colaborador'])
        .order('name')

      if (usuariosError) throw usuariosError
      setUsuarios(usuariosData || [])
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    }
  }

  function toggleFrente(frente: FrenteProjeto) {
    setFrente((prev) => {
      if (prev.includes(frente)) {
        // Não permitir remover se for a única
        if (prev.length === 1) return prev
        return prev.filter((f) => f !== frente)
      }
      return [...prev, frente]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) {
      toast.error('Nome do projeto é obrigatório')
      return
    }

    if (frentes.length === 0) {
      toast.error('Selecione pelo menos uma frente')
      return
    }

    try {
      setLoading(true)

      const { data: projeto, error } = await supabase
        .from('projetos')
        .insert({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cliente_id: clienteId || null,
          area,
          tipo_especifico: tipoEspecifico.trim() || null,
          frente: frentes,

          // Localização
          endereco: endereco.trim() || null,
          cidade: cidade.trim() || null,
          estado: estado.trim() || null,
          cep: cep.trim() || null,

          // Dimensões
          area_construida: areaConstruida ? parseFloat(areaConstruida) : null,
          area_terreno: areaTerreno ? parseFloat(areaTerreno) : null,
          area_util: areaUtil ? parseFloat(areaUtil) : null,
          numero_pavimentos: numeroPavimentos ? parseInt(numeroPavimentos) : null,
          numero_ambientes: numeroAmbientes ? parseInt(numeroAmbientes) : null,

          // Datas
          data_inicio: dataInicio || null,
          data_previsao_entrega: dataPrevisaoEntrega || null,
          prazo_dias: prazoDias ? parseInt(prazoDias) : null,

          // Financeiro
          valor_contrato: valorContrato ? parseFloat(valorContrato.replace(/[^\d,]/g, '').replace(',', '.')) : null,

          // Equipe
          arquiteto_responsavel_id: arquitetoId || null,
          designer_responsavel_id: designerId || null,
          coordenador_id: coordenadorId || null,

          // Observações
          observacoes: observacoes.trim() || null,
          briefing: briefing.trim() || null,
          conceito: conceito.trim() || null,
          estilo: estilo.trim() || null,

          // Status inicial
          etapa_atual: 'planejamento',
          progresso_percentual: 0,
          planejamento_status: 'em_andamento',
          planejamento_progresso: 0,
          planta_baixa_status: 'pendente',
          planta_baixa_progresso: 0,
          modelo_3d_status: 'pendente',
          modelo_3d_progresso: 0,
          executivo_status: 'pendente',
          executivo_progresso: 0,
          valor_recebido: 0,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Projeto criado com sucesso!')
      router.push(`/dashboard/projetos/${projeto.id}`)
    } catch (error: any) {
      console.error('Erro ao criar projeto:', error)
      toast.error('Erro ao criar projeto')
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
            <Link href="/dashboard/projetos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader title="Novo Projeto" description="Preencha as informações do projeto" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Dados principais do projeto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome do Projeto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Apartamento Família Silva"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select value={clienteId || 'none'} onValueChange={(value) => setClienteId(value === 'none' ? '' : value)}>
                    <SelectTrigger id="cliente">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem cliente</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição do projeto"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="area">
                    Área <span className="text-destructive">*</span>
                  </Label>
                  <Select value={area} onValueChange={(value) => setArea(value as AreaProjeto)}>
                    <SelectTrigger id="area">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residencial">Residencial</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Frente <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="arq"
                        checked={frentes.includes('arq')}
                        onCheckedChange={() => toggleFrente('arq')}
                      />
                      <Label htmlFor="arq" className="cursor-pointer font-normal">
                        ARQ (Arquitetônico)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="int"
                        checked={frentes.includes('int')}
                        onCheckedChange={() => toggleFrente('int')}
                      />
                      <Label htmlFor="int" className="cursor-pointer font-normal">
                        INT (Interiores)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_especifico">Tipo Específico</Label>
                  <Input
                    id="tipo_especifico"
                    value={tipoEspecifico}
                    onChange={(e) => setTipoEspecifico(e.target.value)}
                    placeholder="Ex: Casa de Campo, Loja, Escritório"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número, complemento"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dimensões */}
          <Card>
            <CardHeader>
              <CardTitle>Dimensões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="area_construida">Área Construída (m²)</Label>
                  <Input
                    id="area_construida"
                    type="number"
                    step="0.01"
                    value={areaConstruida}
                    onChange={(e) => setAreaConstruida(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area_terreno">Área do Terreno (m²)</Label>
                  <Input
                    id="area_terreno"
                    type="number"
                    step="0.01"
                    value={areaTerreno}
                    onChange={(e) => setAreaTerreno(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area_util">Área Útil (m²)</Label>
                  <Input
                    id="area_util"
                    type="number"
                    step="0.01"
                    value={areaUtil}
                    onChange={(e) => setAreaUtil(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="numero_pavimentos">Número de Pavimentos</Label>
                  <Input
                    id="numero_pavimentos"
                    type="number"
                    value={numeroPavimentos}
                    onChange={(e) => setNumeroPavimentos(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_ambientes">Número de Ambientes</Label>
                  <Input
                    id="numero_ambientes"
                    type="number"
                    value={numeroAmbientes}
                    onChange={(e) => setNumeroAmbientes(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prazos */}
          <Card>
            <CardHeader>
              <CardTitle>Prazos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_previsao_entrega">Previsão de Entrega</Label>
                  <Input
                    id="data_previsao_entrega"
                    type="date"
                    value={dataPrevisaoEntrega}
                    onChange={(e) => setDataPrevisaoEntrega(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prazo_dias">Prazo (dias)</Label>
                  <Input
                    id="prazo_dias"
                    type="number"
                    value={prazoDias}
                    onChange={(e) => setPrazoDias(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle>Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="valor_contrato">Valor do Contrato (R$)</Label>
                <Input
                  id="valor_contrato"
                  type="text"
                  value={valorContrato}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    const formatted = (parseInt(value) / 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                    setValorContrato(value ? `R$ ${formatted}` : '')
                  }}
                  placeholder="R$ 0,00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Equipe */}
          <Card>
            <CardHeader>
              <CardTitle>Equipe Responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="arquiteto">Arquiteto Responsável</Label>
                  <Select value={arquitetoId || 'none'} onValueChange={(value) => setArquitetoId(value === 'none' ? '' : value)}>
                    <SelectTrigger id="arquiteto">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {usuarios.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designer">Designer Responsável</Label>
                  <Select value={designerId || 'none'} onValueChange={(value) => setDesignerId(value === 'none' ? '' : value)}>
                    <SelectTrigger id="designer">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {usuarios.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coordenador">Coordenador</Label>
                  <Select value={coordenadorId || 'none'} onValueChange={(value) => setCoordenadorId(value === 'none' ? '' : value)}>
                    <SelectTrigger id="coordenador">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {usuarios.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações e Conceito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="briefing">Briefing</Label>
                <Textarea
                  id="briefing"
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  placeholder="Descreva o briefing do cliente"
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="conceito">Conceito</Label>
                  <Textarea
                    id="conceito"
                    value={conceito}
                    onChange={(e) => setConceito(e.target.value)}
                    placeholder="Conceito do projeto"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estilo">Estilo</Label>
                  <Input
                    id="estilo"
                    value={estilo}
                    onChange={(e) => setEstilo(e.target.value)}
                    placeholder="Ex: Moderno, Clássico, Industrial"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações gerais sobre o projeto"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/projetos">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Criar Projeto
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
