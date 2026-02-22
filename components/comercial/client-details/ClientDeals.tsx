'use client'

import { useState } from 'react'
import { Deal } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Briefcase, DollarSign, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface ClientDealsProps {
  deals: Deal[]
  clientId: string
  refetch: () => Promise<void>
}

export function ClientDeals({ deals, clientId, refetch }: ClientDealsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; color: string }> = {
      open: { variant: 'default', label: 'Aberto', color: 'bg-blue-500' },
      won: { variant: 'default', label: 'Ganho', color: 'bg-green-500' },
      lost: { variant: 'secondary', label: 'Perdido', color: 'bg-red-500' },
    }
    const config = variants[status] || variants.open
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0)
  const wonDeals = deals.filter(d => d.status === 'won')
  const wonValue = wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0)

  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum deal cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Este cliente ainda não possui deals no pipeline
          </p>
          <Link href="/dashboard/comercial/pipeline">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Deal
            </Button>
          </Link>
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
            <CardTitle className="text-sm font-medium">Total de Deals</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Ganhos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonDeals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(wonValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Todos os Deals</h3>
          <Link href="/dashboard/comercial/pipeline">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Deal
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {deals.map((deal) => (
            <Card key={deal.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{deal.title}</CardTitle>
                    {deal.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {deal.description}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(deal.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {deal.value && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Valor</p>
                        <p className="font-semibold">{formatCurrency(deal.value)}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Probabilidade</p>
                      <p className="font-semibold">{deal.probability}%</p>
                    </div>
                  </div>

                  {deal.expected_close_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fechamento Previsto</p>
                        <p className="font-semibold">
                          {formatDate(deal.expected_close_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {deal.status === 'lost' && deal.lost_reason && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive">
                      <strong>Motivo da perda:</strong> {deal.lost_reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
