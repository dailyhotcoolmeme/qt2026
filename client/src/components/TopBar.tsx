import React, { useState } from "react";
import { Menu, X, User, Type, ChevronRight, Lock, BookType, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useAuth } from "../hooks/use-auth";
import { ProfileEditModal } from "./ProfileEditModal";
import { LoginModal } from "./LoginModal";
import { Link, useLocation } from "wouter";

export function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFontSizeSlider, setShowFontSizeSlider] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { fontSize, setFontSize } = useDisplaySettings();
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => setShowLogoutConfirm(true);

  const handleLoginClick = () => {
    setIsMenuOpen(false);
    setShowLoginModal(true);
  };

  const confirmLogout = () => {
    logout();
    setLocation("/");
    setIsMenuOpen(false);
    setShowLogoutConfirm(false);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFontSize(Number(e.target.value));
  };

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[150] flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMenuOpen(true)} className="-ml-2 rounded-full p-2 transition-colors hover:bg-zinc-100">
            <Menu className="h-6 w-6 text-zinc-700" />
          </button>

          <span className="relative inline-block text-xl font-bold tracking-tighter text-[#4A6741]">
            <span className="absolute -left-4 -top-2.5 text-[14px] font-bold">my</span>
            <span>Amen</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Link href="/search">
            <button className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100" aria-label="성경 검색">
              <BookType className="h-5 w-5" />
            </button>
          </Link>
          <button
            onClick={() => setShowFontSizeSlider(!showFontSizeSlider)}
            className={`rounded-full p-2 transition-colors ${showFontSizeSlider ? "bg-green-100 text-[#4A6741]" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            <Type className="h-5 w-5" />
          </button>
        </div>

        {showFontSizeSlider && <div className="fixed inset-0 z-[155]" onClick={() => setShowFontSizeSlider(false)} />}

        {showFontSizeSlider && (
          <div className="animate-in slide-in-from-top-2 absolute right-4 top-16 z-[160] w-60 rounded-2xl border border-zinc-100 bg-white p-5 shadow-2xl duration-200 fade-in">
            <div className="relative px-1 pb-2 pt-7">
              <div className="absolute left-0 right-0 top-0 flex justify-between px-1">
                {[14, 16, 18, 20, 22, 24].map((step) => (
                  <span key={step} className={`w-4 text-center text-[10px] font-bold transition-colors ${fontSize === step ? "text-[#4A6741]" : "text-zinc-300"}`}>
                    {step}
                  </span>
                ))}
              </div>

              <div className="relative flex h-6 items-center">
                <div className="absolute left-0 right-0 flex justify-between px-[6px]">
                  {[14, 16, 18, 20, 22, 24].map((step) => (
                    <div key={step} className={`h-1 w-1 rounded-full transition-all ${fontSize === step ? "scale-[1.8] bg-[#4A6741]" : "bg-zinc-200"}`} />
                  ))}
                </div>
                <input type="range" min="14" max="24" step="2" value={fontSize} onChange={handleFontSizeChange} className="z-10 h-1 w-full cursor-pointer appearance-none bg-transparent accent-[#4A6741]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {isMenuOpen && <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />}

      <div className={`fixed left-0 top-0 z-[210] h-full w-[280px] transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="mb-8 pt-2">
            <div className="mb-4 flex items-start justify-between">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="프로필" className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
                  <User className="h-8 w-8 text-zinc-400" />
                </div>
              )}
              <button onClick={() => setIsMenuOpen(false)} className="rounded-full p-1 transition-colors hover:bg-zinc-50">
                <X className="h-6 w-6 text-zinc-300" />
              </button>
            </div>

            <div className="space-y-0.5">
              <p className="font-bold text-zinc-900" style={{ fontSize: `${fontSize}px` }}>
                {user?.nickname || "닉네임 없음"}
              </p>
              <p className="text-zinc-500" style={{ fontSize: `${fontSize - 2}px` }}>
                {user?.username || "아이디 없음"}
              </p>
              {user?.church && (
                <p className="text-zinc-500" style={{ fontSize: `${fontSize - 2}px` }}>
                  {user.church}
                </p>
              )}
              {user?.rank && (
                <p className="text-zinc-500" style={{ fontSize: `${fontSize - 2}px` }}>
                  {user.rank}
                </p>
              )}
            </div>

            {user && (
              <button
                onClick={() => {
                  setIsProfileModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="mt-3 flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-600"
                style={{ fontSize: `${fontSize - 4}px` }}
              >
                프로필 관리
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-1">
            <Link href="/archive" onClick={() => setIsMenuOpen(false)}>
              <SidebarItem icon={<Lock className="h-5 w-5" />} label="내 기록함" />
            </Link>

            {!isAuthenticated && (
              <div className="mt-2 flex flex-col gap-2">
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                  <button className="group flex w-full items-center gap-3 rounded-xl bg-green-50 p-3.5 text-left text-[#4A6741] transition-colors hover:bg-green-100">
                    <div className="text-[#4A6741] transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="text-[14px] font-semibold transition-colors">회원가입</span>
                  </button>
                </Link>

                <button onClick={handleLoginClick} className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-600 transition-colors hover:bg-zinc-50">
                  <div className="text-zinc-400 transition-colors group-hover:text-[#4A6741]">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-[14px] font-semibold transition-colors group-hover:text-zinc-900">로그인</span>
                </button>
              </div>
            )}

            {isAuthenticated && (
              <button onClick={handleLogout} className="group mt-2 flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-red-600 transition-colors hover:bg-red-50">
                <div className="text-red-400 transition-colors group-hover:text-red-600">
                  <LogOut className="h-5 w-5" />
                </div>
                <span className="text-[14px] font-semibold transition-colors group-hover:text-red-700">로그아웃</span>
              </button>
            )}
          </nav>

          <div className="mt-auto border-t pt-4">
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] tracking-tight text-zinc-400">© 2026 어웨이마인. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </div>

      <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[280px] rounded-[28px] bg-white p-8 text-center shadow-2xl"
            >
              <h4 className="mb-2 font-bold text-zinc-900" style={{ fontSize: `${fontSize}px` }}>
                로그아웃 하시겠습니까?
              </h4>
              <p className="mb-6 text-zinc-500" style={{ fontSize: `${fontSize * 0.85}px` }}>
                현재 세션이 종료됩니다.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl bg-zinc-100 py-3 font-bold text-zinc-600 transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white shadow-lg shadow-red-200 transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  로그아웃
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  );
}

function SidebarItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="group flex w-full items-center gap-3 rounded-xl p-3.5 text-left text-zinc-600 transition-colors hover:bg-zinc-50">
      <div className="text-zinc-400 transition-colors group-hover:text-[#4A6741]">{icon}</div>
      <span className="text-[14px] font-semibold transition-colors group-hover:text-zinc-900">{label}</span>
    </button>
  );
}
