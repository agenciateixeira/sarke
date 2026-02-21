'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  Building2,
  CheckSquare,
  Calendar,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  TrendingUp,
  HardHat,
  ClipboardList,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  clientes_ativos: number
  obras_em_andamento: number
  tarefas_pendentes: number
  tarefas_atrasadas: number
  tarefas_concluidas_hoje: number
  rdos_hoje: number
  membros_equipe: number
  eventos_hoje: number
}

interface ObraRecente {
  id: string
  nome: string
  status: string
  progresso_percentual: number
  data_previsao_termino: string | null
  tipo_obra: string | null
}

interface TarefaRecente {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
}

interface RDORecente {
  id: string
  numero_relatorio: number
  data_relatorio: string
  status: string
  obra: { nome: string } | null
}

const statusObraLabel: Record<string, { label: string; color: string }> = {
  planejamento: { label: 'Planejamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  em_andamento: { label: 'Em Andamento', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  pausada: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
  concluida: { label: 'Concluída', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
}

const prioridadeLabel: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

const statusTarefaLabel: Record<string, string> = {
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  review: 'Em Revisão',
  completed: 'Concluída',
  blocked: 'Bloqueada',
}

function StatCard({
  title,
  value,
  icon,
  color,
  bgColor,
  href,
  sub,
}: {
  title: string
  value: number | string
  icon: React.ReactNode
  color: string
  bgColor: string
  href: string
  sub?: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={`p-2 rounded-lg ${bgColor} ${color}`}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {sub && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {sub}
              <ArrowUpRight className="h-3 w-3" />
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    clientes_ativos: 0,
    obras_em_andamento: 0,
    tarefas_pendentes: 0,
    tarefas_atrasadas: 0,
    tarefas_concluidas_hoje: 0,
    rdos_hoje: 0,
    membros_equipe: 0,
    eventos_hoje: 0,
  })
  const [obras, setObras] = useState<ObraRecente[]>([])
  const [tarefas, setTarefas] = useState<TarefaRecente[]>([])
  const [rdos, setRdos] = useState<RDORecente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    const hoje = new Date().toISOString().split('T')[0]

    const [
      clientesRes,
      obrasRes,
      tarefasRes,
      tarefasAtrasadasRes,
      tarefasConcluidasHojeRes,
      rdosRes,
      rdosHojeRes,
      membrosRes,
      eventosHojeRes,
      obrasRecentesRes,
      tarefasRecentesRes,
    ] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('obras').select('id', { count: 'exact', head: true }).eq('status', 'em_andamento'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['todo', 'in_progress', 'review']),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['todo', 'in_progress'])
        .lt('due_date', hoje)
        .not('due_date', 'is', null),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_date', hoje),
      supabase.from('rdos').select('id', { count: 'exact', head: true }),
      supabase.from('rdos').select('id', { count: 'exact', head: true }).eq('data_relatorio', hoje),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('calendar_events')
        .select('id', { count: 'exact', head: true })
        .gte('start_date', hoje)
        .lt('start_date', hoje + 'T23:59:59'),
      supabase
        .from('obras')
        .select('id, nome, status, progresso_percentual, data_previsao_termino, tipo_obra')
        .in('status', ['em_andamento', 'planejamento'])
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .in('status', ['todo', 'in_progress', 'review', 'blocked'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(6),
    ])

    // RDOs recentes com nome da obra
    const { data: rdosRecentes } = await supabase
      .from('rdos')
      .select('id, numero_relatorio, data_relatorio, status, obra_id, obras(nome)')
      .order('data_relatorio', { ascending: false })
      .limit(4)

    setStats({
      clientes_ativos: clientesRes.count ?? 0,
      obras_em_andamento: obrasRes.count ?? 0,
      tarefas_pendentes: tarefasRes.count ?? 0,
      tarefas_atrasadas: tarefasAtrasadasRes.count ?? 0,
      tarefas_concluidas_hoje: tarefasConcluidasHojeRes.count ?? 0,
      rdos_hoje: rdosHojeRes.count ?? 0,
      membros_equipe: membrosRes.count ?? 0,
      eventos_hoje: eventosHojeRes.count ?? 0,
    })

    setObras((obrasRecentesRes.data as ObraRecente[]) ?? [])
    setTarefas((tarefasRecentesRes.data as TarefaRecente[]) ?? [])

    if (rdosRecentes) {
      const mapped: RDORecente[] = rdosRecentes.map((r: any) => ({
        id: r.id,
        numero_relatorio: r.numero_relatorio,
        data_relatorio: r.data_relatorio,
        status: r.status,
        obra: r.obras ? { nome: r.obras.nome } : null,
      }))
      setRdos(mapped)
    }

    setLoading(false)
  }

  const primeiroNome = user?.name?.split(' ')[0] || 'Usuário'

  const statCards = [
    {
      title: 'Clientes Ativos',
      value: loading ? '...' : stats.clientes_ativos,
      icon: <Users className="h-4 w-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      href: '/dashboard/comercial',
      sub: 'Ver CRM comercial',
    },
    {
      title: 'Obras em Andamento',
      value: loading ? '...' : stats.obras_em_andamento,
      icon: <HardHat className="h-4 w-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      href: '/dashboard/obra',
      sub: 'Ver todas as obras',
    },
    {
      title: 'Tarefas Abertas',
      value: loading ? '...' : stats.tarefas_pendentes,
      icon: <CheckSquare className="h-4 w-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      href: '/dashboard/tarefas',
      sub: 'Ver kanban',
    },
    {
      title: 'Membros da Equipe',
      value: loading ? '...' : stats.membros_equipe,
      icon: <Users className="h-4 w-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      href: '/dashboard/equipe',
      sub: 'Ver equipe',
    },
  ]

  const alertas = [
    stats.tarefas_atrasadas > 0 && {
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      msg: `${stats.tarefas_atrasadas} tarefa${stats.tarefas_atrasadas > 1 ? 's' : ''} atrasada${stats.tarefas_atrasadas > 1 ? 's' : ''}`,
      href: '/dashboard/tarefas',
      color: 'text-red-600',
    },
    stats.tarefas_concluidas_hoje > 0 && {
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      msg: `${stats.tarefas_concluidas_hoje} tarefa${stats.tarefas_concluidas_hoje > 1 ? 's' : ''} concluída${stats.tarefas_concluidas_hoje > 1 ? 's' : ''} hoje`,
      href: '/dashboard/tarefas',
      color: 'text-green-600',
    },
    stats.rdos_hoje > 0 && {
      icon: <ClipboardList className="h-4 w-4 text-blue-500" />,
      msg: `${stats.rdos_hoje} RDO${stats.rdos_hoje > 1 ? 's' : ''} registrado${stats.rdos_hoje > 1 ? 's' : ''} hoje`,
      href: '/dashboard/obra',
      color: 'text-blue-600',
    },
    stats.eventos_hoje > 0 && {
      icon: <Calendar className="h-4 w-4 text-orange-500" />,
      msg: `${stats.eventos_hoje} evento${stats.eventos_hoje > 1 ? 's' : ''} agendado${stats.eventos_hoje > 1 ? 's' : ''} para hoje`,
      href: '/dashboard/calendario',
      color: 'text-orange-600',
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; msg: string; href: string; color: string }>

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, {primeiroNome}
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do sistema — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Alertas rápidos */}
      {!loading && alertas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alertas.map((alerta, i) => (
            <Link key={i} href={alerta.href}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors text-xs font-medium cursor-pointer">
                {alerta.icon}
                <span className={alerta.color}>{alerta.msg}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Obras + Tarefas */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Obras recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Obras Ativas
            </CardTitle>
            <Link href="/dashboard/obra" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : obras.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma obra cadastrada ainda
              </div>
            ) : (
              obras.map((obra) => {
                const s = statusObraLabel[obra.status] ?? { label: obra.status, color: 'bg-gray-100 text-gray-600' }
                return (
                  <Link key={obra.id} href={`/dashboard/obra/${obra.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{obra.nome}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.color}`}>
                            {s.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={obra.progresso_percentual} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground shrink-0">
                            {obra.progresso_percentual}%
                          </span>
                        </div>
                        {obra.data_previsao_termino && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Previsão: {new Date(obra.data_previsao_termino + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Tarefas pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              Tarefas em Aberto
            </CardTitle>
            <Link href="/dashboard/tarefas" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : tarefas.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma tarefa em aberto
              </div>
            ) : (
              tarefas.map((tarefa) => {
                const prio = prioridadeLabel[tarefa.priority] ?? { label: tarefa.priority, color: 'bg-gray-100 text-gray-600' }
                const atrasada = tarefa.due_date && tarefa.due_date < new Date().toISOString().split('T')[0]
                return (
                  <Link key={tarefa.id} href="/dashboard/tarefas">
                    <div className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-medium truncate">{tarefa.title}</p>
                        <p className="text-xs text-muted-foreground">{statusTarefaLabel[tarefa.status] ?? tarefa.status}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {atrasada && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        {tarefa.due_date && (
                          <span className={`text-xs ${atrasada ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            {new Date(tarefa.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${prio.color}`}>
                          {prio.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* RDOs Recentes + Indicadores */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* RDOs */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Últimos RDOs
            </CardTitle>
            <Link href="/dashboard/obra" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              Ver obras <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : rdos.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhum RDO registrado ainda
              </div>
            ) : (
              rdos.map((rdo) => {
                const statusColor =
                  rdo.status === 'aprovado'
                    ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : rdo.status === 'finalizado'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
                const statusLabel = rdo.status === 'aprovado' ? 'Aprovado' : rdo.status === 'finalizado' ? 'Finalizado' : 'Rascunho'
                return (
                  <div key={rdo.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-muted">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          RDO #{rdo.numero_relatorio}
                          {rdo.obra && <span className="font-normal text-muted-foreground"> — {rdo.obra.nome}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(rdo.data_relatorio + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Indicadores rápidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Indicadores de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Tarefas concluídas
              </div>
              <span className="text-sm font-semibold text-green-600">
                {loading ? '...' : stats.tarefas_concluidas_hoje}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Tarefas atrasadas
              </div>
              <span className={`text-sm font-semibold ${stats.tarefas_atrasadas > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {loading ? '...' : stats.tarefas_atrasadas}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                RDOs hoje
              </div>
              <span className="text-sm font-semibold text-blue-600">
                {loading ? '...' : stats.rdos_hoje}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Eventos hoje
              </div>
              <span className="text-sm font-semibold text-orange-600">
                {loading ? '...' : stats.eventos_hoje}
              </span>
            </div>

            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Acesso rápido</p>
              <Link href="/dashboard/tarefas" className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1">
                <CheckSquare className="h-4 w-4" /> Kanban de tarefas
              </Link>
              <Link href="/dashboard/cronograma" className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1">
                <ClipboardList className="h-4 w-4" /> Cronogramas
              </Link>
              <Link href="/dashboard/financeiro" className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1">
                <TrendingUp className="h-4 w-4" /> Financeiro
              </Link>
              <Link href="/dashboard/equipe" className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-1">
                <Users className="h-4 w-4" /> Equipe
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
