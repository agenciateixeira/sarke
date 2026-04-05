'use client'

import { Deal } from '@/types/pipeline'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Building2, Calendar, TrendingUp, User, MoreVertical, Archive, Trash2, TrophyIcon, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DealCardProps {
  deal: Deal
  onClick?: () => void
  isDragging?: boolean
  onArchive?: (dealId: string) => void
  onDelete?: (dealId: string) => void
  onMarkAsWonLost?: (deal: Deal) => void
}

export function DealCard({ deal, onClick, isDragging, onArchive, onDelete, onMarkAsWonLost }: DealCardProps) {
  const isOverdue = deal.expected_close_date
    ? new Date(deal.expected_close_date) < new Date(new Date().toDateString())
    : false

  const formatCurrency = (value?: number) => {
    if (!value) return 'Valor não definido'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600'
    if (probability >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-all group',
        isDragging && 'opacity-50 rotate-2'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Título e Cliente com Menu de Ações */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {deal.opportunity_cod && (
              <span className="font-mono text-xs text-muted-foreground">{deal.opportunity_cod}</span>
            )}
            <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {deal.title}
            </h4>
            {deal.client && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{deal.client.name}</span>
              </div>
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
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onMarkAsWonLost && (
                <>
                  <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onMarkAsWonLost(deal))}>
                    <TrophyIcon className="h-4 w-4 mr-2 text-green-600" />
                    Ganhou / Perdeu
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onArchive(deal.id))}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => handleMenuAction(e, () => onDelete(deal.id))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Valor e Probabilidade */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-sm font-bold">
              {formatCurrency(deal.value)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Probabilidade</p>
            <p className={cn('text-sm font-bold', getProbabilityColor(deal.probability))}>
              <TrendingUp className="h-3 w-3 inline mr-1" />
              {deal.probability}%
            </p>
          </div>
        </div>

        {/* Data prevista de avanço de estágio */}
        {deal.expected_close_date && (
          <div className={cn(
            'flex items-center gap-1.5 text-xs',
            isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'
          )}>
            <Calendar className="h-3 w-3" />
            <span>
              Prev. {new Date(deal.expected_close_date).toLocaleDateString('pt-BR')}
              {isOverdue && ' (atrasado)'}
            </span>
          </div>
        )}

        {/* Tags */}
        {deal.tags && deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deal.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer: Responsável e Tempo */}
        <div className="flex items-center justify-between pt-2 border-t">
          {deal.owner ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                {deal.owner.avatar_url && <AvatarImage src={deal.owner.avatar_url} />}
                <AvatarFallback className="text-[10px]">
                  {deal.owner.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                {deal.owner.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Sem responsável</span>
            </div>
          )}

          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(deal.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
