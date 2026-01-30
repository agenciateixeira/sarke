'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Building2,
  TrendingUp,
  Calendar,
  Plus,
  ArrowUpRight,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()

  // Stats cards para CRM de Arquitetura
  const stats = [
    {
      title: 'Clientes Ativos',
      value: '-',
      icon: <Users className="h-5 w-5" />,
      description: 'Carregando...',
      href: '/dashboard/comercial',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Projetos em Andamento',
      value: '-',
      icon: <Building2 className="h-5 w-5" />,
      description: 'Carregando...',
      href: '/dashboard/obra',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: 'Pipeline',
      value: '-',
      icon: <TrendingUp className="h-5 w-5" />,
      description: 'Carregando...',
      href: '/dashboard/comercial',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Próximas Atividades',
      value: '-',
      icon: <Calendar className="h-5 w-5" />,
      description: 'Carregando...',
      href: '/dashboard/calendario',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
  ]

  const quickActions = [
    {
      title: 'Novo Cliente',
      description: 'Cadastrar novo cliente',
      icon: <Users className="h-5 w-5" />,
      href: '/dashboard/comercial',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Novo Projeto',
      description: 'Iniciar projeto de arquitetura',
      icon: <Building2 className="h-5 w-5" />,
      href: '/dashboard/obra',
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      title: 'Nova Tarefa',
      description: 'Criar tarefa para a equipe',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard/tarefas',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      title: 'Agendar Reunião',
      description: 'Marcar reunião com cliente',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/calendario',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {user?.name?.split(' ')[0] || 'Usuário'} 👋
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo ao seu painel de controle. Aqui está uma visão geral dos seus projetos e atividades.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {stat.description}
                  <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="hover:border-primary/50 transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${action.color} text-white transition-transform group-hover:scale-110`}>
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Empty States - Incentivando a usar o sistema */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Últimos Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Nenhum projeto ainda</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Comece cadastrando seus projetos de arquitetura para acompanhar o andamento de cada obra.
              </p>
              <Button asChild>
                <Link href="/dashboard/obra">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Projeto
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clientes Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Nenhum cliente cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Cadastre seus clientes para gerenciar contatos, projetos e documentos em um só lugar.
              </p>
              <Button asChild variant="outline">
                <Link href="/dashboard/comercial">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Cliente
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dica de Início */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Comece a usar o Sarke CRM</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para aproveitar ao máximo o sistema, recomendamos começar cadastrando seus clientes e projetos existentes.
                Isso permitirá acompanhar todo o ciclo de vendas e execução das obras.
              </p>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href="/dashboard/comercial">Começar Agora</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/calendario">Ver Calendário</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
