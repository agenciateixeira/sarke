'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Bell, Mail, MessageSquare, Calendar, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationSettings {
  email_notifications: boolean
  push_notifications: boolean
  task_reminders: boolean
  meeting_reminders: boolean
  chat_notifications: boolean
  daily_summary: boolean
}

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    task_reminders: true,
    meeting_reminders: true,
    chat_notifications: true,
    daily_summary: false,
  })

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveSettings = async () => {
    if (!user) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: settings,
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Configurações salvas com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao salvar configurações', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Configurações"
        description="Personalize suas preferências e notificações"
      />

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure como e quando você deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email-notifications" className="font-medium">
                  Notificações por Email
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Receba atualizações importantes por email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.email_notifications}
              onCheckedChange={() => handleToggle('email_notifications')}
            />
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="push-notifications" className="font-medium">
                  Notificações Push
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Receba notificações no navegador
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={settings.push_notifications}
              onCheckedChange={() => handleToggle('push_notifications')}
            />
          </div>

          <Separator />

          {/* Task Reminders */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="task-reminders" className="font-medium">
                Lembretes de Tarefas
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba lembretes sobre tarefas pendentes
              </p>
            </div>
            <Switch
              id="task-reminders"
              checked={settings.task_reminders}
              onCheckedChange={() => handleToggle('task_reminders')}
            />
          </div>

          <Separator />

          {/* Meeting Reminders */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="meeting-reminders" className="font-medium">
                  Lembretes de Reuniões
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Seja notificado antes de reuniões agendadas
              </p>
            </div>
            <Switch
              id="meeting-reminders"
              checked={settings.meeting_reminders}
              onCheckedChange={() => handleToggle('meeting_reminders')}
            />
          </div>

          <Separator />

          {/* Chat Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="chat-notifications" className="font-medium">
                  Notificações de Chat
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Receba notificações de novas mensagens no chat interno
              </p>
            </div>
            <Switch
              id="chat-notifications"
              checked={settings.chat_notifications}
              onCheckedChange={() => handleToggle('chat_notifications')}
            />
          </div>

          <Separator />

          {/* Daily Summary */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="daily-summary" className="font-medium">
                Resumo Diário
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba um resumo diário das suas atividades por email
              </p>
            </div>
            <Switch
              id="daily-summary"
              checked={settings.daily_summary}
              onCheckedChange={() => handleToggle('daily_summary')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferências do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências do Sistema</CardTitle>
          <CardDescription>
            Configure como você interage com o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Tema</Label>
                <p className="text-sm text-muted-foreground">
                  O tema é sincronizado com suas preferências do sistema
                </p>
              </div>
              <Button variant="outline" size="sm">
                Sistema
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Idioma</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione o idioma da interface
                </p>
              </div>
              <Button variant="outline" size="sm">
                Português (BR)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salvar */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setSettings({
              email_notifications: true,
              push_notifications: true,
              task_reminders: true,
              meeting_reminders: true,
              chat_notifications: true,
              daily_summary: false,
            })
          }}
          disabled={loading}
        >
          Restaurar Padrões
        </Button>
        <Button onClick={handleSaveSettings} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
