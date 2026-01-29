'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ClipboardList } from 'lucide-react'

export default function CronogramaPage() {
  return (
    <ProtectedRoute requiredSetor="cronograma">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Cronograma"
          description="Planejamento temporal de projetos e obras"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cronograma
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Cronogramas Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cronograma encontrado</p>
              <p className="text-sm">Integrado com Calendário e Gestão de Obra</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
