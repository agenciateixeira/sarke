'use client'

import { useState } from 'react'
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
  Menu,
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
    title: 'Clientes',
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

export const Header = () => {
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-28 items-center justify-between px-8">
        {/* Menu Hambúrguer à esquerda */}
        <div className="w-[200px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Navegação</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <ScrollArea className="h-[400px]">
                <div className="space-y-1 p-1">
                  {visibleMenuItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-2 py-2 cursor-pointer',
                          pathname === item.href && 'bg-primary text-primary-foreground'
                        )}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              </ScrollArea>

              <DropdownMenuSeparator />

              {/* Toggle de Tema no menu */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium">Tema</span>
                <ThemeToggle />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Logo centralizada */}
        <div className="flex justify-center">
          <Link href="/dashboard">
            <Image
              src="/logo.png"
              alt="Sarke"
              width={160}
              height={53}
              className="object-contain cursor-pointer"
              priority
            />
          </Link>
        </div>

        {/* Menu do usuário à direita */}
        <div className="flex items-center gap-4 w-[200px] justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg hover:bg-muted p-2 transition-colors">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === 'admin' && 'Administrador'}
                    {user.role === 'gerente' && 'Gerente'}
                    {user.role === 'colaborador' && 'Colaborador'}
                    {user.role === 'juridico' && 'Jurídico'}
                  </p>
                </div>
                <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
      </div>
    </header>
  )
}
