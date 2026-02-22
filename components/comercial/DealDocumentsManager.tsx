'use client'

import { useState, useEffect } from 'react'
import { useDocuments } from '@/hooks/useDocuments'
import { DocumentCategory, DealDocument } from '@/types/pipeline'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  File,
  FileSpreadsheet,
  Image as ImageIcon,
  Mail,
  Plus,
  Loader2,
  X,
  History,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Edit,
  Trash,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface DealDocumentsManagerProps {
  dealId: string
}

const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string; icon: any }[] = [
  { value: 'proposta', label: 'Proposta Comercial', icon: FileText },
  { value: 'contrato', label: 'Contrato', icon: FileText },
  { value: 'planta', label: 'Planta/Projeto', icon: FileSpreadsheet },
  { value: 'orcamento', label: 'Orçamento', icon: FileText },
  { value: 'planilha', label: 'Planilha', icon: FileSpreadsheet },
  { value: 'rrt_art', label: 'RRT/ART', icon: FileText },
  { value: 'imagem', label: 'Imagem/Foto', icon: ImageIcon },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'outro', label: 'Outro', icon: File },
]

const getCategoryIcon = (category: DocumentCategory) => {
  const cat = DOCUMENT_CATEGORIES.find((c) => c.value === category)
  return cat?.icon || File
}

