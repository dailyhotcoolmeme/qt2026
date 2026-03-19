import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { PrayerRow, PrayerInsert, PrayerUpdate } from 'src/lib/types'

const STALE_TIME = 3 * 60 * 1000 // 3분

export interface UsePrayersResult {
  myPrayers: PrayerRow[]
  publicPrayers: PrayerRow[]
  isLoading: boolean
  createPrayer: (data: PrayerInsert) => Promise<void>
  isCreating: boolean
  updatePrayer: (id: string, data: PrayerUpdate) => Promise<void>
  deletePrayer: (id: string) => Promise<void>
  markAnswered: (id: string) => Promise<void>
  prayForTopic: (prayerId: string) => Promise<void>
}

const QUERY_KEY = 'prayers'

// Supabase DB types have Insert/Update as `never` until types are regenerated.
// Cast to work around this — safe because the runtime table is correct.
function dbInsert(data: PrayerInsert): never {
  return data as unknown as never
}
function dbUpdate(data: PrayerUpdate | { is_answered: boolean } | { pray_count: number }): never {
  return data as unknown as never
}

export function usePrayers(): UsePrayersResult {
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()

  const { data: myPrayers = [], isLoading: isLoadingMine } = useQuery<PrayerRow[], PostgrestError>({
    queryKey: [QUERY_KEY, 'mine', userId],
    staleTime: STALE_TIME,
    enabled: !!userId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('prayers')
          .select('*')
          .eq('user_id', userId!)
          .order('created_at', { ascending: false })
        if (error) throw error
        return (data as PrayerRow[]) ?? []
      } catch (err) {
        throw err
      }
    },
  })

  const { data: publicPrayers = [], isLoading: isLoadingPublic } = useQuery<PrayerRow[], PostgrestError>({
    queryKey: [QUERY_KEY, 'public'],
    staleTime: STALE_TIME,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('prayers')
          .select('*')
          .eq('is_public', true)
          .neq('user_id', userId ?? '')
          .order('created_at', { ascending: false })
        if (error) throw error
        return (data as PrayerRow[]) ?? []
      } catch (err) {
        throw err
      }
    },
  })

  const createMutation = useMutation<void, PostgrestError, PrayerInsert>({
    mutationFn: async (data) => {
      try {
        const { error } = await supabase.from('prayers').insert(dbInsert(data))
        if (error) throw error
      } catch (err) {
        throw err
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'mine', userId] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'public'] })
    },
  })

  const updateMutation = useMutation<void, PostgrestError, { id: string; data: PrayerUpdate }>({
    mutationFn: async ({ id, data }) => {
      try {
        const { error } = await supabase
          .from('prayers')
          .update(dbUpdate(data))
          .eq('id', id)
        if (error) throw error
      } catch (err) {
        throw err
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'mine', userId] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'public'] })
    },
  })

  const deleteMutation = useMutation<void, PostgrestError, string>({
    mutationFn: async (id) => {
      try {
        const { error } = await supabase.from('prayers').delete().eq('id', id)
        if (error) throw error
      } catch (err) {
        throw err
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'mine', userId] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'public'] })
    },
  })

  const markAnsweredMutation = useMutation<void, PostgrestError, string>({
    mutationFn: async (id) => {
      try {
        const { error } = await supabase
          .from('prayers')
          .update(dbUpdate({ is_answered: true }))
          .eq('id', id)
        if (error) throw error
      } catch (err) {
        throw err
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'mine', userId] })
    },
  })

  const prayForTopicMutation = useMutation<void, PostgrestError, string>({
    mutationFn: async (prayerId) => {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('prayers')
          .select('pray_count')
          .eq('id', prayerId)
          .single()
        if (fetchError) throw fetchError

        const prayCount = (existing as PrayerRow | null)?.pray_count ?? 0
        const { error } = await supabase
          .from('prayers')
          .update(dbUpdate({ pray_count: prayCount + 1 }))
          .eq('id', prayerId)
        if (error) throw error
      } catch (err) {
        throw err
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'public'] })
    },
  })

  return {
    myPrayers,
    publicPrayers,
    isLoading: isLoadingMine || isLoadingPublic,
    createPrayer: (data) => createMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
    updatePrayer: (id, data) => updateMutation.mutateAsync({ id, data }),
    deletePrayer: (id) => deleteMutation.mutateAsync(id),
    markAnswered: (id) => markAnsweredMutation.mutateAsync(id),
    prayForTopic: (prayerId) => prayForTopicMutation.mutateAsync(prayerId),
  }
}
