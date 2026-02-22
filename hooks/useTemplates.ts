'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type {
  CommunicationTemplate,
  TemplateVariable,
  CommunicationSend,
  TemplateFormData,
  SendTemplateParams,
  RenderedTemplate,
} from '@/types/pipeline'

export function useTemplates() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([])
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [sends, setSends] = useState<CommunicationSend[]>([])
  const [loading, setLoading] = useState(true)

  // Buscar todos os templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('communication_templates')
        .select('*')
        .order('name')

      if (error) throw error
      setTemplates(data || [])
    } catch (error: any) {
      console.error('Error fetching templates:', error)
      toast.error('Erro ao carregar templates')
    }
  }

  // Buscar variáveis disponíveis
  const fetchVariables = async () => {
    try {
      const { data, error } = await supabase
        .from('template_variables')
        .select('*')
        .order('variable_category, variable_label')

      if (error) throw error
      setVariables(data || [])
    } catch (error: any) {
      console.error('Error fetching variables:', error)
      toast.error('Erro ao carregar variáveis')
    }
  }

  // Buscar histórico de envios
  const fetchSends = async (limit: number = 50) => {
    try {
      const { data, error } = await supabase
        .from('communication_sends')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      setSends(data || [])
    } catch (error: any) {
      console.error('Error fetching sends:', error)
      toast.error('Erro ao carregar histórico')
    }
  }

  // Criar novo template
  const createTemplate = async (templateData: TemplateFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('communication_templates')
        .insert({
          ...templateData,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Template criado com sucesso!')
      await fetchTemplates()
      return data
    } catch (error: any) {
      console.error('Error creating template:', error)
      toast.error(error.message || 'Erro ao criar template')
      throw error
    }
  }

  // Atualizar template
  const updateTemplate = async (id: string, templateData: Partial<TemplateFormData>) => {
    try {
      const { error } = await supabase
        .from('communication_templates')
        .update(templateData)
        .eq('id', id)

      if (error) throw error

      toast.success('Template atualizado!')
      await fetchTemplates()
    } catch (error: any) {
      console.error('Error updating template:', error)
      toast.error('Erro ao atualizar template')
      throw error
    }
  }

  // Deletar template
  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('communication_templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Template excluído!')
      await fetchTemplates()
    } catch (error: any) {
      console.error('Error deleting template:', error)
      toast.error('Erro ao excluir template')
      throw error
    }
  }

  // Ativar/Desativar template
  const toggleTemplate = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('communication_templates')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error

      toast.success(isActive ? 'Template ativado!' : 'Template desativado!')
      await fetchTemplates()
    } catch (error: any) {
      console.error('Error toggling template:', error)
      toast.error('Erro ao alterar status do template')
      throw error
    }
  }

  // Duplicar template
  const duplicateTemplate = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Buscar template original
      const { data: original, error: fetchError } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Criar cópia
      const { data, error } = await supabase
        .from('communication_templates')
        .insert({
          name: `${original.name} (Cópia)`,
          description: original.description,
          type: original.type,
          category: original.category,
          subject: original.subject,
          body: original.body,
          available_variables: original.available_variables,
          is_active: false,
          is_default: false,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Template duplicado!')
      await fetchTemplates()
      return data
    } catch (error: any) {
      console.error('Error duplicating template:', error)
      toast.error('Erro ao duplicar template')
      throw error
    }
  }

  // Renderizar template com variáveis
  const renderTemplate = async (
    templateId: string,
    variables: Record<string, string>
  ): Promise<RenderedTemplate> => {
    try {
      const { data, error } = await supabase
        .rpc('render_template', {
          p_template_id: templateId,
          p_variables: variables,
        })

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('Erro ao renderizar template')
      }

      return {
        subject: data[0].subject,
        body: data[0].body,
      }
    } catch (error: any) {
      console.error('Error rendering template:', error)
      toast.error('Erro ao renderizar template')
      throw error
    }
  }

  // Enviar template (criar registro de envio)
  const sendTemplate = async (params: SendTemplateParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Renderizar template
      const rendered = await renderTemplate(params.template_id, params.variables)

      // Criar registro de envio
      const { data, error } = await supabase
        .from('communication_sends')
        .insert({
          template_id: params.template_id,
          recipient_type: params.recipient_type,
          recipient_id: params.recipient_id,
          recipient_email: params.recipient_email,
          recipient_phone: params.recipient_phone,
          rendered_subject: rendered.subject,
          rendered_body: rendered.body,
          status: 'pending',
          source: params.source || 'manual',
          source_id: params.source_id,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Mensagem enviada para fila de envio!')
      await fetchSends()
      return data
    } catch (error: any) {
      console.error('Error sending template:', error)
      toast.error('Erro ao enviar mensagem')
      throw error
    }
  }

  // Preview do template renderizado (sem salvar)
  const previewTemplate = async (
    template: CommunicationTemplate,
    variables: Record<string, string>
  ): Promise<RenderedTemplate> => {
    try {
      let subject = template.subject || ''
      let body = template.body

      // Substituir variáveis manualmente
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        subject = subject.replace(new RegExp(placeholder, 'g'), value)
        body = body.replace(new RegExp(placeholder, 'g'), value)
      })

      return { subject, body }
    } catch (error: any) {
      console.error('Error previewing template:', error)
      toast.error('Erro ao visualizar template')
      throw error
    }
  }

  // Buscar templates por tipo
  const getTemplatesByType = (type: string) => {
    return templates.filter(t => t.type === type && t.is_active)
  }

  // Buscar templates por categoria
  const getTemplatesByCategory = (category: string) => {
    return templates.filter(t => t.category === category && t.is_active)
  }

  // Buscar template padrão de uma categoria
  const getDefaultTemplate = (category: string, type: string) => {
    return templates.find(
      t => t.category === category && t.type === type && t.is_default && t.is_active
    )
  }

  // Buscar variáveis por categoria
  const getVariablesByCategory = (category: string) => {
    return variables.filter(v => v.variable_category === category)
  }

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchTemplates(),
        fetchVariables(),
        fetchSends(),
      ])
      setLoading(false)
    }

    loadData()
  }, [])

  // Real-time subscriptions
  useEffect(() => {
    const templatesChannel = supabase
      .channel('templates_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'communication_templates' },
        () => {
          fetchTemplates()
        }
      )
      .subscribe()

    const sendsChannel = supabase
      .channel('sends_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'communication_sends' },
        () => {
          fetchSends()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(templatesChannel)
      supabase.removeChannel(sendsChannel)
    }
  }, [])

  return {
    // Data
    templates,
    variables,
    sends,
    loading,

    // Actions
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplate,
    duplicateTemplate,
    renderTemplate,
    sendTemplate,
    previewTemplate,

    // Helpers
    getTemplatesByType,
    getTemplatesByCategory,
    getDefaultTemplate,
    getVariablesByCategory,

    // Refresh
    fetchTemplates,
    fetchVariables,
    fetchSends,
  }
}
