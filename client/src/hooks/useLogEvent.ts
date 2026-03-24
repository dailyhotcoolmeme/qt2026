import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./use-auth";

const SESSION_KEY = "myamen_session_id";

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "unknown";
  }
}

function getPlatform(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) return cap.getPlatform(); // "ios" | "android"
  } catch {}
  // 웹 브라우저 감지 (User-Agent 기반)
  const ua = navigator.userAgent || '';
  if (/KAKAOTALK/i.test(ua)) return 'kakaotalk';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/OPR|Opera/i.test(ua)) return 'opera';
  if (/Edg\//i.test(ua)) return 'edge';
  if (/Chrome/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua)) return 'safari';
  return 'web';
}

export function useLogEvent() {
  const { user } = useAuth();

  return useCallback(
    (menu: string, action: string, metadata?: Record<string, unknown>) => {
      supabase
        .from("user_event_logs")
        .insert({
          user_id: user?.id ?? null,
          session_id: getSessionId(),
          menu,
          action,
          metadata: metadata ?? {},
          platform: getPlatform(),
        })
        .then(() => {})
        .catch(() => {});
    },
    [user?.id]
  );
}
