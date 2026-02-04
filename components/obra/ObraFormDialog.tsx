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
import { Loader2 } from 'lucide-react'

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

  // Carregar clientes
  useEffect(() => {
    loadClientes()
  }, [])

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

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

      if (obra) {
        // Editar
        const { error } = await supabase.from('obras').update(obraData).eq('id', obra.id)

        if (error) throw error
        toast.success('Obra atualizada com sucesso!')
      } else {
        // Criar
        obraData.created_by = user?.id
        const { error } = await supabase.from('obras').insert(obraData)

        if (error) throw error
        toast.success('Obra criada com sucesso!')
      }

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
                <select
                  id="cliente_id"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
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
              </div>
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
                  placeholder="00000-000"
                />
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
    </Dialog>
  )
}
