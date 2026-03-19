import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'

export interface QTRecord {
  id: string
  user_id: string
  date: string
  book: string
  chapter: number
  reference: string | null
  content: string | null
  voice_url: string | null
  group_id: string | null
  created_at: string
}

export interface UseQTResult {
  todayRecord: QTRecord | null
  isLoading: boolean
  saveQT: (data: { content: string; reference?: string }) => Promise<void>
  isSaving: boolean
  deleteQT: (id: string) => Promise<void>
}

const TODAY = new Date().toISOString().split('T')[0]

async function fetchQT(userId: string, date: string): Promise<QTRecord | null> {
  const { data, error } = await supabase
    .from('qt_records')
    .select('id, user_id, date, book, chapter, reference, content, voice_url, group_id, created_at')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as QTRecord | null
}

export function useQT(date: string = TODAY): UseQTResult {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const qtQuery = useQuery<QTRecord | null, Error>({
    queryKey: ['qt_record', user?.id, date],
    queryFn: () => {
      if (!user) return Promise.resolve(null)
      return fetchQT(user.id, date)
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const saveMutation = useMutation<void, Error, { content: string; reference?: string }>({
    mutationFn: async ({ content, reference }) => {
      if (!user) throw new Error('로그인이 필요합니다')

      const existing = qtQuery.data

      if (existing) {
        const { error } = await supabase
          .from('qt_records')
          .update({ content, reference: reference ?? null } as never)
          .eq('id', existing.id)
          .eq('user_id', user.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('qt_records').insert({
          user_id: user.id,
          date,
          book: '',
          chapter: 0,
          content,
          reference: reference ?? null,
          verse_start: null,
          verse_end: null,
          voice_url: null,
          voice_duration: null,
          group_id: null,
          is_linked: false,
        } as never)
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['qt_record', user?.id, date] })
    },
  })

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('로그인이 필요합니다')
      const { error } = await supabase
        .from('qt_records')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['qt_record', user?.id, date] })
    },
  })

  return {
    todayRecord: qtQuery.data ?? null,
    isLoading: qtQuery.isLoading,
    saveQT: (data) => saveMutation.mutateAsync(data),
    isSaving: saveMutation.isPending,
    deleteQT: (id) => deleteMutation.mutateAsync(id),
  }
}
