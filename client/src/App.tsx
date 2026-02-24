import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Layout } from "./components/Layout";
import { DisplaySettingsProvider } from "./components/DisplaySettingsProvider";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import DailyWordPage from "./pages/DailyWordPage";
import QTPage from "./pages/QTPage";
import ReadingPage from "./pages/ReadingPage";
import CommunityPage from "./pages/CommunityPage";
import GroupDashboard from "./pages/GroupDashboard";
import LeadershipPage from "./pages/LeadershipPage";
import ArchivePage from "./pages/ArchivePage";
import BibleViewPage from "./pages/BibleViewPage";
import AuthPage from "./pages/AuthPage";
import FindAccountPage from "./pages/FindAccountPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/not-found";
import PrayerPage from "./pages/PrayerPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";
import { supabase } from "./lib/supabase";

const PENDING_GROUP_INVITE_KEY = "pending_group_invite";
const GROUP_INVITE_QUERY_KEY = "invite_group";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readInviteGroupIdFromUrl(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = String(searchParams.get(GROUP_INVITE_QUERY_KEY) || "").trim();
  if (UUID_REGEX.test(fromSearch)) return fromSearch;

  const hash = window.location.hash || "";
  const queryIdx = hash.indexOf("?");
  if (queryIdx >= 0) {
    const hashParams = new URLSearchParams(hash.substring(queryIdx + 1));
    const fromHash = String(hashParams.get(GROUP_INVITE_QUERY_KEY) || "").trim();
    if (UUID_REGEX.test(fromHash)) return fromHash;
  }

  return null;
}

