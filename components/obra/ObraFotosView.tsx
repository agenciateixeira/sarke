'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image as ImageIcon, Loader2, Trash2, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ObraFoto {
  id: string
  obra_id: string
  titulo?: string
  descricao?: string
  url: string
  tipo?: string
  data_foto?: string
  uploaded_by?: string
  created_at: string
}

interface PhotoFile {
  file: File
  preview: string
  titulo?: string
  descricao?: string
  tipo?: string
}

interface ObraFotosViewProps {
  obraId: string
}

const tiposFoto = [
  { value: 'progresso', label: 'Progresso da Obra' },
  { value: 'antes', label: 'Antes' },
  { value: 'durante', label: 'Durante' },
  { value: 'depois', label: 'Depois' },
  { value: 'problema', label: 'Problema' },
  { value: 'solucao', label: 'Solução' },
]

export function ObraFotosView({ obraId }: ObraFotosViewProps) {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [fotos, setFotos] = useState<ObraFoto[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PhotoFile[]>([])
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedFoto, setSelectedFoto] = useState<ObraFoto | null>(null)

  useEffect(() => {
    loadFotos()
  }, [obraId])

  async function loadFotos() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('obra_fotos')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFotos(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar fotos:', error)
      toast.error('Erro ao carregar fotos')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos: PhotoFile[] = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      tipo: 'progresso',
    }))

    setPendingPhotos((prev) => [...prev, ...newPhotos])
    setUploadDialogOpen(true)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  })

  function removePhoto(index: number) {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  function updatePhotoField(index: number, field: keyof PhotoFile, value: string) {
    setPendingPhotos((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  async function handleUpload() {
    if (pendingPhotos.length === 0) {
      toast.error('Adicione pelo menos uma foto')
      return
    }

    setUploading(true)

    try {
      for (const photo of pendingPhotos) {
        const fileExt = photo.file.name.split('.').pop()
        const fileName = `${obraId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        // Upload para Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('obra-fotos')
          .upload(fileName, photo.file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Obter URL pública
        const {
          data: { publicUrl },
        } = supabase.storage.from('obra-fotos').getPublicUrl(uploadData.path)

        // Inserir registro no banco
        const { error: dbError } = await supabase.from('obra_fotos').insert({
          obra_id: obraId,
          titulo: photo.titulo || null,
          descricao: photo.descricao || null,
          tipo: photo.tipo || 'progresso',
          url: publicUrl,
          data_foto: format(new Date(), 'yyyy-MM-dd'),
        })

        if (dbError) throw dbError
      }

      toast.success(`${pendingPhotos.length} foto(s) enviada(s) com sucesso!`)
      setPendingPhotos([])
      setUploadDialogOpen(false)
      loadFotos()
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      toast.error('Erro ao fazer upload das fotos')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteFoto(foto: ObraFoto) {
    try {
      // Extrair path do URL
      const urlParts = foto.url.split('/')
      const pathIndex = urlParts.indexOf('obra-fotos')
      const filePath = urlParts.slice(pathIndex + 1).join('/')

      // Deletar do storage
      const { error: deleteError } = await supabase.storage
        .from('obra-fotos')
        .remove([filePath])

      if (deleteError) throw deleteError

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('obra_fotos')
        .delete()
        .eq('id', foto.id)

      if (dbError) throw dbError

      toast.success('Foto excluída com sucesso!')
      loadFotos()
    } catch (error: any) {
      console.error('Erro ao excluir foto:', error)
      toast.error('Erro ao excluir foto')
    }
  }

  function openViewDialog(foto: ObraFoto) {
    setSelectedFoto(foto)
    setViewDialogOpen(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin mb-4 opacity-50" />
            <p>Carregando fotos...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fotos da Obra</CardTitle>
              <CardDescription>
                Galeria de fotos da obra. Essas fotos podem ser vinculadas aos RDOs.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{fotos.length} fotos</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Solte as fotos aqui...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Arraste fotos aqui ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground">
                  JPEG, PNG, GIF, WEBP • Até 10MB cada
                </p>
              </>
            )}
          </div>

          {/* Grid de Fotos */}
          {fotos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {fotos.map((foto) => (
                <div key={foto.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={foto.url}
                      alt={foto.titulo || 'Foto da obra'}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openViewDialog(foto)}
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => openViewDialog(foto)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeleteFoto(foto)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {foto.tipo && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 left-2 text-xs"
                    >
                      {tiposFoto.find((t) => t.value === foto.tipo)?.label || foto.tipo}
                    </Badge>
                  )}
                  {foto.titulo && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      {foto.titulo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhuma foto adicionada ainda</p>
              <p className="text-xs">Arraste fotos acima para começar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Fotos</DialogTitle>
            <DialogDescription>
              Configure as informações das fotos antes de enviar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pendingPhotos.map((photo, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="aspect-video rounded-lg overflow-hidden border">
                      <img
                        src={photo.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`titulo-${index}`}>Título (opcional)</Label>
                        <Input
                          id={`titulo-${index}`}
                          placeholder="Ex: Fachada frontal"
                          value={photo.titulo || ''}
                          onChange={(e) =>
                            updatePhotoField(index, 'titulo', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`descricao-${index}`}>
                          Descrição (opcional)
                        </Label>
                        <Input
                          id={`descricao-${index}`}
                          placeholder="Ex: Acabamento finalizado"
                          value={photo.descricao || ''}
                          onChange={(e) =>
                            updatePhotoField(index, 'descricao', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`tipo-${index}`}>Tipo</Label>
                        <Select
                          value={photo.tipo}
                          onValueChange={(value) =>
                            updatePhotoField(index, 'tipo', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposFoto.map((tipo) => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePhoto(index)}
                        className="w-full"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar {pendingPhotos.length} foto(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedFoto?.titulo || 'Foto da obra'}</DialogTitle>
            {selectedFoto?.descricao && (
              <DialogDescription>{selectedFoto.descricao}</DialogDescription>
            )}
          </DialogHeader>

          {selectedFoto && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden border">
                <img
                  src={selectedFoto.url}
                  alt={selectedFoto.titulo || 'Foto da obra'}
                  className="w-full h-full object-contain bg-muted"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {selectedFoto.tipo && (
                  <Badge variant="secondary">
                    {tiposFoto.find((t) => t.value === selectedFoto.tipo)?.label ||
                      selectedFoto.tipo}
                  </Badge>
                )}
                {selectedFoto.data_foto && (
                  <span>
                    •{' '}
                    {format(
                      new Date(selectedFoto.data_foto),
                      "dd 'de' MMMM 'de' yyyy",
                      {
                        locale: ptBR,
                      }
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Fechar
            </Button>
            {selectedFoto && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteFoto(selectedFoto)
                  setViewDialogOpen(false)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Foto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
