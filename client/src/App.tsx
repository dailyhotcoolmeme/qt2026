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
          {/* 약관 및 인증 페이지 (독립 레이아웃) */}
          <Route path="/terms/:type" component={TermsPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/find-account" component={FindAccountPage} />
          <Route path="/update-password" component={UpdatePasswordPage} />

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
    const checkAuthRedirect = () => {
      const href = window.location.href;

      // 1. 비밀번호 재설정 토큰 감지 (수정됨)
      if (href.includes("access_token")) {
        // 주소창을 복잡하게 합치지 말고, 가장 단순하게 페이지 이동만 시킵니다.
        // 토큰은 어차피 주소창에 남아있으므로 UpdatePasswordPage에서 읽을 수 있습니다.
        if (!window.location.hash.startsWith("#/update-password")) {
          window.location.hash = "/update-password";
          return;
        }
      }

      // 2. 카카오 로그인 특유의 /#/# 버그 수정 (그대로 유지)
      if (href.includes("/#/#")) {
        const newHref = href.replace("/#/#", "/#/");
        window.history.replaceState(null, "", newHref);
        setTimeout(() => window.location.reload(), 300);
      }
    };

    // [이벤트 감시] 비밀번호 재설정 전용 (그대로 유지)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        window.location.hash = "/update-password";
      }
    });

    // [약관 동의] 자동 저장 로직 (그대로 유지)
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

    checkAuthRedirect();
    syncAgreements();

    return () => subscription.unsubscribe();
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        <AppContent />
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}
