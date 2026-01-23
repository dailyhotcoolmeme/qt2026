import React, { useEffect } from "react"; // 1. useEffect 추가 확인
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
import ArchivePage from "./pages/ArchivePage";
import BibleViewPage from "./pages/BibleViewPage";
import AuthPage from "./pages/AuthPage"; 
import RegisterPage from "./pages/RegisterPage";
import NotFound from "./pages/not-found";
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch> 
        <Route path="/" component={DailyWordPage} />
        <Route path="/qt" component={QTPage} />
        <Route path="/reading" component={ReadingPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/archive" component={ArchivePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/view/:bookId/:chapter" component={BibleViewPage} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  // 2. [추가] 로그인 인증 리다이렉트 시 발생하는 URL 꼬임 및 404 방지 로직
  useEffect(() => {
    const href = window.location.href;
    // 카카오 로그인 등 외부 인증 후 돌아올 때 '#'이 깨지거나 꼬이는 현상 강제 교정
    if ((href.includes("access_token") || href.includes("code=")) && !window.location.hash.startsWith("#/")) {
      const cleanHref = href.replace("#access_token", "/#access_token").replace("?code=", "/?code=");
      window.history.replaceState(null, "", cleanHref);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        <WouterRouter hook={useHashLocation}>
          <Layout>
            <TopBar />
            <main className="flex-1 overflow-y-auto pb-20">
              <Router />
            </main>
            <BottomNav />
          </Layout>
        </WouterRouter>
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
