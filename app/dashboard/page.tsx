'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CheckSquare,
  DollarSign,
  Users,
  Building,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  const stats = [
    {
      title: 'Tarefas Ativas',
      value: '12',
      icon: <CheckSquare className="h-4 w-4 text-muted-foreground" />,
      description: '+2 desde ontem',
    },
    {
      title: 'Projetos',
      value: '5',
      icon: <Building className="h-4 w-4 text-muted-foreground" />,
      description: '3 em andamento',
    },
    {
      title: 'Equipe',
      value: '28',
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      description: '24 ativos',
    },
    {
      title: 'Receita Mensal',
      value: 'R$ 45.2k',
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
      description: '+12% vs mês anterior',
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {user?.name}! Aqui está um resumo das suas atividades.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Nova tarefa criada</p>
                  <p className="text-xs text-muted-foreground">Há 2 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Projeto aprovado</p>
                  <p className="text-xs text-muted-foreground">Há 5 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Reunião agendada</p>
                  <p className="text-xs text-muted-foreground">Há 1 dia</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Revisar documentos do projeto X</p>
                  <p className="text-xs text-muted-foreground">Vence em 2 dias</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Reunião com cliente Y</p>
                  <p className="text-xs text-muted-foreground">Amanhã às 14h</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Atualizar planilha de custos</p>
                  <p className="text-xs text-muted-foreground">Vence hoje</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas - Administrador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                Adicionar Colaborador
              </button>
              <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90">
                Gerar Relatório
              </button>
              <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90">
                Configurar Permissões
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
