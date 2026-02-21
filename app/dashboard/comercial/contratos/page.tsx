'use client'

import { Construction } from 'lucide-react'

export default function ContratosPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie contratos e parcelas de pagamento
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg bg-muted/20">
          <Construction className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            Em Desenvolvimento
          </h2>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            A gestão de contratos está sendo desenvolvida.
            Aqui você poderá criar, visualizar e gerenciar contratos com clientes, incluindo parcelas e pagamentos.
          </p>
        </div>
      </div>
    </div>
  )
}
