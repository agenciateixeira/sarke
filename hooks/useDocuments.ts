'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  DealDocument,
  DocumentVersion,
  DocumentSharedLink,
  DealDocumentFormData,
  DocumentSharedLinkFormData,
  DocumentCategory,
  DocumentStatus,
  DocumentComment,
} from '@/types/pipeline'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useDocuments(dealId?: string) {
  const [documents, setDocuments] = useState<DealDocument[]>([])
  const [versions, setVersions] = useState<Record<string, DocumentVersion[]>>({})
  const [sharedLinks, setSharedLinks] = useState<Record<string, DocumentSharedLink>>({})
  const [comments, setComments] = useState<Record<string, DocumentComment[]>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // =============================================
  // GET CURRENT USER
  // =============================================

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  // =============================================
  // FETCH DOCUMENTS
  // =============================================

  const fetchDocuments = useCallback(async (filterDealId?: string) => {
    try {
      setLoading(true)

      let query = supabase
        .from('deal_documents')
        .select(`
          *,
          uploader:uploaded_by(id, name, avatar_url)
        `)
        .eq('is_current', true)
        .order('uploaded_at', { ascending: false })

      if (filterDealId || dealId) {
        query = query.eq('deal_id', filterDealId || dealId)
      }

      const { data, error } = await query

      if (error) {
        const combined = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
        if (combined.includes('42p01') || combined.includes('does not exist')) {
          setDocuments([])
          return
        }
        throw error
      }

      const docs: DealDocument[] = (data || []).map((doc: any) => ({
        ...doc,
        uploader: doc.uploader ? {
          id: doc.uploader.id,
          name: doc.uploader.name,
          avatar_url: doc.uploader.avatar_url,
        } : undefined,
      }))

      setDocuments(docs)
    } catch (err: any) {
      console.error('Error fetching documents:', err.code, err.message, err.details)
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [dealId])

  // =============================================
  // FETCH DOCUMENT VERSIONS
  // =============================================

  const fetchVersions = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
          *,
          uploader:uploaded_by(id, name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('version', { ascending: false })

      if (error) throw error

      const vers: DocumentVersion[] = (data || []).map((ver: any) => ({
        ...ver,
        uploader: ver.uploader ? {
          id: ver.uploader.id,
          name: ver.uploader.name,
          avatar_url: ver.uploader.avatar_url,
        } : undefined,
      }))

      setVersions((prev) => ({ ...prev, [documentId]: vers }))
      return vers
    } catch (err: any) {
      console.error('Error fetching versions:', err)
      toast.error('Erro ao carregar versões')
      return []
    }
  }

  // =============================================
  // UPLOAD DOCUMENT
  // =============================================

  const uploadDocument = async (
    file: File,
    formData: Omit<DealDocumentFormData, 'file_name' | 'file_path' | 'file_size' | 'file_type'>
  ) => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado')
      return null
    }

    try {
      setUploading(true)

      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `deal_documents/${formData.deal_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Create document record
      const { data: document, error: docError } = await supabase
        .from('deal_documents')
        .insert({
          ...formData,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: currentUserId,
          version: 1,
          is_current: true,
        })
        .select()
        .single()

      if (docError) throw docError

      // 3. Create version record
      await supabase
        .from('document_versions')
        .insert({
          document_id: document.id,
          version: 1,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: currentUserId,
        })

      toast.success('Documento enviado com sucesso!')
      fetchDocuments()
      return document
    } catch (err: any) {
      console.error('Error uploading document:', err)
      toast.error('Erro ao enviar documento', {
        description: err.message,
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  // =============================================
  // UPLOAD NEW VERSION
  // =============================================

  const uploadNewVersion = async (
    documentId: string,
    file: File,
    changesDescription?: string
  ) => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado')
      return null
    }

    try {
      setUploading(true)

      // 1. Get current document
      const { data: currentDoc, error: fetchError } = await supabase
        .from('deal_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (fetchError) throw fetchError

      const newVersion = currentDoc.version + 1

      // 2. Upload new file
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_v${newVersion}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `deal_documents/${currentDoc.deal_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 3. Update document record
      const { data: updatedDoc, error: updateError } = await supabase
        .from('deal_documents')
        .update({
          file_path: filePath,
          file_size: file.size,
          version: newVersion,
          uploaded_by: currentUserId,
          uploaded_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select()
        .single()

      if (updateError) throw updateError

      // 4. Create version record
      await supabase
        .from('document_versions')
        .insert({
          document_id: documentId,
          version: newVersion,
          file_path: filePath,
          file_size: file.size,
          changes_description: changesDescription,
          uploaded_by: currentUserId,
        })

      toast.success(`Nova versão (v${newVersion}) enviada com sucesso!`)
      fetchDocuments()
      fetchVersions(documentId)
      return updatedDoc
    } catch (err: any) {
      console.error('Error uploading new version:', err)
      toast.error('Erro ao enviar nova versão', {
        description: err.message,
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  // =============================================
  // UPDATE DOCUMENT
  // =============================================

  const updateDocument = async (
    documentId: string,
    updates: Partial<DealDocumentFormData>
  ) => {
    try {
      const { data, error } = await supabase
        .from('deal_documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error

      toast.success('Documento atualizado!')
      fetchDocuments()
      return data
    } catch (err: any) {
      console.error('Error updating document:', err)
      toast.error('Erro ao atualizar documento')
      return null
    }
  }

  // =============================================
  // DELETE DOCUMENT
  // =============================================

  const deleteDocument = async (documentId: string) => {
    try {
      // Get document to delete file from storage
      const { data: doc, error: fetchError } = await supabase
        .from('deal_documents')
        .select('file_path, deal_id')
        .eq('id', documentId)
        .single()

      if (fetchError) throw fetchError

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path])

      if (storageError) console.warn('Error deleting file from storage:', storageError)

      // Delete record (cascade will delete versions)
      const { error: deleteError } = await supabase
        .from('deal_documents')
        .delete()
        .eq('id', documentId)

      if (deleteError) throw deleteError

      toast.success('Documento deletado!')
      fetchDocuments()
      return true
    } catch (err: any) {
      console.error('Error deleting document:', err)
      toast.error('Erro ao deletar documento')
      return false
    }
  }

  // =============================================
  // CREATE SHARED LINK
  // =============================================

  const createSharedLink = async (formData: DocumentSharedLinkFormData) => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('document_shared_links')
        .insert({
          ...formData,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Link de compartilhamento criado!')
      setSharedLinks((prev) => ({ ...prev, [formData.document_id]: data }))
      return data
    } catch (err: any) {
      console.error('Error creating shared link:', err)
      toast.error('Erro ao criar link de compartilhamento')
      return null
    }
  }

  // =============================================
  // GET SHARED LINK
  // =============================================

  const getSharedLink = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_shared_links')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No results
          return null
        }
        throw error
      }

      setSharedLinks((prev) => ({ ...prev, [documentId]: data }))
      return data
    } catch (err: any) {
      console.error('Error fetching shared link:', err)
      return null
    }
  }

  // =============================================
  // FETCH COMMENTS
  // =============================================

  const fetchComments = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          user:profiles!user_id (id, name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const cmts: DocumentComment[] = (data || []).map((cmt: any) => ({
        ...cmt,
        user: cmt.user ? {
          id: cmt.user.id,
          name: cmt.user.name,
          avatar_url: cmt.user.avatar_url,
        } : undefined,
      }))

      setComments((prev) => ({ ...prev, [documentId]: cmts }))
      return cmts
    } catch (err: any) {
      console.error('Error fetching comments:', err)
      toast.error('Erro ao carregar comentários')
      return []
    }
  }

  // =============================================
  // ADD COMMENT
  // =============================================

  const addComment = async (documentId: string, comment: string) => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          user_id: currentUserId,
          comment,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Comentário adicionado!')
      await fetchComments(documentId)
      return data
    } catch (err: any) {
      console.error('Error adding comment:', err)
      toast.error('Erro ao adicionar comentário')
      return null
    }
  }

  // =============================================
  // UPDATE COMMENT
  // =============================================

  const updateComment = async (commentId: string, documentId: string, newComment: string) => {
    try {
      const { data, error } = await supabase
        .from('document_comments')
        .update({ comment: newComment })
        .eq('id', commentId)
        .select()
        .single()

      if (error) throw error

      toast.success('Comentário atualizado!')
      await fetchComments(documentId)
      return data
    } catch (err: any) {
      console.error('Error updating comment:', err)
      toast.error('Erro ao atualizar comentário')
      return null
    }
  }

  // =============================================
  // DELETE COMMENT
  // =============================================

  const deleteComment = async (commentId: string, documentId: string) => {
    try {
      const { error } = await supabase
        .from('document_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      toast.success('Comentário removido!')
      await fetchComments(documentId)
      return true
    } catch (err: any) {
      console.error('Error deleting comment:', err)
      toast.error('Erro ao remover comentário')
      return false
    }
  }

  // =============================================
  // DOWNLOAD DOCUMENT
  // =============================================

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath)

      if (error) throw error

      // Create download link
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Error downloading document:', err)
      toast.error('Erro ao baixar documento')
    }
  }

  // =============================================
  // GET DOCUMENTS BY CATEGORY
  // =============================================

  const getDocumentsByCategory = (category: DocumentCategory) => {
    return documents.filter((doc) => doc.category === category)
  }

  // =============================================
  // GET DOCUMENTS BY STATUS
  // =============================================

  const getDocumentsByStatus = (status: DocumentStatus) => {
    return documents.filter((doc) => doc.status === status)
  }

  // =============================================
  // REALTIME - DOCUMENTS
  // =============================================

  useEffect(() => {
    if (!dealId) return

    const channel = supabase
      .channel(`deal-documents-${dealId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deal_documents',
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          fetchDocuments()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [dealId, fetchDocuments])

  // =============================================
  // INITIAL LOAD
  // =============================================

  useEffect(() => {
    if (dealId || currentUserId) {
      fetchDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, currentUserId])

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    documents,
    versions,
    sharedLinks,
    comments,
    loading,
    uploading,

    // Actions
    fetchDocuments,
    fetchVersions,
    uploadDocument,
    uploadNewVersion,
    updateDocument,
    deleteDocument,
    createSharedLink,
    getSharedLink,
    downloadDocument,

    // Comments
    fetchComments,
    addComment,
    updateComment,
    deleteComment,

    // Helpers
    getDocumentsByCategory,
    getDocumentsByStatus,
  }
}
