'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  name?: string
  avatar_url?: string
  email?: string
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      const { data, error} = await supabase
        .from('profiles')
        .select('id, name, avatar_url, email')
        .order('name', { ascending: true })

      if (error) throw error

      setProfiles(data || [])
    } catch (err) {
      console.error('Error fetching profiles:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  return {
    profiles,
    loading,
    error,
    refetch: fetchProfiles,
  }
}
