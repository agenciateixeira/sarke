'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Obra, StatusObra } from '@/types/obra'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Archive, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { arquivarObra } from '@/lib/memorial'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const statusLabels: Record<StatusObra, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const statusColors: Record<StatusObra, string> = {
  planejamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  em_andamento: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  pausada: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  concluida: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  cancelada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

interface ObraStatusChangerProps {
  obra: Obra
  onStatusChanged: () => void
}

export function ObraStatusChanger({ obra, onStatusChanged }: ObraStatusChangerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [novoStatus, setNovoStatus] = useState<StatusObra>(obra.status)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [arquivarDialogOpen, setArquivarDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [arquivando, setArquivando] = useState(false)

  function handleOpenConfirmation() {
    if (novoStatus === obra.status) {
      toast.info('Selecione um status diferente do atual')
      return
    }
    setDialogOpen(true)
  }

  async function handleConfirmarMudanca() {
    setDialogOpen(false)

    // Se mudando para concluída/cancelada, perguntar sobre arquivamento
    if (novoStatus === 'concluida' || novoStatus === 'cancelada') {
      setArquivarDialogOpen(true)
      return
    }

    // Mudar status normalmente (sem arquivar)
    await mudarStatus(false)
  }

  async function mudarStatus(arquivar: boolean) {
    try {
      setLoading(true)

      // Atualizar status
      const { error } = await supabase
        .from('obras')
        .update({ status: novoStatus })
        .eq('id', obra.id)

      if (error) throw error

      toast.success(`Status alterado para "${statusLabels[novoStatus]}"`)

      // Se escolheu arquivar
      if (arquivar && user) {
        setArquivando(true)
        const result = await arquivarObra({
          obra_id: obra.id,
          user_id: user.id,
          motivo: `Obra ${novoStatus === 'concluida' ? 'concluída' : 'cancelada'}`,
        })

        if (result.success) {
          toast.success('Obra arquivada no memorial! Redirecionando...')
          // Redirecionar para o memorial após 1 segundo
          setTimeout(() => {
            router.push(`/dashboard/memorial/${result.memorial_id}`)
          }, 1000)
          return // Não chamar onStatusChanged pois a obra foi deletada
        } else {
          toast.error('Erro ao arquivar: ' + result.error)
        }
        setArquivando(false)
      }

      onStatusChanged()
    } catch (error: any) {
      console.error('Erro ao mudar status:', error)
      toast.error(error.message || 'Erro ao mudar status')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmarArquivamento(arquivar: boolean) {
    setArquivarDialogOpen(false)
    await mudarStatus(arquivar)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status da Obra</span>
            <Badge className={statusColors[obra.status]}>{statusLabels[obra.status]}</Badge>
          </CardTitle>
          <CardDescription>Altere o status da obra com segurança</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Novo Status</label>
            <Select value={novoStatus} onValueChange={(v) => setNovoStatus(v as StatusObra)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejamento">Planejamento</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="pausada">Pausada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleOpenConfirmation}
            disabled={loading || novoStatus === obra.status}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <RefreshCw className="mr-2 h-4 w-4" />
            Alterar Status
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação Simples */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de status?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está alterando o status da obra <strong>"{obra.nome}"</strong> de{' '}
              <strong>{statusLabels[obra.status]}</strong> para{' '}
              <strong>{statusLabels[novoStatus]}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarMudanca}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Arquivamento */}
      <AlertDialog open={arquivarDialogOpen} onOpenChange={setArquivarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-pink-600" />
              Arquivar obra no Memorial?
            </AlertDialogTitle>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                A obra <strong>"{obra.nome}"</strong> está sendo marcada como{' '}
                <strong>{novoStatus === 'concluida' ? 'concluída' : 'cancelada'}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Deseja arquivá-la no <strong>Memorial de Obras</strong>?
              </p>
              <div className="text-sm space-y-2">
                <div className="p-3 bg-muted rounded-md">
                  <strong>✓ Arquivar no Memorial:</strong>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>Todos os dados serão movidos para o Memorial</li>
                    <li>Obra ficará em modo somente leitura</li>
                    <li>Apenas admins poderão desarquivar</li>
                    <li>Não aparecerá na lista de obras ativas</li>
                  </ul>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <strong>○ Não arquivar agora:</strong>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>Obra permanecerá na lista com novo status</li>
                    <li>Poderá ser arquivada manualmente depois</li>
                  </ul>
                </div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirmarArquivamento(false)}>
              Não arquivar agora
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirmarArquivamento(true)}
              disabled={arquivando}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {arquivando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Archive className="mr-2 h-4 w-4" />
              Arquivar no Memorial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
