'use client'

import { Construction } from 'lucide-react'

export default function AtividadesPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Atividades</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie ligações, reuniões e tarefas com clientes
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg bg-muted/20">
          <Construction className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            Em Desenvolvimento
          </h2>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            A gestão de atividades comerciais está sendo desenvolvida.
            Aqui você poderá criar e acompanhar ligações, reuniões, emails e tarefas relacionadas aos clientes.
          </p>
        </div>
      </div>
    </div>
  )
}
