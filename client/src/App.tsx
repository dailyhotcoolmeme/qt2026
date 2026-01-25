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
import RegisterPage from "./pages/RegisterPage";
import TermsPage from "./pages/TermsPage"; // 1. TermsPage 임포트 추가
import NotFound from "./pages/not-found";
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";

function AppContent() {
  return (
    <WouterRouter hook={useHashLocation}>
      <AnimatePresence mode="wait">
        <Switch>
          {/* 2. 약관 페이지는 상단바/하단바가 없는 독립된 레이아웃으로 배치 */}
          <Route path="/terms/:type" component={TermsPage} />
          <Route path="/auth" component={AuthPage} />

          {/* 3. 나머지 메인 서비스 페이지들은 기존 Layout 안에서 동작 */}
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
      if (href.includes("/#/#")) {
        const newHref = href.replace("/#/#", "/#/");
        window.history.replaceState(null, "", newHref);
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    };
    checkAuthRedirect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        <AppContent />
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}