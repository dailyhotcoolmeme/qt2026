import { useState, useEffect, useCallback } from 'react'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'

export interface DailyWord {
  id: string
  display_date: string
  bible_name: string
  chapter: number
  verse: number
  verse_end: number | null
  content: string
  amen_count: number
  // derived
  reference: string
  book_order?: number
}

export interface UseDailyWordResult {
  todayWord: DailyWord | null
  isLoading: boolean
  error: Error | null
  amenCount: number
  hasAmened: boolean
  handleAmen: () => Promise<void>
  isBookmarked: boolean
  handleBookmark: () => Promise<{ alreadySaved: boolean } | void>
  activityDateKeys: Set<string>
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toLocalDateKey(value?: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return formatDate(parsed)
}

type VerseRow = {
  id: string
  display_date: string
  bible_name: string
  chapter: number
  verse: number
  verse_end: number | null
  content: string
  amen_count: number
}

type BookRow = {
  book_order: number
}

async function fetchDailyWord(date: string): Promise<DailyWord | null> {
  const { data: verse, error } = await supabase
    .from('daily_bible_verses')
    .select('*')
    .eq('display_date', date)
    .maybeSingle() as { data: VerseRow | null; error: unknown }

  if (error || !verse) return null

  const { data: book } = await supabase
    .from('bible_books')
    .select('book_order')
    .eq('book_name', verse.bible_name)
    .maybeSingle() as { data: BookRow | null; error: unknown }

  const unit = verse.bible_name === '시편' ? '편' : '장'
  const reference = `${verse.bible_name} ${verse.chapter}${unit} ${verse.verse}절`

  return {
    ...verse,
    reference,
    book_order: book?.book_order,
  }
}

export function useDailyWord(date: string): UseDailyWordResult {
  const user = useAuthStore((s) => s.user)

  const [todayWord, setTodayWord] = useState<DailyWord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [amenCount, setAmenCount] = useState(0)
  const [hasAmened, setHasAmened] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [activityDateKeys, setActivityDateKeys] = useState<Set<string>>(new Set())

  // 말씀 로드
  useEffect(() => {
    setIsLoading(true)
    setHasAmened(false)
    fetchDailyWord(date)
      .then((word) => {
        setTodayWord(word)
        setAmenCount(word?.amen_count ?? 0)
        setIsLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e : new Error('fetch failed'))
        setIsLoading(false)
      })
  }, [date])

  // 북마크 여부 확인
  useEffect(() => {
    if (!user?.id || !todayWord) {
      setIsBookmarked(false)
      return
    }

    const checkBookmark = async () => {
      const { data } = await supabase
        .from('verse_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('source', 'daily_word')
        .contains('verse_ref', [todayWord.reference])
        .maybeSingle()
      setIsBookmarked(!!data)
    }

    void checkBookmark()
  }, [user?.id, todayWord])

  // 활동 날짜 키 로드 (달력 점 표시용)
  useEffect(() => {
    if (!user?.id) return

    const load = async () => {
      const { data: bookmarkRows } = await supabase
        .from('verse_bookmarks')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('source', 'daily_word')

      const next = new Set<string>()
      ;(bookmarkRows ?? []).forEach((row: { created_at: string }) => {
        const dateKey = toLocalDateKey(row.created_at)
        if (dateKey) next.add(dateKey)
      })
      setActivityDateKeys(next)
    }

    void load()
  }, [user?.id, isBookmarked])

  const handleAmen = useCallback(async () => {
    if (hasAmened || !todayWord) return

    setHasAmened(true)
    setAmenCount((prev) => prev + 1)

    // fire-and-forget amen count 증가
    void (supabase as unknown as {
      from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<void> } }
    }).from('daily_bible_verses')
      .update({ amen_count: (todayWord.amen_count ?? 0) + 1 })
      .eq('id', todayWord.id)
      .catch(() => {})
  }, [hasAmened, todayWord])

  const handleBookmark = useCallback(async () => {
    if (!todayWord) return
    if (!user?.id) return

    // 이미 저장된 경우
    const { data: existing } = await supabase
      .from('verse_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('source', 'daily_word')
      .eq('verse_ref', todayWord.reference)
      .maybeSingle()

    if (existing) {
      return { alreadySaved: true }
    }

    const { error: insertError } = await supabase.from('verse_bookmarks').insert({
      user_id: user.id,
      source: 'daily_word',
      verse_ref: todayWord.reference,
      content: todayWord.content,
      memo: null,
    } as never)

    if (insertError) throw new Error(insertError.message)

    setIsBookmarked(true)
  }, [todayWord, user?.id])

  return {
    todayWord,
    isLoading,
    error,
    amenCount,
    hasAmened,
    handleAmen,
    isBookmarked,
    handleBookmark,
    activityDateKeys,
  }
}
