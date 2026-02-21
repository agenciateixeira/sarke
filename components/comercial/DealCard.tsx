'use client'

import { Deal } from '@/types/pipeline'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Building2, Calendar, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DealCardProps {
  deal: Deal
  onClick?: () => void
  isDragging?: boolean
}

export function DealCard({ deal, onClick, isDragging }: DealCardProps) {
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

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-all group',
        isDragging && 'opacity-50 rotate-2'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Título e Cliente */}
        <div>
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

        {/* Data esperada de fechamento */}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Prev. {new Date(deal.expected_close_date).toLocaleDateString('pt-BR')}
            </span>
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
