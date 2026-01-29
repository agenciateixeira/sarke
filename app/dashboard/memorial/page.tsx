'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'

export default function MemorialPage() {
  return (
    <ProtectedRoute requiredSetor="memorial">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Memorial"
          description="Memorial descritivo e documentação técnica"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Memorial
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Memoriais Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum memorial encontrado</p>
              <p className="text-sm">Crie memoriais descritivos para seus projetos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
