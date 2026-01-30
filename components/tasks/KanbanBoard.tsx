'use client'

import { useState } from 'react'
import { PipelineColumn, TaskWithDetails } from '@/types/tasks'
import { TaskCard } from './TaskCard'
import { Button } from '@/components/ui/button'
import { Plus, MoreVertical, Edit, Trash } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface KanbanBoardProps {
  columns: PipelineColumn[]
  tasks: TaskWithDetails[]
  onTaskClick: (task: TaskWithDetails) => void
  onCreateTask: (columnId: string) => void
  onEditColumn: (column: PipelineColumn) => void
  onDeleteColumn: (column: PipelineColumn) => void
  onCreateColumn: () => void
  onMoveTask?: (taskId: string, newColumnId: string, newOrder: number) => void
}

export function KanbanBoard({
  columns,
  tasks,
  onTaskClick,
  onCreateTask,
  onEditColumn,
  onDeleteColumn,
  onCreateColumn,
  onMoveTask,
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<TaskWithDetails | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)

  // Agrupar tarefas por coluna
  const getTasksByColumn = (columnId: string) => {
    return tasks.filter(task => task.column_id === columnId)
  }

  // Handlers de drag and drop
  const handleDragStart = (task: TaskWithDetails) => {
    setDraggedTask(task)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDraggedOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDraggedOverColumn(columnId)
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()

    if (draggedTask && onMoveTask) {
      const targetTasks = getTasksByColumn(columnId)
      const newOrder = targetTasks.length

      onMoveTask(draggedTask.id, columnId, newOrder)
    }

    setDraggedTask(null)
    setDraggedOverColumn(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Scroll horizontal para o Kanban */}
      <ScrollArea className="flex-1">
        <div className="flex gap-4 p-6 h-full">
          {/* Renderizar colunas */}
          {columns.map((column) => {
            const columnTasks = getTasksByColumn(column.id)
            const isOver = draggedOverColumn === column.id

            return (
              <div
                key={column.id}
                className={cn(
                  'flex-shrink-0 w-[350px] flex flex-col transition-all',
                  isOver && 'ring-2 ring-primary ring-offset-2 rounded-lg'
                )}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Header da coluna */}
                <div className="flex items-center justify-between mb-4 p-3 bg-card rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="font-semibold text-sm">{column.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {columnTasks.length}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Botão criar tarefa */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onCreateTask(column.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>

                    {/* Menu da coluna */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditColumn(column)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar coluna
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteColumn(column)}
                          className="text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Excluir coluna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Lista de tarefas */}
                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-3 pb-4">
                    {columnTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Nenhuma tarefa nesta coluna
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCreateTask(column.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Criar tarefa
                        </Button>
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          onDragEnd={handleDragEnd}
                        >
                          <TaskCard
                            task={task}
                            onClick={() => onTaskClick(task)}
                            isDragging={draggedTask?.id === task.id}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )
          })}

          {/* Botão para criar nova coluna */}
          <div className="flex-shrink-0 w-[300px]">
            <Button
              variant="outline"
              className="w-full h-[100px] border-dashed"
              onClick={onCreateColumn}
            >
              <Plus className="mr-2 h-5 w-5" />
              Nova Coluna
            </Button>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
