'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, X, ArrowUpDown } from 'lucide-react'
import { TeamMember } from '@/types/tasks'

export interface SubtaskFilterOptions {
  searchText: string
  assignedTo: string | null
  priority: string | null
  status: 'all' | 'completed' | 'pending' | 'overdue'
  sortBy: 'date' | 'priority' | 'name' | 'none'
  sortOrder: 'asc' | 'desc'
}

interface SubtaskFiltersProps {
  filters: SubtaskFilterOptions
  teamMembers: TeamMember[]
  onFiltersChange: (filters: SubtaskFilterOptions) => void
  totalCount: number
  filteredCount: number
}

export function SubtaskFilters({
  filters,
  teamMembers = [],
  onFiltersChange,
  totalCount,
  filteredCount,
}: SubtaskFiltersProps) {
  const hasActiveFilters =
    filters.searchText ||
    filters.assignedTo ||
    filters.priority ||
    filters.status !== 'all' ||
    filters.sortBy !== 'none'

  const clearFilters = () => {
    onFiltersChange({
      searchText: '',
      assignedTo: null,
      priority: null,
      status: 'all',
      sortBy: 'none',
      sortOrder: 'asc',
    })
  }

  const toggleSortOrder = () => {
    onFiltersChange({
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    })
  }

  return (
    <div className="space-y-3">
      {/* Barra de Busca e Botão Limpar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.searchText}
            onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
            placeholder="Buscar tarefas..."
            className="pl-9"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Filtros e Ordenação */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />

        {/* Filtro por Responsável */}
        <Select
          value={filters.assignedTo || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, assignedTo: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unassigned">Sem responsável</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por Prioridade */}
        <Select
          value={filters.priority || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, priority: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Status */}
        <Select
          value={filters.status}
          onValueChange={(value: any) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
          </SelectContent>
        </Select>

        {/* Divisor */}
        <div className="h-6 w-px bg-border" />

        {/* Ordenação */}
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filters.sortBy}
            onValueChange={(value: any) => onFiltersChange({ ...filters, sortBy: value })}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Padrão</SelectItem>
              <SelectItem value="date">Data de vencimento</SelectItem>
              <SelectItem value="priority">Prioridade</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
            </SelectContent>
          </Select>

          {filters.sortBy !== 'none' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSortOrder}
              className="h-8 w-8 p-0"
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          )}
        </div>
      </div>

      {/* Contador de Resultados */}
      {hasActiveFilters && (
        <div className="text-xs text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground">{filteredCount}</span> de{' '}
          <span className="font-semibold text-foreground">{totalCount}</span> tarefas
        </div>
      )}
    </div>
  )
}
