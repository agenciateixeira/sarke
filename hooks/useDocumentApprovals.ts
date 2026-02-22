'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  DocumentApproval,
  DocumentApprovalFormData,
  ApprovalStatus,
} from '@/types/pipeline'

export function useDocumentApprovals(documentId?: string) {
  const [approvals, setApprovals] = useState<DocumentApproval[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<DocumentApproval[]>([])
  const [loading, setLoading] = useState(true)
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
  // FETCH APPROVALS (for a document)
  // =============================================

  const fetchApprovals = useCallback(async (filterDocumentId?: string) => {
    try {
      setLoading(true)

      let query = supabase
        .from('document_approvals')
        .select(`
          *,
          approver:approver_id(id, name, avatar_url),
          document:document_id(
            id,
            file_name,
            category,
            deal_id
          )
        `)
        .order('order_index', { ascending: true })

      if (filterDocumentId || documentId) {
        query = query.eq('document_id', filterDocumentId || documentId)
      }

      const { data, error } = await query

      if (error) throw error

      const apps: DocumentApproval[] = (data || []).map((app: any) => ({
        ...app,
        approver: app.approver ? {
          id: app.approver.id,
          name: app.approver.name,
          avatar_url: app.approver.avatar_url,
        } : undefined,
        document: app.document,
      }))

      setApprovals(apps)
    } catch (err: any) {
      console.error('Error fetching approvals:', err)
      toast.error('Erro ao carregar aprovações')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  // =============================================
  // FETCH PENDING APPROVALS (for current user)
  // =============================================

  const fetchPendingApprovals = useCallback(async () => {
    if (!currentUserId) return

    try {
      const { data, error } = await supabase
        .from('document_approvals')
        .select(`
          *,
          approver:approver_id(id, name, avatar_url),
          document:document_id(
            id,
            file_name,
            category,
            deal_id,
            description
          )
        `)
        .eq('approver_id', currentUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      const apps: DocumentApproval[] = (data || []).map((app: any) => ({
        ...app,
        approver: app.approver ? {
          id: app.approver.id,
          name: app.approver.name,
          avatar_url: app.approver.avatar_url,
        } : undefined,
        document: app.document,
      }))

      setPendingApprovals(apps)
    } catch (err: any) {
      console.error('Error fetching pending approvals:', err)
    }
  }, [currentUserId])

  // =============================================
  // ADD APPROVER
  // =============================================

  const addApprover = async (formData: DocumentApprovalFormData) => {
    try {
      // Check if approver already exists
      const { data: existing } = await supabase
        .from('document_approvals')
        .select('id')
        .eq('document_id', formData.document_id)
        .eq('approver_id', formData.approver_id)
        .single()

      if (existing) {
        toast.error('Este aprovador já está na lista')
        return null
      }

      const { data, error } = await supabase
        .from('document_approvals')
        .insert({
          ...formData,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Aprovador adicionado!')
      fetchApprovals()
      return data
    } catch (err: any) {
      console.error('Error adding approver:', err)
      toast.error('Erro ao adicionar aprovador')
      return null
    }
  }

  // =============================================
  // APPROVE DOCUMENT
  // =============================================

  const approveDocument = async (approvalId: string, comment?: string) => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('document_approvals')
        .update({
          status: 'approved',
          comment: comment,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalId)
        .eq('approver_id', currentUserId) // Ensure user can only approve their own approvals
        .select()
        .single()

      if (error) throw error

      toast.success('Documento aprovado!')
      fetchApprovals()
      fetchPendingApprovals()

      // Check if all approvals are done and update document status
      await checkAndUpdateDocumentStatus(data.document_id)

      return data
    } catch (err: any) {
      console.error('Error approving document:', err)
      toast.error('Erro ao aprovar documento')
      return null
    }
  }

  // =============================================
  // REJECT DOCUMENT
  // =============================================

  const rejectDocument = async (approvalId: string, comment: string) => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado')
      return null
    }

    if (!comment || comment.trim() === '') {
      toast.error('Por favor, informe o motivo da rejeição')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('document_approvals')
        .update({
          status: 'rejected',
          comment: comment,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalId)
        .eq('approver_id', currentUserId) // Ensure user can only reject their own approvals
        .select()
        .single()

      if (error) throw error

      toast.success('Documento rejeitado')
      fetchApprovals()
      fetchPendingApprovals()

      // Update document status to rejected
      await supabase
        .from('deal_documents')
        .update({ status: 'rejected' })
        .eq('id', data.document_id)

      return data
    } catch (err: any) {
      console.error('Error rejecting document:', err)
      toast.error('Erro ao rejeitar documento')
      return null
    }
  }

  // =============================================
  // REMOVE APPROVER
  // =============================================

  const removeApprover = async (approvalId: string) => {
    try {
      const { error } = await supabase
        .from('document_approvals')
        .delete()
        .eq('id', approvalId)

      if (error) throw error

      toast.success('Aprovador removido')
      fetchApprovals()
      return true
    } catch (err: any) {
      console.error('Error removing approver:', err)
      toast.error('Erro ao remover aprovador')
      return false
    }
  }

  // =============================================
  // CHECK AND UPDATE DOCUMENT STATUS
  // =============================================

  const checkAndUpdateDocumentStatus = async (docId: string) => {
    try {
      // Get all approvals for this document
      const { data: allApprovals, error } = await supabase
        .from('document_approvals')
        .select('status, required')
        .eq('document_id', docId)

      if (error) throw error

      if (!allApprovals || allApprovals.length === 0) {
        return
      }

      // Check if all REQUIRED approvals are approved
      const requiredApprovals = allApprovals.filter((a) => a.required)
      const allRequiredApproved = requiredApprovals.every(
        (a) => a.status === 'approved'
      )

      if (allRequiredApproved && requiredApprovals.length > 0) {
        // Update document status to approved
        await supabase
          .from('deal_documents')
          .update({ status: 'approved' })
          .eq('id', docId)
      }
    } catch (err: any) {
      console.error('Error checking document status:', err)
    }
  }

  // =============================================
  // GET APPROVAL STATS
  // =============================================

  const getApprovalStats = () => {
    const total = approvals.length
    const approved = approvals.filter((a) => a.status === 'approved').length
    const rejected = approvals.filter((a) => a.status === 'rejected').length
    const pending = approvals.filter((a) => a.status === 'pending').length

    const requiredTotal = approvals.filter((a) => a.required).length
    const requiredApproved = approvals.filter(
      (a) => a.required && a.status === 'approved'
    ).length

    return {
      total,
      approved,
      rejected,
      pending,
      requiredTotal,
      requiredApproved,
      isFullyApproved: requiredTotal > 0 && requiredApproved === requiredTotal,
      isRejected: rejected > 0,
    }
  }

  // =============================================
  // CAN USER APPROVE
  // =============================================

  const canUserApprove = (approval: DocumentApproval) => {
    return (
      currentUserId === approval.approver_id &&
      approval.status === 'pending'
    )
  }

  // =============================================
  // REALTIME - APPROVALS
  // =============================================

  useEffect(() => {
    if (!documentId && !currentUserId) return

    const channelName = documentId
      ? `document-approvals-${documentId}`
      : `user-approvals-${currentUserId}`

    const channel = supabase.channel(channelName)

    if (documentId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_approvals',
          filter: `document_id=eq.${documentId}`,
        },
        () => {
          fetchApprovals()
        }
      )
    }

    if (currentUserId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_approvals',
          filter: `approver_id=eq.${currentUserId}`,
        },
        () => {
          fetchPendingApprovals()
        }
      )
    }

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [documentId, currentUserId, fetchApprovals, fetchPendingApprovals])

  // =============================================
  // INITIAL LOAD
  // =============================================

  useEffect(() => {
    if (documentId || currentUserId) {
      if (documentId) {
        fetchApprovals()
      }
      if (currentUserId) {
        fetchPendingApprovals()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, currentUserId])

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    approvals,
    pendingApprovals,
    loading,

    // Actions
    fetchApprovals,
    fetchPendingApprovals,
    addApprover,
    approveDocument,
    rejectDocument,
    removeApprover,

    // Helpers
    getApprovalStats,
    canUserApprove,
  }
}
