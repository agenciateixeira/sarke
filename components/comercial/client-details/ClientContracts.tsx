'use client'

import { Contract, CONTRACT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, DollarSign, Calendar, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface ClientContractsProps {
  contracts: Contract[]
  clientId: string
  refetch: () => Promise<void>
}

export function ClientContracts({ contracts, clientId, refetch }: ClientContractsProps) {
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
    const variants: Record<string, any> = {
      draft: 'outline',
      pending: 'outline',
      approved: 'default',
      active: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
      suspended: 'secondary',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {CONTRACT_STATUS_LABELS[status as keyof typeof CONTRACT_STATUS_LABELS] || status}
      </Badge>
    )
  }

  const totalValue = contracts.reduce((sum, c) => sum + c.contract_value, 0)
  const activeContracts = contracts.filter(c => c.status === 'active')
  const activeValue = activeContracts.reduce((sum, c) => sum + c.contract_value, 0)

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum contrato cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Este cliente ainda não possui contratos
          </p>
          <Link href="/dashboard/comercial/contratos">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Contrato
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
            <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(activeValue)}
            </p>
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
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Todos os Contratos</h3>
          <Link href="/dashboard/comercial/contratos">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {contracts.map((contract) => (
            <Card key={contract.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {contract.contract_number && (
                        <Badge variant="outline">{contract.contract_number}</Badge>
                      )}
                      {getStatusBadge(contract.status)}
                    </div>
                    <CardTitle className="text-base">{contract.object}</CardTitle>
                    {contract.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {contract.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="font-semibold">
                        {formatCurrency(contract.contract_value)}
                      </p>
                    </div>
                  </div>

                  {contract.payment_method && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pagamento</p>
                        <p className="font-semibold">
                          {PAYMENT_METHOD_LABELS[contract.payment_method]}
                        </p>
                      </div>
                    </div>
                  )}

                  {contract.installments && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Parcelas</p>
                        <p className="font-semibold">{contract.installments}x</p>
                      </div>
                    </div>
                  )}

                  {contract.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Início</p>
                        <p className="font-semibold">{formatDate(contract.start_date)}</p>
                      </div>
                    </div>
                  )}

                  {contract.end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Término</p>
                        <p className="font-semibold">{formatDate(contract.end_date)}</p>
                      </div>
                    </div>
                  )}

                  {contract.deadline_months && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Prazo</p>
                        <p className="font-semibold">{contract.deadline_months} meses</p>
                      </div>
                    </div>
                  )}
                </div>

                {contract.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{contract.notes}</p>
                  </div>
                )}

                {contract.contract_file_url && (
                  <div className="mt-4">
                    <a
                      href={contract.contract_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Ver arquivo do contrato
                    </a>
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
