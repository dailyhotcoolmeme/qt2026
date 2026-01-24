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
import NotFound from "./pages/not-found";
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";

// 1. [알맹이 컴포넌트] Layout과 모든 페이지 로직을 담습니다.
function AppContent() {
  return (
    <WouterRouter hook={useHashLocation}>
      <Layout>
        <TopBar />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            <Switch> 
              <Route path="/" component={DailyWordPage} />
              <Route path="/qt" component={QTPage} />
              <Route path="/reading" component={ReadingPage} />
              <Route path="/community" component={CommunityPage} />
              <Route path="/archive" component={ArchivePage} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/search" component={SearchPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/view/:bookId/:chapter" component={BibleViewPage} />
              <Route component={NotFound} />
            </Switch>
          </AnimatePresence>
        </main>
        <BottomNav />
      </Layout>
    </WouterRouter>
  );
}

// 2. [껍데기 컴포넌트] 최상위에서 오직 Provider들만 관리합니다.
export default function App() {
  useEffect(() => {
    const href = window.location.href;
    if (href.includes("access_token") && href.includes("//#")) {
      window.history.replaceState(null, "", href.replace("//#", "/#"));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        {/* 이제 AppContent 안에 있는 Layout은 무조건 Provider의 자식이 됩니다. */}
        <AppContent />
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}