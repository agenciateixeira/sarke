'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Play,
  Pause,
  Square,
  Clock,
  Trash2,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TaskTimeEntry {
  id: string
  task_id: string
  user_id: string
  user_name: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  notes: string | null
  is_running: boolean
  created_at: string
}

interface TaskTimeTrackingProps {
  taskId: string
}

export function TaskTimeTracking({ taskId }: TaskTimeTrackingProps) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<TaskTimeEntry[]>([])
  const [runningEntry, setRunningEntry] = useState<TaskTimeEntry | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch time entries
  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setEntries(data || [])

      // Encontrar entry em execução
      const running = data?.find(e => e.is_running && e.user_id === user?.id)
      setRunningEntry(running || null)
    } catch (error) {
      console.error('Error fetching time entries:', error)
      toast.error('Erro ao carregar histórico de tempo')
    }
  }

  useEffect(() => {
    fetchTimeEntries()
  }, [taskId])

  // Atualizar tempo decorrido
  useEffect(() => {
    if (!runningEntry) {
      setElapsedTime(0)
      return
    }

    const updateElapsed = () => {
      const start = new Date(runningEntry.started_at).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - start) / 1000) // segundos
      setElapsedTime(elapsed)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [runningEntry])

  // Iniciar cronômetro
  const handleStart = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .insert({
          task_id: taskId,
          user_id: user.id,
          user_name: user.name,
          started_at: new Date().toISOString(),
          is_running: true,
        })
        .select()
        .single()

      if (error) throw error

      setRunningEntry(data)
      toast.success('Cronômetro iniciado')
      await fetchTimeEntries()
    } catch (error) {
      console.error('Error starting timer:', error)
      toast.error('Erro ao iniciar cronômetro')
    } finally {
      setLoading(false)
    }
  }

  // Pausar cronômetro (finalizar entry)
  const handleStop = async () => {
    if (!runningEntry) return

    setLoading(true)
    try {
      const endTime = new Date()
      const startTime = new Date(runningEntry.started_at)
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)

      const { error } = await supabase
        .from('task_time_entries')
        .update({
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          is_running: false,
          notes: notes.trim() || null,
        })
        .eq('id', runningEntry.id)

      if (error) throw error

      setRunningEntry(null)
      setElapsedTime(0)
      setNotes('')
      toast.success(`Tempo registrado: ${formatDuration(durationMinutes)}`)
      await fetchTimeEntries()
    } catch (error) {
      console.error('Error stopping timer:', error)
      toast.error('Erro ao parar cronômetro')
    } finally {
      setLoading(false)
    }
  }

  // Deletar entry
  const handleDelete = async (entryId: string) => {
    if (!confirm('Deseja realmente excluir este registro de tempo?')) return

    try {
      const { error } = await supabase
        .from('task_time_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error

      toast.success('Registro excluído')
      await fetchTimeEntries()
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error('Erro ao excluir registro')
    }
  }

  // Formatar duração
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Formatar tempo decorrido do cronômetro
  const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const pad = (num: number) => num.toString().padStart(2, '0')

    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
  }

  // Calcular tempo total
  const totalMinutes = entries
    .filter(e => !e.is_running)
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0)

  return (
    <div className="space-y-6">
      {/* Cronômetro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cronômetro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display do tempo */}
          <div className="flex items-center justify-center">
            <div className="text-5xl font-bold font-mono tabular-nums">
              {runningEntry ? formatElapsed(elapsedTime) : '00:00:00'}
            </div>
          </div>

          {/* Notas (quando está rodando) */}
          {runningEntry && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                placeholder="O que você está trabalhando?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {/* Botões de controle */}
          <div className="flex gap-2 justify-center">
            {!runningEntry ? (
              <Button
                onClick={handleStart}
                disabled={loading}
                size="lg"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            ) : (
              <Button
                onClick={handleStop}
                disabled={loading}
                size="lg"
                variant="destructive"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Parar e Salvar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Histórico de Tempo
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {formatDuration(totalMinutes)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum tempo registrado ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div key={entry.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{entry.user_name}</span>
                          {entry.is_running && (
                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                              Em execução
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.started_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                          {!entry.is_running && entry.duration_minutes && (
                            <span className="font-medium text-foreground ml-2">
                              • {formatDuration(entry.duration_minutes)}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            "{entry.notes}"
                          </p>
                        )}
                      </div>

                      {/* Botão delete (apenas próprias entries) */}
                      {entry.user_id === user?.id && !entry.is_running && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
