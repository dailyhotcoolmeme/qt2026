import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Layout } from "./components/Layout";
import { DisplaySettingsProvider } from "./components/DisplaySettingsProvider";
import { RefreshProvider } from "./lib/refreshContext";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import DailyWordPage from "./pages/DailyWordPage";
import QTPage from "./pages/QTPage";
import ReadingPage from "./pages/ReadingPage";
import CommunityPage from "./pages/CommunityPage";
import GroupDashboard from "./pages/GroupDashboard";
import LeadershipPage from "./pages/LeadershipPage";
import ArchivePage from "./pages/ArchivePage";
import VerseCardsPage from "./pages/VerseCardsPage";
import FavoritesPage from "./pages/FavoritesPage";
import BibleViewPage from "./pages/BibleViewPage";
import AuthPage from "./pages/AuthPage";
import FindAccountPage from "./pages/FindAccountPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import RegisterPage from "./pages/RegisterPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/not-found";
import PrayerPage from "./pages/PrayerPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";
import { supabase } from "./lib/supabase";
import { getBrowserOrigin, isKnownAppOrigin, isNativeApp, resolveAppUrl } from "./lib/appUrl";
import InsightsDashboardPage from "./pages/InsightsDashboardPage";
import OnboardingPage from "./pages/OnboardingPage";
import AdminPage from "./pages/AdminPage";
import MyPrayerBoxPage from "./pages/MyPrayerBoxPage";
import {
  clearInviteGroupId,
  GROUP_INVITE_QUERY_KEY,
  isAlreadyJoinedInviteError,
  joinInviteGroup,
  PENDING_GROUP_INVITE_KEY,
  PENDING_GROUP_INVITE_REDIRECTED_KEY,
  persistInviteGroupId,
  readInviteGroupIdFromUrl,
  resolveJoinedGroupId,
  UUID_REGEX,
} from "./lib/groupInvite";
const REGISTER_HASH_PATH = "#/register";
const NATIVE_OAUTH_CALLBACK_PREFIX = "com.myamen.app://auth/callback";
const NATIVE_OAUTH_BRIDGE_QUERY_KEY = "native_oauth";

