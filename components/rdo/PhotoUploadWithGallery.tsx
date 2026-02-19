'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Upload, Image as ImageIcon, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export interface PhotoFile {
  file: File
  preview: string
  descricao?: string
  local?: string
}

export interface ObraPhoto {
  id: string
  url: string
  titulo?: string
  descricao?: string
  tipo?: string
  data_foto?: string
}

interface PhotoUploadWithGalleryProps {
  obraId: string
  photos: PhotoFile[]
  selectedObraPhotos?: ObraPhoto[]
  onPhotosChange: (photos: PhotoFile[]) => void
  onObraPhotosChange?: (photos: ObraPhoto[]) => void
  maxPhotos?: number
}

export function PhotoUploadWithGallery({
  obraId,
  photos,
  selectedObraPhotos = [],
  onPhotosChange,
  onObraPhotosChange,
  maxPhotos = 20,
}: PhotoUploadWithGalleryProps) {
  const [loading, setLoading] = useState(true)
  const [obraPhotos, setObraPhotos] = useState<ObraPhoto[]>([])

  useEffect(() => {
    loadObraPhotos()
  }, [obraId])

  async function loadObraPhotos() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('obra_fotos')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setObraPhotos(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar fotos da obra:', error)
      toast.error('Erro ao carregar fotos da obra')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (photos.length + acceptedFiles.length + selectedObraPhotos.length > maxPhotos) {
        toast.error(`Máximo de ${maxPhotos} fotos permitidas`)
        return
      }

      const newPhotos: PhotoFile[] = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))

      onPhotosChange([...photos, ...newPhotos])
      toast.success(`${acceptedFiles.length} foto(s) adicionada(s)`)
    },
    [photos, selectedObraPhotos, onPhotosChange, maxPhotos]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  })

  function removePhoto(index: number) {
    const newPhotos = photos.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)
    toast.success('Foto removida')
  }

  function updatePhotoDescription(index: number, descricao: string) {
    const newPhotos = [...photos]
    newPhotos[index] = { ...newPhotos[index], descricao }
    onPhotosChange(newPhotos)
  }

  function updatePhotoLocal(index: number, local: string) {
    const newPhotos = [...photos]
    newPhotos[index] = { ...newPhotos[index], local }
    onPhotosChange(newPhotos)
  }

  function toggleObraPhoto(photo: ObraPhoto) {
    if (!onObraPhotosChange) return

    const isSelected = selectedObraPhotos.some((p) => p.id === photo.id)

    if (isSelected) {
      onObraPhotosChange(selectedObraPhotos.filter((p) => p.id !== photo.id))
    } else {
      if (photos.length + selectedObraPhotos.length >= maxPhotos) {
        toast.error(`Máximo de ${maxPhotos} fotos permitidas`)
        return
      }
      onObraPhotosChange([...selectedObraPhotos, photo])
    }
  }

  const totalPhotos = photos.length + selectedObraPhotos.length

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">
            Upload Novas Fotos
            {photos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {photos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gallery">
            Fotos da Obra
            {selectedObraPhotos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedObraPhotos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upload de Novas Fotos */}
        <TabsContent value="upload" className="space-y-4">
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
                <p className="text-xs text-muted-foreground mt-2">
                  {totalPhotos} / {maxPhotos} fotos selecionadas
                </p>
              </>
            )}
          </div>

          {/* Grid de Fotos Novas */}
          {photos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="relative aspect-video">
                    <img
                      src={photo.preview}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="pt-4 space-y-2">
                    <input
                      type="text"
                      placeholder="Descrição da foto (opcional)"
                      className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                      value={photo.descricao || ''}
                      onChange={(e) => updatePhotoDescription(index, e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Local (opcional)"
                      className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                      value={photo.local || ''}
                      onChange={(e) => updatePhotoLocal(index, e.target.value)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhuma foto adicionada ainda</p>
            </div>
          )}
        </TabsContent>

        {/* Galeria de Fotos da Obra */}
        <TabsContent value="gallery" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
              <p className="text-sm text-muted-foreground">Carregando fotos da obra...</p>
            </div>
          ) : obraPhotos.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Selecione fotos já enviadas na aba Fotos da obra para incluir neste RDO
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {obraPhotos.map((photo) => {
                  const isSelected = selectedObraPhotos.some((p) => p.id === photo.id)
                  return (
                    <Card
                      key={photo.id}
                      className={`overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'hover:ring-2 hover:ring-primary/50'
                      }`}
                      onClick={() => toggleObraPhoto(photo)}
                    >
                      <div className="relative aspect-video">
                        <img
                          src={photo.url}
                          alt={photo.titulo || 'Foto da obra'}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              <Check className="h-6 w-6" />
                            </div>
                          </div>
                        )}
                        {photo.tipo && (
                          <Badge
                            variant="secondary"
                            className="absolute top-2 left-2 text-xs"
                          >
                            {photo.tipo}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="pt-3 pb-3">
                        {photo.titulo && (
                          <p className="text-sm font-medium truncate">{photo.titulo}</p>
                        )}
                        {photo.descricao && (
                          <p className="text-xs text-muted-foreground truncate">
                            {photo.descricao}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Nenhuma foto disponível na obra</p>
              <p className="text-xs mt-2">
                Envie fotos na aba Fotos da obra para selecioná-las aqui
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
