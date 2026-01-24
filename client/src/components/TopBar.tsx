import React, { useState } from "react";
import { Menu, X, Bell, Crown, Settings, User, MessageCircle, HelpCircle, Type, ChevronRight } from "lucide-react";
import { useDisplaySettings } from "../components/DisplaySettingsProvider"; 

export function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFontSizeSlider, setShowFontSizeSlider] = useState(false);
  
  // 전역 Context에서 상태와 변경 함수를 가져옵니다.
  const { fontSize, setFontSize } = useDisplaySettings();

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = Number(e.target.value);
    // 여기서 전역 상태를 업데이트해야 DailyWordPage의 글자가 실시간으로 바뀝니다.
    setFontSize(size); 
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[150] bg-white border-b px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors">
            <Menu className="w-6 h-6 text-zinc-700" />
          </button>
          <span className="text-xl font-black text-[#4A6741] tracking-tighter">묵상일기</span>
        </div>
        
        <div className="flex items-center gap-1">
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

        {/* 글자 크기 조절 슬라이더 팝업 */}
{showFontSizeSlider && (
  <div className="absolute top-16 right-4 w-60 bg-white shadow-2xl border border-zinc-100 rounded-2xl p-5 z-[160] animate-in fade-in slide-in-from-top-2 duration-200">
    <div className="relative pt-7 pb-2 px-1"> {/* px-1로 슬라이더와 숫자의 시작점 통일 */}
      
      {/* 1. 점 위에 숫자 표시 (Flex 중심 정렬) */}
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

      {/* 2. 슬라이더 트랙과 가이드 점 */}
      <div className="relative flex items-center h-6">
        {/* 뒷배경 가이드 점들 (숫자 위치와 정확히 일치) */}
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
        
        {/* 실제 조절 레버 (가이드 점 위를 지나가도록 설정) */}
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
              <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-zinc-400" />
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-1 hover:bg-zinc-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-zinc-300" />
              </button>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-zinc-900">홍길동</span>
                <span className="text-xs font-medium text-[#4A6741] bg-green-50 px-2 py-0.5 rounded-full">(신실한 성도)</span>
              </div>
              <p className="text-sm text-zinc-500">광주중흥교회 집사</p>
            </div>
            
            <button className="flex items-center gap-1 text-[11px] text-zinc-400 mt-3 hover:text-zinc-600 transition-colors">
              프로필 관리 <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 p-4 bg-[#FDF8EE] rounded-2xl text-[#855D16] font-bold mb-4 shadow-sm active:scale-[0.98] transition-all text-left">
              <Crown className="w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13px]">프리미엄 멤버십</span>
                <span className="text-[10px] font-medium opacity-70">음성 기록 무제한 보관</span>
              </div>
            </button>
            
            <SidebarItem icon={<Settings className="w-5 h-5" />} label="서비스 설정" />
            <SidebarItem icon={<MessageCircle className="w-5 h-5" />} label="공지사항" />
            <SidebarItem icon={<HelpCircle className="w-5 h-5" />} label="도움말" />
          </nav>
          
          <div className="mt-auto border-t pt-4">
            <p className="text-[9px] text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
              © 2026 아워마인. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </div>
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