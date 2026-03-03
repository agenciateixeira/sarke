'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ProjectDocumentCategory, ProjectDocumentFile } from '@/types/documents'
import { Upload, FileText, Image as ImageIcon, File, X, Download, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DocumentCategoryItemProps {
  category: ProjectDocumentCategory
  files: ProjectDocumentFile[]
  onUploadComplete: () => void
}

export function DocumentCategoryItem({ category, files, onUploadComplete }: DocumentCategoryItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const supabase = createClient()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Validar tamanho (10MB max)
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede o tamanho máximo de 10MB`)
        return false
      }
      return true
    })

    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      for (const file of selectedFiles) {
        // Upload para Supabase Storage
        const fileName = `${category.projeto_id}/${category.id}/${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Salvar metadados no banco
        const { error: dbError } = await supabase
          .from('project_document_files')
          .insert({
            category_id: category.id,
            projeto_id: category.projeto_id,
            file_name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user?.id,
          })

        if (dbError) throw dbError
      }

      toast.success(`${selectedFiles.length} arquivo(s) enviado(s) com sucesso`)
      setSelectedFiles([])
      setIsOpen(false)
      onUploadComplete()
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      toast.error('Erro ao enviar arquivos')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    try {
      // Deletar do storage
      await supabase.storage
        .from('project-documents')
        .remove([filePath])

      // Deletar do banco
      const { error } = await supabase
        .from('project_document_files')
        .delete()
        .eq('id', fileId)

      if (error) throw error

      toast.success('Arquivo deletado')
      onUploadComplete()
    } catch (error: any) {
      console.error('Erro ao deletar arquivo:', error)
      toast.error('Erro ao deletar arquivo')
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const isImage = (fileType: string) => fileType.startsWith('image/')

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('project-documents')
      .getPublicUrl(filePath)
    return data.publicUrl
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-md cursor-pointer group transition-colors',
            files.length > 0 && 'bg-pink-50/50 dark:bg-pink-900/20'
          )}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className={cn(
              'h-2 w-2 rounded-full',
              files.length > 0 ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'
            )} />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {category.title}
            </span>
            {files.length > 0 && (
              <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                ({files.length})
              </span>
            )}
          </div>
          <Upload className="h-4 w-4 text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400" />
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category.title}</DialogTitle>
          <DialogDescription>{category.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
            <input
              type="file"
              id={`file-input-${category.id}`}
              multiple
              accept="image/*,.pdf,.doc,.docx,.dwg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor={`file-input-${category.id}`}
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Clique para selecionar arquivos ou arraste aqui
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Imagens, PDFs, DWGs (máx. 10MB por arquivo)
              </p>
            </label>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Arquivos selecionados:</h4>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSelectedFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              >
                {uploading ? 'Enviando...' : `Enviar ${selectedFiles.length} arquivo(s)`}
              </Button>
            </div>
          )}

          {/* Existing Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Arquivos enviados:</h4>

              {/* Images Gallery */}
              {files.filter(f => isImage(f.file_type)).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {files.filter(f => isImage(f.file_type)).map((file) => (
                    <div key={file.id} className="relative group">
                      <img
                        src={getPublicUrl(file.file_path)}
                        alt={file.file_name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(getPublicUrl(file.file_path), '_blank')}
                          className="text-white hover:text-white hover:bg-white/20"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFile(file.id, file.file_path)}
                          className="text-white hover:text-white hover:bg-white/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {file.file_name}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Other Files List */}
              {files.filter(f => !isImage(f.file_type)).map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded">
                  <div className="flex items-center gap-2 flex-1">
                    {getFileIcon(file.file_type)}
                    <span className="text-sm truncate">{file.file_name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.file_size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(getPublicUrl(file.file_path), '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id, file.file_path)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && selectedFiles.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Nenhum arquivo enviado ainda
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
