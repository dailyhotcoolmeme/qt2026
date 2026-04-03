import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// 세션 내 캐시 — 동일 키를 여러 컴포넌트에서 써도 쿼리는 1번
const cache = new Map<string, boolean>();
const pending = new Map<string, Promise<boolean>>();

async function fetchFlag(key: string): Promise<boolean> {
  if (pending.has(key)) return pending.get(key)!;
  const p = Promise.resolve(
    supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .maybeSingle()
  ).then(({ data }) => {
    const value = data?.enabled ?? false;
    cache.set(key, value);
    pending.delete(key);
    return value;
  });
  pending.set(key, p);
  return p;
}

/**
 * 사용 예:
 *   const isEnabled = useFeatureFlag('new_prayer_ui');
 *   if (!isEnabled) return null;
 */
export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const [enabled, setEnabled] = useState(() => cache.get(key) ?? defaultValue);

  useEffect(() => {
    if (cache.has(key)) {
      setEnabled(cache.get(key)!);
      return;
    }
    fetchFlag(key).then(setEnabled);
  }, [key]);

  return enabled;
}

/** 비 React 코드에서 사용 */
export async function getFeatureFlag(key: string, defaultValue = false): Promise<boolean> {
  if (cache.has(key)) return cache.get(key)!;
  return fetchFlag(key).catch(() => defaultValue);
}
