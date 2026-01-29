'use client'

import { PageHeader } from '@/components/dashboard/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Chat Interno"
        description="Comunicação em tempo real com a equipe"
      />

      <Card className="h-[calc(100vh-200px)]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Chat Interno</p>
            <p className="text-sm">Funcionalidade em desenvolvimento</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
