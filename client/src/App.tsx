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
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";
import { supabase } from "./lib/supabase";

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
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
    }

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
      if (hash.includes("access_token") || hash.includes("error") || hash.includes("provider_token")) {
        try {
          // Prefer SDK helpers if available
          // supabase-js v2 exposes getSessionFromUrl or exchangeCodeForSession in some installs
          const authAny: any = supabase.auth as any;
          if (typeof authAny.getSessionFromUrl === "function") {
            await authAny.getSessionFromUrl();
          } else if (typeof authAny.exchangeCodeForSession === "function") {
            await authAny.exchangeCodeForSession();
          } else {
            // Last resort: call onAuthStateChange listener will pick up session if SDK already parsed it.
          }
        } catch (e) {
          // swallow; we'll still try to clean URL
          // eslint-disable-next-line no-console
          console.error("Error handling Supabase auth hash:", e);
        }

        // Give SDK a moment to process the session before checking returnTo
        await new Promise(resolve => setTimeout(resolve, 100));

        // If a returnTo query param was preserved, use it. Otherwise try localStorage fallback.
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get("returnTo");
        if (returnTo) {
          // Decode and navigate to the original page
          try {
            const decoded = decodeURIComponent(returnTo);
            window.location.href = decoded;
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Failed to decode returnTo:", e);
            const clean = window.location.origin + window.location.pathname;
            window.history.replaceState(null, "", clean);
          }
        } else {
          // fallback: check localStorage for desired return
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
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        // eslint-disable-next-line no-console
        console.warn('syncAgreements: getUser error', userErr);
        return;
      }

      if (user) {
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
          const { data: insData, error: insErr } = await supabase.from('user_terms_agreements').insert([
            { user_id: user.id, term_type: 'service', term_version: 'v1.0' },
            { user_id: user.id, term_type: 'privacy', term_version: 'v1.0' }
          ]);

          if (insErr) {
            // eslint-disable-next-line no-console
            console.warn('syncAgreements: insert error', insErr);
            return;
          }
        }
      }
    };

    // Process OAuth hash and returnTo FIRST, before any other async operations
    handleSupabaseHash();
    // Then check and sync agreements after hash is cleared
    fixKakaoHash();
    syncAgreements();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        syncAgreements();
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
