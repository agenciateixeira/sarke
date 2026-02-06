'use client'

import { useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CronogramaObraView } from '@/components/cronograma-obra/CronogramaObraView'

export default function CronogramaObraDetailPage() {
  const params = useParams()
  const obraId = params.id as string

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <CronogramaObraView obraId={obraId} />
      </div>
    </ProtectedRoute>
  )
}
