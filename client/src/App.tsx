import React from "react";
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
// 방금 만든 회원가입 페이지 추가
import NotFound from "./pages/not-found";
import { AnimatePresence } from "framer-motion";
import SearchPage from "./pages/SearchPage";
// App.tsx 파일의 Router 함수 바로 위나 내부에 추가
useEffect(() => {
  // 주소창에 Supabase가 보낸 인증 토큰(access_token)은 있는데 '#'이 깨져있을 경우
  if (window.location.href.includes("access_token") && !window.location.hash.includes("#/")) {
    // 현재 주소에서 토큰 부분만 추출해서 HashRouter가 이해할 수 있는 형태(/#/)로 강제 변환
    const newHref = window.location.href.replace(/([^#])#access_token/, "$1/#access_token");
    window.history.replaceState(null, "", newHref);
  }
}, []);

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch> 
        {/* Switch 태그 안을 비웁니다. WouterRouter가 알아서 관리합니다 */}
        {/* 모든 페이지는 기본적으로 공개(Public) 상태입니다 */}
        <Route path="/" component={DailyWordPage} />
        <Route path="/qt" component={QTPage} />
        <Route path="/reading" component={ReadingPage} />
        <Route path="/search" component={SearchPage} />
        
        {/* '내 기록' 메뉴를 누르면 로그인/회원가입 화면이 보이게 설정 */}
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
  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        {/* 아래 WouterRouter 줄을 추가하여 전체를 감싸세요 */}
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
