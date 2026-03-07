import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { Layout } from "./components/Layout";
import { DisplaySettingsProvider } from "./components/DisplaySettingsProvider";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import DailyWordPage from "./pages/DailyWordPage";
import QTPage from "./pages/QTPage";
import ReadingPage from "./pages/ReadingPage";
import CommunityPage from "./pages/CommunityPage";
import GroupDashboard from "./pages/GroupDashboard";
import LeadershipPage from "./pages/LeadershipPage";
import ArchivePage from "./pages/ArchivePage";
import BibleViewPage from "./pages/BibleViewPage";
import AuthPage from "./pages/AuthPage";
import FindAccountPage from "./pages/FindAccountPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import RegisterPage from "./pages/RegisterPage";
import TermsPage from "./pages/TermsPage";
import PrayerPage from "./pages/PrayerPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/not-found";

const PENDING_GROUP_INVITE_KEY = "pending_group_invite";
const GROUP_INVITE_QUERY_KEY = "invite_group";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readInviteGroupIdFromUrl(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = String(searchParams.get(GROUP_INVITE_QUERY_KEY) || "").trim();
  if (UUID_REGEX.test(fromSearch)) return fromSearch;

  const hash = window.location.hash || "";
  const queryIdx = hash.indexOf("?");
  if (queryIdx >= 0) {
    const hashParams = new URLSearchParams(hash.substring(queryIdx + 1));
    const fromHash = String(hashParams.get(GROUP_INVITE_QUERY_KEY) || "").trim();
    if (UUID_REGEX.test(fromHash)) return fromHash;
  }

  return null;
}

function AppContent() {
  return (
    <WouterRouter hook={useHashLocation}>
      <AnimatePresence mode="wait">
        <Switch>
          <Route path="/terms/:type" component={TermsPage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/find-account" component={FindAccountPage} />
          <Route path="/update-password" component={UpdatePasswordPage} />
          <Route>
            <Layout>
              <TopBar />
              <main className="no-scrollbar flex-1 overflow-y-auto">
                <Switch>
                  <Route path="/" component={DailyWordPage} />
                  <Route path="/qt" component={QTPage} />
                  <Route path="/prayer" component={PrayerPage} />
                  <Route path="/reading" component={ReadingPage} />
                  <Route path="/community" component={CommunityPage} />
                  <Route path="/group/:id" component={GroupDashboard} />
                  <Route path="/leadership" component={LeadershipPage} />
                  <Route path="/archive" component={ArchivePage} />
                  <Route path="/bible/:book/:chapter" component={BibleViewPage} />
                  <Route path="/record/:id" component={RecordDetailPage} />
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
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
    }

    const inviteGroupId = readInviteGroupIdFromUrl();
    if (inviteGroupId) {
      try {
        localStorage.setItem(PENDING_GROUP_INVITE_KEY, inviteGroupId);
      } catch (error) {
        console.error("failed to persist invite group id:", error);
      }
    }

    try {
      const storedReturnTo = localStorage.getItem("qt_return");
      if (storedReturnTo && window.location.href === storedReturnTo) {
        localStorage.removeItem("qt_return");
        localStorage.removeItem("qt_autoOpenWrite");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DisplaySettingsProvider>
        <AppContent />
      </DisplaySettingsProvider>
    </QueryClientProvider>
  );
}
