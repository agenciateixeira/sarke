import { CartaoCredito, CartaoBandeira } from '@/types/erp'
import { CreditCard } from 'lucide-react'

interface CartaoCreditoCardProps {
  cartao: CartaoCredito
  onClick?: () => void
  className?: string
}

const BANDEIRA_COLORS: Record<CartaoBandeira | 'Outros', { gradient: string; logo: string }> = {
  Visa: {
    gradient: 'from-blue-600 via-blue-700 to-blue-900',
    logo: '💳 VISA',
  },
  Mastercard: {
    gradient: 'from-red-600 via-orange-600 to-yellow-600',
    logo: '💳 MASTERCARD',
  },
  Amex: {
    gradient: 'from-cyan-600 via-blue-700 to-blue-900',
    logo: '💳 AMEX',
  },
  Elo: {
    gradient: 'from-yellow-500 via-yellow-600 to-orange-600',
    logo: '💳 ELO',
  },
  Hipercard: {
    gradient: 'from-red-700 via-red-800 to-red-900',
    logo: '💳 HIPERCARD',
  },
  Diners: {
    gradient: 'from-slate-600 via-slate-700 to-slate-900',
    logo: '💳 DINERS',
  },
  Outros: {
    gradient: 'from-gray-600 via-gray-700 to-gray-900',
    logo: '💳',
  },
}

export function CartaoCreditoCard({ cartao, onClick, className = '' }: CartaoCreditoCardProps) {
  const bandeira = cartao.bandeira || 'Outros'
  const colors = BANDEIRA_COLORS[bandeira as CartaoBandeira] || BANDEIRA_COLORS.Outros

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-48 rounded-2xl bg-gradient-to-br ${colors.gradient} p-6 text-white shadow-xl cursor-pointer transition-all hover:scale-105 hover:shadow-2xl ${className}`}
    >
      {/* Círculos decorativos de fundo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Conteúdo do cartão */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Header com bandeira e chip */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium opacity-80 uppercase tracking-wider">
              {cartao.portador || 'Corporativo'}
            </div>
            {/* Chip simulado */}
            <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-md opacity-90" />
          </div>

          {/* Logo da bandeira */}
          <div className="text-right">
            <div className="text-2xl font-bold opacity-90">{colors.logo}</div>
            <div className="text-xs opacity-70 uppercase tracking-widest mt-1">{bandeira}</div>
          </div>
        </div>

        {/* Número do cartão (últimos 4 dígitos) */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <span className="text-xl tracking-wider">••••</span>
            <span className="text-xl tracking-wider">••••</span>
            <span className="text-xl tracking-wider">••••</span>
            <span className="text-2xl font-bold tracking-wider">
              {cartao.ultimos_digitos || '****'}
            </span>
          </div>
        </div>

        {/* Nome do cartão e validade simulada */}
        <div className="flex justify-between items-end">
          <div>
            <div className="text-xs opacity-70 uppercase tracking-wide mb-1">Nome do Cartão</div>
            <div className="text-sm font-semibold uppercase tracking-wide truncate max-w-[200px]">
              {cartao.nome}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs opacity-70 uppercase tracking-wide mb-1">Status</div>
            <div className="text-sm font-semibold">
              {cartao.ativo ? (
                <span className="text-green-300">● ATIVO</span>
              ) : (
                <span className="text-red-300">● INATIVO</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Efeito de brilho no hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
    </div>
  )
}
