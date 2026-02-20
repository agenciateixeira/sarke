'use client'

import { useMemo, useState } from 'react'
import { Subtask } from '@/types/tasks'
import { parseISO, isPast } from 'date-fns'
import { SubtaskFilterOptions } from '@/components/tasks/SubtaskFilters'

export function useSubtaskFilters(subtasks: Subtask[]) {
  const [filters, setFilters] = useState<SubtaskFilterOptions>({
    searchText: '',
    assignedTo: null,
    priority: null,
    status: 'all',
    sortBy: 'none',
    sortOrder: 'asc',
  })

  const filteredAndSortedSubtasks = useMemo(() => {
    let result = [...subtasks]

    // Filtro por texto de busca
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase()
      result = result.filter((s) => s.title.toLowerCase().includes(searchLower))
    }

    // Filtro por responsável
    if (filters.assignedTo) {
      if (filters.assignedTo === 'unassigned') {
        result = result.filter((s) => !s.assigned_to)
      } else {
        result = result.filter((s) => s.assigned_to === filters.assignedTo)
      }
    }

    // Filtro por prioridade
    if (filters.priority) {
      result = result.filter((s) => s.priority === filters.priority)
    }

    // Filtro por status
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'completed':
          result = result.filter((s) => s.is_completed)
          break
        case 'pending':
          result = result.filter((s) => !s.is_completed)
          break
        case 'overdue':
          result = result.filter(
            (s) => !s.is_completed && s.due_date && isPast(parseISO(s.due_date))
          )
          break
      }
    }

    // Ordenação
    if (filters.sortBy !== 'none') {
      result.sort((a, b) => {
        let comparison = 0

        switch (filters.sortBy) {
          case 'date':
            // Tarefas sem data vão para o final
            if (!a.due_date && !b.due_date) comparison = 0
            else if (!a.due_date) comparison = 1
            else if (!b.due_date) comparison = -1
            else {
              const dateA = parseISO(a.due_date)
              const dateB = parseISO(b.due_date)
              comparison = dateA.getTime() - dateB.getTime()
            }
            break

          case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            const priorityA = priorityOrder[a.priority] || 2
            const priorityB = priorityOrder[b.priority] || 2
            comparison = priorityB - priorityA // Alta prioridade primeiro
            break

          case 'name':
            comparison = a.title.localeCompare(b.title, 'pt-BR')
            break
        }

        return filters.sortOrder === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [subtasks, filters])

  return {
    filters,
    setFilters,
    filteredSubtasks: filteredAndSortedSubtasks,
    totalCount: subtasks.length,
    filteredCount: filteredAndSortedSubtasks.length,
  }
}
