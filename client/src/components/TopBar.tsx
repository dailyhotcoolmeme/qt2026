import React, { useEffect, useMemo, useRef, useState } from "react";
import { Menu, X, User, Type, ChevronRight, Lock, BookType, LogOut, Bell, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { ProfileEditModal } from "./ProfileEditModal";
import { LoginModal } from "./LoginModal";
import { Link, useLocation } from "wouter";
import { supabase } from "../lib/supabase";

type TopNotificationItem = {
  id: string;
  type: "join_pending" | "join_approved" | "join_rejected";
  title: string;
  message: string;
  createdAt: string;
  groupId: string;
  targetPath: string;
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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState<TopNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { fontSize, setFontSize } = useDisplaySettings();
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const seenKey = useMemo(() => `topbar_seen_notifications:${user?.id || "guest"}`, [user?.id]);
  const pushedKey = useMemo(() => `topbar_pushed_notifications:${user?.id || "guest"}`, [user?.id]);
  const pushedIdsRef = useRef<Set<string>>(new Set());
  const pushSyncedKeyRef = useRef<string>("");
  const vapidPublicKey = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();

  const handleLogout = () => setShowLogoutConfirm(true);

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

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFontSize(Number(e.target.value));
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

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
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

      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
      const groupNameMap = new Map<string, string>();
      const managerGroupIds = new Set<string>();

      const [{ data: ownedGroups }, { data: leaderRows }] = await Promise.all([
        supabase.from("groups").select("id,name").eq("owner_id", user.id),
        supabase.from("group_members").select("group_id, role, groups(id,name)").eq("user_id", user.id).eq("role", "leader"),
      ]);

      (ownedGroups ?? []).forEach((g: any) => {
        managerGroupIds.add(String(g.id));
        groupNameMap.set(String(g.id), String(g.name || "모임"));
      });
      (leaderRows ?? []).forEach((row: any) => {
        const gid = String(row.group_id);
        managerGroupIds.add(gid);
        const linked = row.groups as any;
        if (linked?.name) groupNameMap.set(gid, String(linked.name));
      });

      const allItems: TopNotificationItem[] = [];

      if (managerGroupIds.size > 0) {
        const groupIds = Array.from(managerGroupIds);
        const { data: pendingRows } = await supabase
          .from("group_join_requests")
          .select("id,group_id,user_id,message,created_at")
          .in("group_id", groupIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(30);

        const applicantIds = Array.from(new Set((pendingRows ?? []).map((row: any) => String(row.user_id))));
        const { data: applicants } = applicantIds.length
          ? await supabase.from("profiles").select("id,username,nickname").in("id", applicantIds)
          : { data: [] as any[] };
        const applicantMap = new Map<string, string>();
        (applicants ?? []).forEach((a: any) => {
          applicantMap.set(String(a.id), String(a.nickname || a.username || "신청자"));
        });

        (pendingRows ?? []).forEach((row: any) => {
          const gid = String(row.group_id);
          const applicant = applicantMap.get(String(row.user_id)) || "신청자";
          allItems.push({
            id: `pending-${row.id}`,
            type: "join_pending",
            title: `${groupNameMap.get(gid) || "모임"} 가입 신청`,
            message: `${applicant}님의 가입 요청이 대기 중입니다.`,
            createdAt: String(row.created_at || new Date().toISOString()),
            groupId: gid,
            targetPath: `/group/${gid}?tab=members`,
          });
        });
      }

      const { data: decisionRows } = await supabase
        .from("group_join_requests")
        .select("id,group_id,status,resolved_at,created_at")
        .eq("user_id", user.id)
        .in("status", ["approved", "rejected"])
        .not("resolved_at", "is", null)
        .order("resolved_at", { ascending: false })
        .limit(30);

      const decisionGroupIds = Array.from(new Set((decisionRows ?? []).map((row: any) => String(row.group_id))));
      if (decisionGroupIds.length > 0) {
        const { data: decisionGroups } = await supabase.from("groups").select("id,name").in("id", decisionGroupIds);
        (decisionGroups ?? []).forEach((g: any) => groupNameMap.set(String(g.id), String(g.name || "모임")));
      }

      (decisionRows ?? []).forEach((row: any) => {
        const gid = String(row.group_id);
        const isApproved = row.status === "approved";
        allItems.push({
          id: `decision-${row.id}-${row.status}`,
          type: isApproved ? "join_approved" : "join_rejected",
          title: `${groupNameMap.get(gid) || "모임"} 가입 ${isApproved ? "승인" : "거절"}`,
          message: isApproved ? "가입이 승인되었습니다. 탭하여 모임으로 이동합니다." : "가입 요청이 거절되었습니다.",
          createdAt: String(row.resolved_at || row.created_at || new Date().toISOString()),
          groupId: gid,
          targetPath: isApproved ? `/group/${gid}` : "/community?list=1",
        });
      });

      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(allItems);

      const seen = readStringSet(seenKey);
      const unread = allItems.filter((item) => !seen.has(item.id));
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
    }, 45000);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, user?.id]);

  const markAsRead = (id: string) => {
    const seen = readStringSet(seenKey);
    seen.add(id);
    writeStringSet(seenKey, seen);
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    const seen = readStringSet(seenKey);
    notifications.forEach((item) => seen.add(item.id));
    writeStringSet(seenKey, seen);
    setUnreadCount(0);
  };

  const handleNotificationClick = (item: TopNotificationItem) => {
    markAsRead(item.id);
    setShowNotificationPanel(false);
    setLocation(item.targetPath);
  };

  const handleOpenNotifications = async () => {
    setShowNotificationPanel((prev) => !prev);
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
        if (Notification.permission === "granted") {
          await syncPushSubscription(true);
        }
      } catch {
        // ignore
      }
    } else if (Notification.permission === "granted") {
      await syncPushSubscription(false);
    }
  };

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[150] flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMenuOpen(true)} className="-ml-2 rounded-full p-2 transition-colors hover:bg-zinc-100">
            <Menu className="h-6 w-6 text-zinc-700" />
          </button>

          <span className="relative inline-block text-xl font-bold tracking-tighter text-[#4A6741]">
            <span className="absolute -left-4 -top-2.5 text-[14px] font-bold">my</span>
            <span>Amen</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Link href="/search">
            <button className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100" aria-label="성경 검색">
              <BookType className="h-5 w-5" />
            </button>
          </Link>
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

        {showFontSizeSlider && <div className="fixed inset-0 z-[155]" onClick={() => setShowFontSizeSlider(false)} />}

        {showFontSizeSlider && (
          <div className="animate-in slide-in-from-top-2 absolute right-4 top-16 z-[160] w-60 rounded-2xl border border-zinc-100 bg-white p-5 shadow-2xl duration-200 fade-in">
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
        <div className="fixed right-4 top-16 z-[162] w-[330px] max-h-[65vh] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5">
            <h4 className="text-sm font-bold text-zinc-900">알림</h4>
            <button onClick={markAllAsRead} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
              <CheckCheck size={13} />
              모두 읽음
            </button>
          </div>
          <div className="max-h-[56vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-500 text-center">새 알림이 없습니다.</div>
            ) : (
              notifications.map((item) => {
                const isUnread = !readStringSet(seenKey).has(item.id);
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

      {isMenuOpen && <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />}

      <div className={`fixed left-0 top-0 z-[210] h-full w-[280px] transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
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
                {user?.nickname || "닉네임 없음"}
              </p>
              <p className="text-zinc-500" style={{ fontSize: `${fontSize - 2}px` }}>
                {user?.username || "아이디 없음"}
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

            {user && (
              <button
                onClick={() => {
                  setIsProfileModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="mt-3 flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-600"
                style={{ fontSize: `${fontSize - 4}px` }}
              >
                프로필 관리
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-1">
            <Link href="/archive" onClick={() => setIsMenuOpen(false)}>
              <SidebarItem icon={<Lock className="h-5 w-5" />} label="내 기록함" />
            </Link>

            {!isAuthenticated && (
              <div className="mt-2 flex flex-col gap-2">
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                  <button className="group flex w-full items-center gap-3 rounded-xl bg-green-50 p-3.5 text-left text-[#4A6741] transition-colors hover:bg-green-100">
                    <div className="text-[#4A6741] transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="text-[14px] font-semibold transition-colors">회원가입</span>
                  </button>
                </Link>

                <button onClick={handleLoginClick} className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-600 transition-colors hover:bg-zinc-50">
                  <div className="text-zinc-400 transition-colors group-hover:text-[#4A6741]">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-[14px] font-semibold transition-colors group-hover:text-zinc-900">로그인</span>
                </button>
              </div>
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

          <div className="mt-auto border-t pt-4">
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] tracking-tight text-zinc-400">© 2026 어웨이마인. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </div>

      <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

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

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  );
}

function SidebarItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-600 transition-colors hover:bg-zinc-50">
      <div className="text-zinc-400 transition-colors group-hover:text-[#4A6741]">{icon}</div>
      <span className="text-[14px] font-semibold transition-colors group-hover:text-zinc-900">{label}</span>
    </button>
  );
}
