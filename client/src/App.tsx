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
import ArchivePage from "./pages/ArchivePage";
import BibleViewPage from "./pages/BibleViewPage";
import AuthPage from "./pages/AuthPage"; 
import FindAccountPage from "./pages/FindAccountPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TermsPage from "./pages/TermsPage"; 
import NotFound from "./pages/not-found";
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";
import { supabase } from "./lib/supabase";

function AppContent() {
  return (
    <WouterRouter hook={useHashLocation}>
      <AnimatePresence mode="wait">
        <Switch>
          <Route path="/terms/:type" component={TermsPage} />
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
                  <Route path="/reading" component={ReadingPage} />
                  <Route path="/community" component={CommunityPage} />
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
    // 1. 카카오 로그인 특유의 /#/# 버그 수정 (새로고침 로직 제거)
    const fixKakaoHash = () => {
      const href = window.location.href;
      if (href.includes("/#/#")) {
        // 주소창에서 잘못된 해시만 변경하고 새로고침은 하지 않습니다.
        const newHref = href.replace("/#/#", "/#/");
        window.history.replaceState(null, "", newHref);
      }
    };

    // 2. 약관 동의 내역 자동 저장 로직 (유지)
    const syncAgreements = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from('user_terms_agreements')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('user_terms_agreements').insert([
            { user_id: user.id, term_type: 'service', term_version: 'v1.0' },
            { user_id: user.id, term_type: 'privacy', term_version: 'v1.0' }
          ]);
        }
      }
    };

    fixKakaoHash();
    syncAgreements();

    // 인증 상태 변화 리스너
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
