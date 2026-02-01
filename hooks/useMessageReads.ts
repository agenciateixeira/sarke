import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MessageRead {
  message_id: string
  user_id: string
  read_at: string
}

export function useMessageReads(messageIds: string[]) {
  const [reads, setReads] = useState<Map<string, MessageRead[]>>(new Map())

  useEffect(() => {
    if (messageIds.length === 0) return

    const fetchReads = async () => {
      const { data } = await supabase
        .from('message_reads')
        .select('*')
        .in('message_id', messageIds)

      if (data) {
        const readsMap = new Map<string, MessageRead[]>()
        data.forEach((read) => {
          const existing = readsMap.get(read.message_id) || []
          readsMap.set(read.message_id, [...existing, read])
        })
        setReads(readsMap)
      }
    }

    fetchReads()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('message_reads_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
          filter: `message_id=in.(${messageIds.join(',')})`,
        },
        (payload) => {
          const newRead = payload.new as MessageRead
          setReads((prev) => {
            const newMap = new Map(prev)
            const existing = newMap.get(newRead.message_id) || []
            newMap.set(newRead.message_id, [...existing, newRead])
            return newMap
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [messageIds.join(',')])

  return reads
}
