import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  X,
  User,
  Type,
  LogOut,
  UserX,
  Bell,
  FileSearch,
  CheckCheck,
  ChevronRight,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { ProfileEditModal } from "./ProfileEditModal";
import { LoginModal } from "./LoginModal";
import { supabase } from "../lib/supabase";
import { deleteAccount as deleteAccountRequest } from "../lib/auth-client";

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

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function SidebarItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-600 transition-colors hover:bg-zinc-50"
    >
      <div className="text-zinc-400 transition-colors group-hover:text-[#4A6741]">{icon}</div>
      <span className="text-[14px] font-semibold transition-colors group-hover:text-zinc-900">{label}</span>
      <ChevronRight className="ml-auto h-4 w-4 text-zinc-300" />
    </button>
  );
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
  const [notifications, setNotifications] = useState<TopNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [logoTextIndex, setLogoTextIndex] = useState(0);
  const logoTexts = ["myAmen", "마이아멘"];

  const { fontSize, setFontSize } = useDisplaySettings();
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const pushedKey = useMemo(() => `topbar_pushed_notifications:${user?.id || "guest"}`, [user?.id]);
  const pushedIdsRef = useRef<Set<string>>(new Set());
  const pushSyncedKeyRef = useRef<string>("");
  const vapidPublicKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();

  const handleLoginClick = () => {
    setIsMenuOpen(false);
    setShowLoginModal(true);
  };

  const confirmLogout = () => {
    logout();
    setLocation("/");
    setIsMenuOpen(false);
    setShowLogoutConfirm(false);
  };

  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAccountRequest();
      setShowDeleteConfirm(false);
      setIsMenuOpen(false);

      setShowDeleteToast(true);
      setTimeout(() => {
        setShowDeleteToast(false);
        setTimeout(() => {
          window.location.replace(window.location.origin + "/#/");
        }, 500);
      }, 1400);
    } catch (error) {
      console.error("account delete failed:", error);
      alert(error instanceof Error ? error.message : "회원탈퇴에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFontSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFontSize(Number(event.target.value));
  };

  const showSystemNotification = async (item: TopNotificationItem) => {
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

  const syncPushSubscription = async (force = false) => {
    if (!isAuthenticated || !user?.id || !vapidPublicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    const cacheKey = `${user.id}:${Notification.permission}:${vapidPublicKey}`;
    if (!force && pushSyncedKeyRef.current === cacheKey) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) return;
      pushSyncedKeyRef.current = cacheKey;
    } catch (error) {
      console.error("push subscription sync failed:", error);
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch("/api/notifications?limit=80");
      if (!response.ok) {
        console.error("notification fetch failed:", await response.text());
        return;
      }

      const rows = (await response.json()) as Array<any>;
      const allItems: TopNotificationItem[] = rows.map((row) => {
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

      setNotifications(allItems);
      const unread = allItems.filter((item) => !item.isRead);
      setUnreadCount(unread.length);

      if (Notification.permission === "granted") {
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
    if (!isAuthenticated || !user?.id) {
      pushSyncedKeyRef.current = "";
      return;
    }
    void syncPushSubscription(false);
  }, [isAuthenticated, user?.id, vapidPublicKey]);

  useEffect(() => {
    void fetchNotifications();
    if (!isAuthenticated || !user?.id) return;

    const timer = window.setInterval(() => {
      void fetchNotifications();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setOwnedGroupCount(0);
      return;
    }

    void supabase
      .from("groups")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .then((result: { count: number | null }) => {
        setOwnedGroupCount(Number(result.count || 0));
      })
      .catch(() => setOwnedGroupCount(0));
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogoTextIndex((prev) => (prev + 1) % logoTexts.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    const response = await fetch("/api/notifications/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      console.error("markAsRead failed:", await response.text());
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    const response = await fetch("/api/notifications/read-all", {
      method: "POST",
    });
    if (!response.ok) {
      console.error("markAllAsRead failed:", await response.text());
    }
  };

  const handleNotificationClick = (item: TopNotificationItem) => {
    void markAsRead(item.id);
    setShowNotificationPanel(false);
    if (item.type === "join_pending" && item.groupId) {
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
    if (!("Notification" in window)) {
      return;
    }

    const permissionBefore = Notification.permission;
    if (permissionBefore === "default") {
      try {
        await Notification.requestPermission();
        if (Notification.permission === "granted") {
          await syncPushSubscription(true);
        }
      } catch {
        // ignore
      }
    } else if (permissionBefore === "granted") {
      await syncPushSubscription(false);
    }
  };

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[150] flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMenuOpen(true)} className="-ml-2 rounded-full p-2 transition-colors hover:bg-zinc-100">
            <Menu className="h-6 w-6 text-zinc-700" />
          </button>

          <button onClick={() => setLocation("/")} className="flex items-center gap-1.5 p-0 text-[#4A6741]" aria-label="홈으로 이동">
            <img src="/favicon.png" alt="logo" className="h-6 w-6 object-contain" />
            <div className="relative flex h-[18px] w-[95px] items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={logoTexts[logoTextIndex]}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute whitespace-nowrap text-[18px] font-black leading-none tracking-tighter"
                >
                  {logoTexts[logoTextIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Link href="/search">
            <button className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100" aria-label="검색">
              <FileSearch className="h-5 w-5" />
            </button>
          </Link>

          <button
            onClick={() => setShowFontSizeSlider((prev) => !prev)}
            className={`rounded-full p-2 transition-colors ${showFontSizeSlider ? "bg-green-100 text-[#4A6741]" : "text-zinc-600 hover:bg-zinc-100"}`}
            aria-label="글자 크기"
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
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showFontSizeSlider && (
        <>
          <div className="fixed inset-0 z-[155]" onClick={() => setShowFontSizeSlider(false)} />
          <div className="fixed right-4 top-[68px] z-[160] w-[220px] rounded-2xl border bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-700">글자 크기</span>
              <span className="text-sm font-bold text-[#4A6741]">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={28}
              step={1}
              value={fontSize}
              onChange={handleFontSizeChange}
              className="w-full accent-[#4A6741]"
            />
          </div>
        </>
      )}

      {showNotificationPanel && (
        <>
          <div className="fixed inset-0 z-[155]" onClick={() => setShowNotificationPanel(false)} />
          <div className="fixed right-4 top-[68px] z-[160] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-black text-zinc-900">알림</p>
                <p className="text-xs text-zinc-400">{unreadCount}개의 읽지 않은 알림</p>
              </div>
              <button onClick={() => void markAllAsRead()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
                <CheckCheck className="h-4 w-4" />
                모두 읽음
              </button>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm font-medium text-zinc-400">
                  새로운 알림이 없습니다.
                </div>
              )}
              {notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${item.isRead ? "border-zinc-100 bg-white" : "border-green-100 bg-green-50/70"}`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-zinc-900">{item.title}</p>
                    {!item.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-[#4A6741]" />}
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-600">{item.message}</p>
                  <p className="mt-2 text-[11px] text-zinc-400">{new Date(item.createdAt).toLocaleString()}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]"
              onClick={() => setIsMenuOpen(false)}
            />

            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              className="fixed left-0 top-0 z-[210] h-full w-[280px] bg-white shadow-2xl"
            >
              <div className="flex h-full flex-col overflow-y-auto p-6">
                <div className="mb-8 pt-2">
                  <div className="mb-4 flex items-start justify-between">
                    {user?.avatar_url ? (
                      <img src={ensureHttpsUrl(user.avatar_url)} alt="프로필" className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
                        <User className="h-8 w-8 text-zinc-400" />
                      </div>
                    )}
                    <button onClick={() => setIsMenuOpen(false)} className="rounded-full p-1 transition-colors hover:bg-zinc-50">
                      <X className="h-6 w-6 text-zinc-300" />
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    <p className="font-bold text-zinc-900" style={{ fontSize: `${fontSize}px` }}>
                      {user?.nickname || "로그인이 필요합니다"}
                    </p>
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
                  <Link href="/archive" onClick={() => setIsMenuOpen(false)}>
                    <SidebarItem icon={<Lock className="h-5 w-5" />} label="내 기록" />
                  </Link>

                  {isAuthenticated && (
                    <SidebarItem
                      icon={<User className="h-5 w-5" />}
                      label="프로필 관리"
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                    />
                  )}

                  {isAuthenticated && (
                    <Link href="/leadership" onClick={() => setIsMenuOpen(false)}>
                      <SidebarItem
                        icon={<Lock className="h-5 w-5" />}
                        label={ownedGroupCount > 0 ? `리더십 (${ownedGroupCount})` : "리더십"}
                      />
                    </Link>
                  )}

                  {!isAuthenticated && (
                    <div className="mt-2 flex flex-col gap-2">
                      <button onClick={handleLoginClick} className="rounded-xl bg-[#4A6741] px-4 py-3 text-sm font-bold text-white">
                        로그인
                      </button>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setLocation("/register");
                        }}
                        className="rounded-xl border px-4 py-3 text-sm font-bold text-zinc-700"
                      >
                        회원가입
                      </button>
                    </div>
                  )}
                </nav>

                <div className="mt-auto space-y-2 pt-6">
                  {isAuthenticated && (
                    <>
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700"
                      >
                        <LogOut className="h-5 w-5" />
                        로그아웃
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex w-full items-center gap-3 rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600"
                      >
                        <UserX className="h-5 w-5" />
                        회원탈퇴
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/40"
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="fixed inset-x-4 top-1/2 z-[310] mx-auto w-full max-w-sm -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl"
            >
              <p className="mb-2 text-lg font-black text-zinc-900">로그아웃할까요?</p>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">현재 세션이 종료됩니다.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-2xl border px-4 py-3 font-semibold text-zinc-700">
                  취소
                </button>
                <button onClick={confirmLogout} className="flex-1 rounded-2xl bg-[#4A6741] px-4 py-3 font-semibold text-white">
                  로그아웃
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/40"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="fixed inset-x-4 top-1/2 z-[310] mx-auto w-full max-w-sm -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl"
            >
              <p className="mb-2 text-lg font-black text-zinc-900">계정을 삭제할까요?</p>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-2xl border px-4 py-3 font-semibold text-zinc-700">
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 font-semibold text-white"
                >
                  {isDeleting ? "삭제 중..." : "계정 삭제"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 left-1/2 z-[320] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl"
          >
            계정이 삭제되었습니다.
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  );
}
