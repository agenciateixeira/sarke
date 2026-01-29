'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission, SetorType } from '@/types'
import { cn } from '@/lib/utils'
import {
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
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/auth/ThemeToggle'

interface MenuItem {
  title: string
  href: string
  icon: React.ReactNode
  setor: SetorType
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    setor: 'dashboard',
  },
  {
    title: 'Tarefas',
    href: '/dashboard/tarefas',
    icon: <CheckSquare className="h-5 w-5" />,
    setor: 'tarefas',
  },
  {
    title: 'Comercial',
    href: '/dashboard/comercial',
    icon: <ShoppingCart className="h-5 w-5" />,
    setor: 'comercial',
  },
  {
    title: 'Financeiro',
    href: '/dashboard/financeiro',
    icon: <DollarSign className="h-5 w-5" />,
    setor: 'financeiro',
  },
  {
    title: 'Jurídico',
    href: '/dashboard/juridico',
    icon: <Scale className="h-5 w-5" />,
    setor: 'juridico',
  },
  {
    title: 'Calendário',
    href: '/dashboard/calendario',
    icon: <Calendar className="h-5 w-5" />,
    setor: 'calendario',
  },
  {
    title: 'Gestão de Equipe',
    href: '/dashboard/equipe',
    icon: <Users className="h-5 w-5" />,
    setor: 'gestao_equipe',
  },
  {
    title: 'Chat Interno',
    href: '/dashboard/chat',
    icon: <MessageSquare className="h-5 w-5" />,
    setor: 'chat_interno',
  },
  {
    title: 'Ferramentas',
    href: '/dashboard/ferramentas',
    icon: <Wrench className="h-5 w-5" />,
    setor: 'ferramentas',
  },
  {
    title: 'Gestão de Obra',
    href: '/dashboard/obra',
    icon: <Building className="h-5 w-5" />,
    setor: 'gestao_obra',
  },
  {
    title: 'Cronograma',
    href: '/dashboard/cronograma',
    icon: <ClipboardList className="h-5 w-5" />,
    setor: 'cronograma',
  },
  {
    title: 'Memorial',
    href: '/dashboard/memorial',
    icon: <FileText className="h-5 w-5" />,
    setor: 'memorial',
  },
]

export const Sidebar = () => {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

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
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b">
        <h1 className="text-2xl font-bold">Sarke</h1>
        <ThemeToggle />
      </div>

      {/* User Info */}
      <div className="p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <Avatar>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === 'admin' && 'Administrador'}
              {user.role === 'gerente' && 'Gerente'}
              {user.role === 'colaborador' && 'Colaborador'}
              {user.role === 'juridico' && 'Jurídico'}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Menu Items */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              {item.icon}
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => signOut()}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  )
}
