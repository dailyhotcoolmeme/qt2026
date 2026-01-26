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
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TermsPage from "./pages/TermsPage"; 
import NotFound from "./pages/not-found";
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";
import { supabase } from "./lib/supabase"; // 상단에 추가됨

function AppContent() {
  return (
    <WouterRouter hook={useHashLocation}>
      <AnimatePresence mode="wait">
        <Switch>
          {/* 약관 및 인증 페이지 (독립 레이아웃) */}
          <Route path="/terms/:type" component={TermsPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/find-account" component={FindAccountPage} />

          {/* 메인 서비스 페이지 (공통 레이아웃) */}
          <Route>
            <Layout>
              <TopBar />
              <main className="flex-1 flex flex-col relative overflow-hidden">
                <Switch> 
                  <Route path="/" component={DailyWordPage} />
                  <Route path="/qt" component={QTPage} />
                  <Route path="/reading" component={ReadingPage} />
                  <Route path="/community" component={CommunityPage} />
                  <Route path="/archive" component={ArchivePage} />
                  <Route path="/login" component={LoginPage} />
                  <Route path="/search" component={SearchPage} />
                  <Route path="/register" component={RegisterPage} />
                  <Route path="/view/:bookId/:chapter" component={BibleViewPage} />
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
    // 1. 카카오 로그인 리다이렉트 처리
    const checkAuthRedirect = () => {
      const href = window.location.href;
      if (href.includes("/#/#")) {
        const newHref = href.replace("/#/#", "/#/");
        window.history.replaceState(null, "", newHref);
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    };

    // 2. 로그인 성공 시 약관 동의 내역 자동 저장 로직
    const syncAgreements = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 이미 저장된 동의 내역이 있는지 확인
        const { data: existing } = await supabase
          .from('user_terms_agreements')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        // 내역이 없으면 (최초 가입/로그인 시) 동의 도장 찍기
        if (!existing || existing.length === 0) {
          await supabase.from('user_terms_agreements').insert([
            { user_id: user.id, term_type: 'service', term_version: 'v1.0' },
            { user_id: user.id, term_type: 'privacy', term_version: 'v1.0' }
          ]);
        }
      }
    };

    checkAuthRedirect();
    syncAgreements();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        <AppContent />
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}
