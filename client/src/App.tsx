import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/Layout";
import { DisplaySettingsProvider } from "@/components/DisplaySettingsProvider";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import DailyWordPage from "@/pages/DailyWordPage";
import QTPage from "@/pages/QTPage";
import ReadingPage from "@/pages/ReadingPage";
import ArchivePage from "@/pages/ArchivePage";
import AuthPage from "@/pages/AuthPage"; 
import RegisterPage from "@/pages/RegisterPage";
// 방금 만든 회원가입 페이지 추가
import NotFound from "@/pages/not-found";
import { AnimatePresence } from "framer-motion";

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        {/* 모든 페이지는 기본적으로 공개(Public) 상태입니다 */}
        <Route path="/" component={DailyWordPage} />
        <Route path="/qt" component={QTPage} />
        <Route path="/reading" component={ReadingPage} />
        
        {/* '내 기록' 메뉴를 누르면 로그인/회원가입 화면이 보이게 설정 */}
        <Route path="/archive" component={ArchivePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/register" component={RegisterPage} />
        
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        <Layout>
          <TopBar />
          <main className="flex-1 overflow-y-auto pb-20">
            <Router />
          </main>
          <BottomNav />
          <Toaster />
        </Layout>
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}

export default App;