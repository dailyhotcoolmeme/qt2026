import { useState, useEffect, useCallback } from 'react'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'

// prayer_box 테이블: user_id(uuid) + topic_id(prayers.id)
// Supabase 제네릭 타입에 포함되어 있으나 버전 차이로 캐스팅 필요
type PrayerBoxDB = {
  select: (cols: string) => { eq: (col: string, val: string) => Promise<{ data: Array<{ topic_id: string | number }> | null; error: unknown }> }
  insert: (val: object) => Promise<{ error: unknown }>
  delete: () => { eq: (col: string, val: string) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } }
}

function prayerBoxTable(): PrayerBoxDB {
  return supabase.from('prayer_box') as unknown as PrayerBoxDB
}

export function usePrayerBox() {
  const userId = useAuthStore((s) => s.user?.id)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!userId) { setIsLoaded(true); return }
    void prayerBoxTable()
      .select('topic_id')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) console.error('[usePrayerBox load]', error)
        setSavedIds(new Set((data ?? []).map((r) => String(r.topic_id))))
        setIsLoaded(true)
      })
  }, [userId])

  const addPrayer = useCallback(async (prayerId: string) => {
    if (!userId || savedIds.has(prayerId)) return
    const { error } = await prayerBoxTable().insert({ user_id: userId, topic_id: prayerId })
    if (error) { console.error('[usePrayerBox add]', error); return }
    setSavedIds((prev) => new Set(prev).add(prayerId))
  }, [userId, savedIds])

  const removePrayer = useCallback(async (prayerId: string) => {
    if (!userId) return
    const { error } = await prayerBoxTable().delete().eq('user_id', userId).eq('topic_id', prayerId)
    if (error) { console.error('[usePrayerBox remove]', error); return }
    setSavedIds((prev) => { const s = new Set(prev); s.delete(prayerId); return s })
  }, [userId])

  return { savedIds, isLoaded, addPrayer, removePrayer }
}
