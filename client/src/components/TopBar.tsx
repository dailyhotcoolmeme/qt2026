import { Link, useLocation } from "wouter";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { Button } from "./ui/button";
import { ChevronLeft, Menu, Type, Plus, Minus, Search, Settings, Bell, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

export function TopBar() {
  const { fontSize, increaseFontSize, decreaseFontSize } = useDisplaySettings();
  const [location] = useLocation();
  const isInternalPage = location !== "/" && location !== "";

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-white/90 backdrop-blur-md border-b border-zinc-100 px-4 h-16 flex items-center justify-between shadow-sm">
      
      {/* 왼쪽: 뒤로가기 또는 햄버거 메뉴 */}
      <div className="flex items-center gap-2">
        {isInternalPage ? (
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-10 w-10 text-zinc-600">
            <ChevronLeft className="w-6 h-6" />
          </Button>
        ) : (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-600">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="p-6 border-b bg-zinc-50">
                <SheetTitle className="flex items-center gap-2 text-[#6B8E78]">
                  <img src="/logo.png" className="w-6 h-6" alt="로고" />
                  묵상 일기
                </SheetTitle>
              </SheetHeader>
              
              {/* 사이드바 메뉴 리스트 */}
              <div className="flex flex-col py-4">
                <SidebarItem icon={<Search className="w-5 h-5" />} label="성경 검색" href="/search" />
                <SidebarItem icon={<Calendar className="w-5 h-5" />} label="기록 캘린더" href="/archive" />
                <SidebarItem icon={<Bell className="w-5 h-5" />} label="알림 설정" href="/settings/notis" />
                <SidebarItem icon={<Settings className="w-5 h-5" />} label="앱 설정" href="/settings" />
              </div>
            </SheetContent>
          </Sheet>
        )}
        
        {/* 앱 로고 (메인일 때만) */}
        {!isInternalPage && (
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-[#6B8E78] tracking-tight">묵상 일기</span>
          </Link>
        )}
      </div>

      {/* 오른쪽: 글자 크기 조절 (아이콘 중심의 모던한 디자인) */}
      <div className="flex items-center bg-zinc-100/80 rounded-full px-2 py-1 gap-1">
        <button onClick={decreaseFontSize} className="p-1 hover:bg-white rounded-full transition-all shadow-sm">
          <Minus className="w-4 h-4 text-zinc-500" />
        </button>
        <div className="flex items-center gap-1 px-2 border-x border-zinc-200">
          <Type className="w-4 h-4 text-[#6B8E78]" />
          <span className="text-[14px] font-bold text-zinc-700 w-5 text-center">{fontSize}</span>
        </div>
        <button onClick={increaseFontSize} className="p-1 hover:bg-white rounded-full transition-all shadow-sm">
          <Plus className="w-4 h-4 text-zinc-500" />
        </button>
      </div>
    </div>
  );
}

// 사이드바 전용 메뉴 아이템 컴포넌트
function SidebarItem({ icon, label, href }: { icon: React.ReactNode, label: string, href: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 text-zinc-700 transition-colors border-b border-zinc-50/50">
      <span className="text-zinc-400">{icon}</span>
      <span className="text-[15px] font-medium">{label}</span>
    </Link>
  );
}