'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Check, X, Clock, UserCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AccessRequestWithUser } from '@/types/notifications'

interface AccessRequestsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AccessRequestsDialog({ open, onOpenChange }: AccessRequestsDialogProps) {
  const { accessRequests, reviewAccessRequest } = useNotifications()
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [selectedHours, setSelectedHours] = useState<Record<string, number>>({})

  const handleReview = async (request: AccessRequestWithUser, approved: boolean) => {
    setReviewingId(request.id)
    const hours = selectedHours[request.id] || 24
    await reviewAccessRequest(request.id, approved, hours)
    setReviewingId(null)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Solicitações de Acesso
          </DialogTitle>
          <DialogDescription>
            Aprove ou negue solicitações de acesso fora do horário de trabalho
          </DialogDescription>
        </DialogHeader>

        {accessRequests.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma solicitação pendente
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {accessRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.user_avatar} />
                        <AvatarFallback>{getInitials(request.user_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.user_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(request.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Pendente</Badge>
                  </div>

                  {/* Reason */}
                  {request.reason && (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">Motivo:</p>
                      <p className="text-sm text-muted-foreground">{request.reason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Select
                      defaultValue="24"
                      disabled={reviewingId === request.id}
                      onValueChange={(value) => {
                        setSelectedHours((prev) => ({
                          ...prev,
                          [request.id]: parseInt(value),
                        }))
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Duração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hora</SelectItem>
                        <SelectItem value="3">3 horas</SelectItem>
                        <SelectItem value="6">6 horas</SelectItem>
                        <SelectItem value="12">12 horas</SelectItem>
                        <SelectItem value="24">24 horas</SelectItem>
                        <SelectItem value="48">48 horas</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex-1" />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(request, false)}
                      disabled={reviewingId === request.id}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Negar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReview(request, true)}
                      disabled={reviewingId === request.id}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
