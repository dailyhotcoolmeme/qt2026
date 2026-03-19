import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from 'src/lib/supabase'
import { api } from 'src/lib/api'
import { useAuthStore } from 'src/stores/authStore'
import type { VerseFavoriteInsert, VerseFavoriteRow } from 'src/lib/types'
import type { PostgrestError } from '@supabase/supabase-js'

export interface BibleVerse {
  verse: number
  content: string
}

export interface UseBibleViewResult {
  verses: BibleVerse[]
  isLoading: boolean
  error: Error | null
  bookName: string
  totalChapters: number
  audioUrl: string | null
  favoriteVerseNums: Set<number>
  toggleFavorite: (v: BibleVerse) => Promise<void>
  isTogglingFavorite: boolean
}

// bible_verses는 Database 타입 외부 테이블이므로 최소 인터페이스로 접근
interface BibleVersesChain {
  eq(col: string, val: string | number): BibleVersesChain
  order(col: string, opts: { ascending: boolean }): Promise<{
    data: BibleVerse[] | null
    error: PostgrestError | null
  }>
}

const BIBLE_META: Record<string, { name: string; chapters: number }> = {
  GEN: { name: '창세기', chapters: 50 },   EXO: { name: '출애굽기', chapters: 40 },
  LEV: { name: '레위기', chapters: 27 },   NUM: { name: '민수기', chapters: 36 },
  DEU: { name: '신명기', chapters: 34 },   JOS: { name: '여호수아', chapters: 24 },
  JDG: { name: '사사기', chapters: 21 },   RUT: { name: '룻기', chapters: 4 },
  '1SA': { name: '사무엘상', chapters: 31 }, '2SA': { name: '사무엘하', chapters: 24 },
  '1KI': { name: '열왕기상', chapters: 22 }, '2KI': { name: '열왕기하', chapters: 25 },
  '1CH': { name: '역대상', chapters: 29 },  '2CH': { name: '역대하', chapters: 36 },
  EZR: { name: '에스라', chapters: 10 },   NEH: { name: '느헤미야', chapters: 13 },
  EST: { name: '에스더', chapters: 10 },   JOB: { name: '욥기', chapters: 42 },
  PSA: { name: '시편', chapters: 150 },    PRO: { name: '잠언', chapters: 31 },
  ECC: { name: '전도서', chapters: 12 },   SNG: { name: '아가', chapters: 8 },
  ISA: { name: '이사야', chapters: 66 },   JER: { name: '예레미야', chapters: 52 },
  LAM: { name: '예레미야애가', chapters: 5 }, EZK: { name: '에스겔', chapters: 48 },
  DAN: { name: '다니엘', chapters: 12 },   HOS: { name: '호세아', chapters: 14 },
  JOL: { name: '요엘', chapters: 3 },      AMO: { name: '아모스', chapters: 9 },
  OBA: { name: '오바댜', chapters: 1 },    JON: { name: '요나', chapters: 4 },
  MIC: { name: '미가', chapters: 7 },      NAM: { name: '나훔', chapters: 3 },
  HAB: { name: '하박국', chapters: 3 },    ZEP: { name: '스바냐', chapters: 3 },
  HAG: { name: '학개', chapters: 2 },      ZEC: { name: '스가랴', chapters: 14 },
  MAL: { name: '말라기', chapters: 4 },    MAT: { name: '마태복음', chapters: 28 },
  MRK: { name: '마가복음', chapters: 16 },  LUK: { name: '누가복음', chapters: 24 },
  JHN: { name: '요한복음', chapters: 21 },  ACT: { name: '사도행전', chapters: 28 },
  ROM: { name: '로마서', chapters: 16 },   '1CO': { name: '고린도전서', chapters: 16 },
  '2CO': { name: '고린도후서', chapters: 13 }, GAL: { name: '갈라디아서', chapters: 6 },
  EPH: { name: '에베소서', chapters: 6 },  PHP: { name: '빌립보서', chapters: 4 },
  COL: { name: '골로새서', chapters: 4 },  '1TH': { name: '데살로니가전서', chapters: 5 },
  '2TH': { name: '데살로니가후서', chapters: 3 }, '1TI': { name: '디모데전서', chapters: 6 },
  '2TI': { name: '디모데후서', chapters: 4 }, TIT: { name: '디도서', chapters: 3 },
  PHM: { name: '빌레몬서', chapters: 1 },  HEB: { name: '히브리서', chapters: 13 },
  JAS: { name: '야고보서', chapters: 5 },  '1PE': { name: '베드로전서', chapters: 5 },
  '2PE': { name: '베드로후서', chapters: 3 }, '1JN': { name: '요한일서', chapters: 5 },
  '2JN': { name: '요한이서', chapters: 1 }, '3JN': { name: '요한삼서', chapters: 1 },
  JUD: { name: '유다서', chapters: 1 },    REV: { name: '요한계시록', chapters: 22 },
}

export function useBibleView(book: string, chapter: number): UseBibleViewResult {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const meta = BIBLE_META[book] ?? { name: book, chapters: 1 }

  const {
    data: verses = [],
    isLoading: isLoadingVerses,
    error: versesError,
  } = useQuery<BibleVerse[], PostgrestError>({
    queryKey: ['bible_verses', book, chapter],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from(t: 'bible_verses'): { select(c: string): BibleVersesChain }
      }).from('bible_verses')
        .select('verse, content')
        .eq('book', book)
        .eq('chapter', chapter)
        .order('verse', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 60 * 60 * 1000,
  })

  const { data: audioData, isLoading: isLoadingAudio } = useQuery<{ url: string } | null, Error>({
    queryKey: ['bible_audio', book, chapter],
    queryFn: async () => {
      try {
        return await api.getBibleAudioUrl(book, chapter)
      } catch {
        return null
      }
    },
    staleTime: 60 * 60 * 1000,
  })

  const { data: favoritesData = [] } = useQuery<VerseFavoriteRow[], PostgrestError>({
    queryKey: ['verse_favorites', 'nums', user?.id, book, chapter],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('verse_favorites')
        .select('verse')
        .eq('user_id', user.id)
        .eq('book', book)
        .eq('chapter', chapter)
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })

  const favoriteVerseNums = useMemo(
    () => new Set(favoritesData.map((f) => f.verse)),
    [favoritesData],
  )

  const { mutateAsync: doToggle, isPending: isTogglingFavorite } = useMutation<
    void,
    PostgrestError,
    BibleVerse
  >({
    mutationFn: async (v) => {
      if (!user) return
      if (favoriteVerseNums.has(v.verse)) {
        const { error } = await supabase
          .from('verse_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('book', book)
          .eq('chapter', chapter)
          .eq('verse', v.verse)
        if (error) throw error
      } else {
        const insert: VerseFavoriteInsert = {
          user_id: user.id,
          book,
          chapter,
          verse: v.verse,
          verse_end: null,
          content: v.content,
          reference: `${meta.name} ${chapter}:${v.verse}`,
          favorite_count: 0,
        }
        const { error } = await supabase.from('verse_favorites').insert(insert as never)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['verse_favorites', 'nums', user?.id, book, chapter],
      })
    },
  })

  return {
    verses,
    isLoading: isLoadingVerses || isLoadingAudio,
    error: versesError as Error | null,
    bookName: meta.name,
    totalChapters: meta.chapters,
    audioUrl: audioData?.url ?? null,
    favoriteVerseNums,
    toggleFavorite: doToggle,
    isTogglingFavorite,
  }
}
