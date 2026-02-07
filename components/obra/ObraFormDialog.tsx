'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Obra, StatusObra, TipoObra } from '@/types/obra'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Loader2, Plus, X, Check, ChevronsUpDown } from 'lucide-react'
import { ClientDialog } from '@/components/comercial/ClientDialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ObraFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  obra?: Obra | null
  onSuccess: () => void
}

export function ObraFormDialog({ open, onOpenChange, obra, onSuccess }: ObraFormDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [empresasParceiras, setEmpresasParceiras] = useState<any[]>([])
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([])
  const [showClienteDialog, setShowClienteDialog] = useState(false)
  const [empresasPopoverOpen, setEmpresasPopoverOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cliente_id: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    area_construida: '',
    area_terreno: '',
    tipo_obra: 'residencial' as TipoObra,
    valor_contrato: '',
    data_inicio: '',
    data_previsao_termino: '',
    duracao_meses: '',
    status: 'planejamento' as StatusObra,
    progresso_percentual: 0,
    observacoes: '',
  })

  // Carregar clientes e empresas parceiras
  useEffect(() => {
    loadClientes()
    loadEmpresasParceiras()
  }, [])

  // Carregar empresas vinculadas quando editar obra
  useEffect(() => {
    if (obra) {
      loadEmpresasVinculadas(obra.id)
    } else {
      setEmpresasSelecionadas([])
    }
  }, [obra])

  // Preencher form quando editar
  useEffect(() => {
    if (obra) {
      setFormData({
        nome: obra.nome || '',
        descricao: obra.descricao || '',
        cliente_id: obra.cliente_id || '',
        endereco: obra.endereco || '',
        cidade: obra.cidade || '',
        estado: obra.estado || '',
        cep: obra.cep || '',
        area_construida: obra.area_construida?.toString() || '',
        area_terreno: obra.area_terreno?.toString() || '',
        tipo_obra: obra.tipo_obra || 'residencial',
        valor_contrato: obra.valor_contrato?.toString() || '',
        data_inicio: obra.data_inicio || '',
        data_previsao_termino: obra.data_previsao_termino || '',
        duracao_meses: obra.duracao_meses?.toString() || '',
        status: obra.status,
        progresso_percentual: obra.progresso_percentual,
        observacoes: obra.observacoes || '',
      })
    } else {
      // Reset form
      setFormData({
        nome: '',
        descricao: '',
        cliente_id: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        area_construida: '',
        area_terreno: '',
        tipo_obra: 'residencial',
        valor_contrato: '',
        data_inicio: '',
        data_previsao_termino: '',
        duracao_meses: '',
        status: 'planejamento',
        progresso_percentual: 0,
        observacoes: '',
      })
    }
  }, [obra])

  async function loadClientes() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  async function loadEmpresasParceiras() {
    try {
      const { data, error } = await supabase
        .from('empresas_parceiras')
        .select('id, nome, servicos')
        .eq('status', 'ativa')
        .order('nome')

      if (error) throw error
      setEmpresasParceiras(data || [])
    } catch (error) {
      console.error('Erro ao carregar empresas parceiras:', error)
    }
  }

  async function loadEmpresasVinculadas(obraId: string) {
    try {
      const { data, error } = await supabase
        .from('obra_empresas')
        .select('empresa_id')
        .eq('obra_id', obraId)

      if (error) throw error
      const empresasIds = data?.map((item) => item.empresa_id) || []
      setEmpresasSelecionadas(empresasIds)
    } catch (error) {
      console.error('Erro ao carregar empresas vinculadas:', error)
    }
  }

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function buscarCEP(cep: string) {
    const cepNumeros = cep.replace(/\D/g, '')

    if (cepNumeros.length !== 8) return

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`)
      const data = await response.json()

      if (data.erro) {
        toast.error('CEP não encontrado')
        return
      }

      setFormData((prev) => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }))

      toast.success('Endereço preenchido automaticamente!')
    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
      toast.error('Erro ao buscar CEP')
    }
  }

  function toggleEmpresa(empresaId: string) {
    setEmpresasSelecionadas((prev) =>
      prev.includes(empresaId)
        ? prev.filter((id) => id !== empresaId)
        : [...prev, empresaId]
    )
  }

  async function handleCriarCliente(clienteData: any) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([clienteData])
        .select('id, name')
        .single()

      if (error) throw error

      toast.success('Cliente criado com sucesso!')
      await loadClientes()
      setFormData((prev) => ({ ...prev, cliente_id: data.id }))
      setShowClienteDialog(false)
      return { error: null }
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error)
      toast.error(error.message || 'Erro ao criar cliente')
      return { error: error.message }
    }
  }

  async function salvarVinculosEmpresas(obraId: string) {
    try {
      // Remover vínculos antigos
      if (obra) {
        await supabase.from('obra_empresas').delete().eq('obra_id', obraId)
      }

      // Criar novos vínculos
      if (empresasSelecionadas.length > 0) {
        const vinculos = empresasSelecionadas.map((empresaId) => ({
          obra_id: obraId,
          empresa_id: empresaId,
          servico_executado: 'Serviços diversos', // Valor padrão
          status: 'aguardando',
        }))

        const { error } = await supabase.from('obra_empresas').insert(vinculos)
        if (error) throw error
      }
    } catch (error) {
      console.error('Erro ao salvar vínculos de empresas:', error)
      throw error
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Nome da obra é obrigatório')
      return
    }

    try {
      setLoading(true)

      const obraData: any = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        cliente_id: formData.cliente_id || null,
        endereco: formData.endereco || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep || null,
        area_construida: formData.area_construida ? parseFloat(formData.area_construida) : null,
        area_terreno: formData.area_terreno ? parseFloat(formData.area_terreno) : null,
        tipo_obra: formData.tipo_obra,
        valor_contrato: formData.valor_contrato ? parseFloat(formData.valor_contrato) : null,
        data_inicio: formData.data_inicio || null,
        data_previsao_termino: formData.data_previsao_termino || null,
        duracao_meses: formData.duracao_meses ? parseInt(formData.duracao_meses) : null,
        status: formData.status,
        progresso_percentual: formData.progresso_percentual,
        observacoes: formData.observacoes || null,
      }

      let obraId: string

      if (obra) {
        // Editar
        const { error } = await supabase.from('obras').update(obraData).eq('id', obra.id)

        if (error) throw error
        obraId = obra.id
        toast.success('Obra atualizada com sucesso!')
      } else {
        // Criar
        obraData.created_by = user?.id
        const { data, error } = await supabase.from('obras').insert(obraData).select('id').single()

        if (error) throw error
        obraId = data.id
        toast.success('Obra criada com sucesso!')
      }

      // Salvar vínculos com empresas parceiras
      await salvarVinculosEmpresas(obraId)

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Erro ao salvar obra:', error)
      toast.error(error.message || 'Erro ao salvar obra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{obra ? 'Editar Obra' : 'Nova Obra'}</DialogTitle>
          <DialogDescription>
            {obra
              ? 'Atualize as informações da obra'
              : 'Preencha os dados para cadastrar uma nova obra'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold">Informações Básicas</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome da Obra <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: Residência João Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente</Label>
                <div className="flex gap-2">
                  <select
                    id="cliente_id"
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background"
                    value={formData.cliente_id}
                    onChange={(e) => handleChange('cliente_id', e.target.value)}
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowClienteDialog(true)}
                    title="Criar novo cliente"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Empresas Parceiras */}
            <div className="space-y-2">
              <Label>Empresas Parceiras da Obra</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Selecione as empresas que participarão desta obra
              </p>

              <Popover open={empresasPopoverOpen} onOpenChange={setEmpresasPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between min-h-[40px] h-auto py-2 hover:bg-pink-50 hover:border-pink-200 dark:hover:bg-pink-950/20 dark:hover:border-pink-900/50 transition-colors"
                  >
                    <div className="flex flex-wrap gap-1">
                      {empresasSelecionadas.length === 0 ? (
                        <span className="text-muted-foreground">Selecione as empresas...</span>
                      ) : (
                        <>
                          {empresasSelecionadas.slice(0, 3).map((empresaId) => {
                            const empresa = empresasParceiras.find((e) => e.id === empresaId)
                            return empresa ? (
                              <Badge key={empresa.id} variant="secondary" className="text-xs">
                                {empresa.nome}
                              </Badge>
                            ) : null
                          })}
                          {empresasSelecionadas.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{empresasSelecionadas.length - 3} mais
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="border-b p-3">
                    <Input
                      placeholder="Buscar empresa..."
                      className="h-9"
                      onChange={(e) => {
                        const searchTerm = e.target.value.toLowerCase()
                        // Filtro será aplicado direto na renderização abaixo
                      }}
                    />
                  </div>
                  <ScrollArea className="max-h-64">
                    <div className="p-2">
                      {empresasParceiras.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Nenhuma empresa parceira cadastrada
                        </div>
                      ) : (
                        empresasParceiras.map((empresa) => (
                          <label
                            key={empresa.id}
                            className="flex items-start gap-3 p-2 hover:bg-pink-50 dark:hover:bg-pink-950/20 rounded-md cursor-pointer transition-colors"
                          >
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                checked={empresasSelecionadas.includes(empresa.id)}
                                onChange={() => {
                                  setEmpresasSelecionadas((prev) =>
                                    prev.includes(empresa.id)
                                      ? prev.filter((id) => id !== empresa.id)
                                      : [...prev, empresa.id]
                                  )
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{empresa.nome}</div>
                              {empresa.servicos && empresa.servicos.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {empresa.servicos.slice(0, 2).join(', ')}
                                </div>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="border-t p-2 flex justify-between items-center bg-muted/50">
                    <span className="text-xs text-muted-foreground px-2">
                      {empresasSelecionadas.length} selecionada(s)
                    </span>
                    {empresasSelecionadas.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEmpresasSelecionadas([])}
                      >
                        Limpar tudo
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <p className="text-xs text-muted-foreground">
                {empresasSelecionadas.length} empresa(s) selecionada(s)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Descrição detalhada da obra..."
                rows={3}
              />
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-4">
            <h3 className="font-semibold">Localização</h3>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => handleChange('endereco', e.target.value)}
                placeholder="Rua, Número, Bairro"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => handleChange('cep', e.target.value)}
                  onBlur={(e) => buscarCEP(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <p className="text-xs text-muted-foreground">
                  💡 O endereço será preenchido automaticamente ao sair do campo
                </p>
              </div>
            </div>
          </div>

          {/* Características do Projeto */}
          <div className="space-y-4">
            <h3 className="font-semibold">Características do Projeto</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo_obra">Tipo de Obra</Label>
                <select
                  id="tipo_obra"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  value={formData.tipo_obra}
                  onChange={(e) => handleChange('tipo_obra', e.target.value)}
                >
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="reforma">Reforma</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_contrato">Valor do Contrato (R$)</Label>
                <Input
                  id="valor_contrato"
                  type="number"
                  step="0.01"
                  value={formData.valor_contrato}
                  onChange={(e) => handleChange('valor_contrato', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_construida">Área Construída (m²)</Label>
                <Input
                  id="area_construida"
                  type="number"
                  step="0.01"
                  value={formData.area_construida}
                  onChange={(e) => handleChange('area_construida', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_terreno">Área do Terreno (m²)</Label>
                <Input
                  id="area_terreno"
                  type="number"
                  step="0.01"
                  value={formData.area_terreno}
                  onChange={(e) => handleChange('area_terreno', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Prazos */}
          <div className="space-y-4">
            <h3 className="font-semibold">Prazos</h3>

            <div className="grid gap-4 md:grid-cols-3">
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
                <Label htmlFor="data_previsao_termino">Previsão de Término</Label>
                <Input
                  id="data_previsao_termino"
                  type="date"
                  value={formData.data_previsao_termino}
                  onChange={(e) => handleChange('data_previsao_termino', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracao_meses">Duração (meses)</Label>
                <Input
                  id="duracao_meses"
                  type="number"
                  value={formData.duracao_meses}
                  onChange={(e) => handleChange('duracao_meses', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="font-semibold">Status</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status da Obra</Label>
                <select
                  id="status"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="planejamento">Planejamento</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="pausada">Pausada</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="progresso_percentual">Progresso (%)</Label>
                <Input
                  id="progresso_percentual"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progresso_percentual}
                  onChange={(e) =>
                    handleChange('progresso_percentual', parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {obra ? 'Atualizar' : 'Criar'} Obra
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Dialog de Criação de Cliente Completo */}
      <ClientDialog
        open={showClienteDialog}
        onOpenChange={setShowClienteDialog}
        onSave={handleCriarCliente}
      />
    </Dialog>
  )
}
