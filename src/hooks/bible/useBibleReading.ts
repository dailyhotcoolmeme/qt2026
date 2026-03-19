import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { ReadingRecordRow, Database } from 'src/lib/types'
import type { PostgrestError } from '@supabase/supabase-js'

type ReadingInsert = Database['public']['Tables']['reading_records']['Insert']

// 성경 66권 순서 기반 읽기 계획
const BIBLE_PLAN: { book: string; chapters: number }[] = [
  { book: 'GEN', chapters: 50 }, { book: 'EXO', chapters: 40 },
  { book: 'LEV', chapters: 27 }, { book: 'NUM', chapters: 36 },
  { book: 'DEU', chapters: 34 }, { book: 'JOS', chapters: 24 },
  { book: 'JDG', chapters: 21 }, { book: 'RUT', chapters: 4 },
  { book: '1SA', chapters: 31 }, { book: '2SA', chapters: 24 },
  { book: '1KI', chapters: 22 }, { book: '2KI', chapters: 25 },
  { book: '1CH', chapters: 29 }, { book: '2CH', chapters: 36 },
  { book: 'EZR', chapters: 10 }, { book: 'NEH', chapters: 13 },
  { book: 'EST', chapters: 10 }, { book: 'JOB', chapters: 42 },
  { book: 'PSA', chapters: 150 }, { book: 'PRO', chapters: 31 },
  { book: 'ECC', chapters: 12 }, { book: 'SNG', chapters: 8 },
  { book: 'ISA', chapters: 66 }, { book: 'JER', chapters: 52 },
  { book: 'LAM', chapters: 5 }, { book: 'EZK', chapters: 48 },
  { book: 'DAN', chapters: 12 }, { book: 'HOS', chapters: 14 },
  { book: 'JOL', chapters: 3 }, { book: 'AMO', chapters: 9 },
  { book: 'OBA', chapters: 1 }, { book: 'JON', chapters: 4 },
  { book: 'MIC', chapters: 7 }, { book: 'NAM', chapters: 3 },
  { book: 'HAB', chapters: 3 }, { book: 'ZEP', chapters: 3 },
  { book: 'HAG', chapters: 2 }, { book: 'ZEC', chapters: 14 },
  { book: 'MAL', chapters: 4 }, { book: 'MAT', chapters: 28 },
  { book: 'MRK', chapters: 16 }, { book: 'LUK', chapters: 24 },
  { book: 'JHN', chapters: 21 }, { book: 'ACT', chapters: 28 },
  { book: 'ROM', chapters: 16 }, { book: '1CO', chapters: 16 },
  { book: '2CO', chapters: 13 }, { book: 'GAL', chapters: 6 },
  { book: 'EPH', chapters: 6 }, { book: 'PHP', chapters: 4 },
  { book: 'COL', chapters: 4 }, { book: '1TH', chapters: 5 },
  { book: '2TH', chapters: 3 }, { book: '1TI', chapters: 6 },
  { book: '2TI', chapters: 4 }, { book: 'TIT', chapters: 3 },
  { book: 'PHM', chapters: 1 }, { book: 'HEB', chapters: 13 },
  { book: 'JAS', chapters: 5 }, { book: '1PE', chapters: 5 },
  { book: '2PE', chapters: 3 }, { book: '1JN', chapters: 5 },
  { book: '2JN', chapters: 1 }, { book: '3JN', chapters: 1 },
  { book: 'JUD', chapters: 1 }, { book: 'REV', chapters: 22 },
]

// 올해 기준 일수로 오늘 읽을 장 계산
function getTodayPlanChapter(dateStr: string): { book: string; chapter: number } {
  const start = new Date(new Date(dateStr).getFullYear(), 0, 1)
  const today = new Date(dateStr)
  const dayOfYear = Math.floor((today.getTime() - start.getTime()) / 86400000)

  const totalChapters = BIBLE_PLAN.reduce((acc, b) => acc + b.chapters, 0)
  const targetChapter = dayOfYear % totalChapters

  let accumulated = 0
  for (const book of BIBLE_PLAN) {
    if (targetChapter < accumulated + book.chapters) {
      return { book: book.book, chapter: targetChapter - accumulated + 1 }
    }
    accumulated += book.chapters
  }
  return { book: 'GEN', chapter: 1 }
}

export interface ReadingPlan {
  date: string
  book: string
  chapter: number
  isCompleted: boolean
}

export interface UseBibleReadingResult {
  todayPlan: ReadingPlan | null
  recentRecords: ReadingRecordRow[]
  isLoading: boolean
  markAsRead: (book: string, chapter: number) => Promise<void>
  isMarking: boolean
  completionRate: number
  weeklyCount: number
}

export function useBibleReading(): UseBibleReadingResult {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  // 이번 달 읽기 기록
  const { data: monthRecords = [], isLoading: isLoadingMonth } = useQuery<
    ReadingRecordRow[],
    PostgrestError
  >({
    queryKey: ['reading_records', 'month', user?.id],
    queryFn: async () => {
      if (!user) return []
      const firstDay = today.slice(0, 7) + '-01'
      const { data, error } = await supabase
        .from('reading_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDay)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })

  // 최근 10개 기록
  const { data: recentRecords = [], isLoading: isLoadingRecent } = useQuery<
    ReadingRecordRow[],
    PostgrestError
  >({
    queryKey: ['reading_records', 'recent', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('reading_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })

  const { mutateAsync: markAsRead, isPending: isMarking } = useMutation<
    void,
    PostgrestError,
    { book: string; chapter: number }
  >({
    mutationFn: async ({ book, chapter }) => {
      if (!user) return
      const record: ReadingInsert = {
        user_id: user.id,
        date: today,
        book,
        chapter,
        content: null,
        voice_url: null,
        group_id: null,
      }
      const { error } = await supabase.from('reading_records').insert(record as never)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reading_records'] })
    },
  })

  const planBase = getTodayPlanChapter(today)
  const isCompletedToday = monthRecords.some(
    (r) => r.date === today && r.book === planBase.book && r.chapter === planBase.chapter,
  )

  const todayPlan: ReadingPlan = {
    date: today,
    book: planBase.book,
    chapter: planBase.chapter,
    isCompleted: isCompletedToday,
  }

  // 이번 달 일수 기준 완료율 계산
  const daysInMonth = new Date(
    parseInt(today.slice(0, 4)),
    parseInt(today.slice(5, 7)),
    0,
  ).getDate()
  const completionRate = Math.min(monthRecords.length / daysInMonth, 1)

  // 최근 7일 읽기 횟수
  const weeklyCount = useMemo(() => {
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 6)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]
    return monthRecords.filter((r) => r.date >= weekAgoStr).length
  }, [monthRecords, today])

  return {
    todayPlan,
    recentRecords,
    isLoading: isLoadingMonth || isLoadingRecent,
    markAsRead: async (book, chapter) => { await markAsRead({ book, chapter }) },
    isMarking,
    completionRate,
    weeklyCount,
  }
}
