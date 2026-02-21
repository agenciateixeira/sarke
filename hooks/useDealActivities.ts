import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  DealActivity,
  DealActivityFormData,
  DealAttachment,
  DealActivityStats,
} from '@/types/pipeline'

export function useDealActivities(dealId: string) {
  const [activities, setActivities] = useState<DealActivity[]>([])
  const [attachments, setAttachments] = useState<DealAttachment[]>([])
  const [stats, setStats] = useState<DealActivityStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Buscar atividades do deal
  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_activities')
        .select(`
          *,
          creator:profiles!created_by (id, name, avatar_url)
        `)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Erro ao carregar atividades')
    }
  }

  // Buscar anexos do deal
  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_attachments')
        .select(`
          *,
          uploader:profiles!uploaded_by (id, name, avatar_url)
        `)
        .eq('deal_id', dealId)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
      toast.error('Erro ao carregar anexos')
    }
  }

  // Buscar estatísticas de atividades
  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_activity_stats')
        .select('*')
        .eq('deal_id', dealId)
        .single()

      if (error) {
        // Se não houver estatísticas, não é erro
        if (error.code === 'PGRST116') {
          setStats(null)
          return
        }
        throw error
      }

      setStats(data)
    } catch (error) {
      console.error('Error fetching activity stats:', error)
    }
  }

  // Criar nova atividade
  const createActivity = async (activityData: DealActivityFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('deal_activities')
        .insert({
          deal_id: dealId,
          ...activityData,
          created_by: user.id,
        })
        .select(`
          *,
          creator:profiles!created_by (id, name, avatar_url)
        `)
        .single()

      if (error) throw error

      toast.success('Atividade adicionada!')
      await fetchActivities()
      await fetchStats()
      return data
    } catch (error: any) {
      console.error('Error creating activity:', error)
      toast.error('Erro ao adicionar atividade')
      throw error
    }
  }

  // Atualizar atividade
  const updateActivity = async (activityId: string, updates: Partial<DealActivityFormData>) => {
    try {
      const { error } = await supabase
        .from('deal_activities')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activityId)

      if (error) throw error

      toast.success('Atividade atualizada!')
      await fetchActivities()
      await fetchStats()
    } catch (error: any) {
      console.error('Error updating activity:', error)
      toast.error('Erro ao atualizar atividade')
      throw error
    }
  }

  // Marcar task como completa
  const completeTask = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('deal_activities')
        .update({
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activityId)

      if (error) throw error

      toast.success('Tarefa concluída!')
      await fetchActivities()
      await fetchStats()
    } catch (error: any) {
      console.error('Error completing task:', error)
      toast.error('Erro ao concluir tarefa')
      throw error
    }
  }

  // Reabrir task
  const reopenTask = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('deal_activities')
        .update({
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activityId)

      if (error) throw error

      toast.success('Tarefa reaberta!')
      await fetchActivities()
      await fetchStats()
    } catch (error: any) {
      console.error('Error reopening task:', error)
      toast.error('Erro ao reabrir tarefa')
      throw error
    }
  }

  // Deletar atividade
  const deleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('deal_activities')
        .delete()
        .eq('id', activityId)

      if (error) throw error

      toast.success('Atividade excluída!')
      await fetchActivities()
      await fetchStats()
    } catch (error: any) {
      console.error('Error deleting activity:', error)
      toast.error('Erro ao excluir atividade')
      throw error
    }
  }

  // Upload de anexo
  const uploadAttachment = async (
    file: File,
    description?: string,
    activityId?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Upload do arquivo para o Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${dealId}/${Date.now()}.${fileExt}`
      const filePath = `deal-attachments/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('deals')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Registrar anexo no banco
      const { data, error } = await supabase
        .from('deal_attachments')
        .insert({
          deal_id: dealId,
          activity_id: activityId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
          description,
        })
        .select(`
          *,
          uploader:profiles!uploaded_by (id, name, avatar_url)
        `)
        .single()

      if (error) throw error

      toast.success('Anexo adicionado!')
      await fetchAttachments()
      return data
    } catch (error: any) {
      console.error('Error uploading attachment:', error)
      toast.error('Erro ao fazer upload do anexo')
      throw error
    }
  }

  // Deletar anexo
  const deleteAttachment = async (attachmentId: string, filePath: string) => {
    try {
      // Deletar arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('deals')
        .remove([filePath])

      if (storageError) throw storageError

      // Deletar registro do banco
      const { error } = await supabase
        .from('deal_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) throw error

      toast.success('Anexo excluído!')
      await fetchAttachments()
    } catch (error: any) {
      console.error('Error deleting attachment:', error)
      toast.error('Erro ao excluir anexo')
      throw error
    }
  }

  // Download de anexo
  const downloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('deals')
        .download(filePath)

      if (error) throw error

      // Criar link de download
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Download iniciado!')
    } catch (error: any) {
      console.error('Error downloading attachment:', error)
      toast.error('Erro ao fazer download do anexo')
      throw error
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        await Promise.all([
          fetchActivities(),
          fetchAttachments(),
          fetchStats(),
        ])
      } catch (error) {
        console.error('Error loading activities data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (dealId) {
      loadData()

      // Subscribe to real-time changes
      const activitiesChannel = supabase
        .channel(`deal_${dealId}_activities`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deal_activities',
            filter: `deal_id=eq.${dealId}`,
          },
          () => {
            fetchActivities()
            fetchStats()
          }
        )
        .subscribe()

      const attachmentsChannel = supabase
        .channel(`deal_${dealId}_attachments`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deal_attachments',
            filter: `deal_id=eq.${dealId}`,
          },
          () => {
            fetchAttachments()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(activitiesChannel)
        supabase.removeChannel(attachmentsChannel)
      }
    }
  }, [dealId])

  return {
    activities,
    attachments,
    stats,
    loading,
    createActivity,
    updateActivity,
    completeTask,
    reopenTask,
    deleteActivity,
    uploadAttachment,
    deleteAttachment,
    downloadAttachment,
    refresh: async () => {
      await Promise.all([fetchActivities(), fetchAttachments(), fetchStats()])
    },
  }
}
