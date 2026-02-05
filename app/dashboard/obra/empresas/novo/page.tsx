'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusEmpresa } from '@/types/empresa'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const servicosDisponiveis = [
  'topografia',
  'sondagem',
  'projeto',
  'terraplenagem',
  'fundacao',
  'estrutura_concreto',
  'estrutura_metalica',
  'alvenaria',
  'telhado',
  'impermeabilizacao',
  'eletrica',
  'hidraulica',
  'esgoto',
  'gas',
  'ar_condicionado',
  'incendio',
  'automacao',
  'revestimento_piso',
  'revestimento_parede',
  'pintura',
  'gesso',
  'forro',
  'esquadrias',
  'vidracaria',
  'marcenaria',
  'loucas_metais',
  'serralheria',
  'paisagismo',
  'calcada',
  'muro',
  'piscina',
  'decoracao',
  'limpeza',
  'transporte',
  'locacao_equipamentos',
  'outro',
]

export default function NovaEmpresaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    responsavel: '',
    telefone: '',
    celular: '',
    email: '',
    site: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    servicos: [] as string[],
    especialidade_principal: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: 'corrente' as 'corrente' | 'poupanca',
    status: 'ativa' as StatusEmpresa,
    observacoes: '',
    pontos_fortes: '',
    pontos_atencao: '',
  })

  function handleChange(field: string, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function toggleServico(servico: string) {
    setFormData((prev) => ({
      ...prev,
      servicos: prev.servicos.includes(servico)
        ? prev.servicos.filter((s) => s !== servico)
        : [...prev.servicos, servico],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Nome da empresa é obrigatório')
      return
    }

    if (formData.servicos.length === 0) {
      toast.error('Selecione pelo menos um serviço')
      return
    }

    try {
      setLoading(true)

      const empresaData = {
        nome: formData.nome,
        nome_fantasia: formData.nome_fantasia || null,
        cnpj: formData.cnpj || null,
        inscricao_estadual: formData.inscricao_estadual || null,
        inscricao_municipal: formData.inscricao_municipal || null,
        responsavel: formData.responsavel || null,
        telefone: formData.telefone || null,
        celular: formData.celular || null,
        email: formData.email || null,
        site: formData.site || null,
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep || null,
        servicos: formData.servicos,
        especialidade_principal: formData.especialidade_principal || null,
        banco: formData.banco || null,
        agencia: formData.agencia || null,
        conta: formData.conta || null,
        tipo_conta: formData.tipo_conta,
        status: formData.status,
        observacoes: formData.observacoes || null,
        pontos_fortes: formData.pontos_fortes || null,
        pontos_atencao: formData.pontos_atencao || null,
        created_by: user?.id,
      }

      const { data, error } = await supabase
        .from('empresas_parceiras')
        .insert(empresaData)
        .select()
        .single()

      if (error) throw error

      toast.success('Empresa cadastrada com sucesso!')
      router.push(`/dashboard/obra/empresas/${data.id}`)
    } catch (error: any) {
      console.error('Erro ao cadastrar empresa:', error)
      toast.error(error.message || 'Erro ao cadastrar empresa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute requiredSetor="gestao_obra">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/obra/empresas">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nova Empresa Parceira</h1>
            <p className="text-muted-foreground">
              Cadastre uma empresa prestadora de serviço ou fornecedor
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
                <CardDescription>Dados de identificação da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">
                      Razão Social <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      placeholder="Ex: Construtora ABC Ltda"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome_fantasia"
                      value={formData.nome_fantasia}
                      onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                      placeholder="Ex: ABC Construções"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => handleChange('cnpj', e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                    <Input
                      id="inscricao_estadual"
                      value={formData.inscricao_estadual}
                      onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                    <Input
                      id="inscricao_municipal"
                      value={formData.inscricao_municipal}
                      onChange={(e) => handleChange('inscricao_municipal', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contatos */}
            <Card>
              <CardHeader>
                <CardTitle>Contatos</CardTitle>
                <CardDescription>Informações de contato da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsável</Label>
                    <Input
                      id="responsavel"
                      value={formData.responsavel}
                      onChange={(e) => handleChange('responsavel', e.target.value)}
                      placeholder="Nome do responsável"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => handleChange('telefone', e.target.value)}
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="celular">Celular</Label>
                    <Input
                      id="celular"
                      value={formData.celular}
                      onChange={(e) => handleChange('celular', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="site">Site</Label>
                    <Input
                      id="site"
                      value={formData.site}
                      onChange={(e) => handleChange('site', e.target.value)}
                      placeholder="www.empresa.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>Localização da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => handleChange('endereco', e.target.value)}
                      placeholder="Rua, Avenida..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => handleChange('numero', e.target.value)}
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => handleChange('complemento', e.target.value)}
                      placeholder="Sala, Andar..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro}
                      onChange={(e) => handleChange('bairro', e.target.value)}
                    />
                  </div>

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
                </div>

                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleChange('cep', e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Serviços */}
            <Card>
              <CardHeader>
                <CardTitle>Serviços</CardTitle>
                <CardDescription>
                  Selecione os serviços que a empresa executa{' '}
                  <span className="text-red-500">*</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="especialidade_principal">Especialidade Principal</Label>
                  <select
                    id="especialidade_principal"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    value={formData.especialidade_principal}
                    onChange={(e) => handleChange('especialidade_principal', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {servicosDisponiveis.map((servico) => (
                      <option key={servico} value={servico}>
                        {servico.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Serviços Oferecidos</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                    {servicosDisponiveis.map((servico) => (
                      <label
                        key={servico}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={formData.servicos.includes(servico)}
                          onChange={() => toggleServico(servico)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {servico.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados Bancários */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Bancários</CardTitle>
                <CardDescription>Informações para pagamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="banco">Banco</Label>
                    <Input
                      id="banco"
                      value={formData.banco}
                      onChange={(e) => handleChange('banco', e.target.value)}
                      placeholder="Nome do banco"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agencia">Agência</Label>
                    <Input
                      id="agencia"
                      value={formData.agencia}
                      onChange={(e) => handleChange('agencia', e.target.value)}
                      placeholder="0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conta">Conta</Label>
                    <Input
                      id="conta"
                      value={formData.conta}
                      onChange={(e) => handleChange('conta', e.target.value)}
                      placeholder="00000-0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                    <select
                      id="tipo_conta"
                      className="w-full px-3 py-2 rounded-md border border-input bg-background"
                      value={formData.tipo_conta}
                      onChange={(e) => handleChange('tipo_conta', e.target.value)}
                    >
                      <option value="corrente">Corrente</option>
                      <option value="poupanca">Poupança</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
                <CardDescription>Informações adicionais sobre a empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações Gerais</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleChange('observacoes', e.target.value)}
                    placeholder="Informações relevantes sobre a empresa..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pontos_fortes">Pontos Fortes</Label>
                  <Textarea
                    id="pontos_fortes"
                    value={formData.pontos_fortes}
                    onChange={(e) => handleChange('pontos_fortes', e.target.value)}
                    placeholder="Qualidades e diferenciais da empresa..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pontos_atencao">Pontos de Atenção</Label>
                  <Textarea
                    id="pontos_atencao"
                    value={formData.pontos_atencao}
                    onChange={(e) => handleChange('pontos_atencao', e.target.value)}
                    placeholder="Aspectos que requerem atenção..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                  >
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/obra/empresas">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar Empresa
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