function coerceReturnToInAppUrl(rawReturnTo?: string | null) {
  const appOrigin = getBrowserOrigin();
  const fallback = `${appOrigin}/#/`;
  if (!rawReturnTo) return fallback;

  const value = String(rawReturnTo);
  if (value.startsWith("/#/")) return `${appOrigin}${value}`;
  if (value.startsWith("#/")) return `${appOrigin}/${value}`;

  try {
    const url = new URL(value);
    if (url.hash && url.hash.startsWith("#/")) {
      return `${appOrigin}/${url.hash}`;
    }
    if (isKnownAppOrigin(url.origin)) {
      return `${appOrigin}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // ignore parse errors
  }

  return fallback;
}

function buildNativeCallbackUrlFromBrowserLocation(rawUrl: string) {
  const currentUrl = new URL(rawUrl);
  currentUrl.searchParams.delete(NATIVE_OAUTH_BRIDGE_QUERY_KEY);
  const nextSearch = currentUrl.searchParams.toString();
  return `${NATIVE_OAUTH_CALLBACK_PREFIX}${nextSearch ? `?${nextSearch}` : ""}${currentUrl.hash || ""}`;
}

function OnboardingRedirect() {
  const [, setLocation] = useHashLocation();
  useEffect(() => {
    try {
      if (localStorage.getItem("myamen_onboarding_done") !== "1") {
        // localStorage에 초대 대기 중인지 확인
        const storedInvite = String(localStorage.getItem(PENDING_GROUP_INVITE_KEY) || "").trim();
        if (storedInvite && UUID_REGEX.test(storedInvite)) return;
        // URL에 초대 파라미터가 있는지 직접 확인 (App.useEffect보다 먼저 실행되므로)
        if (readInviteGroupIdFromUrl()) return;
        // OAuth 콜백 진행 중 (search param 또는 sessionStorage 플래그)
        if (window.location.search.includes("code=") || window.location.search.includes("state=")) return;
        if (sessionStorage.getItem('__oauth_cb') === '1') return;
        // hash에 직접 토큰이 있는 경우 (implicit flow)
        if (window.location.hash.includes("access_token") || window.location.hash.includes("provider_token")) return;
        setLocation("/onboarding");
      }
    } catch { /* ignore */ }
  }, []);
  return null;
}

function AppContent() {
  return (
    <WouterRouter hook={useHashLocation}>
      <OnboardingRedirect />
      <AnimatePresence mode="wait">
        <Switch>
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/terms/:type" component={TermsPage} />
          {/* Auth route */}
          <Route path="/auth" component={AuthPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/find-account" component={FindAccountPage} />
          <Route path="/update-password" component={UpdatePasswordPage} />
          <Route path="/insights" component={InsightsDashboardPage} />
          <Route path="/admin" component={AdminPage} />
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
                  <Route path="/verse-cards" component={VerseCardsPage} />
                  <Route path="/favorites" component={FavoritesPage} />
                  <Route path="/bible/:book/:chapter" component={BibleViewPage} />
                  <Route path="/record/:id" component={RecordDetailPage} />
                  <Route path="/search" component={SearchPage} />
                  <Route path="/my-prayer-box" component={MyPrayerBoxPage} />
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

// 그룹 가입 후 네비게이션이 시작됐으면 다른 네비게이션이 덮어쓰지 못하게 막는 플래그
let groupNavigationDone = false;

// ── 모듈 로드 시 즉시 실행 (React 렌더링 전) ──────────────────────────────
// OnboardingRedirect.useEffect보다 먼저 실행되어야 하므로 useEffect 밖에 위치
// 1) hash에 OAuth 토큰이 있으면 즉시 캡처하고 URL을 정리
// 2) sessionStorage에 플래그 → OnboardingRedirect가 OAuth 진행 중임을 인식
const _INITIAL_OAUTH_HASH = (typeof window !== 'undefined' ? window.location.hash : '') || '';
if (_INITIAL_OAUTH_HASH.includes('access_token') || _INITIAL_OAUTH_HASH.includes('provider_token')) {
  window.history.replaceState(null, '', window.location.pathname + (window.location.search || ''));
  try { sessionStorage.setItem('__oauth_cb', '1'); } catch { /* ignore */ }
}
// PKCE code flow도 동일하게 플래그 설정
if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
  try { sessionStorage.setItem('__oauth_cb', '1'); } catch { /* ignore */ }
}

export default function App() {
  useEffect(() => {
    let inviteJoinInFlight = false;
    let nativeUrlOpenListener: { remove: () => Promise<void> } | null = null;
    const originalFetch = window.fetch.bind(window);

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (!isNativeApp() || typeof input !== "string") {
        return originalFetch(input, init);
      }

      if (input.startsWith("/api/") || input.startsWith("/uploads/")) {
        return originalFetch(resolveAppUrl(input), init);
      }

      return originalFetch(input, init);
    }) as typeof window.fetch;

    const shouldBridgeNativeOAuthFromBrowser = () => {
      if (isNativeApp()) return false;
      const search = window.location.search || "";
      const hash = window.location.hash || "";
      if (!search.includes(`${NATIVE_OAUTH_BRIDGE_QUERY_KEY}=1`)) return false;
      return (
        search.includes("code=") ||
        search.includes("error=") ||
        hash.includes("access_token") ||
        hash.includes("provider_token") ||
        hash.includes("error")
      );
    };

    if (shouldBridgeNativeOAuthFromBrowser()) {
      window.location.replace(buildNativeCallbackUrlFromBrowserLocation(window.location.href));
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
    }

    const persistPendingInviteFromUrl = () => {
      const inviteGroupId = readInviteGroupIdFromUrl();
      if (!inviteGroupId) return;
      try {
        persistInviteGroupId(inviteGroupId);
        // Legacy shared links may include "#/register?invite_group=...".
        // Keep invite id in storage and normalize hash to "/register" to avoid route mismatch.
        if (window.location.hash.startsWith("#/register?")) {
          const clean = `${window.location.pathname}${window.location.search}${REGISTER_HASH_PATH}`;
          window.history.replaceState(null, "", clean);
        }
      } catch (error) {
        console.error("failed to persist invite group id:", error);
      }
    };

    const redirectToAuthForInvite = (inviteGroupId: string) => {
      const targetUrl = `${getBrowserOrigin()}/?${GROUP_INVITE_QUERY_KEY}=${encodeURIComponent(inviteGroupId)}#/auth`;
      const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentUrl !== targetUrl) {
        window.location.href = targetUrl;
      }
    };

    const resolveSessionUserId = async (fallbackUserId?: string | null) => {
      if (fallbackUserId) return fallbackUserId;

      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (error) return null;
        return sessionData?.session?.user?.id ?? null;
      } catch (error) {
        // "no session" is a normal state for logged-out users; don't treat as a hard error.
        console.warn("failed to resolve auth session:", error);
        return null;
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
        localStorage.removeItem(PENDING_GROUP_INVITE_REDIRECTED_KEY);
        return;
      }

      let userId = await resolveSessionUserId(sessionUserId || null);
      if (!userId) {
        const isOAuthInProgress =
          window.location.search.includes("code=") ||
          window.location.search.includes("state=") ||
          window.location.hash.includes("access_token") ||
          window.location.hash.includes("provider_token");
        if (isOAuthInProgress) return;

        const inviteFromCurrentUrl = readInviteGroupIdFromUrl();
        if (inviteFromCurrentUrl && inviteFromCurrentUrl !== pendingGroupId) return;
        const redirected = localStorage.getItem(PENDING_GROUP_INVITE_REDIRECTED_KEY) === "1";
        if (redirected) return;
        localStorage.setItem(PENDING_GROUP_INVITE_REDIRECTED_KEY, "1");
        redirectToAuthForInvite(pendingGroupId);
        return;
      }

      inviteJoinInFlight = true;
      try {
        let joinedGroupId = "";
        try {
          joinedGroupId = await joinInviteGroup(pendingGroupId);
        } catch (error) {
          if (!isAlreadyJoinedInviteError(error)) {
            console.error("join pending invite failed:", error);
            return;
          }
          joinedGroupId = resolveJoinedGroupId("", pendingGroupId);
        }

        if (!UUID_REGEX.test(joinedGroupId)) return;

        clearInviteGroupId();
        // 초대 흐름으로 가입한 경우 온보딩 완료 표시
        try { localStorage.setItem("myamen_onboarding_done", "1"); } catch { /* ignore */ }

        const targetPath = `/group/${joinedGroupId}`;
        const targetHash = `#${targetPath}`;
        if (!window.location.hash.startsWith(targetHash)) {
          groupNavigationDone = true;
          window.location.href = `${getBrowserOrigin()}/#${targetPath}`;
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

    const safeDecodeURIComponent = (value?: string | null) => {
      if (!value) return "";
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    const consumeStoredReturnTo = () => {
      try {
        const stored = localStorage.getItem("qt_return");
        localStorage.removeItem("qt_return");
        localStorage.removeItem("qt_autoOpenWrite");
        return stored || "";
      } catch {
        return "";
      }
    };

    const navigateAfterOAuth = (rawReturnTo?: string | null) => {
      if (groupNavigationDone) return;
      const fromQuery = safeDecodeURIComponent(rawReturnTo);
      const fromStorage = consumeStoredReturnTo();
      const target = fromQuery || fromStorage || `${getBrowserOrigin()}/#/`;
      window.location.href = coerceReturnToInAppUrl(target);
    };

    // Handle Supabase OAuth responses that return tokens in the URL hash
    const handleSupabaseHash = async () => {
      // _INITIAL_OAUTH_HASH: 모듈 로드 시점에 캡처한 원본 hash (OnboardingRedirect가 변경하기 전)
      const hash = _INITIAL_OAUTH_HASH || window.location.hash || "";
      const search = window.location.search || "";

      if (hash.includes("error") || search.includes("error=")) {
        const errorDesc = new URLSearchParams(search).get('error_description')
          || new URLSearchParams(hash.replace(/^#/, '')).get('error_description')
          || "알 수 없는 오류가 발생했습니다.";
        console.error('[OAuth Error]', decodeURIComponent(errorDesc));

        window.history.replaceState(null, "", getBrowserOrigin() + '/#/');
        window.dispatchEvent(new Event('hashchange'));
        return;
      }

      // PKCE code flow (e.g. Google): exchange `?code=...` for a session.
      if (search.includes("code=")) {
        // OAuth 콜백이 감지되면 리다이렉트 플래그 즉시 제거 (실패해도 다음번 초대 흐름 재사용 가능)
        try { localStorage.removeItem(PENDING_GROUP_INVITE_REDIRECTED_KEY); } catch { /* ignore */ }

        // ★ 코드를 URL에서 즉시 제거 — 삼성 인터넷이 백그라운드 재로드할 때
        //    동일한 code로 이중 exchange가 발생하면 "invalid grant" 오류가 남
        //    code 파라미터만 제거하고 나머지(returnTo, invite 등)는 유지
        const _exchangeParams = new URLSearchParams(search);
        const _codeToExchange = _exchangeParams.get('code') || '';
        const _stateToExchange = _exchangeParams.get('state') || '';
        const _returnToParam = _exchangeParams.get('returnTo') || '';
        const _inviteParam = _exchangeParams.get(GROUP_INVITE_QUERY_KEY) || '';
        const _cleanExchangeSearch = new URLSearchParams();
        if (_returnToParam) _cleanExchangeSearch.set('returnTo', _returnToParam);
        if (_inviteParam) _cleanExchangeSearch.set(GROUP_INVITE_QUERY_KEY, _inviteParam);
        const _cleanExchangeUrl = window.location.pathname
          + (_cleanExchangeSearch.toString() ? '?' + _cleanExchangeSearch.toString() : '')
          + (window.location.hash || '#/');
        window.history.replaceState(null, '', _cleanExchangeUrl);

        // 교환에 사용할 전체 URL(코드 포함)을 미리 저장
        const _originalHrefWithCode = `${window.location.origin}${window.location.pathname}?${
          _codeToExchange ? `code=${encodeURIComponent(_codeToExchange)}&` : ''}${
          _stateToExchange ? `state=${encodeURIComponent(_stateToExchange)}&` : ''}${_cleanExchangeSearch.toString()}`;

        let codeExchangeOk = false;
        try {
          const authAny: any = supabase.auth as any;
          if (typeof authAny.exchangeCodeForSession === "function") {
            const { error } = await authAny.exchangeCodeForSession(_originalHrefWithCode);
            if (error) throw error;
            codeExchangeOk = true;
          } else if (typeof authAny.getSessionFromUrl === "function") {
            // Fallback for older SDK builds.
            const { error } = await authAny.getSessionFromUrl();
            if (error) throw error;
            codeExchangeOk = true;
          }
        } catch (e) {
          console.error("Error exchanging OAuth code for session:", e);
          // code_verifier 소실 등으로 교환 실패 시 기존 세션 재확인
          // (이미 다른 경로로 세션이 설정된 경우 정상 진행)
        }

        // Give SDK a moment to persist the session before checking returnTo.
        await new Promise(resolve => setTimeout(resolve, codeExchangeOk ? 300 : 500));

        // code exchange 성공 시 온보딩 완료 마킹 (삼성 인터넷 등 새 브라우저 재방문 시 온보딩 리디렉션 방지)
        if (codeExchangeOk) {
          try { localStorage.setItem("myamen_onboarding_done", "1"); } catch { /* ignore */ }
        }
        // OAuth 플래그 제거
        try { sessionStorage.removeItem('__oauth_cb'); } catch { /* ignore */ }

        // code exchange 실패해도 기존 세션이 있으면 계속 진행
        if (!codeExchangeOk) {
          const { data: sessionCheck } = await supabase.auth.getSession();
          if (!sessionCheck?.session?.user) {
            // 세션도 없으면: URL 정리 후 auth로 이동 (invite 파라미터 보존)
            const pendingGroupIdOnFail = localStorage.getItem(PENDING_GROUP_INVITE_KEY)?.trim() || "";
            const clean = pendingGroupIdOnFail
              ? `${getBrowserOrigin()}/?${GROUP_INVITE_QUERY_KEY}=${encodeURIComponent(pendingGroupIdOnFail)}#/auth?login_fail=1`
              : `${getBrowserOrigin()}/#/auth?login_fail=1`;
            window.location.replace(clean);
            return;
          }
        }

        // 초대 링크로 온 경우: returnTo보다 먼저 그룹 가입 처리
        // joinPendingInviteGroup 사용 → inviteJoinInFlight 보호, clearInviteGroupId, 온보딩 처리 일괄 위임
        const pendingGroupIdForHash = localStorage.getItem(PENDING_GROUP_INVITE_KEY)?.trim() || "";
        if (pendingGroupIdForHash && UUID_REGEX.test(pendingGroupIdForHash)) {
          await joinPendingInviteGroup();
          // joinPendingInviteGroup 내부에서 navigate 후 groupNavigationDone = true 세팅됨
          if (groupNavigationDone) return;
        }

        // Preserve returnTo behavior for code flow too.
        const params = new URLSearchParams(_returnToParam ? `returnTo=${encodeURIComponent(_returnToParam)}` : window.location.search);
        const returnTo = params.get("returnTo");
        if (returnTo) {
          try {
            const decoded = decodeURIComponent(returnTo);
            const targetUrl = coerceReturnToInAppUrl(decoded);
            // replaceState로 SPA 내비게이션 (전체 리로드 없음)
            const targetHash = new URL(targetUrl).hash || '#/';
            window.history.replaceState(null, '', window.location.pathname + targetHash);
            window.dispatchEvent(new Event('hashchange'));
            return;
          } catch (e) {
            console.error("Failed to decode returnTo:", e);
          }
        }

        try {
          const stored = localStorage.getItem('qt_return');
          if (stored) {
            localStorage.removeItem('qt_return');
            localStorage.removeItem('qt_autoOpenWrite');
            const targetUrl = coerceReturnToInAppUrl(stored);
            const targetHash = new URL(targetUrl).hash || '#/';
            window.history.replaceState(null, '', window.location.pathname + targetHash);
            window.dispatchEvent(new Event('hashchange'));
            return;
          }
        } catch {
          // ignore storage errors
        }

        // onAuthStateChange에서 이미 그룹 페이지로 이동했으면 덮어쓰지 않음
        if (groupNavigationDone) return;

        // Remove code params while preserving hash routing.
        const clean = getBrowserOrigin() + "/#/";
        window.history.replaceState(null, "", clean);
        window.dispatchEvent(new Event('hashchange'));
        return;
      }

      if (hash.includes("access_token") || hash.includes("provider_token")) {
        try {
          // detectSessionInUrl: false 이므로 수동으로 hash에서 세션 추출
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          } else {
            const authAny: any = supabase.auth as any;
            if (typeof authAny.getSessionFromUrl === "function") {
              await authAny.getSessionFromUrl();
            }
          }
        } catch (e) {
          console.error("Error handling Supabase auth hash:", e);
        }

        // Give SDK a moment to process the session before checking returnTo
        await new Promise(resolve => setTimeout(resolve, 300));

        // 온보딩 완료 마킹 + OAuth 플래그 제거
        try { localStorage.setItem("myamen_onboarding_done", "1"); } catch { /* ignore */ }
        try { sessionStorage.removeItem('__oauth_cb'); } catch { /* ignore */ }

        // 초대 링크로 온 경우: returnTo보다 먼저 그룹 가입 처리
        const pendingGroupIdForAccess = localStorage.getItem(PENDING_GROUP_INVITE_KEY)?.trim() || "";
        if (pendingGroupIdForAccess && UUID_REGEX.test(pendingGroupIdForAccess)) {
          await joinPendingInviteGroup();
          if (groupNavigationDone) return;
        }

        // If a returnTo query param was preserved, use it. Otherwise try localStorage fallback.
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get("returnTo");
        if (returnTo) {
          try {
            const decoded = decodeURIComponent(returnTo);
            const targetUrl = coerceReturnToInAppUrl(decoded);
            const targetHash = new URL(targetUrl).hash || '#/';
            window.history.replaceState(null, '', window.location.pathname + targetHash);
            window.dispatchEvent(new Event('hashchange'));
          } catch (e) {
            console.error("Failed to decode returnTo:", e);
            window.history.replaceState(null, "", getBrowserOrigin() + '/#/');
            window.dispatchEvent(new Event('hashchange'));
          }
        } else {
          try {
            const stored = localStorage.getItem('qt_return');
            if (stored) {
              localStorage.removeItem('qt_return');
              localStorage.removeItem('qt_autoOpenWrite');
              const targetUrl = coerceReturnToInAppUrl(stored);
              const targetHash = new URL(targetUrl).hash || '#/';
              window.history.replaceState(null, '', window.location.pathname + targetHash);
              window.dispatchEvent(new Event('hashchange'));
              return;
            }
          } catch (e) {
            // ignore storage errors
          }
          // Remove fragment while preserving path and search
          const clean = getBrowserOrigin() + '/#/';
          window.history.replaceState(null, "", clean);
          window.dispatchEvent(new Event('hashchange'));
        }
      }
    };

    const handleNativeOAuthCallback = async (incomingUrl: string) => {
      if (!incomingUrl || !incomingUrl.startsWith(NATIVE_OAUTH_CALLBACK_PREFIX)) return;

      try {
        const authAny: any = supabase.auth as any;
        if (incomingUrl.includes("code=")) {
          if (typeof authAny.exchangeCodeForSession === "function") {
            const { error } = await authAny.exchangeCodeForSession(incomingUrl);
            if (error) throw error;
          }
        } else if (incomingUrl.includes("access_token")) {
          const hash = incomingUrl.split("#")[1] || "";
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          }
        }
      } catch (error) {
        console.error("native OAuth callback handling failed:", error);
      }

      try {
        await Browser.close();
      } catch {
        // ignore close errors
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
      await syncAgreements();

      // 그룹 초대 대기 중이면 가입 후 그룹 페이지로 이동 (navigateAfterOAuth 건너뜀)
      const pendingInviteBeforeJoin = String(localStorage.getItem(PENDING_GROUP_INVITE_KEY) || "").trim();
      if (pendingInviteBeforeJoin && UUID_REGEX.test(pendingInviteBeforeJoin)) {
        try { localStorage.setItem("myamen_onboarding_done", "1"); } catch { /* ignore */ }
        await joinPendingInviteGroup();
        return;
      }

      const callbackUrl = new URL(incomingUrl);
      navigateAfterOAuth(callbackUrl.searchParams.get("returnTo"));
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

    if (isNativeApp()) {
      const setupNativeOAuthBridge = async () => {
        try {
          const launch = await CapacitorApp.getLaunchUrl();
          if (launch?.url) {
            await handleNativeOAuthCallback(launch.url);
          }
        } catch (error) {
          console.error("failed to read native launch url:", error);
        }

        nativeUrlOpenListener = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
          if (!url) return;
          void handleNativeOAuthCallback(url);
        });
      };

      void setupNativeOAuthBridge();
    }

    // Process OAuth hash and returnTo FIRST, before any other async operations
    void handleSupabaseHash();
    // Then check and sync agreements after hash is cleared
    fixKakaoHash();
    void syncAgreements();
    void joinPendingInviteGroup();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {

        // code= URL이 있으면 handleSupabaseHash()가 처리 중이므로 여기서 초대 처리 스킵
        // (중복 rpc 호출 및 경쟁 방지)
        if (window.location.search.includes('code=')) {
          // handleSupabaseHash에 위임 — 아무것도 하지 않음
          return;
        }

        // 초대 링크로 접속한 경우 → 그룹 가입 & 리다이렉트를 최우선 처리
        if (session?.user?.id) {
          let pendingGroupId = "";
          try { pendingGroupId = localStorage.getItem(PENDING_GROUP_INVITE_KEY)?.trim() || ""; } catch { /* ignore */ }
          if (pendingGroupId && UUID_REGEX.test(pendingGroupId)) {
            syncAgreements();
            await joinPendingInviteGroup(session.user.id);
            return;
          }
        }

        if (window.location.search.includes('code=')) {
          const params = new URLSearchParams(window.location.search);
          const returnTo = params.get('returnTo') || localStorage.getItem('qt_return');
          if (returnTo) {
            try {
              const decoded = decodeURIComponent(returnTo);
              syncAgreements();
              localStorage.removeItem('qt_return');
              window.location.href = coerceReturnToInAppUrl(decoded);
              return;
            } catch (e) {
              console.error('Failed to parse returnTo in SIGNED_IN:', e);
            }
          }

          window.history.replaceState(null, '', getBrowserOrigin() + '/#/');
          window.dispatchEvent(new Event('hashchange'));
        }
        syncAgreements();
        void joinPendingInviteGroup(session?.user?.id ?? null);
      }
    });

    return () => {
      window.fetch = originalFetch;
      authListener.subscription.unsubscribe();
      if (nativeUrlOpenListener) {
        void nativeUrlOpenListener.remove();
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        <RefreshProvider>
          <AppContent />
        </RefreshProvider>
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}
