'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CronogramaObraView } from '@/components/cronograma-obra/CronogramaObraView'
import { supabase } from '@/lib/supabase'
import { Obra } from '@/types/obra'

export default function CronogramaObraDetailPage() {
  const params = useParams()
  const obraId = params.id as string
  const [obra, setObra] = useState<Obra | null>(null)

  useEffect(() => {
    async function loadObra() {
      try {
        const { data, error } = await supabase
          .from('obras')
          .select('*')
          .eq('id', obraId)
          .single()

        if (error) throw error
        setObra(data)
      } catch (error) {
        console.error('Erro ao carregar obra:', error)
      }
    }

    loadObra()
  }, [obraId])

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        <CronogramaObraView obraId={obraId} obraNome={obra?.nome} />
      </div>
    </ProtectedRoute>
  )
}
