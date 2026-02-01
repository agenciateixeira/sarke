'use client'

import { Calendar, CheckSquare, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SlashCommand {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

interface SlashCommandMenuProps {
  onSelectCommand: (commandId: string) => void
  position?: { top: number; left: number }
  hasParentTask?: boolean
}

export function SlashCommandMenu({
  onSelectCommand,
  position,
  hasParentTask = false,
}: SlashCommandMenuProps) {
  const commands: SlashCommand[] = [
    {
      id: 'meeting',
      label: '/reuniao',
      description: 'Agendar uma reunião',
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      id: 'task',
      label: '/tarefa',
      description: 'Criar uma tarefa',
      icon: <CheckSquare className="h-4 w-4" />,
    },
  ]

  // Adicionar comando de subtarefa se houver contexto de tarefa
  if (hasParentTask) {
    commands.push({
      id: 'subtask',
      label: '/subtarefa',
      description: 'Criar uma subtarefa',
      icon: <ListTodo className="h-4 w-4" />,
    })
  }

  return (
    <div
      className={cn(
        'absolute z-50 w-72 rounded-lg border bg-popover shadow-lg',
        'animate-in fade-in-0 zoom-in-95'
      )}
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className="p-2">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          Comandos Disponíveis
        </div>
        <div className="space-y-1">
          {commands.map((command) => (
            <button
              key={command.id}
              onClick={() => onSelectCommand(command.id)}
              className={cn(
                'w-full flex items-start gap-3 px-2 py-2 rounded-md',
                'hover:bg-accent hover:text-accent-foreground',
                'transition-colors cursor-pointer text-left'
              )}
            >
              <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                {command.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{command.label}</div>
                <div className="text-xs text-muted-foreground">
                  {command.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
