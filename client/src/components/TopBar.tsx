import React, { useState } from "react";
import { Menu, X, Bell, Crown, Settings, User, MessageCircle, HelpCircle, Type, ChevronRight, Lock, BookType, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDisplaySettings } from "../components/DisplaySettingsProvider"; 
import { useAuth } from "../hooks/use-auth";
import { ProfileEditModal } from "./ProfileEditModal";
import { Link, useLocation } from "wouter";

export function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFontSizeSlider, setShowFontSizeSlider] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // 전역 Context에서 상태와 변경 함수를 가져옵니다.
  const { fontSize, setFontSize } = useDisplaySettings();
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setLocation("/");
    setIsMenuOpen(false);
    setShowLogoutConfirm(false);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = Number(e.target.value);
    // 여기서 전역 상태를 업데이트해야 DailyWordPage의 글자가 실시간으로 바뀝니다.
    setFontSize(size); 
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[150] bg-white border-b px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors">
            <Menu className="w-6 h-6 text-zinc-700" />
          </button>
        
        
            <span className="text-xl font-bold text-[#4A6741] tracking-tighter relative inline-block">
              <span className="text-[14px] font-bold absolute -top-2.5 -left-4">my</span>
              <span>Amen</span>
            </span>
        
        </div>
  
  
        <div className="flex items-center gap-1">
  <Link href="/search">
    <button
      className="p-2 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors"
      aria-label="성경 검색"
    >
      <BookType className="w-5 h-5" />
    </button>
  </Link>
          <button 
            onClick={() => setShowFontSizeSlider(!showFontSizeSlider)}
            className={`p-2 rounded-full transition-colors ${showFontSizeSlider ? 'bg-green-100 text-[#4A6741]' : 'hover:bg-zinc-100 text-zinc-600'}`}
          >
            <Type className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-zinc-100 rounded-full relative transition-colors">
            <Bell className="w-5 h-5 text-zinc-600" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>

        {/* 1. 슬라이더 외부 클릭 감지를 위한 투명 오버레이 */}
{showFontSizeSlider && (
  <div 
    className="fixed inset-0 z-[155]" 
    onClick={() => setShowFontSizeSlider(false)} 
  />
)}

{/* 2. 글자 크기 조절 슬라이더 팝업 */}
{showFontSizeSlider && (
  <div className="absolute top-16 right-4 w-60 bg-white shadow-2xl border border-zinc-100 rounded-2xl p-5 z-[160] animate-in fade-in slide-in-from-top-2 duration-200">
    <div className="relative pt-7 pb-2 px-1">
      {/* ... 슬라이더 내부 코드는 동일 ... */}
      <div className="absolute top-0 left-0 right-0 flex justify-between px-1">
        {[14, 16, 18, 20, 22, 24].map((step) => (
          <span 
            key={step} 
            className={`text-[10px] font-bold w-4 text-center transition-colors ${
              fontSize === step ? 'text-[#4A6741]' : 'text-zinc-300'
            }`}
          >
            {step}
          </span>
        ))}
      </div>

      <div className="relative flex items-center h-6">
        <div className="absolute left-0 right-0 flex justify-between px-[6px]">
          {[14, 16, 18, 20, 22, 24].map((step) => (
            <div 
              key={step} 
              className={`w-1 h-1 rounded-full transition-all ${
                fontSize === step ? 'bg-[#4A6741] scale-[1.8]' : 'bg-zinc-200'
              }`} 
            />
          ))}
        </div>
        
        <input 
          type="range" 
          min="14" 
          max="24" 
          step="2" 
          value={fontSize}
          onChange={handleFontSizeChange}
          className="w-full h-1 bg-transparent appearance-none cursor-pointer accent-[#4A6741] z-10"
        />
      </div>
    </div>
  </div>
)}
      </div>

      {/* 사이드바 메뉴 배경 (Overlay) */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* 사이드바 본체 */}
      <div className={`fixed top-0 left-0 h-full w-[280px] bg-white z-[210] shadow-2xl transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full overflow-y-auto">
          <div className="mb-8 pt-2">
            <div className="flex justify-between items-start mb-4">
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt="프로필" 
                  className="w-14 h-14 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center">
                  <User className="w-8 h-8 text-zinc-400" />
                </div>
              )}
              <button onClick={() => setIsMenuOpen(false)} className="p-1 hover:bg-zinc-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-zinc-300" />
              </button>
            </div>
            
            <div className="space-y-0.5">
              <p className="font-bold text-zinc-900" style={{ fontSize: `${fontSize}px` }}>
                {user?.nickname || '닉네임 없음'}
              </p>
              <p className="text-zinc-500" style={{ fontSize: `${fontSize - 2}px` }}>
                {user?.username || '아이디 없음'}
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
                className="flex items-center gap-1 text-zinc-400 mt-3 hover:text-zinc-600 transition-colors" 
                style={{ fontSize: `${fontSize - 4}px` }}
              >
                프로필 관리 <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 p-4 bg-[#FDF8EE] rounded-2xl text-[#855D16] font-bold mb-4 shadow-sm active:scale-[0.98] transition-all text-left">
              <Crown className="w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13px]">프리미엄 멤버십</span>
                <span className="text-[10px] font-medium opacity-70">음성 기록 무제한 보관</span>
              </div>
            </button>
            
            {/* 내 기록함 이동 추가 */}
            <Link href="/archive" onClick={() => setIsMenuOpen(false)}>
              <SidebarItem icon={<Lock className="w-5 h-5" />} label="내 기록함" />
            </Link>
            
            <SidebarItem icon={<Settings className="w-5 h-5" />} label="서비스 설정" />
            <SidebarItem icon={<MessageCircle className="w-5 h-5" />} label="공지사항" />
            <SidebarItem icon={<HelpCircle className="w-5 h-5" />} label="도움말" />
            
            {!isAuthenticated && (
              <div className="flex flex-col gap-2 mt-2">
                <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                  <button className="flex items-center gap-3 p-3.5 rounded-xl text-[#4A6741] bg-green-50 hover:bg-green-100 transition-colors text-left w-full group">
                    <div className="text-[#4A6741] transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-[14px] transition-colors">회원가입</span>
                  </button>
                </Link>
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <button className="flex items-center gap-3 p-3.5 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors text-left w-full group">
                    <div className="text-zinc-400 group-hover:text-[#4A6741] transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-[14px] group-hover:text-zinc-900 transition-colors">로그인</span>
                  </button>
                </Link>
              </div>
            )}
            
            {isAuthenticated && (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 p-3.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-left w-full group mt-2"
              >
                <div className="text-red-400 group-hover:text-red-600 transition-colors">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-semibold text-[14px] group-hover:text-red-700 transition-colors">로그아웃</span>
              </button>
            )}
          </nav>
          
          <div className="mt-auto border-t pt-4">
            <p className="text-[9px] text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
              © 2026 아워마인. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </div>
      
      {/* Profile Edit Modal */}
      <ProfileEditModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      
      {/* Logout Confirm Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            {/* 배경 흐리게 */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            
            {/* 모달 본체 */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-8 w-full max-w-[280px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize}px` }}>
                로그아웃 하시겠습니까?
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                현재 세션이 종료됩니다.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소
                </button>
                <button 
                  onClick={confirmLogout}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold transition-active active:scale-95 shadow-lg shadow-red-200"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  로그아웃
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-3 p-3.5 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors text-left w-full group">
      <div className="text-zinc-400 group-hover:text-[#4A6741] transition-colors">
        {icon}
      </div>
      <span className="font-semibold text-[14px] group-hover:text-zinc-900 transition-colors">{label}</span>
    </button>
  );
}
