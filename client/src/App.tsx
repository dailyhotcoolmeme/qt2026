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
  useEffect(() => {
  const handleAuth = async () => {
    const href = window.location.href;
    
    // 카카오 로그인 후 돌아올 때 URL에 붙는 인증 정보를 Supabase가 인식하도록 돕습니다.
    if (href.includes("access_token")) {
      // 해시 라우팅을 사용하므로 URL 파싱 시 주의가 필요합니다.
      // 별도의 처리가 없어도 Supabase 라이브러리가 초기화될 때 URL을 읽지만, 
      // 404 방지를 위해 아래 코드를 유지합니다.
      if (href.includes("//#")) {
        window.history.replaceState(null, "", href.replace("//#", "/#"));
      }
    }
  };

  handleAuth();
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
