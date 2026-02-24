'use client'

import { LancamentoComRelacoes } from '@/types/erp'
import { Card, CardContent } from '@/components/ui/card'
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
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Edit,
  Eye,
  Check,
  X,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatarMoeda,
  formatarData,
  STATUS_LABELS,
  STATUS_COLORS,
  TIPO_LABELS,
  TIPO_COLORS,
  calcularDiasAtraso,
} from '@/types/erp'

interface LancamentoCardProps {
  lancamento: LancamentoComRelacoes
  onClick?: () => void
  onEdit?: (lancamento: LancamentoComRelacoes) => void
  onBaixa?: (lancamento: LancamentoComRelacoes) => void
  onCancelar?: (lancamentoId: string) => void
}

export function LancamentoCard({
  lancamento,
  onClick,
  onEdit,
  onBaixa,
  onCancelar,
}: LancamentoCardProps) {
  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  const diasAtraso =
    lancamento.status === 'atrasado' && lancamento.data_vencimento
      ? calcularDiasAtraso(lancamento.data_vencimento)
      : 0

  const isReceita = lancamento.tipo === 'receita'
  const valorPendente = lancamento.valor_total - lancamento.valor_pago

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isReceita ? (
                <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
              )}
              <h4 className="font-semibold text-sm line-clamp-1">
                {lancamento.descricao}
              </h4>
            </div>

            {/* Cliente/Fornecedor */}
            {(lancamento.cliente || lancamento.fornecedor) && (
              <p className="text-xs text-muted-foreground truncate">
                {lancamento.cliente?.name || lancamento.fornecedor?.nome}
              </p>
            )}

            {/* Projeto/Obra */}
            {(lancamento.projeto || lancamento.obra) && (
              <p className="text-xs text-muted-foreground truncate">
                {lancamento.projeto?.nome || lancamento.obra?.nome}
              </p>
            )}
          </div>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onClick?.())}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
              </DropdownMenuItem>
              {onEdit && lancamento.status !== 'cancelado' && (
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onEdit(lancamento))}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onBaixa && lancamento.status !== 'pago' && lancamento.status !== 'cancelado' && (
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onBaixa(lancamento))}>
                  <Check className="mr-2 h-4 w-4" />
                  Dar Baixa
                </DropdownMenuItem>
              )}
              {onCancelar && lancamento.status !== 'cancelado' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleMenuAction(e, () => onCancelar(lancamento.id))}
                    className="text-destructive"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Valor */}
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold',
              isReceita ? 'text-green-600' : 'text-red-600'
            )}
          >
            {formatarMoeda(lancamento.valor_total)}
          </span>
          {lancamento.status === 'parcial' && valorPendente > 0 && (
            <span className="text-xs text-muted-foreground">
              (Pendente: {formatarMoeda(valorPendente)})
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={TIPO_COLORS[lancamento.tipo]}>
            {TIPO_LABELS[lancamento.tipo]}
          </Badge>
          <Badge variant="outline" className={STATUS_COLORS[lancamento.status]}>
            {STATUS_LABELS[lancamento.status]}
          </Badge>
          {diasAtraso > 0 && (
            <Badge variant="destructive" className="text-xs">
              {diasAtraso} dia{diasAtraso > 1 ? 's' : ''} atrasado
            </Badge>
          )}
        </div>

        {/* Datas */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
          {lancamento.data_vencimento && (
            <div>
              <span className="font-medium">Vencimento:</span>{' '}
              {formatarData(lancamento.data_vencimento)}
            </div>
          )}
          {lancamento.data_pagamento && (
            <div>
              <span className="font-medium">Pagamento:</span>{' '}
              {formatarData(lancamento.data_pagamento)}
            </div>
          )}
          {!lancamento.data_pagamento && (
            <div>
              <span className="font-medium">Competência:</span>{' '}
              {formatarData(lancamento.data_competencia)}
            </div>
          )}
        </div>

        {/* Conta bancária */}
        {lancamento.conta_bancaria && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            {lancamento.conta_bancaria.apelido || lancamento.conta_bancaria.nome}
          </div>
        )}

        {/* Tags */}
        {lancamento.tags && lancamento.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lancamento.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
