'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AutomationRulesManager } from '@/components/comercial/AutomationRulesManager'
import { AutomationReports } from '@/components/comercial/AutomationReports'
import { Settings, BarChart3 } from 'lucide-react'

export default function AutomacoesPage() {
  const [activeTab, setActiveTab] = useState('rules')

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Automações</h1>
        <p className="text-muted-foreground">
          Configure e monitore as automações do pipeline
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="flex-1 mt-6">
          <AutomationRulesManager />
        </TabsContent>

        <TabsContent value="reports" className="flex-1 mt-6">
          <AutomationReports />
        </TabsContent>
      </Tabs>
    </div>
  )
}