function AppContent() {
  return (
    <WouterRouter hook={useHashLocation}>
      <AnimatePresence mode="wait">
        <Switch>
          <Route path="/terms/:type" component={TermsPage} />
          {/* AuthPage 경로 확인: /auth 로 설정됨 */}
          <Route path="/auth" component={AuthPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/find-account" component={FindAccountPage} />
          <Route path="/update-password" component={UpdatePasswordPage} />
          <Route>
            <Layout>
              <TopBar />
              <main className="flex-1 overflow-y-auto no-scrollbar">
                <Switch>
                  <Route path="/" component={DailyWordPage} />
                  <Route path="/qt" component={QTPage} />
                  <Route path="/prayer" component={PrayerPage} />
                  <Route path="/reading" component={ReadingPage} />
                  <Route path="/community" component={CommunityPage} />
                  <Route path="/group/:id" component={GroupDashboard} />
                  <Route path="/leadership" component={LeadershipPage} />
                  <Route path="/archive" component={ArchivePage} />
                  <Route path="/bible/:book/:chapter" component={BibleViewPage} />
                  <Route path="/record/:id" component={RecordDetailPage} />
                  <Route path="/search" component={SearchPage} />
                  <Route component={NotFound} />
                </Switch>
              </main>
              <BottomNav />
            </Layout>
          </Route>
        </Switch>
      </AnimatePresence>
    </WouterRouter>
  );
}

export default function App() {
  useEffect(() => {
    let inviteJoinInFlight = false;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
    }

    const persistPendingInviteFromUrl = () => {
      const inviteGroupId = readInviteGroupIdFromUrl();
      if (!inviteGroupId) return;
      try {
        localStorage.setItem(PENDING_GROUP_INVITE_KEY, inviteGroupId);
      } catch (error) {
        console.error("failed to persist invite group id:", error);
      }
    };

    const joinPendingInviteGroup = async (sessionUserId?: string | null) => {
      if (inviteJoinInFlight) return;

      let pendingGroupId = "";
      try {
        pendingGroupId = String(localStorage.getItem(PENDING_GROUP_INVITE_KEY) || "").trim();
      } catch (error) {
        console.error("failed to read pending invite:", error);
        return;
      }

      if (!pendingGroupId) return;
      if (!UUID_REGEX.test(pendingGroupId)) {
        localStorage.removeItem(PENDING_GROUP_INVITE_KEY);
        return;
      }

      let userId = sessionUserId || null;
      if (!userId) {
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData?.session?.user?.id ?? null;
      }
      if (!userId) return;

      inviteJoinInFlight = true;
      try {
        const { data, error } = await supabase.rpc("join_group_by_invite_link", {
          p_group_id: pendingGroupId,
        });

        if (error) {
          console.error("join pending invite failed:", error);
          return;
        }

        const joinedGroupId = String(data || pendingGroupId).trim();
        if (!UUID_REGEX.test(joinedGroupId)) return;

        localStorage.removeItem(PENDING_GROUP_INVITE_KEY);

        const targetPath = `/group/${joinedGroupId}`;
        const targetHash = `#${targetPath}`;
        if (!window.location.hash.startsWith(targetHash)) {
          window.location.href = `${window.location.origin}/#${targetPath}`;
        }
      } finally {
        inviteJoinInFlight = false;
      }
    };

    const fixKakaoHash = () => {
      const href = window.location.href;
      if (href.includes("/#/#")) {
        const newHref = href.replace("/#/#", "/#/");
        window.history.replaceState(null, "", newHref);
        setTimeout(() => window.location.reload(), 300);
      }
    };

    // Handle Supabase OAuth responses that return tokens in the URL hash
    const handleSupabaseHash = async () => {
      const hash = window.location.hash || "";
      const search = window.location.search || "";

      // 에러 케이스: Supabase가 에러와 함께 리다이렉트한 경우
      if (hash.includes("error") || search.includes("error=")) {
        const errorDesc = new URLSearchParams(search).get('error_description')
          || new URLSearchParams(hash.replace(/^#/, '')).get('error_description')
          || '알 수 없는 오류가 발생했습니다.';
        console.error('[OAuth Error]', decodeURIComponent(errorDesc));
        // URL 정리 후 auth 페이지로 이동
        window.history.replaceState(null, "", window.location.origin + '/');
        return;
      }

      // 성공 케이스: access_token 또는 provider_token이 있는 경우
      if (hash.includes("access_token") || hash.includes("provider_token")) {
        try {
          // Prefer SDK helpers if available
          const authAny: any = supabase.auth as any;
          if (typeof authAny.getSessionFromUrl === "function") {
            await authAny.getSessionFromUrl();
          }
        } catch (e) {
          console.error("Error handling Supabase auth hash:", e);
        }

        // Give SDK a moment to process the session before checking returnTo
        await new Promise(resolve => setTimeout(resolve, 100));

        // If a returnTo query param was preserved, use it. Otherwise try localStorage fallback.
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get("returnTo");
        if (returnTo) {
          try {
            const decoded = decodeURIComponent(returnTo);
            window.location.href = decoded;
          } catch (e) {
            console.error("Failed to decode returnTo:", e);
            const clean = window.location.origin + window.location.pathname;
            window.history.replaceState(null, "", clean);
          }
        } else {
          try {
            const stored = localStorage.getItem('qt_return');
            if (stored) {
              localStorage.removeItem('qt_return');
              localStorage.removeItem('qt_autoOpenWrite');
              window.location.href = stored;
              return;
            }
          } catch (e) {
            // ignore storage errors
          }
          // Remove fragment while preserving path and search
          const clean = window.location.origin + window.location.pathname + window.location.search;
          window.history.replaceState(null, "", clean);
        }
      }
    };

    const syncAgreements = async () => {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        // eslint-disable-next-line no-console
        console.warn('syncAgreements: getSession error', sessionErr);
        return;
      }
      const user = sessionData?.session?.user;
      if (!user?.id) return;

      const { data: existing, error: selectErr } = await supabase
        .from('user_terms_agreements')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (selectErr) {
        // eslint-disable-next-line no-console
        console.warn('syncAgreements: select error', selectErr);
        return;
      }

      if (!existing || existing.length === 0) {
        const { error: insErr } = await supabase.from('user_terms_agreements').insert([
          { user_id: user.id, term_type: 'service', term_version: 'v1.0' },
          { user_id: user.id, term_type: 'privacy', term_version: 'v1.0' }
        ]);

        if (insErr) {
          // eslint-disable-next-line no-console
          console.warn('syncAgreements: insert error', insErr);
          return;
        }
      }
    };

    persistPendingInviteFromUrl();

    // OAuth 콜백 즉각 처리: ?code= URL에서 빈 해시로 인한 not-found 방지
    // 리로드 없이 URL에 #/ 추가 → 라우터가 즉시 홈 화면 표시
    if (!window.location.hash && window.location.search.includes('code=')) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#/`
      );
      window.dispatchEvent(new Event('hashchange'));
    }

    // Process OAuth hash and returnTo FIRST, before any other async operations
    handleSupabaseHash();
    // Then check and sync agreements after hash is cleared
    fixKakaoHash();
    syncAgreements();
    void joinPendingInviteGroup();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // OAuth 콜백 URL 정리: ?code= 제거하고 깔끔하게 /#/ 로 변경 (리로드 없음)
        if (window.location.search.includes('code=')) {
          window.history.replaceState(null, '', window.location.origin + '/#/');
        }
        syncAgreements();
        void joinPendingInviteGroup(session?.user?.id ?? null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        <AppContent />
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}
