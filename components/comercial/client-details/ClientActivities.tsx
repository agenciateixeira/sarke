'use client'

import { ClientActivity, CLIENT_ACTIVITY_TYPE_LABELS } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Calendar,
  Phone,
  Mail,
  Users,
  Home,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'

interface ClientActivitiesProps {
  activities: ClientActivity[]
  clientId: string
  refetch: () => Promise<void>
}

export function ClientActivities({ activities, clientId, refetch }: ClientActivitiesProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      call: Phone,
      email: Mail,
      meeting: Users,
      visit: Home,
      proposal: FileText,
      contract: FileText,
      payment: CreditCard,
      note: FileText,
      task: CheckCircle2,
      milestone: CheckCircle2,
    }
    const Icon = icons[type] || Calendar
    return <Icon className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: 'outline', label: 'Pendente', icon: Clock },
      completed: { variant: 'default', label: 'Concluído', icon: CheckCircle2 },
      cancelled: { variant: 'secondary', label: 'Cancelado', icon: XCircle },
    }
    const { variant, label, icon: Icon } = config[status] || config.pending
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = new Date(a.scheduled_date || a.created_at)
    const dateB = new Date(b.scheduled_date || b.created_at)
    return dateB.getTime() - dateA.getTime()
  })

  const pendingActivities = activities.filter(a => a.status === 'pending')
  const completedActivities = activities.filter(a => a.status === 'completed')

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhuma atividade registrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Comece registrando interações com este cliente
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Primeira Atividade
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingActivities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedActivities.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Timeline de Atividades</h3>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nova Atividade
          </Button>
        </div>

        <div className="relative space-y-4 pl-6">
          {/* Linha vertical do timeline */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

          {sortedActivities.map((activity, index) => (
            <div key={activity.id} className="relative">
              {/* Ponto do timeline */}
              <div className="absolute -left-[25px] top-2 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>

              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {CLIENT_ACTIVITY_TYPE_LABELS[activity.activity_type]}
                          </Badge>
                          {getStatusBadge(activity.status)}
                        </div>
                        <CardTitle className="text-base">{activity.title}</CardTitle>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {activity.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {activity.status === 'completed' ? 'Agendado: ' : 'Agendado para: '}
                          {formatDate(activity.scheduled_date)}
                        </span>
                      </div>
                    )}
                    {activity.completed_date && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Concluído em: {formatDate(activity.completed_date)}</span>
                      </div>
                    )}
                    {!activity.scheduled_date && !activity.completed_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Criado em: {formatDate(activity.created_at)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
