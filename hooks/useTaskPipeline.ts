'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Task,
  TaskWithDetails,
  Subtask,
  SubtaskWithDetails,
  TaskComment,
  TaskCommentWithDetails,
  PipelineColumn,
  CreateTaskData,
  UpdateTaskData,
  CreateSubtaskData,
  UpdateSubtaskData,
  CreateColumnData,
  UpdateColumnData,
} from '@/types/tasks'

export function useTaskPipeline() {
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // =============================================
  // FETCH DATA
  // =============================================

  const fetchColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline_columns')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error

      setColumns(data || [])
      return data || []
    } catch (err) {
      console.error('Error fetching columns:', err)
      setError(err as Error)
      return []
    }
  }

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks_with_details')
        .select('*')
        .eq('is_archived', false)
        .order('order_in_column', { ascending: true })

      if (error) throw error

      setTasks(data || [])
      return data || []
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err as Error)
      return []
    }
  }

  const fetchTaskById = async (taskId: string): Promise<TaskWithDetails | null> => {
    try {
      const { data, error } = await supabase
        .from('tasks_with_details')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('Error fetching task:', err)
      return null
    }
  }

  const fetchSubtasks = async (taskId: string): Promise<Subtask[]> => {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('order_index', { ascending: true })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Error fetching subtasks:', err)
      return []
    }
  }

  const fetchComments = async (taskId: string): Promise<TaskComment[]> => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Error fetching comments:', err)
      return []
    }
  }

  // =============================================
  // COLUMNS CRUD
  // =============================================

  const createColumn = async (data: CreateColumnData): Promise<PipelineColumn | null> => {
    try {
      const { data: newColumn, error } = await supabase
        .from('pipeline_columns')
        .insert(data)
        .select()
        .single()

      if (error) throw error

      toast.success('Coluna criada com sucesso!')
      await fetchColumns()
      return newColumn
    } catch (err) {
      console.error('Error creating column:', err)
      toast.error('Erro ao criar coluna')
      return null
    }
  }

  const updateColumn = async (columnId: string, data: UpdateColumnData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pipeline_columns')
        .update(data)
        .eq('id', columnId)

      if (error) throw error

      toast.success('Coluna atualizada com sucesso!')
      await fetchColumns()
      return true
    } catch (err) {
      console.error('Error updating column:', err)
      toast.error('Erro ao atualizar coluna')
      return false
    }
  }

  const deleteColumn = async (columnId: string): Promise<boolean> => {
    try {
      // Update otimista - remove da UI imediatamente
      setColumns(prevCols => prevCols.filter(c => c.id !== columnId))
      setTasks(prevTasks => prevTasks.filter(t => t.column_id !== columnId))

      const { error } = await supabase
        .from('pipeline_columns')
        .delete()
        .eq('id', columnId)

      if (error) {
        // Se der erro, recarrega para restaurar
        await Promise.all([fetchColumns(), fetchTasks()])
        throw error
      }

      toast.success('Coluna excluída!')
      return true
    } catch (err) {
      console.error('Error deleting column:', err)
      toast.error('Erro ao excluir coluna')
      return false
    }
  }

  // =============================================
  // TASKS CRUD
  // =============================================

  const createTask = async (data: CreateTaskData): Promise<Task | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Tarefa criada com sucesso!')
      await fetchTasks()
      return newTask
    } catch (err) {
      console.error('Error creating task:', err)
      toast.error('Erro ao criar tarefa')
      return null
    }
  }

  const updateTask = async (taskId: string, data: UpdateTaskData): Promise<boolean> => {
    try {
      // Update otimista - atualiza na UI imediatamente
      setTasks(prevTasks =>
        prevTasks.map(t => (t.id === taskId ? { ...t, ...data } : t))
      )

      const { error } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', taskId)

      if (error) {
        // Se der erro, recarrega para restaurar
        await fetchTasks()
        throw error
      }

      return true
    } catch (err) {
      console.error('Error updating task:', err)
      toast.error('Erro ao atualizar tarefa')
      return false
    }
  }

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      // Update otimista - remove da UI imediatamente
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId))

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        // Se der erro, recarrega para restaurar
        await fetchTasks()
        throw error
      }

      toast.success('Tarefa excluída!')
      return true
    } catch (err) {
      console.error('Error deleting task:', err)
      toast.error('Erro ao excluir tarefa')
      return false
    }
  }

  const moveTask = async (taskId: string, newColumnId: string, newOrder: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          column_id: newColumnId,
          order_in_column: newOrder,
        })
        .eq('id', taskId)

      if (error) throw error

      await fetchTasks()
      return true
    } catch (err) {
      console.error('Error moving task:', err)
      toast.error('Erro ao mover tarefa')
      return false
    }
  }

  const toggleTaskComplete = async (taskId: string, isCompleted: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_completed: isCompleted,
          completed_date: isCompleted ? new Date().toISOString() : null,
          status: isCompleted ? 'completed' : 'todo',
        })
        .eq('id', taskId)

      if (error) throw error

      toast.success(isCompleted ? 'Tarefa concluída!' : 'Tarefa reaberta!')
      await fetchTasks()
      return true
    } catch (err) {
      console.error('Error toggling task completion:', err)
      toast.error('Erro ao atualizar tarefa')
      return false
    }
  }

  // =============================================
  // SUBTASKS CRUD
  // =============================================

  const createSubtask = async (data: CreateSubtaskData): Promise<Subtask | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: newSubtask, error } = await supabase
        .from('subtasks')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Subtarefa criada com sucesso!')
      return newSubtask
    } catch (err) {
      console.error('Error creating subtask:', err)
      toast.error('Erro ao criar subtarefa')
      return null
    }
  }

  const updateSubtask = async (subtaskId: string, data: UpdateSubtaskData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update(data)
        .eq('id', subtaskId)

      if (error) throw error

      return true
    } catch (err) {
      console.error('Error updating subtask:', err)
      toast.error('Erro ao atualizar subtarefa')
      return false
    }
  }

  const deleteSubtask = async (subtaskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId)

      if (error) throw error

      toast.success('Subtarefa excluída com sucesso!')
      return true
    } catch (err) {
      console.error('Error deleting subtask:', err)
      toast.error('Erro ao excluir subtarefa')
      return false
    }
  }

  const toggleSubtaskComplete = async (subtaskId: string, isCompleted: boolean): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('subtasks')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          completed_by: isCompleted ? user?.id : null,
        })
        .eq('id', subtaskId)

      if (error) throw error

      return true
    } catch (err) {
      console.error('Error toggling subtask completion:', err)
      toast.error('Erro ao atualizar subtarefa')
      return false
    }
  }

  // =============================================
  // COMMENTS
  // =============================================

  const createComment = async (taskId: string, content: string): Promise<TaskComment | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: newComment, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          content,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Comentário adicionado!')
      return newComment
    } catch (err) {
      console.error('Error creating comment:', err)
      toast.error('Erro ao adicionar comentário')
      return null
    }
  }

  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      toast.success('Comentário excluído!')
      return true
    } catch (err) {
      console.error('Error deleting comment:', err)
      toast.error('Erro ao excluir comentário')
      return false
    }
  }

  // =============================================
  // INITIAL LOAD
  // =============================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchColumns(), fetchTasks()])
      setLoading(false)
    }

    loadData()

    // Configurar Realtime para atualização automática de tarefas
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    // Realtime para colunas
    const columnsChannel = supabase
      .channel('columns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_columns',
        },
        () => {
          fetchColumns()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(columnsChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // =============================================
  // RETURN
  // =============================================

  return {
    columns,
    tasks,
    loading,
    error,

    // Columns
    createColumn,
    updateColumn,
    deleteColumn,
    fetchColumns,

    // Tasks
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    toggleTaskComplete,
    fetchTaskById,
    fetchTasks,

    // Subtasks
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskComplete,
    fetchSubtasks,

    // Comments
    createComment,
    deleteComment,
    fetchComments,
  }
}
