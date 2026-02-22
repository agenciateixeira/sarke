'use client'

import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function NotificationBell() {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id)
    }

    // Navigate if has link
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'access_request':
        return '🔔'
      case 'access_approved':
        return '✅'
      case 'access_denied':
        return '❌'
      case 'mention':
        return '@'
      case 'task_assigned':
        return '📋'
      case 'task_due_soon':
        return '⏰'
      case 'task_overdue':
        return '⚠️'
      case 'task_completed':
        return '✅'
      case 'comment_added':
        return '💬'
      case 'project_updated':
        return '📊'
      case 'message':
        return '💬'
      // Pipeline notifications
      case 'deal_stage_changed':
        return '🔄'
      case 'deal_assigned':
        return '👤'
      case 'automation_executed':
        return '🤖'
      case 'automation_failed':
        return '❌'
      case 'document_approval_requested':
        return '📝'
      case 'document_approval_approved':
        return '✅'
      case 'document_approval_rejected':
        return '❌'
      case 'document_uploaded':
        return '📎'
      case 'deadline_approaching':
        return '⏰'
      default:
        return '📌'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  'flex flex-col items-start p-3 cursor-pointer',
                  !notification.read && 'bg-muted/50'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      {(notification.message || notification.description) && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message || notification.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                        {notification.action_label && notification.link && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-primary font-medium">
                              {notification.action_label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
