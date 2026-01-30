'use client'

import { useState } from 'react'
import { useTaskPipeline } from '@/hooks/useTaskPipeline'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskWithDetails, PipelineColumn, CreateTaskData, CreateColumnData } from '@/types/tasks'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function TarefasPage() {
  const {
    columns,
    tasks,
    loading,
    createTask,
    createColumn,
    updateColumn,
    deleteColumn,
    moveTask,
  } = useTaskPipeline()

  // Estados para modais
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false)
  const [createColumnModalOpen, setCreateColumnModalOpen] = useState(false)
  const [editColumnModalOpen, setEditColumnModalOpen] = useState(false)

  // Estados para criação de tarefa
  const [selectedColumnId, setSelectedColumnId] = useState<string>('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')

  // Estados para coluna
  const [editingColumn, setEditingColumn] = useState<PipelineColumn | null>(null)
  const [columnName, setColumnName] = useState('')
  const [columnColor, setColumnColor] = useState('#3b82f6')

  // Handlers
  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task)
    setDetailModalOpen(true)
  }

  const handleCreateTaskClick = (columnId: string) => {
    setSelectedColumnId(columnId)
    setCreateTaskModalOpen(true)
  }

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error('Digite um título para a tarefa')
      return
    }

    const taskData: CreateTaskData = {
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      column_id: selectedColumnId || undefined,
      priority: newTaskPriority,
      status: 'todo',
    }

    const result = await createTask(taskData)

    if (result) {
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskPriority('medium')
      setCreateTaskModalOpen(false)
    }
  }

  const handleCreateColumnClick = () => {
    setColumnName('')
    setColumnColor('#3b82f6')
    setCreateColumnModalOpen(true)
  }

  const handleCreateColumn = async () => {
    if (!columnName.trim()) {
      toast.error('Digite um nome para a coluna')
      return
    }

    const columnData: CreateColumnData = {
      name: columnName.trim(),
      order_index: columns.length + 1,
      color: columnColor,
    }

    const result = await createColumn(columnData)

    if (result) {
      setColumnName('')
      setColumnColor('#3b82f6')
      setCreateColumnModalOpen(false)
    }
  }

  const handleEditColumnClick = (column: PipelineColumn) => {
    setEditingColumn(column)
    setColumnName(column.name)
    setColumnColor(column.color)
    setEditColumnModalOpen(true)
  }

  const handleUpdateColumn = async () => {
    if (!editingColumn || !columnName.trim()) {
      toast.error('Digite um nome para a coluna')
      return
    }

    const result = await updateColumn(editingColumn.id, {
      name: columnName.trim(),
      color: columnColor,
    })

    if (result) {
      setEditingColumn(null)
      setColumnName('')
      setColumnColor('#3b82f6')
      setEditColumnModalOpen(false)
    }
  }

  const handleDeleteColumn = async (column: PipelineColumn) => {
    if (confirm(`Excluir a coluna "${column.name}"? As tarefas nela serão mantidas, mas ficarão sem coluna.`)) {
      await deleteColumn(column.id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-background">
        <div>
          <h1 className="text-2xl font-semibold">Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seu pipeline de trabalho estilo Kanban
          </p>
        </div>

        <Button onClick={() => handleCreateTaskClick('')}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          columns={columns}
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onCreateTask={handleCreateTaskClick}
          onEditColumn={handleEditColumnClick}
          onDeleteColumn={handleDeleteColumn}
          onCreateColumn={handleCreateColumnClick}
          onMoveTask={moveTask}
        />
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        task={selectedTask}
      />

      {/* Create Task Modal */}
      <Dialog open={createTaskModalOpen} onOpenChange={setCreateTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Crie uma nova tarefa no seu pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título *</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Nome da tarefa..."
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Descrição</Label>
              <Input
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Descreva brevemente a tarefa..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-column">Coluna</Label>
                <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-priority">Prioridade</Label>
                <Select value={newTaskPriority} onValueChange={(value: any) => setNewTaskPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTask}>
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Column Modal */}
      <Dialog open={createColumnModalOpen} onOpenChange={setCreateColumnModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Coluna</DialogTitle>
            <DialogDescription>
              Adicione uma nova coluna ao seu pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="column-name">Nome *</Label>
              <Input
                id="column-name"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Ex: Em Desenvolvimento"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="column-color">Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="column-color"
                  type="color"
                  value={columnColor}
                  onChange={(e) => setColumnColor(e.target.value)}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{columnColor}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateColumnModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateColumn}>
              Criar Coluna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Column Modal */}
      <Dialog open={editColumnModalOpen} onOpenChange={setEditColumnModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Coluna</DialogTitle>
            <DialogDescription>
              Altere o nome e a cor da coluna
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-column-name">Nome *</Label>
              <Input
                id="edit-column-name"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Ex: Em Desenvolvimento"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-column-color">Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-column-color"
                  type="color"
                  value={columnColor}
                  onChange={(e) => setColumnColor(e.target.value)}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{columnColor}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditColumnModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateColumn}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
