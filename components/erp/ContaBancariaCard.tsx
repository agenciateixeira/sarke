'use client'

import { ContaBancaria } from '@/types/erp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Edit,
  Eye,
  Archive
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatarMoeda } from '@/types/erp'

interface ContaBancariaCardProps {
  conta: ContaBancaria
  onClick?: () => void
  onEdit?: (conta: ContaBancaria) => void
  onArchive?: (contaId: string) => void
}

export function ContaBancariaCard({ conta, onClick, onEdit, onArchive }: ContaBancariaCardProps) {
  const tipoLabels: Record<string, string> = {
    conta_corrente: 'Conta Corrente',
    poupanca: 'Poupança',
    caixa: 'Caixa',
    carteira_digital: 'Carteira Digital',
  }

  const tipoColors: Record<string, string> = {
    conta_corrente: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    poupanca: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    caixa: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    carteira_digital: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  }

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  const saldoPositivo = conta.saldo_atual >= 0

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-lg transition-all group border-2',
        !conta.ativa && 'opacity-50'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <CardTitle className="text-base truncate">
                {conta.apelido || conta.nome}
              </CardTitle>
            </div>
            {conta.banco_nome && (
              <p className="text-xs text-muted-foreground mt-1">
                {conta.banco_nome}
                {conta.agencia && conta.numero_conta && (
                  <> • Ag {conta.agencia} / CC {conta.numero_conta}</>
                )}
              </p>
            )}
          </div>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onClick?.())}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Extrato
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onEdit(conta))}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onArchive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleMenuAction(e, () => onArchive(conta.id))}
                    className="text-destructive"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {conta.ativa ? 'Desativar' : 'Ativar'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Tipo de conta */}
        <Badge variant="outline" className={tipoColors[conta.tipo]}>
          {tipoLabels[conta.tipo]}
        </Badge>

        {/* Saldo */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
          <div className="flex items-center gap-2">
            {saldoPositivo ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <p
              className={cn(
                'text-2xl font-bold',
                saldoPositivo ? 'text-green-600' : 'text-red-600'
              )}
            >
              {formatarMoeda(conta.saldo_atual)}
            </p>
          </div>
        </div>

        {/* Saldo inicial (se diferente) */}
        {conta.saldo_inicial !== 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Saldo Inicial:</span>
              <span className="font-medium">{formatarMoeda(conta.saldo_inicial)}</span>
            </div>
          </div>
        )}

        {/* Status de integração */}
        {conta.integrado && (
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
            Sincronizado
            {conta.ultima_sincronizacao && (
              <span className="text-muted-foreground">
                • {new Date(conta.ultima_sincronizacao).toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
