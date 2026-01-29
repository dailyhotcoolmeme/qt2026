import React from "react";
import { Link, useLocation } from "wouter";
// HandsPraying 대신 확실히 존재하는 아이콘들로 대체
import { Sun, Sparkles, Book, Users2, Mic } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t px-1 pb-safe-area-inset-bottom h-[76px] flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
      {/* 오늘말씀 */}
      <NavItem href="/" icon={<Sun />} label="오늘말씀" active={location === "/"} />
      
      {/* 오늘묵상: Sparkles (기도의 영성을 상징하는 반짝임) */}
      <NavItem href="/qt" icon={<Sparkles />} label="묵상일기" active={location === "/qt"} />

      {/* 성경읽기: Book */}
      <NavItem href="/reading" icon={<Book />} label="성경듣기" active={location === "/reading"} />

      {/* 낙타무릎: Mic (음성 기도 중심) */}
      <NavItem href="/prayer" icon={<Mic />} label="낙타무릎" active={location === "/prayer"} />
      
      {/* 중보모임: Users2 */}
      <NavItem href="/community" icon={<Users2 />} label="중보모임" active={location === "/community"} />
    </nav>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactElement; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center justify-center min-w-[68px] h-full gap-0.5 cursor-pointer">
        <div className={`p-1.5 rounded-2xl transition-all ${active ? 'bg-green-50 text-[#4A6741]' : 'text-zinc-400'}`}>
          {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
        </div>
        <span className={`text-[13px] font-bold tracking-tighter ${active ? 'text-[#4A6741] text-[14px]' : 'text-zinc-400'}`}>
          {label}
        </span>
      </div>
    </Link>
  );
}