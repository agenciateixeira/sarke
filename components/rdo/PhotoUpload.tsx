'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

interface PhotoFile {
  file: File
  preview: string
  descricao?: string
  local?: string
}

interface PhotoUploadProps {
  photos: PhotoFile[]
  onPhotosChange: (photos: PhotoFile[]) => void
  maxPhotos?: number
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 20 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (photos.length + acceptedFiles.length > maxPhotos) {
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
    [photos, onPhotosChange, maxPhotos]
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

  return (
    <div className="space-y-4">
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
              Máximo {maxPhotos} fotos • JPEG, PNG, GIF, WEBP • Até 10MB cada
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {photos.length} / {maxPhotos} fotos adicionadas
            </p>
          </>
        )}
      </div>

      {/* Grid de Fotos */}
      {photos.length > 0 && (
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
      )}

      {photos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Nenhuma foto adicionada ainda</p>
        </div>
      )}
    </div>
  )
}
