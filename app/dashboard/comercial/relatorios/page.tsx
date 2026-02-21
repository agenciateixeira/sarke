'use client'

import { PipelineAnalyticsDashboard } from '@/components/comercial/PipelineAnalyticsDashboard'

export default function RelatoriosPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Relatórios e Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Análises e métricas de desempenho do pipeline comercial
        </p>
      </div>

      <PipelineAnalyticsDashboard />
    </div>
  )
}
