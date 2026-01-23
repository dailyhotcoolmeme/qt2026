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
  // 로그인 후 돌아올 때 주소창에 생기는 이상 현상만 최소한으로 방어합니다.
  useEffect(() => {
    const href = window.location.href;
    if (href.includes("//#")) {
      window.history.replaceState(null, "", href.replace("//#", "/#"));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        {/* hook={useHashLocation}을 사용하여 새로고침 404를 방지합니다 */}
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
