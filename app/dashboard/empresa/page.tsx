'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building, Upload, Save, Image as ImageIcon, Loader2 } from 'lucide-react'
import { EmpresaConfig } from '@/types/empresa-config'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'

export default function EmpresaPage() {
  const [config, setConfig] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome_empresa: '',
    cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    email: '',
    website: '',
  })

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      setLoading(true)

      // Primeiro, tentar criar a tabela se não existir
      await initializeTable()

      const { data, error } = await supabase
        .from('empresa_config')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setConfig(data)
        setFormData({
          nome_empresa: data.nome_empresa || '',
          cnpj: data.cnpj || '',
          endereco: data.endereco || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          cep: data.cep || '',
          telefone: data.telefone || '',
          email: data.email || '',
          website: data.website || '',
        })
        setPreviewUrl(data.logo_url || null)
      } else {
        // Criar registro padrão
        const { data: newConfig, error: insertError} = await supabase
          .from('empresa_config')
          .insert({ nome_empresa: 'Minha Empresa' })
          .select()
          .single()

        if (insertError) throw insertError
        setConfig(newConfig)
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações da empresa')
    } finally {
      setLoading(false)
    }
  }

  async function initializeTable() {
    try {
      // Criar bucket de storage
      const { error: bucketError } = await supabase.storage.createBucket('empresa-logos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      })

      // Ignorar erro se bucket já existir
      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error('Erro ao criar bucket:', bucketError)
      }
    } catch (error) {
      console.error('Erro ao inicializar storage:', error)
    }
  }

  async function handleSave() {
    if (!config) return

    try {
      setSaving(true)

      const { data: user } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('empresa_config')
        .update({
          ...formData,
          updated_by: user.user?.id,
        })
        .eq('id', config.id)

      if (error) throw error

      toast.success('Configurações salvas com sucesso!')
      await loadConfig()
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!config) return
      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem')
        return
      }

      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB')
        return
      }

      try {
        setUploading(true)

        // Deletar logo anterior se existir
        if (config.logo_url) {
          const oldPath = config.logo_url.split('/').pop()
          if (oldPath) {
            await supabase.storage.from('empresa-logos').remove([oldPath])
          }
        }

        // Upload do novo arquivo
        const fileExt = file.name.split('.').pop()
        const fileName = `logo-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('empresa-logos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Obter URL pública
        const {
          data: { publicUrl },
        } = supabase.storage.from('empresa-logos').getPublicUrl(fileName)

        // Atualizar banco de dados
        const { data: user } = await supabase.auth.getUser()

        const { error: updateError } = await supabase
          .from('empresa_config')
          .update({
            logo_url: publicUrl,
            updated_by: user.user?.id,
          })
          .eq('id', config.id)

        if (updateError) throw updateError

        setPreviewUrl(publicUrl)
        toast.success('Logo atualizado com sucesso!')
        await loadConfig()
      } catch (error: any) {
        console.error('Erro ao fazer upload do logo:', error)
        toast.error('Erro ao fazer upload do logo')
      } finally {
        setUploading(false)
      }
    },
    [config]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    disabled: uploading || !config,
  })

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Building className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Configurações da Empresa"
          description="Gerencie informações da empresa e upload de logo para relatórios"
        />

        <div className="grid gap-6 md:grid-cols-3">
          {/* Logo da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Logo da Empresa</CardTitle>
              <CardDescription>
                Upload do logo que aparecerá nos PDFs (max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview do Logo */}
              {previewUrl ? (
                <div className="relative w-full aspect-square rounded-lg border-2 border-dashed border-muted overflow-hidden bg-muted/50">
                  <Image src={previewUrl} alt="Logo" fill className="object-contain p-4" />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-muted/50">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhum logo</p>
                  </div>
                </div>
              )}

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Enviando...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    {isDragActive ? (
                      <p className="text-sm text-primary">Solte a imagem aqui...</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Clique ou arraste uma imagem</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações da Empresa */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Dados que aparecerão nos relatórios e documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
                  <Input
                    id="nome_empresa"
                    value={formData.nome_empresa}
                    onChange={(e) => setFormData({ ...formData, nome_empresa: e.target.value })}
                    placeholder="Nome da sua empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, número, bairro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="www.empresa.com"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={saving || !formData.nome_empresa}>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
