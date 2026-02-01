'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission, SetorType } from '@/types'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  CheckSquare,
  ShoppingCart,
  DollarSign,
  Scale,
  Calendar,
  Users,
  MessageSquare,
  Wrench,
  Building,
  ClipboardList,
  FileText,
} from 'lucide-react'
import { ThemeToggle } from '@/components/auth/ThemeToggle'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { AccessRequestsDialog } from '@/components/notifications/AccessRequestsDialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useNotifications } from '@/hooks/useNotifications'

interface MenuItem {
  title: string
  href: string
  icon: React.ElementType
  setor: SetorType
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    setor: 'dashboard',
  },
  {
    title: 'Tarefas',
    href: '/dashboard/tarefas',
    icon: CheckSquare,
    setor: 'tarefas',
  },
  {
    title: 'Clientes',
    href: '/dashboard/comercial',
    icon: ShoppingCart,
    setor: 'comercial',
  },
  {
    title: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: DollarSign,
    setor: 'financeiro',
  },
  {
    title: 'Jurídico',
    href: '/dashboard/juridico',
    icon: Scale,
    setor: 'juridico',
  },
  {
    title: 'Calendário',
    href: '/dashboard/calendario',
    icon: Calendar,
    setor: 'calendario',
  },
  {
    title: 'Gestão de Equipe',
    href: '/dashboard/equipe',
    icon: Users,
    setor: 'gestao_equipe',
  },
  {
    title: 'Chat Interno',
    href: '/dashboard/chat',
    icon: MessageSquare,
    setor: 'chat_interno',
  },
  {
    title: 'Ferramentas',
    href: '/dashboard/ferramentas',
    icon: Wrench,
    setor: 'ferramentas',
  },
  {
    title: 'Gestão de Obra',
    href: '/dashboard/obra',
    icon: Building,
    setor: 'gestao_obra',
  },
  {
    title: 'Cronograma',
    href: '/dashboard/cronograma',
    icon: ClipboardList,
    setor: 'cronograma',
  },
  {
    title: 'Memorial',
    href: '/dashboard/memorial',
    icon: FileText,
    setor: 'memorial',
  },
]

export const Sidebar = () => {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(true)
  const [accessRequestsOpen, setAccessRequestsOpen] = useState(false)
  const { accessRequests, isAdmin } = useNotifications()

  // Carregar preferência do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded')
    if (saved !== null) {
      setIsExpanded(saved === 'true')
    }
  }, [])

  // Salvar preferência no localStorage
  const toggleSidebar = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    localStorage.setItem('sidebar-expanded', String(newState))
  }

  if (!user) return null

  const visibleMenuItems = menuItems.filter((item) =>
    hasPermission(user.role, item.setor)
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-card border-r transition-all duration-300 ease-in-out',
        isExpanded ? 'w-64' : 'w-20'
      )}
    >
      {/* Header da Sidebar - Logo */}
      <div className="flex items-center justify-center h-28 px-4 border-b">
        {isExpanded ? (
          <Link href="/dashboard">
            <Image
              src="/logo.png"
              alt="Sarke"
              width={140}
              height={46}
              className="object-contain cursor-pointer"
              priority
            />
          </Link>
        ) : (
          <Link href="/dashboard">
            <Image
              src="/artbold.png"
              alt="Sarke"
              width={40}
              height={40}
              className="object-contain cursor-pointer"
              priority
            />
          </Link>
        )}
      </div>

      {/* Botão de Toggle */}
      <div className="absolute -right-3 top-32 z-10">
        <Button
          onClick={toggleSidebar}
          size="icon"
          variant="outline"
          className="h-6 w-6 rounded-full bg-background shadow-md hover:shadow-lg"
        >
          {isExpanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Menu de Navegação */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          <TooltipProvider delayDuration={0}>
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                    !isExpanded && 'justify-center px-2'
                  )}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary-foreground')} />
                  {isExpanded && (
                    <span className="text-sm font-medium truncate">{item.title}</span>
                  )}
                </Link>
              )

              if (!isExpanded) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return <div key={item.href}>{linkContent}</div>
            })}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* Footer - Configurações e Usuário */}
      <div className="border-t p-3 space-y-2">
        {/* Actions: Notifications, Access Requests, Theme */}
        <div className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2',
          !isExpanded && 'justify-center px-2 flex-col gap-1'
        )}>
          {isExpanded && <span className="text-sm font-medium mr-auto">Ações</span>}

          <NotificationBell />

          {isAdmin && accessRequests.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAccessRequestsOpen(true)}
              className="relative"
              title="Solicitações de acesso"
            >
              <Users className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-semibold">
                {accessRequests.length}
              </span>
            </Button>
          )}

          <ThemeToggle />
        </div>

        <Separator />

        {/* Access Requests Dialog */}
        <AccessRequestsDialog
          open={accessRequestsOpen}
          onOpenChange={setAccessRequestsOpen}
        />

        {/* Menu do Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 rounded-lg hover:bg-accent p-2 transition-all w-full',
                !isExpanded && 'justify-center'
              )}
            >
              <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all flex-shrink-0">
                {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              {isExpanded && (
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.role === 'admin' && 'Administrador'}
                    {user.role === 'gerente' && 'Gerente'}
                    {user.role === 'colaborador' && 'Colaborador'}
                    {user.role === 'juridico' && 'Jurídico'}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isExpanded ? 'end' : 'start'} side="right" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/perfil" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/configuracoes" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
