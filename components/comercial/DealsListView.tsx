'use client'

import { Deal } from '@/types/pipeline'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Calendar, TrendingUp, User, MoreVertical, Trash2, ArchiveRestore, RotateCcw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DealsListViewProps {
  deals: Deal[]
  type: 'won' | 'lost' | 'archived'
  onDealClick: (deal: Deal) => void
  onDelete?: (dealId: string) => void
  onUnarchive?: (dealId: string) => void
  onReopen?: (dealId: string) => void
}

export function DealsListView({ deals, type, onDealClick, onDelete, onUnarchive, onReopen }: DealsListViewProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return 'Valor não definido'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date?: string) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getTypeColor = () => {
    switch (type) {
      case 'won':
        return 'bg-green-100 border-green-300'
      case 'lost':
        return 'bg-red-100 border-red-300'
      case 'archived':
        return 'bg-gray-100 border-gray-300'
    }
  }

  const getTypeIcon = () => {
    switch (type) {
      case 'won':
        return '🏆'
      case 'lost':
        return '❌'
      case 'archived':
        return '📦'
    }
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <div className="text-6xl mb-4">{getTypeIcon()}</div>
        <h3 className="text-lg font-semibold mb-2">Nenhum negócio {type === 'won' ? 'ganho' : type === 'lost' ? 'perdido' : 'arquivado'}</h3>
        <p className="text-sm text-muted-foreground">
          {type === 'won' && 'Quando você fechar um negócio, ele aparecerá aqui.'}
          {type === 'lost' && 'Negócios marcados como perdidos aparecerão aqui.'}
          {type === 'archived' && 'Negócios arquivados aparecerão aqui.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <Card
          key={deal.id}
          className={cn(
            'cursor-pointer hover:shadow-md transition-all group border-l-4',
            getTypeColor()
          )}
          onClick={() => onDealClick(deal)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Coluna Principal */}
              <div className="flex-1 space-y-2">
                {/* Título e Cliente */}
                <div>
                  <h4 className="font-semibold text-base mb-1 flex items-center gap-2">
                    <span>{deal.title}</span>
                    {type === 'won' && <span className="text-green-600">🏆</span>}
                    {type === 'lost' && <span className="text-red-600">❌</span>}
                    {type === 'archived' && <span className="text-gray-600">📦</span>}
                  </h4>
                  {deal.client && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{deal.client.name}</span>
                    </div>
                  )}
                </div>

                {/* Informações adicionais */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Valor: </span>
                    <span className="font-semibold">{formatCurrency(deal.value)}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Probabilidade: </span>
                    <span className="font-semibold">{deal.probability}%</span>
                  </div>

                  {type === 'won' && deal.actual_close_date && (
                    <div className="flex items-center gap-1 text-green-700">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Fechado em {formatDate(deal.actual_close_date)}</span>
                    </div>
                  )}

                  {type === 'lost' && deal.lost_reason && (
                    <div className="text-red-700">
                      <span className="text-muted-foreground">Motivo: </span>
                      <span>{deal.lost_reason}</span>
                    </div>
                  )}

                  {type === 'archived' && deal.archived_at && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Arquivado em {formatDate(deal.archived_at)}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {deal.tags && deal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {deal.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Coluna Lateral - Responsável e Ações */}
              <div className="flex flex-col items-end gap-3">
                {/* Responsável */}
                {deal.owner ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {deal.owner.avatar_url && <AvatarImage src={deal.owner.avatar_url} />}
                      <AvatarFallback className="text-xs">
                        {deal.owner.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {deal.owner.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Sem responsável</span>
                  </div>
                )}

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
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {(type === 'won' || type === 'lost') && onReopen && (
                      <>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onReopen(deal.id)
                        }}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reabrir Negócio
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {type === 'archived' && onUnarchive && (
                      <>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onUnarchive(deal.id)
                        }}>
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Desarquivar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {type === 'archived' && onReopen && (
                      <>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onReopen(deal.id)
                        }}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reabrir Negócio
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(deal.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Tempo */}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(deal.updated_at || deal.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
