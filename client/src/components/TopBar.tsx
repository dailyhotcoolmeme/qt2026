import React, { useEffect, useMemo, useRef, useState } from "react";
import { Menu, X, User, Type, ChevronRight, LogOut, UserX, Bell, CheckCheck, Image, Bookmark, Settings, Loader2, Smartphone, HandHeart, HeadphonesIcon, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { ProfileEditModal } from "./ProfileEditModal";
import { LoginModal } from "./LoginModal";
import { Link, useLocation } from "wouter";
import { supabase } from "../lib/supabase";
import { isNativeApp, resolveApiUrl } from "../lib/appUrl";
import { Capacitor } from "@capacitor/core";
import { defaultNotificationSettings, isNotificationTypeEnabled, loadNotificationSettings, saveNotificationSettings, type NotificationSettings } from "../lib/notificationPreferences";
import { ensureNativePushListeners, getLatestNativePushToken, getNotificationPermissionState, registerForNativePush, requestNotificationPermission } from "../lib/pushNotifications";

type TopNotificationItem = {
  id: string;
  type: "join_pending" | "join_approved" | "join_rejected" | "member_left" | "system";
  title: string;
  message: string;
  createdAt: string;
  groupId: string;
  targetPath: string;
  isRead: boolean;
};
function ensureHttpsUrl(url?: string | null) {
  if (!url) return "";
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

function ProfileAvatar({ url, ensureHttps }: { url: string | null; ensureHttps: (u?: string | null) => string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
        <User className="h-8 w-8 text-zinc-400" />
      </div>
    );
  }
  return (
    <img src={ensureHttps(url)} alt="프로필" className="h-14 w-14 rounded-2xl object-cover" onError={() => setFailed(true)} />
  );
}

function readStringSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function writeStringSet(key: string, values: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(values).slice(-300)));
  } catch {
    // ignore
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFontSizeSlider, setShowFontSizeSlider] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ownedGroupCount, setOwnedGroupCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notifications, setNotifications] = useState<TopNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [logoTextIndex, setLogoTextIndex] = useState(0);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notificationPermission, setNotificationPermission] = useState<string>("prompt");
  const [isPushSyncing, setIsPushSyncing] = useState(false);
  const [subscriptionResult, setSubscriptionResult] = useState<"ok" | "error" | null>(null);
  const [showNotificationHistory, setShowNotificationHistory] = useState(false);
  const [hasVerseCards, setHasVerseCards] = useState(false);
  const [hasPrayerBox, setHasPrayerBox] = useState(false);
  const [hasFavorites, setHasFavorites] = useState(false);
  const logoTexts = ["마이아멘", "myAmen"];

  const { fontSize, setFontSize } = useDisplaySettings();
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const pushedKey = useMemo(() => `topbar_pushed_notifications:${user?.id || "guest"}`, [user?.id]);
  const pushedIdsRef = useRef<Set<string>>(new Set());
  const pushSyncedKeyRef = useRef<string>("");
  const pushSyncInProgressRef = useRef(false);
  // handleNotificationSettingChange가 직접 sync를 처리할 때 useEffect 중복 호출 방지
  const skipNextPushSyncRef = useRef(false);
  const vapidPublicKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || "BIqWHcoeJPIYyxzR6AXBXoJwsxb90hfiQ1yVaqzYIxYINHxIeXVDuUvi502EdP1GGVYaAo7Xi0K-WZz1tS0LapI").trim();

  const syncPermissionState = async () => {
    try {
      const permission = await getNotificationPermissionState();
      setNotificationPermission(permission);
      return permission;
    } catch {
      setNotificationPermission("denied");
      return "denied";
    }
  };

  const handlePushOpenTarget = (targetPath: string) => {
    if (!targetPath) return;
    setShowNotificationPanel(false);
    setLocation(targetPath);
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const handleLoginClick = () => {
    setIsMenuOpen(false);
    setShowLoginModal(true);
  };

  const confirmLogout = () => {
    logout();
    setIsMenuOpen(false);
    setShowLogoutConfirm(false);
  };

  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("세션이 없습니다");

      const response = await fetch(resolveApiUrl("/api/user/delete"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const raw = await response.text();
        let err: any = null;
        try {
          err = raw ? JSON.parse(raw) : null;
        } catch {
          // ignore JSON parse errors
        }
        const message =
          err?.message
          ?? err?.error
          ?? (raw ? raw : `회원탈퇴에 실패했습니다 (HTTP ${response.status})`);
        const detail = err?.detail ? `\n상세: ${err.detail}` : "";
        throw new Error(String(message) + detail);
      }

      await supabase.auth.signOut();
      // 탈퇴 시 로컬스토리지 초기화 (재가입 시 온보딩부터 시작하도록)
      try { localStorage.clear(); } catch { /* ignore */ }
      setShowDeleteConfirm(false);
      setIsMenuOpen(false);

      // 탈퇴 토스트 표시 → 1.4초 후 exit 애니메이션 → 홈 이동
      setShowDeleteToast(true);
      setTimeout(() => {
        setShowDeleteToast(false); // exit 애니메이션 트리거
        setTimeout(() => {
          window.location.replace(window.location.origin + "/#/");
        }, 500);
      }, 1400);
    } catch (error) {
      console.error("회원탈퇴 오류:", error);
      alert(error instanceof Error ? error.message : "회원탈퇴에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFontSize(Number(e.target.value));
  };

  const showSystemNotification = async (item: TopNotificationItem) => {
    if (!isNotificationTypeEnabled(notificationSettings, item.type)) return;
    if (isNativeApp()) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const url = `${window.location.origin}/#${item.targetPath}`;

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(item.title, {
          body: item.message,
          tag: item.id,
          data: { url },
        });
        return;
      }
    }

    new Notification(item.title, {
      body: item.message,
      tag: item.id,
    });
  };

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const unsubscribePushSubscription = async () => {
    const token = await getAccessToken();
    if (!token) return;

    try {
      if (isNativeApp()) {
        const nativeToken = getLatestNativePushToken();
        if (!nativeToken) return;

        await fetch(resolveApiUrl("/api/push/unsubscribe"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            channel: "fcm",
            token: nativeToken,
          }),
        });
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) return;

      await fetch(resolveApiUrl("/api/push/unsubscribe"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel: "webpush",
          endpoint: subscription.endpoint,
        }),
      });
    } catch (error) {
      console.error("push unsubscribe failed:", error);
    }
  };

  const syncPushSubscription = async (force = false) => {
    // 동시 호출 방지 — 토글 ON 시 useEffect와 handleNotificationSettingChange가 동시에 호출되는 레이스 컨디션 차단
    if (pushSyncInProgressRef.current) return "in_progress";
    pushSyncInProgressRef.current = true;
    try {
    // force=true 시 pushEnabled 체크 생략: 토글 직후 React 상태가 아직 반영 안 됐을 수 있음
    if (!isAuthenticated || !user?.id) return "no_auth";
    if (!force && !notificationSettings.pushEnabled) return "disabled";

    const permission = await syncPermissionState();
    if (permission !== "granted") return;

    const token = await getAccessToken();
    if (!token) return;

    if (isNativeApp()) {
      const cacheKey = `${user.id}:${permission}:native`;
      if (!force && pushSyncedKeyRef.current === cacheKey) return;

      try {
        setIsPushSyncing(true);
        await ensureNativePushListeners(handlePushOpenTarget, () => {
          void fetchNotifications();
        });
        const nativeToken = await registerForNativePush();
        if (!nativeToken) return;

        const response = await fetch(resolveApiUrl("/api/push/subscribe"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            channel: "fcm",
            token: nativeToken,
            platform: Capacitor.getPlatform(),
          }),
        });

        if (!response.ok) return;
        pushSyncedKeyRef.current = cacheKey;
      } catch (error) {
        console.error("native push sync failed:", error);
      } finally {
        setIsPushSyncing(false);
      }
      return;
    }

    if (!vapidPublicKey) return "no_vapid";
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "no_sw";

    const cacheKey = `${user.id}:${permission}:${vapidPublicKey}`;
    if (!force && pushSyncedKeyRef.current === cacheKey) return "cached";

    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch(resolveApiUrl("/api/push/subscribe"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel: "webpush",
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) return `server_error_${response.status}`;
      pushSyncedKeyRef.current = cacheKey;
      return "ok";
    } catch (error) {
      console.error("web push sync failed:", error);
      return `exception:${String(error).slice(0, 80)}`;
    }
    } finally {
      pushSyncInProgressRef.current = false;
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const { data: rows, error } = await supabase
        .from("app_notifications")
        .select("id,notification_type,title,message,target_path,payload,is_read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) {
        console.error("notification fetch failed:", error);
        return;
      }

      const allItems: TopNotificationItem[] = ((rows ?? []) as Array<any>).map((row) => {
        const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
        const groupId = String(payload?.groupId || "");
        const targetPathRaw = String(row.target_path || "/");
        const targetPath =
          targetPathRaw.startsWith("/#/")
            ? targetPathRaw.slice(2)
            : targetPathRaw.startsWith("#/")
              ? targetPathRaw.slice(1)
              : targetPathRaw;
        return {
          id: String(row.id),
          type: (row.notification_type || "system") as TopNotificationItem["type"],
          title: String(row.title || "알림"),
          message: String(row.message || ""),
          createdAt: String(row.created_at || new Date().toISOString()),
          groupId,
          targetPath: targetPath || "/",
          isRead: Boolean(row.is_read),
        };
      });

      const visibleItems = allItems.filter((item) => isNotificationTypeEnabled(notificationSettings, item.type));
      setNotifications(visibleItems);
      const unread = visibleItems.filter((item) => !item.isRead);
      setUnreadCount(unread.length);

      if (!isNativeApp() && Notification.permission === "granted") {
        const pushed = pushedIdsRef.current;
        unread.forEach((item) => {
          if (!pushed.has(item.id)) {
            void showSystemNotification(item);
            pushed.add(item.id);
          }
        });
        writeStringSet(pushedKey, pushed);
      }
    } catch (error) {
      console.error("notification fetch failed:", error);
    }
  };

  useEffect(() => {
    pushedIdsRef.current = readStringSet(pushedKey);
  }, [pushedKey]);

  useEffect(() => {
    void syncPermissionState();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setNotificationSettings(defaultNotificationSettings);
      return;
    }

    loadNotificationSettings(user.id)
      .then(async (settings) => {
        // 웹 브라우저: 실제 push 구독 존재 여부 + 권한 상태로 토글 자동 보정
        if (settings.pushEnabled && !isNativeApp()) {
          // 브라우저 알림 권한이 차단된 경우 → toggle OFF 보정
          if (typeof Notification !== "undefined" && Notification.permission === "denied") {
            const corrected = { ...settings, pushEnabled: false };
            setNotificationSettings(corrected);
            void saveNotificationSettings(user.id, corrected);
            return;
          }
          try {
            if ("serviceWorker" in navigator && "PushManager" in window) {
              const reg = await navigator.serviceWorker.ready;
              const sub = await reg.pushManager.getSubscription();
              if (!sub) {
                const corrected = { ...settings, pushEnabled: false };
                setNotificationSettings(corrected);
                void saveNotificationSettings(user.id, corrected);
                return;
              }
            }
          } catch {
            // serviceWorker 접근 실패 시 그냥 로드된 설정 사용
          }
        }
        setNotificationSettings(settings);
      })
      .catch(() => setNotificationSettings(defaultNotificationSettings));
  }, [user?.id]);

  // 메뉴 항목 활성 여부 (저장 데이터 있으면 녹색)
  useEffect(() => {
    if (!user?.id) {
      setHasVerseCards(false); setHasPrayerBox(false); setHasFavorites(false);
      return;
    }
    const uid = user.id;
    // 내 기도제목함 (Supabase)
    void (async () => {
      try {
        const { count } = await supabase.from("prayer_box_items").select("id", { count: "exact", head: true }).eq("user_id", uid);
        setHasPrayerBox((count ?? 0) > 0);
      } catch { setHasPrayerBox(false); }
    })();
    // 말씀카드 (Supabase 우선, 0이면 로컬 폴백)
    void (async () => {
      try {
        const { count } = await supabase.from("user_verse_cards").select("id", { count: "exact", head: true }).eq("user_id", uid);
        if ((count ?? 0) > 0) { setHasVerseCards(true); return; }
      } catch { /* 로컬 폴백으로 진행 */ }
      // 로컬 IndexedDB → localStorage 폴백
      try {
        const cardKey = `verse-card-records:${uid}`;
        const db = await new Promise<IDBDatabase | null>((resolve) => {
          const req = window.indexedDB.open("myamen_verse_cards", 1);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
          req.onupgradeneeded = () => resolve(null);
        });
        if (db) {
          const records = await new Promise<unknown[]>((resolve) => {
            try {
              const tx = db.transaction("cards", "readonly");
              const r = tx.objectStore("cards").get(cardKey);
              r.onsuccess = () => resolve((r.result as unknown[]) ?? []);
              r.onerror = () => resolve([]);
            } catch { resolve([]); }
          });
          db.close();
          setHasVerseCards(records.length > 0);
          return;
        }
      } catch { /* ignore */ }
      try {
        const raw = localStorage.getItem(`verse-card-records:${uid}`);
        const arr = raw ? JSON.parse(raw) : [];
        setHasVerseCards(Array.isArray(arr) && arr.length > 0);
      } catch { setHasVerseCards(false); }
    })();
    // 즐겨찾기 말씀 (Supabase)
    supabase.from("verse_bookmarks").select("id", { count: "exact", head: true }).eq("user_id", uid)
      .then(({ count }) => setHasFavorites((count ?? 0) > 0));
  }, [user?.id, isMenuOpen]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      pushSyncedKeyRef.current = "";
      return;
    }
    // handleNotificationSettingChange가 직접 sync 처리 중이면 useEffect 중복 실행 방지
    if (skipNextPushSyncRef.current) {
      skipNextPushSyncRef.current = false;
      return;
    }
    void syncPushSubscription(false);
  }, [isAuthenticated, user?.id, vapidPublicKey, notificationSettings.pushEnabled]);

  useEffect(() => {
    void fetchNotifications();
    if (!isAuthenticated || !user?.id) return;

    const timer = window.setInterval(() => {
      void fetchNotifications();
    }, 30000);

    const channel = supabase
      .channel(`app_notifications_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, notificationSettings]);

  const markAsRead = async (id: string) => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    const { error } = await supabase
      .from("app_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("markAsRead failed:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    const { error } = await supabase
      .from("app_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .in("id", unreadIds);
    if (error) {
      console.error("markAllAsRead failed:", error);
    }
  };

  const handleNotificationClick = (item: TopNotificationItem) => {
    void markAsRead(item.id);
    setShowNotificationPanel(false);
    if (item.type === "join_pending") {
      window.location.hash = `#/group/${item.groupId}?tab=members`;
      return;
    }
    setLocation(item.targetPath);
  };

  const handleOpenNotifications = async () => {
    const nextOpen = !showNotificationPanel;
    setShowNotificationPanel(nextOpen);
    if (nextOpen) {
      void markAllAsRead();
    }
    if (notificationPermission === "prompt") {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        await syncPushSubscription(true);
      }
    } else if (notificationPermission === "granted") {
      await syncPushSubscription(false);
    }
  };

  const handleNotificationSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    if (key === "pushEnabled") {
      if (!value) {
        // 토글 OFF
        pushSyncedKeyRef.current = "";
        setSubscriptionResult(null);
        const next = { ...notificationSettings, pushEnabled: false };
        setNotificationSettings(next);
        await saveNotificationSettings(user?.id, next);
        await unsubscribePushSubscription();
        return;
      }

      // 토글 ON
      if (isNativeApp()) {
        const permission = await requestNotificationPermission();
        setNotificationPermission(permission);
        if (permission === "granted") {
          const next = { ...notificationSettings, pushEnabled: true };
          setNotificationSettings(next);
          await saveNotificationSettings(user?.id, next);
          await syncPushSubscription(true);
        } else {
          // 거부됨 — 토글 다시 OFF
          const reverted = { ...notificationSettings, pushEnabled: false };
          setNotificationSettings(reverted);
          await saveNotificationSettings(user?.id, reverted);
        }
        return;
      }

      // 웹 브라우저: 현재 권한 상태 먼저 확인 (requestPermission 아님)
      const currentPermission = Notification.permission as NotificationPermission;

      if (currentPermission === "denied") {
        // 이미 차단 — 팝업 안 뜸, 안내만 표시
        alert("⚠️ 브라우저 알림이 차단되어 있습니다.\n주소창 옆 🔒(자물쇠) 아이콘 → 알림 → 허용 후 다시 시도해주세요.\n(삼성인터넷: 설정 → 사이트 → 알림 → myamen.co.kr 허용)");
        const next = { ...notificationSettings, pushEnabled: false };
        setNotificationSettings(next);
        await saveNotificationSettings(user?.id, next);
        return;
      }

      if (currentPermission === "granted") {
        // 이미 허용 — 바로 구독
        const next = { ...notificationSettings, pushEnabled: true };
        skipNextPushSyncRef.current = true; // useEffect 중복 호출 방지
        setNotificationSettings(next);
        await saveNotificationSettings(user?.id, next);
        const result = await syncPushSubscription(true);
        if (result === "ok" || result === "cached") {
          setSubscriptionResult("ok");
        } else {
          // 실패 시 토글 다시 OFF
          setSubscriptionResult("error");
          const reverted = { ...notificationSettings, pushEnabled: false };
          skipNextPushSyncRef.current = true;
          setNotificationSettings(reverted);
          void saveNotificationSettings(user?.id, reverted);
        }
        return;
      }

      // "default" (처음) — 팝업 요청 (유저 제스처 직후 호출)
      const granted = await requestNotificationPermission();
      setNotificationPermission(granted);
      if (granted === "granted") {
        const next = { ...notificationSettings, pushEnabled: true };
        skipNextPushSyncRef.current = true; // useEffect 중복 호출 방지
        setNotificationSettings(next);
        await saveNotificationSettings(user?.id, next);
        const result = await syncPushSubscription(true);
        if (result === "ok" || result === "cached") {
          setSubscriptionResult("ok");
        } else {
          // 실패 시 토글 다시 OFF
          setSubscriptionResult("error");
          const reverted = { ...notificationSettings, pushEnabled: false };
          skipNextPushSyncRef.current = true;
          setNotificationSettings(reverted);
          void saveNotificationSettings(user?.id, reverted);
        }
      } else {
        // 거부됨 — toggle 다시 OFF
        const next = { ...notificationSettings, pushEnabled: false };
        setNotificationSettings(next);
        await saveNotificationSettings(user?.id, next);
        setNotificationPermission("denied");
      }
      return;
    }

    // pushEnabled 외 다른 설정 키
    const next = { ...notificationSettings, [key]: value };
    setNotificationSettings(next);
    const saved = await saveNotificationSettings(user?.id, next);
    if (!saved) {
      console.warn("notification settings save fallback: local only");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setLogoTextIndex((prev) => (prev + 1) % logoTexts.length);
    }, 10000); // <-- 이 숫자(ms 단위)를 수정하시면 됩니다. (1000 = 1초)
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div
        className="fixed left-0 right-0 top-0 z-[150] border-b bg-white shadow-sm"
        style={{ paddingTop: "var(--safe-top-inset)" }}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-1">
          <button onClick={() => setIsMenuOpen(true)} className="-ml-2 rounded-full p-2 transition-colors hover:bg-zinc-100">
            <Menu className={`h-6 w-6 ${notificationSettings.pushEnabled ? "text-[#4A6741]" : "text-zinc-700"}`} />
          </button>

          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-[#4A6741] p-0" /* p-0으로 기본 패딩 제거 */
            aria-label="홈으로 이동"
          >
            <img src="/favicon.png" alt="logo" className="w-6 h-6 object-contain" />
            <div className="relative h-[18px] w-[95px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={logoTexts[logoTextIndex]}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute text-[18px] font-black tracking-tighter leading-none whitespace-nowrap"
                >
                  {logoTexts[logoTextIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          </button>

	          </div>
	
	          <div className="flex items-center gap-1">
	            {/*
	            FileSearch(성경 검색) 버튼/기능 비활성화
	            <Link href="/search">
	              <button className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100" aria-label="성경 검색">
	                <FileSearch className="h-5 w-5" />
	              </button>
	            </Link>
	            */}
	            <button
	              onClick={() => setShowFontSizeSlider(!showFontSizeSlider)}
	              className={`rounded-full p-2 transition-colors ${showFontSizeSlider ? "bg-green-100 text-[#4A6741]" : "text-zinc-600 hover:bg-zinc-100"}`}
	            >
              <Type className="h-5 w-5" />
            </button>
            <button
              onClick={handleOpenNotifications}
              className={`relative rounded-full p-2 transition-colors ${showNotificationPanel ? "bg-green-100 text-[#4A6741]" : "text-zinc-600 hover:bg-zinc-100"}`}
              aria-label="알림"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {showFontSizeSlider && <div className="fixed inset-0 z-[155]" onClick={() => setShowFontSizeSlider(false)} />}

        {showFontSizeSlider && (
          <div
            className="animate-in slide-in-from-top-2 absolute right-4 z-[160] w-60 rounded-2xl border border-zinc-100 bg-white p-5 shadow-2xl duration-200 fade-in"
            style={{ top: "calc(64px + var(--safe-top-inset))" }}
          >
            <div className="relative px-1 pb-2 pt-7">
              <div className="absolute left-0 right-0 top-0 flex justify-between px-1">
                {[14, 16, 18, 20, 22, 24].map((step) => (
                  <span key={step} className={`w-4 text-center text-[10px] font-bold transition-colors ${fontSize === step ? "text-[#4A6741]" : "text-zinc-300"}`}>
                    {step}
                  </span>
                ))}
              </div>

              <div className="relative flex h-6 items-center">
                <div className="absolute left-0 right-0 flex justify-between px-[6px]">
                  {[14, 16, 18, 20, 22, 24].map((step) => (
                    <div key={step} className={`h-1 w-1 rounded-full transition-all ${fontSize === step ? "scale-[1.8] bg-[#4A6741]" : "bg-zinc-200"}`} />
                  ))}
                </div>
                <input type="range" min="14" max="24" step="2" value={fontSize} onChange={handleFontSizeChange} className="z-10 h-1 w-full cursor-pointer appearance-none bg-transparent accent-[#4A6741]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {showNotificationPanel && <div className="fixed inset-0 z-[161]" onClick={() => setShowNotificationPanel(false)} />}
	      {showNotificationPanel && (
	        <div
	          className="fixed right-4 z-[162] w-[330px] max-h-[65vh] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
	          style={{ top: "calc(64px + var(--safe-top-inset))" }}
	        >
	          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
	            <div className="flex items-center gap-2">
	              <h4 className="text-sm font-bold text-zinc-900">알림</h4>
	              <button
	                type="button"
	                onClick={() => {
	                  setShowNotificationSettings(true);
	                  setShowNotificationPanel(false);
	                }}
	                className="inline-flex items-center justify-center rounded-lg bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
	                aria-label="알림 설정"
	              >
	                <Settings size={13} />
	              </button>
	              <button
	                type="button"
	                onClick={() => {
	                  setShowNotificationHistory(true);
	                  setShowNotificationPanel(false);
	                }}
	                className="inline-flex items-center gap-1 rounded-lg bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
	              >
	                알림내역
	              </button>
	            </div>
	            <button onClick={() => void markAllAsRead()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
	              <CheckCheck size={13} />
	              모두 읽음
	            </button>
	          </div>
          <div className="max-h-[56vh] overflow-y-auto">
            {notifications.filter((item) => !item.isRead).length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-500 text-center">새 알림이 없습니다.</div>
            ) : (
              notifications.filter((item) => !item.isRead).map((item) => {
                const isUnread = true;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`w-full border-b border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50 ${isUnread ? "bg-emerald-50/40" : "bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-zinc-900 line-clamp-1">{item.title}</p>
                      {isUnread && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                    </div>
                    <p className="mt-1 text-xs text-zinc-600 line-clamp-2">{item.message}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">{new Date(item.createdAt).toLocaleString("ko-KR")}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 알림내역 팝업 */}
      <AnimatePresence>
        {showNotificationHistory && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              onClick={() => setShowNotificationHistory(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
              style={{ maxHeight: "75vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <h4 className="text-sm font-bold text-zinc-900">알림 내역</h4>
                <button onClick={() => setShowNotificationHistory(false)} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "calc(75vh - 52px)" }}>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-zinc-500 text-center">알림 내역이 없습니다.</div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setShowNotificationHistory(false);
                        handleNotificationClick(item);
                      }}
                      className={`w-full border-b border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50 ${!item.isRead ? "bg-emerald-50/40" : "bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-zinc-900 line-clamp-1">{item.title}</p>
                        {!item.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                      </div>
                      <p className="mt-1 text-xs text-zinc-600 line-clamp-2">{item.message}</p>
                      <p className="mt-1 text-[11px] text-zinc-400">{new Date(item.createdAt).toLocaleString("ko-KR")}</p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotificationSettings && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              onClick={() => setShowNotificationSettings(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-[420px] rounded-[28px] bg-white p-7 shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold text-zinc-900">알림 설정</h4>
                  {isNativeApp() && (
                    <p className="mt-1 text-[15px] text-zinc-500">앱 푸시와 앱 내 알림을 관리합니다.</p>
                  )}
                </div>
                <button onClick={() => { setShowNotificationSettings(false); setSubscriptionResult(null); }} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 차단됨일 때만 경고 박스 */}
              {notificationPermission === "denied" && (
                <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5 space-y-1">
                  <p className="text-[14px] font-bold text-amber-800">📵 알림이 막혀 있어요</p>
                  <p className="text-[13px] text-amber-700 leading-relaxed">
                    폰이 알림을 차단하고 있어요. 딱 한 번만 설정하면 돼요.<br />
                    주소창 왼쪽 🔒 아이콘 → <span className="font-bold">알림 → 허용</span>으로 바꿔주세요.<br />
                    <span className="text-[12px] text-amber-600">(삼성인터넷: 설정 → 사이트 → 알림 → myamen.co.kr 허용)</span>
                  </p>
                </div>
              )}

              <div className="space-y-3.5">
                <NotificationToggle
                  label="푸시 알림"
                  description={
                    notificationSettings.pushEnabled
                      ? "알림이 켜져 있어요. 새 소식을 바로 알려드릴게요."
                      : notificationPermission === "denied"
                        ? "알림을 받으려면 위 안내대로 설정해 주세요."
                        : notificationPermission === "default"
                          ? "켜면 브라우저 허용 창이 나타납니다. 허용을 눌러주세요."
                          : "지금 알림을 받지 않고 있어요. 켜면 바로 시작됩니다."
                  }
                  checked={notificationSettings.pushEnabled}
                  disabled={isPushSyncing || notificationPermission === "denied"}
                  onChange={(value) => void handleNotificationSettingChange("pushEnabled", value)}
                />
              </div>
              {!isNativeApp() && (
                <p className="mt-3 text-[11px] text-zinc-400">
                  ※ Safari(iOS)는 홈 화면에 추가(PWA) 후 가능. 시크릿 모드는 차단됩니다.
                </p>
              )}

              {isPushSyncing && (
                <div className="mt-4 flex items-center gap-2 text-[13px] text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>알림 등록 중...</span>
                </div>
              )}
              {!isPushSyncing && subscriptionResult === "ok" && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-[13px] text-green-700 font-medium">
                  <span>✅</span>
                  <span>알림 설정이 완료됐습니다.</span>
                </div>
              )}
              {!isPushSyncing && subscriptionResult === "error" && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700 font-medium">
                  <span>⚠️</span>
                  <span>알림 등록에 실패했습니다. 다시 시도해 주세요.</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isMenuOpen && <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />}

      <div className={`fixed left-0 top-0 z-[210] h-full w-[280px] transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col overflow-y-auto p-6" style={{ paddingTop: "calc(24px + var(--safe-top-inset))" }}>
	          <div className="mb-8 pt-2">
	            <div className="mb-4 flex items-start justify-between">
	              <ProfileAvatar url={user?.avatar_url ?? null} ensureHttps={ensureHttpsUrl} />
              <button onClick={() => setIsMenuOpen(false)} className="rounded-full p-1 transition-colors hover:bg-zinc-50">
                <X className="h-6 w-6 text-zinc-300" />
	              </button>
	            </div>
	
	            <div className="space-y-0.5">
	              <div className="flex items-center gap-2">
	                <p className="font-bold text-zinc-900" style={{ fontSize: `${fontSize}px` }}>
	                  {user?.nickname || "비로그인 상태"}
	                </p>
	                {isAuthenticated && (
	                  <button
	                    type="button"
	                    onClick={() => {
	                      setIsProfileModalOpen(true);
	                      setIsMenuOpen(false);
	                    }}
	                    className="shrink-0 rounded-lg border border-zinc-200/60 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-100"
	                  >
	                    프로필 수정
	                  </button>
	                )}
	              </div>
	              {user?.username && (
	                <p className="text-zinc-500" style={{ fontSize: `${Math.max(10, fontSize - 3)}px` }}>
	                  아이디 : {user.username}
	                </p>
	              )}
              {user?.church && (
                <p className="text-zinc-500" style={{ fontSize: `${fontSize - 2}px` }}>
                  {user.church}
                </p>
              )}
              {user?.rank && (
                <p className="text-zinc-500" style={{ fontSize: `${fontSize - 2}px` }}>
                  {user.rank}
                </p>
              )}
            </div>


          </div>

	          <nav className="flex flex-col gap-1">
	            <Link href="/verse-cards" onClick={() => setIsMenuOpen(false)}>
	              <SidebarItem icon={<Image className="h-5 w-5" />} label="말씀카드 보관함" active={hasVerseCards} />
	            </Link>
	            <Link href="/my-prayer-box" onClick={() => setIsMenuOpen(false)}>
	              <SidebarItem icon={<HandHeart className="h-5 w-5" />} label="내 기도제목함" active={hasPrayerBox} />
	            </Link>
	            <Link href="/favorites" onClick={() => setIsMenuOpen(false)}>
	              <SidebarItem icon={<Bookmark className="h-5 w-5" />} label="즐겨찾기 말씀" active={hasFavorites} />
	            </Link>
	
	            {!isAuthenticated && (
	              <div className="mt-2 flex flex-col gap-2">
	                <button onClick={handleLoginClick} className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-600 transition-colors hover:bg-zinc-50">
	                  <div className="text-zinc-400 transition-colors group-hover:text-[#4A6741]">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-[14px] font-semibold transition-colors group-hover:text-zinc-900">로그인</span>
                </button>
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                  <button className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-600 transition-colors hover:bg-zinc-50">
                    <div className="text-zinc-400 transition-colors group-hover:text-[#4A6741]">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="text-[14px] font-semibold transition-colors group-hover:text-zinc-900">회원가입</span>
                  </button>
                </Link>


              </div>
            )}

            {isAuthenticated && (
              <button
                onClick={() => { setShowNotificationSettings(true); setIsMenuOpen(false); }}
                className="group mt-2 flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <div className={`transition-colors ${notificationSettings.pushEnabled ? "text-[#4A6741]" : "text-zinc-400 group-hover:text-zinc-600"}`}>
                  <Bell className="h-5 w-5" />
                </div>
                <span className={`text-[14px] font-semibold transition-colors ${notificationSettings.pushEnabled ? "text-[#4A6741]" : "group-hover:text-zinc-800"}`}>알림 설정</span>
              </button>
            )}

            {isAuthenticated && (
              <button onClick={handleLogout} className="group mt-2 flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-red-600 transition-colors hover:bg-red-50">
                <div className="text-red-400 transition-colors group-hover:text-red-600">
                  <LogOut className="h-5 w-5" />
                </div>
                <span className="text-[14px] font-semibold transition-colors group-hover:text-red-700">로그아웃</span>
              </button>
            )}
          </nav>

          <div className="mt-auto pt-4 border-t border-zinc-100 space-y-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setIsMenuOpen(false); setShowSupportModal(true); }}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-zinc-400 transition-colors hover:text-[#4A6741]"
                style={{ fontSize: `${fontSize - 2}px` }}
              >
                <HeadphonesIcon className="h-3.5 w-3.5" />
                <span>고객센터</span>
              </button>
              {isAuthenticated && (
                <button
                  onClick={async () => {
                    setIsMenuOpen(false);
                    // 소유한 그룹 수 조회
                    if (user?.id) {
                      const { count } = await supabase
                        .from("groups")
                        .select("id", { count: "exact", head: true })
                        .eq("owner_id", user.id);
                      setOwnedGroupCount(count ?? 0);
                    }
                    setShowDeleteConfirm(true);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-zinc-400 transition-colors hover:text-rose-500"
                  style={{ fontSize: `${fontSize - 2}px` }}
                >
                  <UserX className="h-3.5 w-3.5" />
                  <span>회원탈퇴</span>
                </button>
              )}
            </div>
            <div className="flex gap-3 mb-1">
              <Link href="/terms/service" onClick={() => setIsMenuOpen(false)}>
                <span className="text-[12px] text-zinc-400 hover:text-zinc-600 cursor-pointer">이용약관</span>
              </Link>
              <span className="text-[12px] text-zinc-300">|</span>
              <Link href="/terms/privacy" onClick={() => setIsMenuOpen(false)}>
                <span className="text-[12px] text-zinc-400 hover:text-zinc-600 cursor-pointer">개인정보처리방침</span>
              </Link>
            </div>
            <p className="text-[11px] text-zinc-300 mb-0.5">성경 본문: 개역한글</p>
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] tracking-tight text-zinc-300">© 2026 아워마인. ALL RIGHTS RESERVED</p>
          </div>
        </div>
      </div>

      <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* 고객센터 팝업 */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupportModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[300px] rounded-[28px] bg-white p-7 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-5">
                <HeadphonesIcon className="h-5 w-5 text-[#4A6741]" />
                <h4 className="font-bold text-zinc-900 text-base">고객센터</h4>
              </div>
              <div className="space-y-3">
                <a
                  href="mailto:ourmine1003@naver.com"
                  className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3.5 hover:bg-[#4A6741]/10 transition-colors"
                >
                  <Mail className="h-4 w-4 text-[#4A6741] shrink-0" />
                  <div>
                    <p className="text-[11px] text-zinc-400 mb-0.5">이메일</p>
                    <p className="text-sm font-semibold text-zinc-800">ourmine1003@naver.com</p>
                  </div>
                </a>
                <a
                  href="tel:07045131894"
                  className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3.5 hover:bg-[#4A6741]/10 transition-colors"
                >
                  <Phone className="h-4 w-4 text-[#4A6741] shrink-0" />
                  <div>
                    <p className="text-[11px] text-zinc-400 mb-0.5">전화</p>
                    <p className="text-sm font-semibold text-zinc-800">070-4513-1894</p>
                  </div>
                </a>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="mt-5 w-full rounded-xl bg-zinc-100 py-3 font-bold text-zinc-600 text-sm active:scale-95 transition-transform"
              >
                닫기
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 회원탈퇴 완료 토스트 - 화면 정중앙, 빨간색, 스르르 fade out */}
      <AnimatePresence>
        {showDeleteToast && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.35 }}
              className="rounded-full bg-red-500 px-10 py-4 text-base font-bold text-white shadow-2xl"
            >
              탈퇴처리되었습니다
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[280px] rounded-[28px] bg-white p-8 text-center shadow-2xl"
            >
              <h4 className="mb-2 font-bold text-zinc-900" style={{ fontSize: `${fontSize}px` }}>
                로그아웃 하시겠습니까?
              </h4>
              <p className="mb-6 text-zinc-500" style={{ fontSize: `${fontSize * 0.85}px` }}>
                현재 세션이 종료됩니다.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl bg-zinc-100 py-3 font-bold text-zinc-600 transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white shadow-lg shadow-red-200 transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  로그아웃
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 회원탈퇴 확인 모달 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[300px] rounded-[28px] bg-white p-8 text-center shadow-2xl"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                <UserX className="h-7 w-7 text-rose-500" />
              </div>
              <h4 className="mb-2 font-bold text-zinc-900" style={{ fontSize: `${fontSize}px` }}>
                회원탈퇴
              </h4>
              <p className="mb-1 text-zinc-500" style={{ fontSize: `${fontSize * 0.85}px` }}>
                탈퇴하면 모든 데이터가
              </p>
              <p className={`font-semibold text-rose-500 ${ownedGroupCount > 0 ? 'mb-2' : 'mb-6'}`} style={{ fontSize: `${fontSize * 0.85}px` }}>
                영구적으로 삭제됩니다.
              </p>
              {ownedGroupCount > 0 && (
                <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-left">
                  <p className="font-bold text-rose-600 text-[13px]">⚠️ 소유한 모임 {ownedGroupCount}개 포함</p>
                  <p className="text-rose-500 text-[12px] mt-0.5">탈퇴 시 내가 만든 모임과 모임의 모든 게시물, 기도 제목 등이 함께 삭제됩니다.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl bg-zinc-100 py-3 font-bold text-zinc-600 transition-active active:scale-95 disabled:opacity-50"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl bg-rose-500 py-3 font-bold text-white shadow-lg shadow-rose-200 transition-active active:scale-95 disabled:opacity-70"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  {isDeleting ? "처리 중..." : "탈퇴하기"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  );
}

function SidebarItem({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-600 transition-colors hover:bg-zinc-50">
      <div className={`transition-colors group-hover:text-[#4A6741] ${active ? "text-[#4A6741]" : "text-zinc-400"}`}>{icon}</div>
      <span className={`text-[14px] font-semibold transition-colors group-hover:text-zinc-900 ${active ? "text-[#4A6741]" : ""}`}>{label}</span>
    </button>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border border-zinc-100 px-4 py-3 ${disabled ? "bg-zinc-50/70 opacity-70" : "bg-white"}`}>
      <div>
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        aria-checked={checked}
        className={`mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors ${
          checked ? "justify-end bg-[#4A6741]" : "justify-start bg-zinc-200"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}