const getCategoryLabel = (category: DocumentCategory) => {
  const cat = DOCUMENT_CATEGORIES.find((c) => c.value === category)
  return cat?.label || 'Outro'
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function DealDocumentsManager({ dealId }: DealDocumentsManagerProps) {
  const {
    documents,
    versions,
    comments,
    loading,
    uploading,
    uploadDocument,
    uploadNewVersion,
    fetchVersions,
    deleteDocument,
    downloadDocument,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
  } = useDocuments(dealId)

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentCategory>('outro')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'todos'>('todos')
  const [previewDoc, setPreviewDoc] = useState<DealDocument | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Estados para versionamento
  const [versionDialogOpen, setVersionDialogOpen] = useState(false)
  const [selectedDocForVersion, setSelectedDocForVersion] = useState<DealDocument | null>(null)
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [changesDescription, setChangesDescription] = useState('')
  const [showVersionsFor, setShowVersionsFor] = useState<string | null>(null)

  // Estados para comentários
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')

  // Estados para confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo')
      return
    }

    const result = await uploadDocument(selectedFile, {
      deal_id: dealId,
      category,
      description,
    })

    if (result) {
      setUploadDialogOpen(false)
      setSelectedFile(null)
      setCategory('outro')
      setDescription('')
    }
  }

  const handleOpenDeleteDialog = (documentId: string, fileName: string) => {
    setDocToDelete({ id: documentId, name: fileName })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (docToDelete) {
      await deleteDocument(docToDelete.id)
      setDeleteDialogOpen(false)
      setDocToDelete(null)
    }
  }

  const handlePreview = async (doc: DealDocument) => {
    setLoadingPreview(true)
    setPreviewDoc(doc)

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600) // URL válida por 1 hora

      if (error) throw error

      setPreviewUrl(data.signedUrl)
    } catch (err) {
      console.error('Error creating preview URL:', err)
      toast.error('Erro ao carregar preview')
      setPreviewDoc(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const closePreview = () => {
    setPreviewDoc(null)
    setPreviewUrl(null)
  }

  // Handlers para versionamento
  const handleOpenVersionDialog = (doc: DealDocument) => {
    setSelectedDocForVersion(doc)
    setVersionDialogOpen(true)
  }

  const handleVersionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVersionFile(e.target.files[0])
    }
  }

  const handleUploadVersion = async () => {
    if (!versionFile || !selectedDocForVersion) {
      toast.error('Selecione um arquivo')
      return
    }

    const result = await uploadNewVersion(selectedDocForVersion.id, versionFile, changesDescription)

    if (result) {
      setVersionDialogOpen(false)
      setVersionFile(null)
      setChangesDescription('')
      setSelectedDocForVersion(null)
    }
  }

  const handleToggleVersions = async (docId: string) => {
    if (showVersionsFor === docId) {
      setShowVersionsFor(null)
    } else {
      setShowVersionsFor(docId)
      if (!versions[docId]) {
        await fetchVersions(docId)
      }
    }
  }

  // Handlers para comentários
  const handleToggleComments = async (docId: string) => {
    if (showCommentsFor === docId) {
      setShowCommentsFor(null)
    } else {
      setShowCommentsFor(docId)
      if (!comments[docId]) {
        await fetchComments(docId)
      }
    }
  }

  const handleAddComment = async (docId: string) => {
    if (!newComment.trim()) return

    await addComment(docId, newComment)
    setNewComment('')
  }

  const handleStartEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId)
    setEditCommentText(currentText)
  }

  const handleSaveEditComment = async (commentId: string, docId: string) => {
    if (!editCommentText.trim()) return

    await updateComment(commentId, docId, editCommentText)
    setEditingCommentId(null)
    setEditCommentText('')
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditCommentText('')
  }

  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<{ id: string; docId: string } | null>(null)

  const handleOpenDeleteCommentDialog = (commentId: string, docId: string) => {
    setCommentToDelete({ id: commentId, docId })
    setDeleteCommentDialogOpen(true)
  }

  const handleConfirmDeleteComment = async () => {
    if (commentToDelete) {
      await deleteComment(commentToDelete.id, commentToDelete.docId)
      setDeleteCommentDialogOpen(false)
      setCommentToDelete(null)
    }
  }

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Agrupar documentos por categoria
  const documentsByCategory = DOCUMENT_CATEGORIES.map((cat) => ({
    ...cat,
    documents: documents.filter((doc) => doc.category === cat.value),
  })).filter((cat) => cat.documents.length > 0)

  // Filtrar documentos
  const filteredDocs =
    selectedCategory === 'todos'
      ? documents
      : documents.filter((doc) => doc.category === selectedCategory)

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      {/* Header com Upload */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Documentos</h3>
          <p className="text-sm text-muted-foreground">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </p>
        </div>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload de Documento</DialogTitle>
              <DialogDescription>
                Adicione um novo documento ao negócio
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Categoria */}
              <div>
                <Label>Categoria *</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Arquivo */}
              <div>
                <Label>Arquivo *</Label>
                <Input type="file" onChange={handleFileSelect} />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              {/* Descrição */}
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Adicione uma descrição..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro por Categoria */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant={selectedCategory === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setSelectedCategory('todos')
          }}
        >
          Todos ({documents.length})
        </Button>
        {documentsByCategory.map((cat) => {
          const Icon = cat.icon
          return (
            <Button
              key={cat.value}
              type="button"
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedCategory(cat.value)
              }}
            >
              <Icon className="h-3 w-3 mr-1" />
              {cat.label} ({cat.documents.length})
            </Button>
          )
        })}
      </div>

      <Separator />

      {/* Lista de Documentos */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>Nenhum documento encontrado</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredDocs.map((doc) => {
              const Icon = getCategoryIcon(doc.category)
              return (
                <div key={doc.id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{doc.file_name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(doc.category)}
                          </Badge>
                          {doc.version > 1 && (
                            <Badge variant="outline" className="text-xs">
                              v{doc.version}
                            </Badge>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(doc.uploaded_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          {doc.uploader && (
                            <>
                              <span>•</span>
                              <span>por {doc.uploader.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handlePreview(doc)
                        }}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          downloadDocument(doc.file_path, doc.file_name)
                        }}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleOpenVersionDialog(doc)
                        }}
                        title="Nova Versão"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      {doc.version > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleToggleVersions(doc.id)
                          }}
                          title="Histórico de Versões"
                        >
                          {showVersionsFor === doc.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <History className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleComments(doc.id)
                        }}
                        title="Comentários"
                        className="relative"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {comments[doc.id]?.length > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                            {comments[doc.id].length}
                          </span>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleOpenDeleteDialog(doc.id, doc.file_name)
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Histórico de Versões */}
                  {showVersionsFor === doc.id && (
                    <div className="ml-14 p-3 bg-muted/30 rounded-lg border-l-2 border-primary">
                      <div className="flex items-center gap-2 mb-3">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Histórico de Versões</span>
                      </div>
                      {versions[doc.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {versions[doc.id].map((version) => (
                            <div
                              key={version.id}
                              className="flex items-center justify-between p-2 bg-background rounded text-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    v{version.version}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(version.uploaded_at), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </span>
                                  {version.uploader && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className="text-xs text-muted-foreground">
                                        {version.uploader.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {version.changes_description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {version.changes_description}
                                  </p>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(version.file_size)}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadDocument(version.file_path, `${doc.file_name} (v${version.version})`)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Baixar
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Carregando versões...</p>
                      )}
                    </div>
                  )}

                  {/* Comentários */}
                  {showCommentsFor === doc.id && (
                    <div className="ml-14 p-3 bg-muted/30 rounded-lg border-l-2 border-blue-500">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Comentários</span>
                      </div>

                      {/* Lista de comentários */}
                      {comments[doc.id]?.length > 0 && (
                        <div className="space-y-3 mb-3">
                          {comments[doc.id].map((comment) => (
                            <div key={comment.id} className="p-2 bg-background rounded">
                              {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    rows={2}
                                    className="text-sm"
                                  />
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleSaveEditComment(comment.id, doc.id)}
                                    >
                                      Salvar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium">
                                          {comment.user?.name || 'Usuário'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatDistanceToNow(new Date(comment.created_at), {
                                            addSuffix: true,
                                            locale: ptBR,
                                          })}
                                        </span>
                                      </div>
                                      <p className="text-sm">{comment.comment}</p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleStartEditComment(comment.id, comment.comment)}
                                        title="Editar"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleOpenDeleteCommentDialog(comment.id, doc.id)}
                                        title="Excluir"
                                      >
                                        <Trash className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Campo para novo comentário */}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Adicionar comentário..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={2}
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              handleAddComment(doc.id)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => handleAddComment(doc.id)}
                          disabled={!newComment.trim()}
                          title="Enviar (Cmd/Ctrl + Enter)"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {/* Modal de Preview */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <DialogTitle className="truncate">{previewDoc?.file_name}</DialogTitle>
                <DialogDescription className="sr-only">
                  Visualização do documento {previewDoc?.file_name}
                </DialogDescription>
                <div className="flex items-center gap-2 text-xs mt-1 text-muted-foreground">
                  <Badge variant="secondary">{previewDoc && getCategoryLabel(previewDoc.category)}</Badge>
                  <span>•</span>
                  <span>{previewDoc && formatFileSize(previewDoc.file_size)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(previewDoc.file_path, previewDoc.file_name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button type="button" variant="ghost" size="icon" onClick={closePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loadingPreview ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewUrl && previewDoc ? (
              <div className="h-full w-full">
                {/* PDF */}
                {previewDoc.file_type === 'application/pdf' && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full rounded-lg border"
                    title={previewDoc.file_name}
                  />
                )}

                {/* Imagens */}
                {previewDoc.file_type.startsWith('image/') && (
                  <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg">
                    <img
                      src={previewUrl}
                      alt={previewDoc.file_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}

                {/* Outros arquivos - mostrar mensagem */}
                {!previewDoc.file_type.startsWith('image/') &&
                  previewDoc.file_type !== 'application/pdf' && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Visualização não disponível</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Este tipo de arquivo não pode ser visualizado no navegador
                      </p>
                      <Button
                        onClick={() =>
                          previewDoc && downloadDocument(previewDoc.file_path, previewDoc.file_name)
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Arquivo
                      </Button>
                    </div>
                  )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Versão */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Versão do Documento</DialogTitle>
            <DialogDescription>
              Faça upload de uma nova versão de "{selectedDocForVersion?.file_name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações do documento atual */}
            {selectedDocForVersion && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">Versão Atual: v{selectedDocForVersion.version}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedDocForVersion.file_size)}
                </p>
              </div>
            )}

            {/* Novo arquivo */}
            <div>
              <Label>Novo Arquivo *</Label>
              <Input type="file" onChange={handleVersionFileSelect} />
              {versionFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  {versionFile.name} ({formatFileSize(versionFile.size)})
                </p>
              )}
            </div>

            {/* Descrição das mudanças */}
            <div>
              <Label>O que mudou? (opcional)</Label>
              <Textarea
                placeholder="Descreva as alterações nesta versão..."
                value={changesDescription}
                onChange={(e) => setChangesDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setVersionDialogOpen(false)
                  setVersionFile(null)
                  setChangesDescription('')
                }}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleUploadVersion} disabled={uploading || !versionFile}>
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Fazer Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Confirmação de Exclusão de Documento */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento "{docToDelete?.name}"?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog de Confirmação de Exclusão de Comentário */}
      <AlertDialog open={deleteCommentDialogOpen} onOpenChange={setDeleteCommentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Comentário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comentário?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteComment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
