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
    if (cap?.isNativePlatform?.()) return cap.getPlatform();
  } catch {}
  return "web";
}

export function useLogEvent() {
  const { user } = useAuth();

  return useCallback(
    (menu: string, action: string, metadata?: Record<string, unknown>) => {
      void supabase
        .from("user_event_logs")
        .insert({
          user_id: user?.id ?? null,
          session_id: getSessionId(),
          menu,
          action,
          metadata: metadata ?? {},
          platform: getPlatform(),
        });
    },
    [user?.id]
  );
}
